export const en = {
  systemPrompt: `Generate a Git commit message using Gitmoji + Conventional Commits format.

Format: <emoji> <type>(<scope>): <subject>

Types and emojis:
- ✨ feat: New feature
- 🐛 fix: Bug fix
- ⚡ perf: Performance improvement
- 📚 docs: Documentation only changes
- ♻️ refactor: Code refactoring
- ✅ test: Adding or correcting tests
- 🔧 chore: Build process or auxiliary tool changes

Rules:
- Subject maximum 72 characters
- Use imperative mood ("Add" not "Added")
- Include scope in parentheses when clear (e.g., feat(auth))
- Be specific but concise
- Focus on WHAT changed and WHY
- Respond ONLY with the commit message

For body generation (when there are many changes):
- Add a blank line after subject
- Use bullet points (-) for each change
- Explain WHAT changed and WHY
- Reference breaking changes if any`,

  messages: {
    noStagedChanges: 'No staged changes found. Stage some files first.',
    noGitRepository: 'No Git repository found in the current workspace.',
    noModelsAvailable: 'No language models available. Please install GitHub Copilot.',
    noModelsWithCopilot: 'No language models available. Make sure GitHub Copilot is installed and enabled.',
    generating: 'Generating commit message...',
    generated: 'Commit message generated!',
    error: 'Error generating commit message: {0}',
    gitUnavailable: 'Git Commit Generator: Git is not available in your system PATH. Some features may not work.',
    openSettings: 'Open Settings',
    welcomeReady: 'Git Commit Generator is ready! Generate commit messages with AI using the sparkle button in the Source Control panel.',
    generateCommitAction: 'Generate a Commit',
    gotIt: 'Got it',
    llmConsentRequired: 'Please grant permission to use the Language Model API.',
    rateLimited: 'Rate limit exceeded. Please try again later.',
    diffTooLarge: 'Diff is very large. Truncating to fit token limits.',
    styleChanged: 'Commit style changed to: {0}',
    gitmojisEnabled: '✅ Gitmojis enabled',
    gitmojisDisabled: '⭕ Gitmojis disabled',
    enabledLabel: 'ON',
    disabledLabel: 'OFF',
    currentStyle: 'Current: {0}',
    selectStyle: 'Select commit message style',
    selectStyleTitle: 'Select Commit Style',
    toggleGitmojis: 'Toggle Gitmojis On/Off',
    analyzingModel: 'Analyzing available models...',
    analyzingHistory: 'Analyzing commit history...',
    fetchingModels: 'Fetching available models from VS Code LLM API...',
    buildingModelList: 'Building model list...',
    showingModelSelection: 'Showing selection...',
    selectLanguageModel: 'Select a language model for commit generation',
    modelsAvailableTitle: 'Git Commit Generator - {0} Model(s) Available',
    modelSet: '✅ Model set to {0} ({1})',
    refreshingModels: 'Refreshing available language models...',
    modelsFoundOpeningSelector: '✅ Found {0} available model(s). Opening selector...',
    errorFetchingModels: 'Error fetching models: {0}',
    errorRefreshingModels: 'Error refreshing models: {0}',
    installCopilot: 'Install Copilot',
    buildingPrompt: 'Building prompt...',
    parsingResponse: 'Parsing response...',
    done: 'Done!',
    maxRetriesExceeded: 'Maximum retry attempts exceeded. Please try again later.',
    offTopicError: 'The changes are not suitable for commit message generation.',
    quotaExceeded: 'API quota exceeded. Please try again later.',
    activationFailed: 'Git Commit Generator failed to activate. Check the Debug Console for details.',
    statusBarTooltip: 'Click to change commit style\nCurrent: {0}\nGitmojis: {1}',
  },

  commitTypes: {
    feat: 'feat',
    fix: 'fix',
    perf: 'perf',
    docs: 'docs',
    refactor: 'refactor',
    test: 'test',
    chore: 'chore',
  },

  styles: {
    conventional: 'Conventional Commits',
    angular: 'Angular/Google',
    atom: 'Atom Editor',
    eslint: 'ESLint',
    jquery: 'jQuery',
    ember: 'Ember.js',
    linux: 'Linux Kernel',
    symfony: 'Symfony',
    rails: 'Ruby on Rails',
    graphql: 'GraphQL',
    docker: 'Docker',
    karma: 'Karma Runner',
    semantic: 'Semantic Versioning',
    plain: 'Plain Simple',
    bitbucket: 'Bitbucket',
  },

  styleDescriptions: {
    conventional: 'type: description',
    angular: 'type(scope): description',
    atom: ':emoji: description',
    eslint: 'Tag: Description',
    jquery: 'Component: Short description',
    ember: '[TAG] short description',
    linux: 'subsystem: description',
    symfony: '[Type] Description',
    rails: '[Tag] description',
    graphql: 'description (type)',
    docker: 'scope: description',
    karma: 'type(scope): description',
    semantic: 'type: description (closes #X)',
    plain: 'Description',
    bitbucket: 'JIRA-123: description',
  },

  categories: {
    popular: '⭐ Popular',
    framework: '🔧 Framework',
    devops: '🛠️ DevOps & Tools',
    system: '⚙️ System',
    specialized: '📋 Specialized',
    minimal: '✨ Minimal',
  },
};
