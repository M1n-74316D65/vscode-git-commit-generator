import * as assert from 'assert';
import { suite, test } from 'mocha';
import * as vscode from 'vscode';
import { ConfigManager } from '../config';

suite('Git Commit Generator', () => {
  test('registers contributed commands', async () => {
    const extension = vscode.extensions.getExtension('m1n.vscode-llm-api-git-commit-generator');

    assert.ok(extension);
    await extension.activate();

    const commands = await vscode.commands.getCommands(true);

    assert.ok(commands.includes('git-commit-generator.generate'));
    assert.ok(commands.includes('git-commit-generator.selectModel'));
    assert.ok(commands.includes('git-commit-generator.selectStyle'));
    assert.ok(commands.includes('git-commit-generator.toggleGitmojis'));
  });

  test('returns a supported language when auto-detecting', () => {
    const language = ConfigManager.getLanguage();

    assert.ok(['en', 'es'].includes(language));
  });

  test('loads translation messages for the active language', () => {
    const translation = ConfigManager.getTranslation();

    assert.ok(translation.messages.generating.length > 0);
    assert.ok(translation.messages.selectStyleTitle.length > 0);
  });
});
