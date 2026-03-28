import * as vscode from 'vscode';
import { registerCommands } from './commands';
import { registerConfigCommands } from './config-commands';
import { StatusBarManager } from './status-bar';
import { GitManager } from './git';

export async function activate(context: vscode.ExtensionContext) {
  try {
    // Check if Git is available
    const isGitAvailable = await GitManager.isGitAvailable();
    if (!isGitAvailable) {
      vscode.window.showWarningMessage(
        'Git Commit Generator: Git is not available in your system PATH. Some features may not work.',
        'Open Settings'
      ).then(selection => {
        if (selection === 'Open Settings') {
          vscode.commands.executeCommand('workbench.action.openSettings', '@ext:m1n.vscode-git-commit-generator');
        }
      });
    }

    // Register main command
    registerCommands(context);

    // Register config commands
    registerConfigCommands(context);

    // Initialize status bar
    StatusBarManager.initialize(context);

    // Welcome message for first-time users
    const config = vscode.workspace.getConfiguration('gitCommitGenerator');
    const hasShownWelcome = config.get<boolean>('hasShownWelcome', false);
    
    if (!hasShownWelcome) {
      const result = await vscode.window.showInformationMessage(
        'Git Commit Generator is ready! Generate commit messages with AI using the sparkle button in the Source Control panel.',
        'Open Settings',
        'Generate a Commit',
        'Got it'
      );
      
      if (result === 'Open Settings') {
        await vscode.commands.executeCommand(
          'workbench.action.openSettings',
          '@ext:m1n.vscode-git-commit-generator'
        );
      } else if (result === 'Generate a Commit') {
        await vscode.commands.executeCommand('git-commit-generator.generate');
      }
      
      await config.update('hasShownWelcome', true, true);
    }

    // Set up configuration change listener for status bar
    const configChangeDisposable = vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('gitCommitGenerator')) {
        StatusBarManager.update();
      }
    });
    context.subscriptions.push(configChangeDisposable);

  } catch (error) {
    console.error('❌ Error registering commands:', error);
    vscode.window.showErrorMessage(
      'Git Commit Generator failed to activate. Check the Debug Console for details.'
    );
  }
}

export function deactivate() {
  StatusBarManager.dispose();
}
