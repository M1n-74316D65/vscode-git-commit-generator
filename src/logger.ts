import * as vscode from 'vscode';

const OUTPUT_CHANNEL_NAME = 'Git Commit Generator';

export class LogManager {
  private static channel: vscode.OutputChannel | undefined;

  static initialize(context: vscode.ExtensionContext): void {
    if (this.channel) {
      return;
    }

    this.channel = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
    context.subscriptions.push(this.channel);
    context.subscriptions.push(
      vscode.commands.registerCommand('git-commit-generator.showLogs', () => {
        this.show();
      })
    );
  }

  static info(message: string): void {
    this.write('INFO', message);
  }

  static warn(message: string): void {
    this.write('WARN', message);
  }

  static error(message: string, error?: unknown): void {
    const errorSummary = error === undefined ? '' : ` (${this.describeError(error)})`;
    this.write('ERROR', `${message}${errorSummary}`);
  }

  static show(): void {
    this.channel?.show(true);
  }

  static dispose(): void {
    this.channel?.dispose();
    this.channel = undefined;
  }

  private static write(level: string, message: string): void {
    this.channel?.appendLine(`[${new Date().toISOString()}] [${level}] ${message}`);
  }

  private static describeError(error: unknown): string {
    if (error instanceof vscode.LanguageModelError) {
      return `${error.name}:${error.code}`;
    }
    if (error instanceof Error) {
      const code = (error as NodeJS.ErrnoException).code;
      return code ? `${error.name}:${code}` : error.name;
    }
    return typeof error;
  }
}
