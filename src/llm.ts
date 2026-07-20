import * as vscode from 'vscode';
import { GenerationContext, CommitMessage, CommitStyle } from './types';
import { ConfigManager } from './config';

// Constants
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const MODEL_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const APPROX_CHARS_PER_TOKEN = 4;
// Chars reserved for the prompt template (system prompt, instructions, stats)
const PROMPT_TEMPLATE_HEADROOM_CHARS = 8000;
const MIN_DIFF_CHARS = 2000;

interface CachedModels {
  models: vscode.LanguageModelChat[];
  timestamp: number;
}

export class LLMManager {
  private static modelCache: CachedModels | null = null;

  /**
   * Generate a commit message using VS Code's Language Model API
   */
  static async generateCommitMessage(
    context: GenerationContext,
    progress?: vscode.Progress<{ message?: string; increment?: number }>,
    cancellationToken?: vscode.CancellationToken
  ): Promise<CommitMessage | undefined> {
    const translation = ConfigManager.getTranslation();

    try {
      progress?.report({ increment: 10, message: translation.messages.analyzingModel });

      // Get available model with fallback strategy
      const model = await this.getAvailableModel();
      if (!model) {
        throw new Error(translation.messages.noModelsAvailable);
      }

      progress?.report({ increment: 20, message: translation.messages.buildingPrompt });

      // Derive the diff truncation limit from the model's input window
      const maxDiffChars = Math.max(
        MIN_DIFF_CHARS,
        model.maxInputTokens * APPROX_CHARS_PER_TOKEN - PROMPT_TEMPLATE_HEADROOM_CHARS
      );
      if (context.diff.length > maxDiffChars) {
        console.warn(
          `Diff length ${context.diff.length} exceeds derived limit ${maxDiffChars} chars, truncating`
        );
        void vscode.window.showWarningMessage(translation.messages.diffTooLarge);
      }

      // Build the prompt
      const messages = this.buildPrompt(context, translation.systemPrompt, maxDiffChars);

      progress?.report({ increment: 30, message: translation.messages.generating });

      // Send request with retry logic
      const fullMessage = await this.sendRequestWithRetry(model, messages, cancellationToken);

      progress?.report({ increment: 30, message: translation.messages.parsingResponse });

      // Parse the response
      const commitMessage = this.parseCommitMessage(fullMessage.trim());

      progress?.report({ increment: 10, message: translation.messages.done });

      return commitMessage;
    } catch (error) {
      if (this.isCancellation(error, cancellationToken)) {
        return undefined;
      }
      this.handleGenerationError(error);
      return undefined;
    }
  }

  /**
   * Check whether an error represents user cancellation
   */
  private static isCancellation(error: unknown, token?: vscode.CancellationToken): boolean {
    return error instanceof vscode.CancellationError || Boolean(token?.isCancellationRequested);
  }

  /**
   * Get available model with intelligent fallback strategy
   */
  private static async getAvailableModel(): Promise<vscode.LanguageModelChat | null> {
    const config = vscode.workspace.getConfiguration('gitCommitGenerator');
    const preferredFamily = config.get<string>('modelFamily', 'gpt-4o');
    const preferredId = ConfigManager.getModelId();

    // Check cache first
    if (this.modelCache && Date.now() - this.modelCache.timestamp < MODEL_CACHE_TTL_MS) {
      const cached = this.modelCache.models.find(m => {
        if (preferredId) return m.id === preferredId;
        if (preferredFamily) return m.family === preferredFamily;
        return true;
      });
        if (cached) {
        return cached;
      }
    }

    try {
      // Strategy 1: Try preferred model by ID
      if (preferredId) {
        const models = await vscode.lm.selectChatModels({ id: preferredId });
        if (models.length > 0) {
          this.cacheModels(models);
          return models[0];
        }
      }

      // Strategy 2: Try preferred model by family
      if (preferredFamily) {
        const models = await vscode.lm.selectChatModels({ family: preferredFamily });
        if (models.length > 0) {
          this.cacheModels(models);
          return models[0];
        }
      }

      // Strategy 3: Get any available model
      const models = await vscode.lm.selectChatModels({});
      if (models.length > 0) {
        this.cacheModels(models);
        return models[0];
      }

      return null;
    } catch (error) {
      console.error('Error selecting chat models:', error);
      return null;
    }
  }

  /**
   * Cache available models
   */
  static cacheModels(models: vscode.LanguageModelChat[]): void {
    this.modelCache = {
      models,
      timestamp: Date.now()
    };
  }

  /**
   * Clear model cache
   */
  static clearModelCache(): void {
    this.modelCache = null;
  }

  /**
   * Send request with retry logic
   */
  private static async sendRequestWithRetry(
    model: vscode.LanguageModelChat,
    messages: vscode.LanguageModelChatMessage[],
    cancellationToken?: vscode.CancellationToken
  ): Promise<string> {
    const translation = ConfigManager.getTranslation();
    let currentRetryAttempt = 0;

    while (currentRetryAttempt < MAX_RETRIES) {
      try {
        const response = await model.sendRequest(
          messages,
          {},
          cancellationToken
        );

        // Collect the response
        let fullMessage = '';
        for await (const fragment of response.text) {
          fullMessage += fragment;
        }

        return fullMessage;
      } catch (error) {
        if (this.isCancellation(error, cancellationToken)) {
          throw error;
        }

        // Only retry retryable LanguageModelErrors; rethrow everything else
        if (!(error instanceof vscode.LanguageModelError) || !this.isRetryableError(error)) {
          throw error;
        }

        currentRetryAttempt++;
        if (currentRetryAttempt >= MAX_RETRIES) {
          throw error;
        }

        // Wait before retrying
        await this.delay(RETRY_DELAY_MS * currentRetryAttempt);
      }
    }

    throw new Error(translation.messages.maxRetriesExceeded);
  }

  /**
   * Check if error is retryable (rate limits, timeouts, temporary server errors)
   */
  private static isRetryableError(error: vscode.LanguageModelError): boolean {
    if (error.cause instanceof Error) {
      const causeMessage = error.cause.message.toLowerCase();
      return (
        causeMessage.includes('rate_limit') ||
        causeMessage.includes('timeout') ||
        causeMessage.includes('temporarily') ||
        causeMessage.includes('503') ||
        causeMessage.includes('502') ||
        causeMessage.includes('504')
      );
    }
    // Fallback to the error's own message when there is no cause
    const message = (error.message || '').toLowerCase();
    return (
      message.includes('rate_limit') ||
      message.includes('timeout') ||
      message.includes('temporarily') ||
      message.includes('503') ||
      message.includes('502') ||
      message.includes('504')
    );
  }

  /**
   * Delay utility
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Build the prompt for the LLM
   */
  private static buildPrompt(
    context: GenerationContext,
    systemPrompt: string,
    maxDiffChars: number
  ): vscode.LanguageModelChatMessage[] {
    const messages: vscode.LanguageModelChatMessage[] = [];

    // Build system prompt with style and configuration
    let prompt = systemPrompt;

    // Add style-specific instructions
    const styleInstructions = this.getStyleInstructions(context.style, context.useGitmojis);
    prompt += '\n\n' + styleInstructions;

    // Add body generation instructions
    if (context.language === 'es') {
      prompt += '\n\nWrite the commit message in Spanish.';
    } else {
      prompt += '\n\nWrite the commit message in English.';
    }

    if (context.includeBody) {
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

    // Add the git diff (truncate if necessary)
    let diff = context.diff;
    if (diff.length > maxDiffChars) {
      diff = diff.substring(0, maxDiffChars) + '\n\n[Diff truncated due to length...]';
    }

    messages.push(vscode.LanguageModelChatMessage.User(`Git diff:\n${diff}`));

    return messages;
  }

  /**
   * Get style-specific instructions
   */
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

  /**
   * Parse the LLM response into a CommitMessage
   */
  static parseCommitMessage(fullMessage: string): CommitMessage {
    const lines = fullMessage.split('\n');

    if (lines.length === 1) {
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

  /**
   * Clean the subject line
   */
  static cleanSubject(subject: string): string {
    return subject
      .replace(/^\s+|\s+$/g, '')
      .replace(/^["']|["']$/g, '');
  }

  /**
   * Handle generation errors with user-friendly messages
   */
  private static handleGenerationError(error: unknown): void {
    const translation = ConfigManager.getTranslation();
    let errorMessage = translation.messages.error;

    if (error instanceof vscode.LanguageModelError) {
      errorMessage = this.handleLMError(error);
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    console.error('Error generating commit message:', error);
    vscode.window.showErrorMessage(errorMessage);
  }

  /**
   * Handle Language Model specific errors
   */
  private static handleLMError(error: vscode.LanguageModelError): string {
    const translation = ConfigManager.getTranslation();

    // Primary classification via the error code
    switch (error.code) {
      case vscode.LanguageModelError.NoPermissions().code:
        return translation.messages.llmConsentRequired;
      case vscode.LanguageModelError.Blocked().code:
        return translation.messages.offTopicError;
      case vscode.LanguageModelError.NotFound().code:
        return translation.messages.noModelsAvailable;
    }

    // Fallback: substring matching on the cause message
    if (error.cause instanceof Error) {
      const causeMessage = error.cause.message.toLowerCase();

      if (causeMessage.includes('off_topic')) {
        return translation.messages.offTopicError;
      }

      if (causeMessage.includes('rate_limit')) {
        return translation.messages.rateLimited;
      }

      if (causeMessage.includes('consent')) {
        return translation.messages.llmConsentRequired;
      }

      if (causeMessage.includes('quota')) {
        return translation.messages.quotaExceeded;
      }
    }

    return translation.messages.error.replace('{0}', error.message);
  }
}
