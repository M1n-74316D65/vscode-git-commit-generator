import * as vscode from 'vscode';
import { ConfigManager } from './config';

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

    context.subscriptions.push(gitWatcher);

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

    this.statusBarItem.text = `$(git-commit) ${styleName} ${gitmojiIcon}`;
    this.statusBarItem.tooltip = `Click to change commit style\nCurrent: ${styleName}\nGitmojis: ${config.useGitmojis ? 'ON' : 'OFF'}`;
  }

  static updateVisibility(): void {
    if (!this.statusBarItem) {
      return;
    }

    // Only show if there's a git repository
    const hasGitRepo = vscode.workspace.workspaceFolders?.some(
      folder => folder.uri.scheme === 'file'
    ) ?? false;

    if (hasGitRepo) {
      this.statusBarItem.show();
    } else {
      this.statusBarItem.hide();
    }
  }

  static dispose(): void {
    this.statusBarItem?.dispose();
    this.statusBarItem = undefined;
  }
}
