import * as vscode from 'vscode';
import { ConfigManager } from './config';
import { LLMManager } from './llm';
import { CommitStyle } from './types';

const EXTENSION_SETTINGS_QUERY = '@ext:m1n.vscode-llm-api-git-commit-generator';

// Style definitions with categories for QuickPick
interface StyleDefinition {
  id: CommitStyle;
  label: string;
  format: string;
  category: string;
  categoryIcon: string;
}

const styles: StyleDefinition[] = [
  // Popular
  { id: 'conventional', label: 'Conventional Commits', format: 'type: description', category: 'popular', categoryIcon: '⭐' },
  { id: 'angular', label: 'Angular/Google', format: 'type(scope): description', category: 'popular', categoryIcon: '⭐' },
  { id: 'atom', label: 'Atom Editor', format: ':emoji: description', category: 'popular', categoryIcon: '⭐' },
  { id: 'eslint', label: 'ESLint', format: 'Tag: Description', category: 'popular', categoryIcon: '⭐' },
  // Framework
  { id: 'ember', label: 'Ember.js', format: '[TAG] short description', category: 'framework', categoryIcon: '🔧' },
  { id: 'graphql', label: 'GraphQL', format: 'description (type)', category: 'framework', categoryIcon: '🔧' },
  { id: 'rails', label: 'Ruby on Rails', format: '[Tag] description', category: 'framework', categoryIcon: '🔧' },
  { id: 'symfony', label: 'Symfony', format: '[Type] Description', category: 'framework', categoryIcon: '🔧' },
  // DevOps & Tools
  { id: 'bitbucket', label: 'Bitbucket', format: 'JIRA-123: description', category: 'devops', categoryIcon: '🛠️' },
  { id: 'docker', label: 'Docker', format: 'scope: description', category: 'devops', categoryIcon: '🛠️' },
  { id: 'karma', label: 'Karma Runner', format: 'type(scope): description', category: 'devops', categoryIcon: '🛠️' },
  // System
  { id: 'jquery', label: 'jQuery', format: 'Component: Short description', category: 'system', categoryIcon: '⚙️' },
  { id: 'linux', label: 'Linux Kernel', format: 'subsystem: description', category: 'system', categoryIcon: '⚙️' },
  // Specialized
  { id: 'semantic', label: 'Semantic Versioning', format: 'type: description (closes #X)', category: 'specialized', categoryIcon: '📋' },
  // Minimal
  { id: 'plain', label: 'Plain Simple', format: 'Description', category: 'minimal', categoryIcon: '✨' },
];

// Group styles by category
function groupStylesByCategory(styles: StyleDefinition[]): Map<string, StyleDefinition[]> {
  const grouped = new Map<string, StyleDefinition[]>();
  const categoryOrder = ['popular', 'framework', 'devops', 'system', 'specialized', 'minimal'];
  
  categoryOrder.forEach(cat => {
    const categoryStyles = styles.filter(s => s.category === cat);
    if (categoryStyles.length > 0) {
      grouped.set(cat, categoryStyles);
    }
  });
  
  return grouped;
}

export function registerConfigCommands(context: vscode.ExtensionContext): void {
  // Command to select language model
  const selectModelDisposable = vscode.commands.registerCommand(
    'git-commit-generator.selectModel',
    async () => {
      const translation = ConfigManager.getTranslation();
      const config = vscode.workspace.getConfiguration('gitCommitGenerator');
      
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: translation.messages.fetchingModels,
          cancellable: false
        },
        async (progress) => {
          try {
            // Get all available models
            const allModels = await vscode.lm.selectChatModels({});
            
            if (allModels.length === 0) {
              const result = await vscode.window.showWarningMessage(
                translation.messages.noModelsWithCopilot,
                translation.messages.installCopilot,
                translation.messages.openSettings
              );
              
              if (result === translation.messages.installCopilot) {
                await vscode.commands.executeCommand(
                  'vscode.open',
                  vscode.Uri.parse('vscode:extension/GitHub.copilot')
                );
              } else if (result === translation.messages.openSettings) {
                await vscode.commands.executeCommand(
                  'workbench.action.openSettings',
                  EXTENSION_SETTINGS_QUERY
                );
              }
              return;
            }

            progress.report({ increment: 50, message: translation.messages.buildingModelList });

            // Map models to QuickPick items
            const modelItems = allModels.map(model => ({
              label: model.name,
              description: `${model.family} by ${model.vendor}`,
              detail: `ID: ${model.id} | Max Input: ${model.maxInputTokens} tokens`,
              model: model,
              picked: model.family === config.get('modelFamily', 'gpt-4o')
            }));

            progress.report({ increment: 50, message: translation.messages.showingModelSelection });

            const selected = await vscode.window.showQuickPick(modelItems, {
              placeHolder: translation.messages.selectLanguageModel,
              title: translation.messages.modelsAvailableTitle.replace('{0}', String(allModels.length)),
              ignoreFocusOut: true,
              matchOnDescription: true,
              matchOnDetail: true
            });

            if (selected) {
              await config.update('modelFamily', selected.model.family, true);
              await config.update('modelId', selected.model.id, true);
              
              vscode.window.showInformationMessage(
                translation.messages.modelSet
                  .replace('{0}', selected.model.name)
                  .replace('{1}', selected.model.family)
              );
            }
          } catch (error) {
            console.error('Error fetching models:', error);
            vscode.window.showErrorMessage(
              translation.messages.errorFetchingModels.replace(
                '{0}',
                error instanceof Error ? error.message : String(error)
              )
            );
          }
        }
      );
    }
  );

  // Command to open settings
  const openSettingsDisposable = vscode.commands.registerCommand(
    'git-commit-generator.openSettings',
    async () => {
      await vscode.commands.executeCommand(
        'workbench.action.openSettings',
        EXTENSION_SETTINGS_QUERY
      );
    }
  );

  // Command to refresh/check available models and open selector
  const refreshModelsDisposable = vscode.commands.registerCommand(
    'git-commit-generator.refreshModels',
    async () => {
      const translation = ConfigManager.getTranslation();
      // Clear the cache first to force fresh model fetch
      LLMManager.clearModelCache();
      
      // First refresh models, then automatically open the selector
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: translation.messages.refreshingModels,
          cancellable: false
        },
        async () => {
          try {
            // Refresh the models (this caches them in VS Code)
            const models = await vscode.lm.selectChatModels({});
            
            if (models.length === 0) {
              const result = await vscode.window.showWarningMessage(
                translation.messages.noModelsWithCopilot,
                translation.messages.installCopilot,
                translation.messages.openSettings
              );
              
              if (result === translation.messages.installCopilot) {
                await vscode.commands.executeCommand(
                  'vscode.open',
                  vscode.Uri.parse('vscode:extension/GitHub.copilot')
                );
              } else if (result === translation.messages.openSettings) {
                await vscode.commands.executeCommand(
                  'workbench.action.openSettings',
                  '@ext:GitHub.copilot'
                );
              }
              return;
            }
            
            // Cache the models
            LLMManager.clearModelCache(); // Clear first
            
            // Success - now open the model selector
            vscode.window.showInformationMessage(
              translation.messages.modelsFoundOpeningSelector.replace('{0}', String(models.length))
            );
          } catch (error) {
            vscode.window.showErrorMessage(
              translation.messages.errorRefreshingModels.replace(
                '{0}',
                error instanceof Error ? error.message : String(error)
              )
            );
            return;
          }
        }
      );
      
      // Open the model selector after refresh completes
      await vscode.commands.executeCommand('git-commit-generator.selectModel');
    }
  );

  // Command to select commit style
  const selectStyleDisposable = vscode.commands.registerCommand(
    'git-commit-generator.selectStyle',
    async () => {
      const config = vscode.workspace.getConfiguration('gitCommitGenerator');
      const currentStyle = config.get<string>('style', 'conventional') as CommitStyle;
      const translation = ConfigManager.getTranslation();
      
      const groupedStyles = groupStylesByCategory(styles);
      const categoryNames: Record<string, string> = {
        popular: translation.categories.popular,
        framework: translation.categories.framework,
        devops: translation.categories.devops,
        system: translation.categories.system,
        specialized: translation.categories.specialized,
        minimal: translation.categories.minimal,
      };
      
      const quickPickItems: (vscode.QuickPickItem & { styleId?: CommitStyle })[] = [];
      
      groupedStyles.forEach((categoryStyles, categoryKey) => {
        // Add category header
        quickPickItems.push({
          label: categoryNames[categoryKey] || categoryKey,
          kind: vscode.QuickPickItemKind.Separator
        });
        
        // Add styles in this category
        categoryStyles.forEach(style => {
          quickPickItems.push({
            label: style.label,
            description: style.format,
            detail: style.id === currentStyle ? `$(check) ${translation.messages.currentStyle.replace('{0}', style.label)}` : '',
            styleId: style.id,
            picked: style.id === currentStyle
          });
        });
      });
      
      const selected = await vscode.window.showQuickPick(quickPickItems, {
        placeHolder: translation.messages.selectStyle,
        title: translation.messages.selectStyleTitle,
        ignoreFocusOut: true,
        matchOnDescription: true
      });
      
      if (selected?.styleId) {
        await config.update('style', selected.styleId, true);
        const styleName = translation.styles[selected.styleId];
        vscode.window.showInformationMessage(
          translation.messages.styleChanged.replace('{0}', styleName)
        );
      }
    }
  );

  // Command to toggle gitmojis
  const toggleGitmojisDisposable = vscode.commands.registerCommand(
    'git-commit-generator.toggleGitmojis',
    async () => {
      const config = vscode.workspace.getConfiguration('gitCommitGenerator');
      const currentValue = config.get<boolean>('useGitmojis', true);
      const translation = ConfigManager.getTranslation();
      
      const newValue = !currentValue;
      await config.update('useGitmojis', newValue, true);
      
      if (newValue) {
        vscode.window.showInformationMessage(translation.messages.gitmojisEnabled);
      } else {
        vscode.window.showInformationMessage(translation.messages.gitmojisDisabled);
      }
    }
  );

  context.subscriptions.push(
    selectModelDisposable,
    openSettingsDisposable,
    refreshModelsDisposable,
    selectStyleDisposable,
    toggleGitmojisDisposable
  );
}
