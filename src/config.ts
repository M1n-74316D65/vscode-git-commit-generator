import * as vscode from 'vscode';
import { ExtensionConfig, CommitStyle } from './types';
import { getTranslation } from './i18n';

const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja'] as const;

export class ConfigManager {
  private static globalState: vscode.Memento | undefined;

  /**
   * Store the extension globalState for internal (non-settings) persistence.
   * Migrates values previously written to workspace configuration.
   */
  static initialize(context: vscode.ExtensionContext): void {
    this.globalState = context.globalState;

    const config = vscode.workspace.getConfiguration('gitCommitGenerator');

    // One-time migration: modelId used to live in settings.json
    const legacyModelId = config.get<string | null>('modelId', null);
    if (legacyModelId && !this.globalState.get('modelId')) {
      void this.globalState.update('modelId', legacyModelId);
    }
    if (config.inspect('modelId')?.globalValue !== undefined) {
      void config.update('modelId', undefined, true);
    }

    // One-time migration: hasShownWelcome used to live in settings.json
    const legacyWelcome = config.get<boolean | undefined>('hasShownWelcome', undefined);
    if (legacyWelcome !== undefined && this.globalState.get('hasShownWelcome') === undefined) {
      void this.globalState.update('hasShownWelcome', legacyWelcome);
    }
    if (config.inspect('hasShownWelcome')?.globalValue !== undefined) {
      void config.update('hasShownWelcome', undefined, true);
    }
  }

  static getModelId(): string | undefined {
    return this.globalState?.get<string>('modelId');
  }

  static async setModelId(modelId: string): Promise<void> {
    await this.globalState?.update('modelId', modelId);
  }

  static hasShownWelcome(): boolean {
    return this.globalState?.get<boolean>('hasShownWelcome') ?? false;
  }

  static async setWelcomeShown(): Promise<void> {
    await this.globalState?.update('hasShownWelcome', true);
  }

  static getConfig(): ExtensionConfig {
    const config = vscode.workspace.getConfiguration('gitCommitGenerator');
    
    return {
      language: config.get<string>('language', 'auto') as ExtensionConfig['language'],
      style: config.get<string>('style', 'conventional') as CommitStyle,
      useGitmojis: config.get<boolean>('useGitmojis', true),
      includeBody: config.get<boolean>('includeBody', true),
      bodyThreshold: config.get<number>('bodyThreshold', 5),
      recentCommitsCount: config.get<number>('recentCommitsCount', 10),
      excludeFiles: (config.get<unknown[]>('excludeFiles', []) ?? []).filter(
        (pattern): pattern is string => typeof pattern === 'string'
      ),
      modelFamily: config.get<string>('modelFamily', 'gpt-4o') as ExtensionConfig['modelFamily'],
    };
  }

  static getLanguage(): string {
    const config = this.getConfig();
    
    if (config.language !== 'auto') {
      return config.language;
    }
    
    // Auto-detect from VS Code locale
    const locale = vscode.env.language;
    const baseLang = locale.split('-')[0];
    
    return SUPPORTED_LANGUAGES.includes(baseLang as typeof SUPPORTED_LANGUAGES[number])
      ? baseLang
      : 'en';
  }

  static getTranslation() {
    const lang = this.getLanguage();
    return getTranslation(lang);
  }
}
