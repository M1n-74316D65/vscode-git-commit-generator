import * as vscode from 'vscode';
import { registerCommands } from './commands';
import { registerConfigCommands } from './config-commands';
import { StatusBarManager } from './status-bar';
import { GitManager } from './git';
import { ConfigManager } from './config';

const EXTENSION_SETTINGS_QUERY = '@ext:m1n.vscode-llm-api-git-commit-generator';

export async function activate(context: vscode.ExtensionContext) {
  const translation = ConfigManager.getTranslation();

  try {
    // Check if Git is available
    const isGitAvailable = await GitManager.isGitAvailable();
    if (!isGitAvailable) {
      vscode.window.showWarningMessage(
        translation.messages.gitUnavailable,
        translation.messages.openSettings
      ).then(selection => {
        if (selection === translation.messages.openSettings) {
          vscode.commands.executeCommand('workbench.action.openSettings', EXTENSION_SETTINGS_QUERY);
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
      void vscode.window.showInformationMessage(
        translation.messages.welcomeReady,
        translation.messages.openSettings,
        translation.messages.generateCommitAction,
        translation.messages.gotIt
      ).then(async (result) => {
        if (result === translation.messages.openSettings) {
          await vscode.commands.executeCommand(
            'workbench.action.openSettings',
            EXTENSION_SETTINGS_QUERY
          );
        } else if (result === translation.messages.generateCommitAction) {
          await vscode.commands.executeCommand('git-commit-generator.generate');
        }

        await config.update('hasShownWelcome', true, true);
      });
    }

  } catch (error) {
    console.error('❌ Error registering commands:', error);
    vscode.window.showErrorMessage(
      translation.messages.activationFailed
    );
  }
}

export function deactivate() {
  StatusBarManager.dispose();
}
