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
    noStagedChanges: 'No staged changes. Stage files, then try again.',
    noChanges: 'No repository changes found.',
    alreadyInProgress: 'A commit message is already being generated.',
    promptTooLarge: 'The selected model cannot fit the commit prompt.',
    compressingPrompt: 'Reducing the prompt to fit the model context.',
    generatingChars: 'Generating commit message ({0} characters).',
    noGitRepository: 'No Git repository exists in this workspace.',
    noModelsAvailable: 'No language model is available. Install GitHub Copilot.',
    noModelsWithCopilot: 'No language model is available. Enable GitHub Copilot, then try again.',
    generating: 'Generating commit message.',
    error: 'Cannot generate the commit message. Open the logs for details.',
    gitUnavailable: 'Git is not in the system PATH. Some extension features will not work.',
    openSettings: 'Open Settings',
    openLogs: 'Open Logs',
    llmConsentRequired: 'Allow access to the Language Model API.',
    rateLimited: 'The language model rate limit was reached. Try again later.',
    diffTooLarge: 'The diff is large. The extension will truncate it to fit the model context.',
    styleChanged: 'Commit style: {0}',
    gitmojisEnabled: 'Gitmojis enabled',
    gitmojisDisabled: 'Gitmojis disabled',
    enabledLabel: 'ON',
    disabledLabel: 'OFF',
    currentStyle: 'Current: {0}',
    selectStyle: 'Select commit message style',
    selectStyleTitle: 'Select Commit Style',
    analyzingModel: 'Checking available models.',
    analyzingHistory: 'Reading recent commits.',
    fetchingModels: 'Finding available language models.',
    buildingModelList: 'Preparing the model list.',
    showingModelSelection: 'Opening the model list.',
    selectLanguageModel: 'Select a language model for commit generation',
    modelsAvailableTitle: 'Git Commit Generator: {0} Available Models',
    modelSet: 'Selected model: {0} ({1})',
    refreshingModels: 'Refreshing available language models.',
    errorFetchingModels: 'Cannot get the available language models.',
    errorRefreshingModels: 'Cannot refresh the available language models.',
    installCopilot: 'Install Copilot',
    buildingPrompt: 'Preparing the prompt.',
    parsingResponse: 'Reading the model response.',
    done: 'Done.',
    maxRetriesExceeded: 'The maximum retry count was reached. Try again later.',
    offTopicError: 'The model cannot create a commit message for these changes.',
    quotaExceeded: 'The language model quota was reached. Try again later.',
    activationFailed: 'Git Commit Generator did not start. Open the logs for details.',
    requestJustification: 'Generate a Git commit message from the selected repository changes.',
    statusBarTooltip: 'Click to change commit style\nCurrent: {0}\nGitmojis: {1}',
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

  categories: {
    popular: 'Popular',
    framework: 'Framework',
    devops: 'DevOps and Tools',
    system: 'System',
    specialized: 'Specialized',
    minimal: 'Minimal',
  },
};
