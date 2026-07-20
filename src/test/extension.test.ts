import * as assert from 'assert';
import { suite, test } from 'mocha';
import * as vscode from 'vscode';
import { ConfigManager } from '../config';
import { GitManager, sanitizeRecentCommitsCount } from '../git';
import { LLMManager } from '../llm';

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

  test('parseStats parses the git diff summary line', () => {
    const stats = GitManager.parseStats(
      ' src/a.ts | 10 +++---\n src/b.ts |  2 +-\n 5 files changed, 100 insertions(+), 50 deletions(-)'
    );

    assert.strictEqual(stats.filesChanged, 5);
    assert.strictEqual(stats.insertions, 100);
    assert.strictEqual(stats.deletions, 50);
  });

  test('parseStats returns zeros for empty output', () => {
    const stats = GitManager.parseStats('');

    assert.strictEqual(stats.filesChanged, 0);
    assert.strictEqual(stats.insertions, 0);
    assert.strictEqual(stats.deletions, 0);
  });

  test('sanitizeRecentCommitsCount clamps and sanitizes input', () => {
    assert.strictEqual(sanitizeRecentCommitsCount(10), 10);
    assert.strictEqual(sanitizeRecentCommitsCount(0), 0);
    assert.strictEqual(sanitizeRecentCommitsCount(-5), 0);
    assert.strictEqual(sanitizeRecentCommitsCount(9999), 50);
    assert.strictEqual(sanitizeRecentCommitsCount(7.6), 8);
    assert.strictEqual(sanitizeRecentCommitsCount('garbage'), 10);
    assert.strictEqual(sanitizeRecentCommitsCount(NaN), 10);
    assert.strictEqual(sanitizeRecentCommitsCount(undefined), 10);
  });

  test('parseCommitMessage splits subject and body', () => {
    const single = LLMManager.parseCommitMessage('feat: add login');
    assert.strictEqual(single.subject, 'feat: add login');
    assert.strictEqual(single.body, undefined);

    const withBody = LLMManager.parseCommitMessage('"feat: add login"\n\n- add form\n- wire API');
    assert.strictEqual(withBody.subject, 'feat: add login');
    assert.strictEqual(withBody.body, '- add form\n- wire API');

    const leadingBlanks = LLMManager.parseCommitMessage('\n\nfix: typo\n\nbody here');
    assert.strictEqual(leadingBlanks.subject, 'fix: typo');
    assert.strictEqual(leadingBlanks.body, 'body here');
  });

  test('cleanSubject strips quotes and whitespace', () => {
    assert.strictEqual(LLMManager.cleanSubject('  "feat: x"  '), 'feat: x');
    assert.strictEqual(LLMManager.cleanSubject("'fix: y'"), 'fix: y');
  });
});
