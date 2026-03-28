import * as vscode from 'vscode';
import { ConfigManager } from './config';

export function registerConfigCommands(context: vscode.ExtensionContext): void {
  // Command to select language model
  const selectModelDisposable = vscode.commands.registerCommand(
    'git-commit-generator.selectModel',
    async () => {
      const config = vscode.workspace.getConfiguration('gitCommitGenerator');
      
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Fetching available models from VS Code LLM API...',
          cancellable: false
        },
        async (progress) => {
          try {
            // Get all available models
            const allModels = await vscode.lm.selectChatModels({});
            
            if (allModels.length === 0) {
              const result = await vscode.window.showWarningMessage(
                'No language models available. Make sure GitHub Copilot is installed and enabled.',
                'Install Copilot',
                'Open Settings'
              );
              
              if (result === 'Install Copilot') {
                await vscode.commands.executeCommand(
                  'vscode.open',
                  vscode.Uri.parse('vscode:extension/GitHub.copilot')
                );
              }
              return;
            }

            progress.report({ increment: 50, message: 'Building model list...' });

            // Map models to QuickPick items
            const modelItems = allModels.map(model => ({
              label: model.name,
              description: `${model.family} by ${model.vendor}`,
              detail: `ID: ${model.id} | Max Input: ${model.maxInputTokens} tokens`,
              model: model,
              picked: model.family === config.get('modelFamily', 'gpt-4o')
            }));

            progress.report({ increment: 50, message: 'Showing selection...' });

            const selected = await vscode.window.showQuickPick(modelItems, {
              placeHolder: 'Select a language model for commit generation',
              title: `Git Commit Generator - ${allModels.length} Model(s) Available`,
              ignoreFocusOut: true,
              matchOnDescription: true,
              matchOnDetail: true
            });

            if (selected) {
              await config.update('modelFamily', selected.model.family, true);
              await config.update('modelId', selected.model.id, true);
              await config.update('modelVendor', selected.model.vendor, true);
              
              vscode.window.showInformationMessage(
                `✅ Model set to ${selected.model.name} (${selected.model.family})`
              );
            }
          } catch (error) {
            console.error('Error fetching models:', error);
            vscode.window.showErrorMessage(
              `Error fetching models: ${error instanceof Error ? error.message : String(error)}`
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
        '@ext:your-publisher-id.vscode-git-commit-generator'
      );
    }
  );

  // Command to refresh/check available models
  const refreshModelsDisposable = vscode.commands.registerCommand(
    'git-commit-generator.refreshModels',
    async () => {
      const translation = ConfigManager.getTranslation();
      
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Checking available language models...',
          cancellable: false
        },
        async () => {
          try {
            const models = await vscode.lm.selectChatModels({});
            
            if (models.length === 0) {
              const result = await vscode.window.showWarningMessage(
                'No language models available. Make sure GitHub Copilot is installed and enabled.',
                'Install Copilot',
                'Open Settings'
              );
              
              if (result === 'Install Copilot') {
                await vscode.commands.executeCommand(
                  'vscode.open',
                  vscode.Uri.parse('vscode:extension/GitHub.copilot')
                );
              } else if (result === 'Open Settings') {
                await vscode.commands.executeCommand(
                  'workbench.action.openSettings',
                  '@ext:GitHub.copilot'
                );
              }
            } else {
              const modelList = models.map(m => `${m.name} (${m.family})`).join(', ');
              vscode.window.showInformationMessage(
                `✅ Found ${models.length} available model(s): ${modelList}`
              );
            }
          } catch (error) {
            vscode.window.showErrorMessage(
              `Error checking models: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }
      );
    }
  );

  context.subscriptions.push(
    selectModelDisposable,
    openSettingsDisposable,
    refreshModelsDisposable
  );
}
