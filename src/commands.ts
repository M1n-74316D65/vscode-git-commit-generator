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

        // Show progress notification
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: translation.messages.generating,
            cancellable: false,
          },
          async (progress) => {
            // Get configuration
            const config = ConfigManager.getConfig();
            const language = ConfigManager.getLanguage();

            // Get recent commits for context
            progress.report({ increment: 20, message: 'Analyzing commit history...' });
            const recentCommits = await gitManager.getRecentCommits(config.recentCommitsCount);

            // Build generation context
            const context: GenerationContext = {
              diff: diff.content,
              language,
              style: config.style,
              recentCommits,
              includeBody: config.includeBody && diff.stats.filesChanged >= config.bodyThreshold,
              stats: diff.stats,
            };

            // Generate commit message
            progress.report({ increment: 40, message: 'Generating message...' });
            const commitMessage = await LLMManager.generateCommitMessage(context);

            if (!commitMessage) {
              throw new Error('Failed to generate commit message');
            }

            // Format the final message
            let fullMessage = commitMessage.subject;
            if (commitMessage.body) {
              fullMessage += '\n\n' + commitMessage.body;
            }

            // Set the message in the Git input box
            progress.report({ increment: 30, message: 'Setting message...' });
            const success = await gitManager.setCommitMessage(fullMessage);

            if (!success) {
              throw new Error('Failed to set commit message in Git input box');
            }

            progress.report({ increment: 10, message: 'Done!' });
          }
        );

        // Show success message
        vscode.window.showInformationMessage(translation.messages.generated);

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
