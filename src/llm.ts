import * as vscode from 'vscode';
import { GenerationContext, CommitMessage, CommitStyle } from './types';
import { ConfigManager } from './config';

export class LLMManager {
  static async generateCommitMessage(context: GenerationContext): Promise<CommitMessage | undefined> {
    const translation = ConfigManager.getTranslation();
    
    try {
      // Get user's preferred model from config
      const config = vscode.workspace.getConfiguration('gitCommitGenerator');
      const preferredFamily = config.get<string>('modelFamily', 'gpt-4o');
      const preferredId = config.get<string | undefined>('modelId', undefined);
      
      // Try to get the preferred model, or any available model
      let models: vscode.LanguageModelChat[] = [];
      
      if (preferredId) {
        // Try to find the specific model by ID
        models = await vscode.lm.selectChatModels({ id: preferredId });
      }
      
      if (models.length === 0) {
        // Try to find by family
        models = await vscode.lm.selectChatModels({ family: preferredFamily });
      }
      
      if (models.length === 0) {
        // Get any available model
        models = await vscode.lm.selectChatModels({});
      }

      if (models.length === 0) {
        throw new Error('No language models available. Please install GitHub Copilot.');
      }

      // Use the first available model
      const model = models[0];
      console.log(`Using model: ${model.name} (${model.family})`);

      // Build the prompt with style-specific instructions
      const messages = this.buildPrompt(context, translation.systemPrompt);

      // Send request to LLM
      const cancellationTokenSource = new vscode.CancellationTokenSource();
      const response = await model.sendRequest(
        messages,
        {},
        cancellationTokenSource.token
      );

      // Collect the response
      let fullMessage = '';
      for await (const fragment of response.text) {
        fullMessage += fragment;
      }

      // Parse the commit message
      return this.parseCommitMessage(fullMessage.trim());
    } catch (error) {
      if (error instanceof vscode.LanguageModelError) {
        throw this.handleLMError(error);
      }
      throw error;
    }
  }

  private static buildPrompt(
    context: GenerationContext,
    systemPrompt: string
  ): vscode.LanguageModelChatMessage[] {
    const messages: vscode.LanguageModelChatMessage[] = [];

    // Base system prompt
    let prompt = systemPrompt;

    // Add style-specific instructions
    const styleInstructions = this.getStyleInstructions(context.style, context.useGitmojis);
    prompt += '\n\n' + styleInstructions;

    // Add body generation instructions
    if (context.includeBody && context.stats.filesChanged >= 5) {
      prompt += '\n\nThis is a complex change with multiple files. Include a detailed body explaining the changes.';
    } else {
      prompt += '\n\nGenerate ONLY the subject line, no body needed.';
    }

    // Add recent commits context
    if (context.recentCommits.length > 0) {
      prompt += '\n\nRecent commits for context (follow similar style):\n';
      prompt += context.recentCommits.slice(0, 5).join('\n');
    }

    // Add stats context
    prompt += `\n\nChange statistics: ${context.stats.filesChanged} files, ${context.stats.insertions} insertions(+), ${context.stats.deletions} deletions(-)`;

    messages.push(vscode.LanguageModelChatMessage.User(prompt));

    // Add the git diff
    // Truncate if too long (rough estimate: 1 token ≈ 4 characters)
    const maxDiffLength = 15000; // Conservative limit
    let diff = context.diff;
    if (diff.length > maxDiffLength) {
      diff = diff.substring(0, maxDiffLength) + '\n\n[Diff truncated due to length...]';
    }

    messages.push(vscode.LanguageModelChatMessage.User(`Git diff:\n${diff}`));

    return messages;
  }

  private static getStyleInstructions(style: CommitStyle, useGitmojis: boolean): string {
    const emojiPrefix = useGitmojis ? '✨ ' : '';
    
    const styleRules: Record<CommitStyle, string> = {
      conventional: `Use Conventional Commits format: ${emojiPrefix}type: subject
- Types: feat, fix, perf, docs, refactor, test, chore
${useGitmojis ? '- Add appropriate emoji before the type' : ''}`,

      angular: `Use Angular/Google format: ${emojiPrefix}type(scope): subject
- type(scope): short description
- Example: ${emojiPrefix}feat(auth): add login functionality
${useGitmojis ? '- Add emoji before type(scope)' : ''}`,

      atom: `Use Atom Editor format: :emoji: subject
- Start with an emoji that represents the change
- Example: :sparkles: Add new feature
- Keep it simple and expressive`,

      eslint: `Use ESLint format: Tag: Subject
- Tag: Build, Chore, Docs, Feat, Fix, Perf, Test, etc.
- Capitalize the tag
- Example: Feat: Add new rule`,

      jquery: `Use jQuery format: Component: Subject
- Component: What part of the code changed
- Keep it short and clear
- Example: Core: Fix selector bug`,

      ember: `Use Ember.js format: [TAG] subject
- TAG in brackets: [FEATURE], [BUGFIX], [DOC], [CLEANUP]
- Example: [FEATURE] Add computed property`,

      linux: `Use Linux Kernel format: subsystem: subject
- subsystem: area of code (e.g., net, fs, drivers)
- Lowercase, no brackets
- Example: net: fix tcp connection bug`,

      symfony: `Use Symfony format: [Type] Subject
- [Type] in brackets: [Feature], [Bugfix], [Minor], etc.
- Example: [Feature] Add new console command`,

      rails: `Use Ruby on Rails format: [tag] subject
- [tag]: [FEATURE], [FIX], [DOC], [CHORE]
- Example: [FEATURE] Add user authentication`,

      graphql: `Use GraphQL format: subject (type)
- Description followed by type in parentheses
- Example: Add user query (feat)`,

      docker: `Use Docker format: scope: subject
- scope: area/component affected
- Lowercase scope
- Example: builder: fix cache issue`,

      karma: `Use Karma Runner format: ${emojiPrefix}type(scope): subject
- type(scope): description
- Example: ${emojiPrefix}feat(config): add env support
${useGitmojis ? '- Include appropriate emoji' : ''}`,

      semantic: `Use Semantic Versioning format: ${emojiPrefix}type: subject (closes #X)
- Include issue reference when applicable
- Example: ${emojiPrefix}fix: resolve memory leak (closes #123)
${useGitmojis ? '- Add emoji for visual clarity' : ''}`,

      plain: `Use Plain Simple format: Subject
- Just a clear description of the change
- No prefixes, no special formatting
- Example: Fix login redirect bug`,

      bitbucket: `Use Bitbucket format: PROJECT-123: subject
- Start with JIRA issue key
- Example: PROJ-456: Add user dashboard
- Or without issue: Subject only`,
    };

    return styleRules[style] || styleRules.conventional;
  }

  private static parseCommitMessage(fullMessage: string): CommitMessage {
    const lines = fullMessage.split('\n');
    
    if (lines.length === 1) {
      // Only subject line
      return { subject: this.cleanSubject(lines[0]) };
    }

    // Find the subject line (first non-empty line)
    let subjectIndex = 0;
    while (subjectIndex < lines.length && lines[subjectIndex].trim() === '') {
      subjectIndex++;
    }

    const subject = this.cleanSubject(lines[subjectIndex]);
    
    // The rest is the body (skip empty lines after subject)
    let bodyStart = subjectIndex + 1;
    while (bodyStart < lines.length && lines[bodyStart].trim() === '') {
      bodyStart++;
    }

    const body = bodyStart < lines.length 
      ? lines.slice(bodyStart).join('\n').trim()
      : undefined;

    return { subject, body };
  }

  private static cleanSubject(subject: string): string {
    // Remove quotes if present
    return subject
      .replace(/^["']|["']$/g, '')
      .replace(/^\s+|\s+$/g, '')
      .substring(0, 72); // Ensure max length
  }

  private static handleLMError(error: vscode.LanguageModelError): Error {
    const translation = ConfigManager.getTranslation();
    
    if (error.cause instanceof Error) {
      const causeMessage = error.cause.message;
      
      if (causeMessage.includes('off_topic')) {
        return new Error('The changes are not suitable for commit message generation');
      }
      
      if (causeMessage.includes('rate_limit')) {
        return new Error(translation.messages.rateLimited);
      }
      
      if (causeMessage.includes('consent')) {
        return new Error(translation.messages.llmConsentRequired);
      }
    }

    return new Error(`${translation.messages.error.replace('{0}', error.message)}`);
  }
}
