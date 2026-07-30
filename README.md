# Git Commit Message Generator

[![VS Code Marketplace](https://img.shields.io/badge/VS%20Code-Marketplace-blue.svg)](https://marketplace.visualstudio.com/items?itemName=m1n.vscode-llm-api-git-commit-generator)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-green.svg)](https://github.com/M1n-74316D65/vscode-git-commit-generator)

Generate Git commit messages from repository changes in VS Code. The extension uses the VS Code Language Model API. It does not use an external API key.

## Features

- Choose from 15 commit message styles.
- Write messages in English, Spanish, French, German, Italian, Portuguese, or Japanese.
- Add Gitmoji prefixes when needed.
- Add a message body for changes that affect several files.
- Use recent commits as context for the selected style.
- Generate from staged changes or all working-tree changes.
- Exclude file paths from the diff that the model receives.
- Compress large diffs to fit the model context.
- Select an available language model or model family.

## Requirements

- VS Code 1.90.0 or later.
- An enabled GitHub Copilot extension with language model access.
- A trusted, file-system-backed Git repository in the workspace.

## Install

1. Open VS Code.
2. Open Extensions with `Ctrl+Shift+X` or `Cmd+Shift+X`.
3. Search for `Git Commit Message Generator`.
4. Select **Install**.

## Generate a Commit Message

1. Open the Source Control view.
2. Stage the files when you want to generate from staged changes.
3. Select the sparkle button.
4. Review the message in the commit input box.
5. Edit or commit the message.

The main command uses staged changes when they exist. Otherwise, it uses all working-tree changes.

## Commands

Open the Command Palette with `Ctrl+Shift+P` or `Cmd+Shift+P`.

| Command | Action |
| --- | --- |
| `Git Commit: Generate Commit Message` | Generate from staged changes, or all changes when you do not stage changes. |
| `Git Commit: Generate Commit Message (Staged Changes)` | Generate only from staged changes. |
| `Git Commit: Generate Commit Message (All Changes)` | Generate from all working-tree changes. |
| `Git Commit: Select Commit Style` | Select a commit message style. |
| `Git Commit: Toggle Gitmojis` | Turn Gitmoji prefixes on or off. |
| `Git Commit: Select Language Model` | Select an available language model. |
| `Git Commit: Refresh Available Models` | Refresh the available model list. |
| `Git Commit: Open Settings` | Open the extension settings. |
| `Git Commit: Show Logs` | Open the Git Commit Generator output channel. |

The Source Control title bar also has buttons to generate messages, select a style, select a model, and toggle Gitmojis.

## Commit Styles

| Style | Example |
| --- | --- |
| Conventional Commits | `feat: add authentication` |
| Angular/Google | `feat(auth): add login` |
| Atom Editor | `:sparkles: Add new feature` |
| ESLint | `Feat: Add new rule` |
| Ember.js | `[FEATURE] Add computed property` |
| GraphQL | `Add user query (feat)` |
| Ruby on Rails | `[FEATURE] Add authentication` |
| Symfony | `[Feature] Add console command` |
| Bitbucket | `JIRA-123: Add feature` |
| Docker | `builder: fix cache` |
| Karma | `feat(config): add env support` |
| jQuery | `Core: Fix selector` |
| Linux Kernel | `net: fix tcp bug` |
| Semantic Versioning | `fix: resolve leak (closes #123)` |
| Plain | `Fix login redirect bug` |

## Settings

Open Settings with `Ctrl+,` or `Cmd+,`. Search for `Git Commit Generator`.

| Setting | Default | Description |
| --- | --- | --- |
| `gitCommitGenerator.language` | `auto` | Select `auto`, `en`, `es`, `fr`, `de`, `it`, `pt`, or `ja` for the message language. |
| `gitCommitGenerator.style` | `conventional` | Select the commit message style. |
| `gitCommitGenerator.useGitmojis` | `true` | Add Gitmoji prefixes. |
| `gitCommitGenerator.includeBody` | `true` | Add a body for complex changes. |
| `gitCommitGenerator.bodyThreshold` | `5` | Set the minimum changed-file count that adds a body. |
| `gitCommitGenerator.recentCommitsCount` | `10` | Set the number of recent commits used as context. |
| `gitCommitGenerator.excludeFiles` | `["**/package-lock.json", "**/.env*"]` | Set glob patterns for paths excluded from the model diff. |
| `gitCommitGenerator.modelFamily` | `gpt-4o` | Set the preferred language model family. |

## Examples

### Simple Change

```
✨ feat(auth): add user authentication
```

### Change with a Body

```
✨ feat(api): add rate limits

- Add a Redis rate limiter.
- Set limits for each endpoint.
- Add retry-after headers.
- Add tests.
```

### Spanish Message

```
✨ feat(autenticacion): implementar OAuth2

- Añadir integración con Google OAuth.
- Crear un mecanismo de refresco de tokens.
- Implementar almacenamiento seguro.
- Añadir pruebas.
```

## Develop

```bash
git clone https://github.com/M1n-74316D65/vscode-git-commit-generator.git
cd vscode-git-commit-generator
bun install
bun run compile
bun run test
```

Press `F5` in VS Code to start an Extension Development Host.

Package and verify the release artifact:

```bash
bun run package:vsix
bun scripts/verify-vsix.mjs
```

The verified VSIX is written to `artifacts/vsix/git-commit-generator.vsix`.
Version tags build the same artifact in CI. Upload that verified file manually to
the Visual Studio Marketplace instead of packaging a second copy.

## Known Limits

- The extension truncates large diffs when the model context cannot hold the full diff.
- The extension requires GitHub Copilot or another language model provider for VS Code.
- The extension is disabled in Restricted Mode and does not support virtual workspaces.

## License

[MIT](LICENSE) © Git Commit Generator Contributors

## Support

- [Report an issue](https://github.com/M1n-74316D65/vscode-git-commit-generator/issues)
- [View the extension in the VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=m1n.vscode-llm-api-git-commit-generator)
