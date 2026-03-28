import * as vscode from 'vscode';
import { ExtensionConfig } from './types';
import { getTranslation } from './i18n';

export class ConfigManager {
  static getConfig(): ExtensionConfig {
    const config = vscode.workspace.getConfiguration('gitCommitGenerator');
    
    return {
      language: config.get<string>('language', 'auto') as ExtensionConfig['language'],
      style: config.get<string>('style', 'gitmoji-conventional') as ExtensionConfig['style'],
      includeBody: config.get<boolean>('includeBody', true),
      bodyThreshold: config.get<number>('bodyThreshold', 5),
      recentCommitsCount: config.get<number>('recentCommitsCount', 10),
      modelFamily: config.get<string>('modelFamily', 'gpt-4o') as ExtensionConfig['modelFamily'],
      useCopilot: config.get<boolean>('useCopilot', true),
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
    
    const supported = ['en', 'es'];
    return supported.includes(baseLang) ? baseLang : 'en';
  }

  static getTranslation() {
    const lang = this.getLanguage();
    return getTranslation(lang);
  }
}
