import * as vscode from 'vscode';
import { registerCommands } from './commands';
import { registerConfigCommands } from './config-commands';
import { StatusBarManager } from './status-bar';

export function activate(context: vscode.ExtensionContext) {
  console.log('✅ Git Commit Generator extension is now active!');
  console.log('Extension path:', context.extensionPath);
  
  try {
    // Register main command
    registerCommands(context);
    console.log('✅ Main commands registered successfully');
    
    // Register config commands
    registerConfigCommands(context);
    console.log('✅ Config commands registered successfully');
    
    // Initialize status bar
    StatusBarManager.initialize(context);
    console.log('✅ Status bar initialized successfully');
    
  } catch (error) {
    console.error('❌ Error registering commands:', error);
    vscode.window.showErrorMessage('Git Commit Generator failed to activate. Check Debug Console.');
  }
}

export function deactivate() {
  StatusBarManager.dispose();
  console.log('Git Commit Generator extension is now deactivated.');
}
