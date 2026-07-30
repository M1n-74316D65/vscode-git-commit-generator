# Changelog

All notable changes to the Git Commit Message Generator extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2026-07-30

### Changed

- Include untracked files in all-changes generation and support repositories without an initial commit.
- Ask users to select a repository when a multi-root workspace has no unambiguous active repository.
- Reduce oversized diffs at file, hunk, and line boundaries before model token counting.
- Include the configured number of recent commits instead of silently limiting prompt context to five.
- Treat repository content as untrusted prompt data and validate generated subjects before writing to SCM.
- Keep only generation inline in the SCM title and move configuration actions to its overflow menu.
- Remove the redundant status bar item and success notifications for model, style, and Gitmoji changes.

## [1.2.1] - 2026-07-30

### Added

- Add a localized `Show Logs` command and Output Channel for runtime diagnostics.
- Add English and Spanish localization for manifest commands, settings, and capability descriptions.
- Add CI checks for VS Code 1.90.0 and the current stable release.
- Add packaged-VSIX integrity checks for size, manifest content, and excluded development files.

### Changed

- Use Bun and `bun.lock` as the project package-manager source of truth.
- Disable the extension in untrusted and virtual workspaces.
- Clear the language model cache when available models change.
- Make retry delays cancellable and include a reason in language model access requests.
- Package release artifacts under `artifacts/vsix/`.
- Build release artifacts only from version tags and require manual Marketplace upload of the verified VSIX.

### Removed

- Remove the proposed SCM input-box contribution and proposed-API packaging workaround.
- Remove first-run and generated-message success notifications.

### Fixed

- Await legacy configuration migrations during activation.
- Update VS Code test tooling for current macOS application bundles.

## [1.2.0] - 2026-07-26

### Added

- Support commit messages in French, German, Italian, Portuguese, and Japanese.
- Detect supported VS Code locale languages when `gitCommitGenerator.language` is `auto`.

### Changed

- Simplify model-picker rows and style-picker category labels.
- Use clearer progress, error, and status messages in English and Spanish.
- Update the README with current commands, settings, and language support.

## [1.1.0] - 2026-07-20

### Added
- Generate button in the SCM commit input box (progressive enhancement; toolbar buttons remain the fallback)
- `Generate Commit Message (Staged Changes)` and `Generate Commit Message (All Changes)` commands; the main generate command auto-detects scope
- Token-aware prompt compression that fits large diffs into the model context window, with a clear error when it cannot
- `excludeFiles` setting to filter paths (lockfiles, `.env`) out of the diff with glob patterns
- Single-flight generation lock with a localized "already in progress" message
- Source Control spinner alongside the cancellable progress notification, with live streaming character count
- Marketplace icon
- Publish-safe packaging that strips proposed-API declarations from the manifest

### Fixed
- Large staged diffs (≥1MB) no longer fail silently or report "no staged changes"
- Generated messages always target the repository that was diffed in multi-root workspaces
- Cancellation no longer shows an error toast; only retryable LM errors are retried
- `modelFamily` setting no longer writes schema-violating values
- Internal state (`hasShownWelcome`, `modelId`) moved out of user settings into extension storage
- `recentCommitsCount` is clamped before use in shell commands

## [1.0.2] - 2026-07-20

### Fixed
- Hardened diff handling, error classification, and command activation

## [1.0.1] - 2026-03-28

### Changed
- Tighten production packaging and versioned VSIX output for marketplace publishing
- Improve cancellation flow, Git repo targeting, and localized extension messaging

### Added
- Extension-host smoke tests for command registration and translation loading

### Removed
- Outdated production checklist document and unused model selector module

## [1.0.0] - 2026-03-28

### Added
- Initial release with 15 commit styles
- Multi-language support (English and Spanish)
- Model caching with intelligent fallback
- Retry logic with exponential backoff for LLM requests
- Welcome message for first-time users
- Cancellation support during generation
- Detailed progress reporting
- Git availability checking
- Status bar showing current style and gitmoji status
- 4 grouped SCM buttons for easy access
- Localized model selection, activation, and status bar messaging
- Working VS Code extension-host smoke tests
- Improved multi-repository targeting for SCM commit input

### Features
- **15 Commit Styles**: Conventional Commits, Angular, Atom, ESLint, jQuery, Ember.js, Linux Kernel, Symfony, Rails, GraphQL, Docker, Karma, Semantic Versioning, Plain, Bitbucket
- **Gitmoji Toggle**: Independent control of emoji prefixes
- **Smart Body Generation**: Auto-generates detailed descriptions based on configurable file thresholds
- **Context Awareness**: Uses recent commit history for consistency
- **Language Model Selection**: Pick from available VS Code LLM models
- **Model Caching**: 5-minute cache to optimize performance
- **Error Handling**: Graceful handling with retry logic

### Security
- No API keys required (uses VS Code's built-in LLM API)
- Respects user permissions and LLM consent
- Secure model selection and caching

## [0.9.0] - 2024-XX-XX (Beta)

### Added
- Beta release for testing
- Core generation functionality
- Basic configuration options
- Status bar integration

---

## Release Notes Template

### Added
- New features

### Changed
- Changes in existing functionality

### Deprecated
- Soon-to-be removed features

### Removed
- Now removed features

### Fixed
- Bug fixes

### Security
- Security improvements
