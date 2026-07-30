import * as vscode from 'vscode';
import { registerCommands } from './commands';
import { registerConfigCommands } from './config-commands';
import { GitManager } from './git';
import { ConfigManager } from './config';
import { LLMManager } from './llm';
import { LogManager } from './logger';
import { NotificationManager } from './notifications';

const EXTENSION_SETTINGS_QUERY = '@ext:m1n.vscode-llm-api-git-commit-generator';

export async function activate(context: vscode.ExtensionContext) {
  LogManager.initialize(context);

  try {
    // Initialize internal state (with migration of legacy settings keys)
    await ConfigManager.initialize(context);
    const translation = ConfigManager.getTranslation();
    LLMManager.initialize(context);

    // Check if Git is available
    const isGitAvailable = await GitManager.isGitAvailable();
    if (!isGitAvailable) {
      LogManager.warn('Git is not available on PATH');
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

    LogManager.info('Extension activated');
  } catch (error) {
    NotificationManager.showError(
      ConfigManager.getTranslation().messages.activationFailed,
      'Extension activation failed',
      error
    );
  }
}

export function deactivate() {
  LogManager.dispose();
}
