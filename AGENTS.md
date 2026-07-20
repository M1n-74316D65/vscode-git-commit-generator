# Repository Guidelines

## Project Overview

VS Code extension (`m1n.vscode-llm-api-git-commit-generator`, v1.0.1) that generates Git commit messages from the staged diff using VS Code's built-in Language Model API (`vscode.lm`, e.g. GitHub Copilot) — no external HTTP calls, no API keys. Supports 15 commit styles, optional Gitmoji prefixes, EN/ES localization, and smart body generation.

## Architecture & Data Flow

Entry: `src/extension.ts` exports `activate`/`deactivate`. `activate()` initializes internal state (`ConfigManager.initialize`, which also migrates legacy `modelId`/`hasShownWelcome` settings into `globalState`), checks git availability, registers commands (`registerCommands`, `registerConfigCommands`), initializes the status bar, and shows a one-time welcome message (persisted via `globalState` key `hasShownWelcome`).

Main flow (`git-commit-generator.generate` in `src/commands.ts`, plus scoped variants `generateStaged`/`generateAll`):

1. Single-flight lock (`tryAcquireGenerationLock`) — a second invocation while one runs shows a localized info message and returns.
2. `GitManager.findGitRepository()` — repo discovery via `vscode.git` extension API (`getAPI(1)`), fallback `git rev-parse --show-toplevel` per workspace folder.
3. Scope resolution — `generate` is auto-scope: staged diff if non-empty, else all changes (`resolveScope`); `generateStaged`/`generateAll` force the scope.
4. `GitManager.getDiff(scope, excludePatterns)` — shells out via `promisify(exec)` (`git diff --staged` vs `git diff HEAD`, 8MB maxBuffer, 30s timeout). Sections whose `diff --git a/x b/y` path matches `gitCommitGenerator.excludeFiles` globs are dropped (`src/glob.ts`, zero-dep matcher supporting `**`/`*`/`?`); stats are computed from the filtered diff content. Returns `undefined` on empty diff, throws on git failure.
5. Build `GenerationContext` inside nested progress: outer `ProgressLocation.SourceControl` spinner + inner cancellable Notification progress.
6. `LLMManager.generateCommitMessage()` — model selection with 3-strategy fallback (preferred id → family → any) and a 5-minute static model cache; `compressContext` (iterative token-based compression: `model.countTokens` vs `maxInputTokens − 2000` headroom, drop recent commits to a floor of 3, then truncate diff ~20%/step, else `PromptTooLargeError`; shows `diffTooLarge` warning only when compression shrank content); `buildPrompt` (i18n system prompt + per-style rules); `sendRequestWithRetry` (3 retries, linear backoff, retries only retryable `LanguageModelError`s, reports streaming char count via progress).
7. `parseCommitMessage` (first non-empty line = subject, rest = body) → `GitManager.setCommitMessage()` writes into the SCM input box (`repo.inputBox.value`).

State: static mutable fields on manager classes (model cache, retry counter, status bar item) + VS Code workspace configuration `gitCommitGenerator.*`. No DI container, no external state store.

## Key Directories

- `src/` — all extension source (entry, commands, git, llm, config, status bar, types, i18n, glob matcher)
- `src/i18n/` — `en.ts`, `es.ts`, `index.ts` message catalogs
- `src/test/` — extension-host tests
- `resources/` — icon placeholder only (see `resources/README.md`)
- `out/` — compiled JS output (gitignored)

## Development Commands

Package manager: **npm** (`package-lock.json` is canonical; `bun.lock` is stale — ignore it).

```bash
npm install          # install
npm run compile      # clean + tsc -p ./
npm run watch        # tsc --watch
npm test             # pretest (compile) + vscode-test
npm run package:vsix # npx @vscode/vsce package
```

Debug: F5 in VS Code (`.vscode/launch.json` "Run Extension", preLaunchTask = default build).

## Code Conventions & Common Patterns

- TypeScript, `strict: true`, `module: commonjs`, `target: ES2022`, source maps on. Plain `tsc` build — no bundler, no ESLint/Prettier configs.
- **Zero runtime dependencies** — only VS Code APIs (`vscode.lm`, `vscode.git`, `vscode.window`, `child_process`). Keep it that way.
- Managers are static classes (`GitManager`, `LLMManager`, `ConfigManager`, `StatusBarManager`) imported directly; only `GitManager` is instantiated per-repo (`new GitManager(root)`).
- Naming: `XxxManager` classes, `registerXxxCommands` functions, kebab-case filenames, command ids `git-commit-generator.<verb>`, category `"Git Commit"`.
- Async: async/await throughout, `promisify(exec)` with explicit timeouts, `Promise.all` for parallel git-root probes, `for await` over LM response streams, `vscode.CancellationToken` checks in long operations.
- Errors: try/catch → `console.error` + localized `vscode.window.showErrorMessage`. `vscode.LanguageModelError` classified primarily by `error.code` (NoPermissions/Blocked/NotFound), with `error.cause.message` substrings (off_topic/rate_limit/consent/quota) as fallback. User cancellation (`vscode.CancellationError` / token) returns silently. Git helpers return `undefined` on "no staged changes" and throw on git failure.
- i18n: all user-facing strings from `src/i18n/` catalogs, camelCase keys, `{0}`/`{1}` placeholders. Add keys to both `en.ts` and `es.ts`.
- Settings live under `gitCommitGenerator.*` in `package.json#contributes.configuration` — add new settings there and mirror in `ConfigManager`.

## Important Files

- `package.json` — extension manifest: commands, `scm/title` menus (navigation buttons + `generateStaged`/`generateAll` in an overflow group, `scmProvider == git`), `scm/inputBox` menu (proposed contribution point, declared via `enabledApiProposals: ["contribSourceControlInputBoxMenu"]`), configuration schema (no `activationEvents` block — VS Code ≥1.74 auto-generates them from contributed commands)
- `src/extension.ts` — activation entry point
- `src/commands.ts` — main generation orchestration (scopes, single-flight lock, nested progress)
- `src/llm.ts` — model selection, prompt compression/building, retry logic (15 style templates live here)
- `src/git.ts` — repo discovery and git shell-outs
- `src/glob.ts` — zero-dep glob matcher + diff-section filter for `excludeFiles`
- `src/config.ts`, `src/config-commands.ts` — settings access and the 5 config commands
- `.vscode-test.js` — test runner config
- `README.md`, `CHANGELOG.md` — user docs; CHANGELOG follows Keep-a-Changelog/SemVer. NOTE: README links to a `CONTRIBUTING.md` that does not exist.

## Runtime/Tooling Preferences

- VS Code engine `^1.90.0`; Node 20.x types; TypeScript ^5.3.
- npm only (see above). Tests download stable VS Code via `@vscode/test-electron`.
- No CI, no lint, no formatter, no coverage tooling — match existing style by reading neighboring code.

## Testing & QA

- Mocha (TDD-style `suite`/`test`) + Node `assert`, running **inside the real VS Code Extension Host** via `@vscode/test-cli` — no mocking frameworks; tests use the live `vscode` API.
- Single suite: `src/test/extension.test.ts` (command registration, language detection, i18n strings). Tests compile to `out/test/**/*.test.js`.
- Run with `npm test`. Mocha timeout is 20s (`.vscode-test.js`); VS Code `stable` is downloaded on first run.
- No coverage thresholds exist. `vscode-test --coverage` is available (bundled c8) but unconfigured.
- When asserting extension presence, the id is `m1n.vscode-llm-api-git-commit-generator`.
