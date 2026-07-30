import * as vscode from 'vscode';
import { GitManager } from './git';
import { LLMManager } from './llm';
import { ConfigManager } from './config';
import { GenerationContext } from './types';
import { LogManager } from './logger';
import { NotificationManager } from './notifications';

export type GenerationScope = 'auto' | 'staged' | 'all';

// Single-flight lock: only one generation may run at a time
let generationInProgress = false;

/**
 * Try to acquire the single-flight generation lock.
 */
export function tryAcquireGenerationLock(): boolean {
  if (generationInProgress) {
    return false;
  }
  generationInProgress = true;
  return true;
}

/**
 * Release the single-flight generation lock.
 */
export function releaseGenerationLock(): void {
  generationInProgress = false;
}

/**
 * Resolve an 'auto' scope to a concrete scope based on whether
 * there are staged changes.
 */
export function resolveScope(
  requested: GenerationScope,
  hasStagedChanges: boolean
): 'staged' | 'all' {
  if (requested !== 'auto') {
    return requested;
  }
  return hasStagedChanges ? 'staged' : 'all';
}

export function registerCommands(context: vscode.ExtensionContext): void {
  const runGenerate = async (scope: GenerationScope): Promise<void> => {
    const translation = ConfigManager.getTranslation();

    if (!tryAcquireGenerationLock()) {
      vscode.window.showInformationMessage(translation.messages.alreadyInProgress);
      return;
    }

    try {
      const repositoryRoots = await GitManager.findGitRepositories();
      if (repositoryRoots.length === 0) {
        vscode.window.showWarningMessage(translation.messages.noGitRepository);
        return;
      }

      let gitRoot = GitManager.resolveRepositoryRoot(
        repositoryRoots,
        vscode.window.activeTextEditor?.document.uri
      );

      if (!gitRoot) {
        const selected = await vscode.window.showQuickPick(
          repositoryRoots.map((root) => ({
            label: vscode.workspace.getWorkspaceFolder(vscode.Uri.file(root))?.name ?? root,
            description: root,
            root,
          })),
          {
            title: translation.messages.selectRepositoryTitle,
            placeHolder: translation.messages.selectRepository,
            ignoreFocusOut: true,
          }
        );
        if (!selected) {
          return;
        }
        gitRoot = selected.root;
      }

      const gitManager = new GitManager(gitRoot);
      const config = ConfigManager.getConfig();

      // Resolve the effective scope (auto prefers staged changes)
      let effectiveScope: 'staged' | 'all';
      let diff;
      if (scope === 'auto') {
        const stagedDiff = await gitManager.getDiff('staged', config.excludeFiles);
        if (stagedDiff) {
          effectiveScope = 'staged';
          diff = stagedDiff;
        } else {
          effectiveScope = 'all';
          diff = await gitManager.getDiff('all', config.excludeFiles);
        }
      } else {
        effectiveScope = scope;
        diff = await gitManager.getDiff(effectiveScope, config.excludeFiles);
      }

      if (!diff) {
        vscode.window.showWarningMessage(
          effectiveScope === 'staged'
            ? translation.messages.noStagedChanges
            : translation.messages.noChanges
        );
        return;
      }

      // Outer spinner in the Source Control view, inner cancellable notification
      const commitMessage = await vscode.window.withProgress(
        { location: vscode.ProgressLocation.SourceControl },
        async () =>
          vscode.window.withProgress(
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

              const language = ConfigManager.getLanguage();

              // Get recent commits for context
              progress.report({ increment: 15, message: translation.messages.analyzingHistory });
              const recentCommits = await gitManager.getRecentCommits(config.recentCommitsCount);

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
              const result = await LLMManager.generateCommitMessage(
                generationContext,
                progress,
                token
              );
              if (token.isCancellationRequested) {
                return undefined;
              }

              return result;
            }
          )
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

      LogManager.info('Commit message generated and written to the SCM input');

    } catch (error) {
      NotificationManager.showError(
        translation.messages.error,
        'Generate command failed',
        error
      );
    } finally {
      releaseGenerationLock();
    }
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('git-commit-generator.generate', () => runGenerate('auto')),
    vscode.commands.registerCommand('git-commit-generator.generateStaged', () => runGenerate('staged')),
    vscode.commands.registerCommand('git-commit-generator.generateAll', () => runGenerate('all'))
  );
}
