import * as vscode from 'vscode';
import { GitManager } from './git';
import { LLMManager } from './llm';
import { ConfigManager } from './config';
import { GenerationContext } from './types';

export function registerCommands(context: vscode.ExtensionContext): void {
  const disposable = vscode.commands.registerCommand(
    'git-commit-generator.generate',
    async () => {
      const translation = ConfigManager.getTranslation();

      try {
        // Check for Git repository
        const gitRoot = await GitManager.findGitRepository();
        if (!gitRoot) {
          vscode.window.showWarningMessage(translation.messages.noGitRepository);
          return;
        }

        const gitManager = new GitManager(gitRoot);

        // Check for staged changes
        const diff = await gitManager.getStagedDiff();
        if (!diff) {
          vscode.window.showWarningMessage(translation.messages.noStagedChanges);
          return;
        }

        // Show progress notification with detailed steps
        const commitMessage = await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: translation.messages.generating,
            cancellable: true,
          },
          async (progress, token) => {
            // Setup cancellation
            if (token.isCancellationRequested) {
              return undefined;
            }

            // Get configuration
            const config = ConfigManager.getConfig();
            const language = ConfigManager.getLanguage();

            // Get recent commits for context (parallel with other operations)
            progress.report({ increment: 15, message: 'Analyzing commit history...' });
            const [recentCommits] = await Promise.all([
              gitManager.getRecentCommits(config.recentCommitsCount),
            ]);

            if (token.isCancellationRequested) {
              return undefined;
            }

            // Build generation context
            const generationContext: GenerationContext = {
              diff: diff.content,
              language,
              style: config.style,
              useGitmojis: config.useGitmojis,
              recentCommits,
              includeBody: config.includeBody && diff.stats.filesChanged >= config.bodyThreshold,
              stats: diff.stats,
            };

            // Generate commit message with progress reporting
            const result = await LLMManager.generateCommitMessage(generationContext, progress);

            if (token.isCancellationRequested) {
              return undefined;
            }

            return result;
          }
        );

        if (!commitMessage) {
          return;
        }

        // Format the final message
        let fullMessage = commitMessage.subject;
        if (commitMessage.body) {
          fullMessage += '\n\n' + commitMessage.body;
        }

        // Set the message in the Git input box
        const success = await gitManager.setCommitMessage(fullMessage);

        if (!success) {
          throw new Error('Failed to set commit message in Git input box');
        }

        // Show success message with details
        const details = commitMessage.body
          ? `${commitMessage.subject} (+ body)`
          : commitMessage.subject;
        vscode.window.showInformationMessage(
          `${translation.messages.generated} ${details.substring(0, 50)}${details.length > 50 ? '...' : ''}`
        );

      } catch (error) {
        console.error('Error in generate command:', error);

        let errorMessage = translation.messages.error;
        if (error instanceof Error) {
          errorMessage = errorMessage.replace('{0}', error.message);
        }

        vscode.window.showErrorMessage(errorMessage);
      }
    }
  );

  context.subscriptions.push(disposable);
}
