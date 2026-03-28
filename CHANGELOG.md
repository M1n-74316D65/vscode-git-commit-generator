# Changelog

All notable changes to the Git Commit Message Generator extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-XX-XX

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

### Features
- **15 Commit Styles**: Conventional Commits, Angular, Atom, ESLint, jQuery, Ember.js, Linux Kernel, Symfony, Rails, GraphQL, Docker, Karma, Semantic Versioning, Plain, Bitbucket
- **Gitmoji Toggle**: Independent control of emoji prefixes
- **Smart Body Generation**: Auto-generates detailed descriptions for complex changes (5+ files)
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
