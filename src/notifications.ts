import * as vscode from 'vscode';
import { ConfigManager } from './config';
import { LogManager } from './logger';

export class NotificationManager {
  private static pendingErrors = new Set<string>();

  static showError(message: string, logMessage: string, error?: unknown): void {
    LogManager.error(logMessage, error);
    if (this.pendingErrors.has(message)) {
      return;
    }
    this.pendingErrors.add(message);

    const openLogs = ConfigManager.getTranslation().messages.openLogs;
    void vscode.window.showErrorMessage(message, openLogs).then((selection) => {
      this.pendingErrors.delete(message);
      if (selection === openLogs) {
        LogManager.show();
      }
    });
  }
}
