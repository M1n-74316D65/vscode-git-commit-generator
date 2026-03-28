# Git Commit Message Generator

AI-powered Git commit message generator for VS Code using GitHub Copilot's Language Model API. Generates commit messages following Gitmoji + Conventional Commits format.

## Features

- ✨ **Gitmoji + Conventional Commits**: Generate commit messages with emojis and standardized format
- 🌍 **Multi-language Support**: English and Spanish (auto-detects from VS Code locale)
- 📝 **Smart Body Generation**: Automatically generates detailed descriptions for complex changes
- 📚 **Context Awareness**: Uses recent commit history to maintain consistency
- 🤖 **Powered by GitHub Copilot**: No API keys needed, uses VS Code's built-in LLM

## Requirements

- VS Code 1.90.0 or higher
- GitHub Copilot extension installed and enabled
- Git repository in your workspace

## Usage

1. **Stage your changes** using the Source Control view
2. **Click the button** in the Source Control panel or run command:
   - Command Palette: `Git Commit: Generate Commit Message`
   - Button: Click the sparkle icon in the Source Control view
3. **Review the generated message** in the commit input box
4. **Edit if needed** and commit manually

## Configuration

Open VS Code settings and search for "Git Commit Generator":

| Setting | Description | Default |
|---------|-------------|---------|
| `gitCommitGenerator.language` | Commit message language (`auto`, `en`, `es`) | `auto` |
| `gitCommitGenerator.style` | Message style (`gitmoji-conventional`, `conventional-only`) | `gitmoji-conventional` |
| `gitCommitGenerator.includeBody` | Generate detailed body for complex changes | `true` |
| `gitCommitGenerator.bodyThreshold` | Min files changed to trigger body generation | `5` |
| `gitCommitGenerator.recentCommitsCount` | Number of recent commits for context | `10` |

## Examples

**Simple change:**
```
✨ feat(auth): add user authentication
```

**Complex change (Spanish):**
```
✨ feat(autenticacion): implementar autenticación OAuth2

- Añadir integración con Google OAuth
- Crear mecanismo de refresco de tokens  
- Implementar almacenamiento seguro de sesión
- Añadir funcionalidad de cierre de sesión
```

## Supported Commit Types

- ✨ `feat`: New feature
- 🐛 `fix`: Bug fix
- ⚡ `perf`: Performance improvement
- 📚 `docs`: Documentation
- ♻️ `refactor`: Code refactoring
- ✅ `test`: Tests
- 🔧 `chore`: Maintenance

## Building from Source

```bash
npm install
npm run compile
```

Press `F5` to open a new VS Code window with the extension loaded.

## License

MIT
