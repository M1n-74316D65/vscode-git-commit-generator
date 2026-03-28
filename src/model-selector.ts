import * as vscode from 'vscode';

export interface ModelInfo {
  id: string;
  name: string;
  vendor: string;
  family: string;
  version: string;
  maxInputTokens: number;
}

export async function getAvailableModels(): Promise<vscode.LanguageModelChat[]> {
  try {
    // Get all available models from VS Code LLM API
    const models = await vscode.lm.selectChatModels({});
    return models;
  } catch (error) {
    return [];
  }
}

export async function selectModel(): Promise<vscode.LanguageModelChat | undefined> {
  const config = vscode.workspace.getConfiguration('gitCommitGenerator');
  const preferredFamily = config.get<string>('modelFamily', 'gpt-4o');
  
  const models = await getAvailableModels();
  
  if (models.length === 0) {
    return undefined;
  }
  
  // Try to find the preferred model
  const preferredModel = models.find(m => m.family === preferredFamily);
  if (preferredModel) {
    return preferredModel;
  }
  
  // Fallback to first available model
  return models[0];
}

export async function showModelPicker(): Promise<void> {
  const models = await getAvailableModels();
  
  if (models.length === 0) {
    const result = await vscode.window.showWarningMessage(
      'No language models available. GitHub Copilot extension is required.',
      'Install Copilot',
      'Check Requirements'
    );
    
    if (result === 'Install Copilot') {
      await vscode.commands.executeCommand(
        'vscode.open',
        vscode.Uri.parse('vscode:extension/GitHub.copilot')
      );
    }
    return;
  }
  
  const items = models.map(model => ({
    label: model.name,
    description: `${model.family} • ${model.vendor}`,
    detail: `Max tokens: ${model.maxInputTokens} • Version: ${model.version}`,
    model: model
  }));
  
  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select a language model',
    title: 'Available Language Models',
    matchOnDescription: true,
    matchOnDetail: true
  });
  
  if (selected) {
    const config = vscode.workspace.getConfiguration('gitCommitGenerator');
    await config.update('modelFamily', selected.model.family, true);
    await config.update('modelId', selected.model.id, true);
    await config.update('modelVendor', selected.model.vendor, true);
    
    vscode.window.showInformationMessage(
      `Selected: ${selected.model.name} (${selected.model.family})`
    );
  }
}
