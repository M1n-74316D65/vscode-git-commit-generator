# Git Commit Message Generator

[![VS Code Marketplace](https://img.shields.io/badge/VS%20Code-Marketplace-blue.svg)](https://marketplace.visualstudio.com/items?itemName=m1n.vscode-llm-api-git-commit-generator)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-green.svg)](https://github.com/M1n-74316D65/vscode-git-commit-generator)

AI-powered Git commit message generator for VS Code using GitHub Copilot's Language Model API. Generates commit messages following multiple industry-standard formats including Gitmoji + Conventional Commits.

## ✨ Features

- 🤖 **15 Commit Styles**: Conventional Commits, Angular, Atom, ESLint, Linux Kernel, and more
- 🌍 **Multi-language Support**: English and Spanish (auto-detects from VS Code locale)
- ✨ **Gitmoji Integration**: Optional emoji prefixes with independent toggle
- 📝 **Smart Body Generation**: Automatically generates detailed descriptions for complex changes
- 📚 **Context Awareness**: Uses recent commit history to maintain consistency
- 🎨 **Multiple Styles**: Choose from 6 categories of commit conventions
- ⚡ **Performance**: Model caching and retry logic for reliability
- 🔒 **Secure**: No API keys needed, uses VS Code's built-in LLM

## 📋 Requirements

- VS Code 1.90.0 or higher
- GitHub Copilot extension installed and enabled
- Git repository in your workspace

## 🚀 Installation

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "Git Commit Message Generator"
4. Click Install

## 🎯 Usage

### Quick Start

1. **Stage your changes** in the Source Control view
2. **Click the sparkle icon** ✨ in the Source Control panel
3. **Review the generated message** in the commit input box
4. **Commit** manually or edit the message as needed

### Using Commands

Open the Command Palette (Ctrl+Shift+P / Cmd+Shift+P) and type:

- `Git Commit: Generate Commit Message` - Generate a message
- `Git Commit: Select Commit Style` - Change commit format
- `Git Commit: Toggle Gitmojis` - Enable/disable emojis
- `Git Commit: Refresh Available Models` - Update model list

### SCM Panel Buttons

Four convenient buttons grouped together in the Source Control panel:

| Button | Icon | Action |
|--------|------|--------|
| Generate | ✨ | Generate commit message |
| Refresh Models | ☁️ | Refresh and select model |
| Select Style | 🎨 | Choose commit style |
| Toggle Gitmojis | 🔘 | Toggle emoji prefixes |

## 🎨 Commit Styles

### ⭐ Popular
- **Conventional Commits**: `feat: add authentication`
- **Angular/Google**: `feat(auth): add login`
- **Atom Editor**: `:sparkles: Add new feature`
- **ESLint**: `Feat: Add new rule`

### 🔧 Framework
- **Ember.js**: `[FEATURE] Add computed property`
- **GraphQL**: `Add user query (feat)`
- **Ruby on Rails**: `[FEATURE] Add authentication`
- **Symfony**: `[Feature] Add console command`

### 🛠️ DevOps & Tools
- **Bitbucket**: `JIRA-123: Add feature`
- **Docker**: `builder: fix cache`
- **Karma**: `feat(config): add env support`

### ⚙️ System
- **jQuery**: `Core: Fix selector`
- **Linux Kernel**: `net: fix tcp bug`

### 📋 Specialized
- **Semantic Versioning**: `fix: resolve leak (closes #123)`

### ✨ Minimal
- **Plain**: `Fix login redirect bug`

## ⚙️ Configuration

Open VS Code settings (Ctrl+, / Cmd+,) and search for "Git Commit Generator":

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `language` | `auto\|en\|es` | `auto` | Message language |
| `style` | string | `conventional` | Commit format style |
| `useGitmojis` | boolean | `true` | Include emoji prefixes |
| `includeBody` | boolean | `true` | Generate detailed body |
| `bodyThreshold` | number | `5` | Min files for body generation |
| `recentCommitsCount` | number | `10` | Context commits count |
| `modelFamily` | string | `gpt-4o` | LLM model family |

## 📖 Examples

### Simple Change
```
✨ feat(auth): add user authentication
```

### Complex Change with Body
```
✨ feat(api): implement rate limiting

- Add Redis-based rate limiter
- Configure per-endpoint limits
- Include retry-after headers
- Add comprehensive tests
```

### Spanish Language
```
✨ feat(autenticacion): implementar OAuth2

- Añadir integración con Google OAuth
- Crear mecanismo de refresco de tokens
- Implementar almacenamiento seguro
- Añadir tests completos
```

## 🛠️ Development

### Building from Source

```bash
# Clone repository
git clone https://github.com/M1n-74316D65/vscode-git-commit-generator.git
cd vscode-git-commit-generator

# Install dependencies
npm install

# Compile
npm run compile

# Watch mode
npm run watch

# Run tests
npm test
```

### Debugging

Press `F5` to open a new VS Code window with the extension loaded.

## 📄 License

[MIT](LICENSE) © Git Commit Generator Contributors

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## 🐛 Known Issues

- Large diffs (>1MB) may be truncated to fit token limits
- Requires GitHub Copilot to be installed and enabled

## 📮 Support

- [GitHub Issues](https://github.com/M1n-74316D65/vscode-git-commit-generator/issues)
- [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=m1n.vscode-llm-api-git-commit-generator)

---

**Enjoy generating better commit messages!** ✨
