import * as vscode from 'vscode';
import { ConfigManager } from './config';
import { GitManager } from './git';

export class StatusBarManager {
  private static statusBarItem: vscode.StatusBarItem | undefined;

  static initialize(context: vscode.ExtensionContext): void {
    // Create status bar item
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );

    // Set command to open style selector on click
    this.statusBarItem.command = 'git-commit-generator.selectStyle';

    // Initial update
    this.update();

    // Add to subscriptions
    context.subscriptions.push(this.statusBarItem);

    // Listen for configuration changes
    const configChangeDisposable = vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('gitCommitGenerator')) {
        this.update();
      }
    });

    context.subscriptions.push(configChangeDisposable);

    // Show/hide based on git repository
    const gitWatcher = vscode.workspace.onDidChangeWorkspaceFolders(() => {
      this.updateVisibility();
    });

    const activeEditorWatcher = vscode.window.onDidChangeActiveTextEditor(() => {
      this.updateVisibility();
    });

    context.subscriptions.push(gitWatcher, activeEditorWatcher);

    // Initial visibility check
    this.updateVisibility();
  }

  static update(): void {
    if (!this.statusBarItem) {
      return;
    }

    const config = ConfigManager.getConfig();
    const translation = ConfigManager.getTranslation();

    const styleName = translation.styles[config.style];
    const gitmojiIcon = config.useGitmojis ? '✨' : '⭕';
    const gitmojiStatus = config.useGitmojis
      ? translation.messages.enabledLabel
      : translation.messages.disabledLabel;

    this.statusBarItem.text = `$(git-commit) ${styleName} ${gitmojiIcon}`;
    this.statusBarItem.tooltip = translation.messages.statusBarTooltip
      .replace('{0}', styleName)
      .replace('{1}', gitmojiStatus);
  }

  static updateVisibility(): void {
    if (!this.statusBarItem) {
      return;
    }

    void GitManager.hasGitRepository().then((hasGitRepo) => {
      if (!this.statusBarItem) {
        return;
      }

      if (hasGitRepo) {
        this.statusBarItem.show();
      } else {
        this.statusBarItem.hide();
      }
    });
  }

  static dispose(): void {
    this.statusBarItem?.dispose();
    this.statusBarItem = undefined;
  }
}
