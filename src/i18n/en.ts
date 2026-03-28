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
    generating: 'Generating commit message...',
    generated: 'Commit message generated!',
    error: 'Error generating commit message: {0}',
    llmConsentRequired: 'Please grant permission to use the Language Model API.',
    rateLimited: 'Rate limit exceeded. Please try again later.',
    diffTooLarge: 'Diff is very large. Truncating to fit token limits.',
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
};
