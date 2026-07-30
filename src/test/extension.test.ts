import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { suite, test } from 'mocha';
import * as vscode from 'vscode';
import { ConfigManager, migrateLegacyState } from '../config';
import { GitManager, sanitizeRecentCommitsCount } from '../git';
import { cancellableDelay, LLMManager, PromptTooLargeError } from '../llm';
import { matchesGlob, filterDiffSections } from '../glob';
import {
  resolveScope,
  tryAcquireGenerationLock,
  releaseGenerationLock,
} from '../commands';
import { GenerationContext } from '../types';

suite('Git Commit Generator', () => {
  test('registers contributed commands', async () => {
    const extension = vscode.extensions.getExtension('m1n.vscode-llm-api-git-commit-generator');

    assert.ok(extension);
    await extension.activate();

    const commands = await vscode.commands.getCommands(true);

    const manifest = extension.packageJSON as {
      contributes: { commands: Array<{ command: string }> };
    };
    for (const contribution of manifest.contributes.commands) {
      assert.ok(commands.includes(contribution.command), `${contribution.command} is not registered`);
    }
  });

  test('manifest uses only stable, supported workspace capabilities', () => {
    const root = path.resolve(__dirname, '../..');
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

    assert.strictEqual(manifest.enabledApiProposals, undefined);
    assert.strictEqual(manifest.contributes.menus['scm/inputBox'], undefined);
    assert.deepStrictEqual(manifest.extensionKind, ['workspace']);
    assert.strictEqual(manifest.capabilities.untrustedWorkspaces.supported, false);
    assert.strictEqual(manifest.capabilities.virtualWorkspaces.supported, false);
  });

  test('manifest localization catalogs contain the same referenced keys', () => {
    const root = path.resolve(__dirname, '../..');
    const manifestText = fs.readFileSync(path.join(root, 'package.json'), 'utf8');
    const english = JSON.parse(fs.readFileSync(path.join(root, 'package.nls.json'), 'utf8'));
    const spanish = JSON.parse(fs.readFileSync(path.join(root, 'package.nls.es.json'), 'utf8'));
    const referenced = new Set(
      Array.from(manifestText.matchAll(/%([^%]+)%/g), (match) => match[1])
    );

    assert.deepStrictEqual(Object.keys(spanish).sort(), Object.keys(english).sort());
    assert.deepStrictEqual([...referenced].sort(), Object.keys(english).sort());
  });

  test('runtime sources use the Output Channel logger instead of console methods', () => {
    const sourceRoot = path.resolve(__dirname, '../../src');
    const runtimeFiles = fs.readdirSync(sourceRoot)
      .filter((file) => file.endsWith('.ts'));

    for (const file of runtimeFiles) {
      const content = fs.readFileSync(path.join(sourceRoot, file), 'utf8');
      assert.ok(!/console\.(?:log|warn|error)/.test(content), `${file} uses console output`);
    }
  });

  test('returns a supported language when auto-detecting', () => {
    const language = ConfigManager.getLanguage();

    assert.ok(['en', 'es', 'fr', 'de', 'it', 'pt', 'ja'].includes(language));
  });

  test('loads translation messages for the active language', () => {
    const translation = ConfigManager.getTranslation();

    assert.ok(translation.messages.generating.length > 0);
    assert.ok(translation.messages.selectStyleTitle.length > 0);
  });

  test('awaits all legacy state migrations', async () => {
    let completedUpdates = 0;
    const values = new Map<string, unknown>();
    const globalState = {
      get: (key: string) => values.get(key),
      update: async (key: string, value: unknown) => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        values.set(key, value);
        completedUpdates++;
      },
    } as unknown as vscode.Memento;
    const config = {
      get: (key: string, defaultValue: unknown) => key === 'modelId' ? 'legacy-model' : defaultValue,
      inspect: (key: string) => (
        key === 'modelId' || key === 'hasShownWelcome'
          ? { globalValue: true }
          : undefined
      ),
      update: async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        completedUpdates++;
      },
    } as unknown as vscode.WorkspaceConfiguration;

    await migrateLegacyState(globalState, config);

    assert.strictEqual(values.get('modelId'), 'legacy-model');
    assert.strictEqual(completedUpdates, 3);
  });

  test('clears the model cache when available models change', () => {
    let clearCount = 0;
    const original = LLMManager.clearModelCache;
    LLMManager.clearModelCache = () => {
      clearCount++;
    };

    try {
      LLMManager.handleAvailableModelsChanged();
      assert.strictEqual(clearCount, 1);
    } finally {
      LLMManager.clearModelCache = original;
    }
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

  test('computeStatsFromDiff counts files, insertions and deletions', () => {
    const diff = [
      'diff --git a/a.ts b/a.ts',
      '--- a/a.ts',
      '+++ b/a.ts',
      '@@ -1,2 +1,3 @@',
      ' line',
      '+added',
      '-removed',
      'diff --git a/b.ts b/b.ts',
      '--- a/b.ts',
      '+++ b/b.ts',
      '@@ -0,0 +1 @@',
      '+new',
    ].join('\n');
    const stats = GitManager.computeStatsFromDiff(diff);

    assert.strictEqual(stats.filesChanged, 2);
    assert.strictEqual(stats.insertions, 2);
    assert.strictEqual(stats.deletions, 1);
  });

  test('matchesGlob supports **, * and ?', () => {
    assert.ok(matchesGlob('**/package-lock.json', 'package-lock.json'));
    assert.ok(matchesGlob('**/package-lock.json', 'a/b/package-lock.json'));
    assert.ok(!matchesGlob('**/package-lock.json', 'a/b/package.json'));
    assert.ok(matchesGlob('**/.env*', '.env'));
    assert.ok(matchesGlob('**/.env*', 'config/.env.local'));
    assert.ok(matchesGlob('src/*.ts', 'src/index.ts'));
    assert.ok(!matchesGlob('src/*.ts', 'src/deep/index.ts'));
    assert.ok(matchesGlob('src/?.ts', 'src/a.ts'));
    assert.ok(!matchesGlob('src/?.ts', 'src/ab.ts'));
    assert.ok(matchesGlob('src/**', 'src/a/b/c.ts'));
  });

  test('filterDiffSections drops sections matching exclude patterns', () => {
    const diff = [
      'diff --git a/src/app.ts b/src/app.ts',
      '--- a/src/app.ts',
      '+++ b/src/app.ts',
      '@@ -1 +1 @@',
      '+code',
      'diff --git a/package-lock.json b/package-lock.json',
      '--- a/package-lock.json',
      '+++ b/package-lock.json',
      '@@ -1 +1 @@',
      '+lock',
      'diff --git a/.env b/.env',
      '--- a/.env',
      '+++ b/.env',
      '@@ -1 +1 @@',
      '+SECRET=x',
    ].join('\n');

    const filtered = filterDiffSections(diff, ['**/package-lock.json', '**/.env*']);

    assert.ok(filtered.includes('src/app.ts'));
    assert.ok(!filtered.includes('package-lock.json'));
    assert.ok(!filtered.includes('SECRET'));
    assert.strictEqual(GitManager.computeStatsFromDiff(filtered).filesChanged, 1);

    // No patterns → unchanged
    assert.strictEqual(filterDiffSections(diff, []), diff);
  });

  test('resolveScope maps auto to staged when staged changes exist', () => {
    assert.strictEqual(resolveScope('auto', true), 'staged');
    assert.strictEqual(resolveScope('auto', false), 'all');
    assert.strictEqual(resolveScope('staged', false), 'staged');
    assert.strictEqual(resolveScope('all', true), 'all');
  });

  test('single-flight generation lock', () => {
    assert.strictEqual(tryAcquireGenerationLock(), true);
    assert.strictEqual(tryAcquireGenerationLock(), false);
    releaseGenerationLock();
    assert.strictEqual(tryAcquireGenerationLock(), true);
    releaseGenerationLock();
  });

  function fakeContext(diffLength: number, recentCommits: number): GenerationContext {
    return {
      diff: 'x'.repeat(diffLength),
      language: 'en',
      style: 'conventional',
      useGitmojis: false,
      recentCommits: Array.from({ length: recentCommits }, (_, i) => `commit ${i}`),
      includeBody: false,
      stats: { filesChanged: 1, insertions: 1, deletions: 0 },
    };
  }

  test('compressContext returns the context unchanged when it fits', async () => {
    const model = {
      maxInputTokens: 100000,
      countTokens: async () => 10,
    };
    const context = fakeContext(100, 5);

    const result = await LLMManager.compressContext(model, context, '', 50000);

    assert.strictEqual(result.diff, context.diff);
    assert.strictEqual(result.recentCommits.length, 5);
  });

  test('compressContext drops recent commits first, then truncates the diff', async () => {
    // Token count derived from the message text length so shrinking helps
    const model = {
      maxInputTokens: 1000,
      countTokens: async (content: string | vscode.LanguageModelChatMessage) => {
        const messageContent = typeof content === 'string'
          ? content
          : (content as unknown as { content: unknown }).content;
        const text = Array.isArray(messageContent)
          ? messageContent.map((part) => {
            if (
              typeof part === 'object' &&
              part !== null &&
              'value' in part &&
              typeof part.value === 'string'
            ) {
              return part.value;
            }
            return '';
          }).join('')
          : String(messageContent);
        return Math.ceil(text.length / 4);
      },
    };
    const context = fakeContext(4000, 6);

    const result = await LLMManager.compressContext(model, context, 'short', 300);

    assert.ok(result.recentCommits.length <= 6);
    assert.ok(result.diff.length < context.diff.length);
    assert.ok(result.recentCommits.length >= 3 || result.diff.length < 4000);
  });

  test('compressContext throws PromptTooLargeError when nothing fits', async () => {
    const model = {
      maxInputTokens: 10,
      countTokens: async () => 999999,
    };

    await assert.rejects(
      LLMManager.compressContext(model, fakeContext(1000, 5), '', 1),
      (error: unknown) => error instanceof PromptTooLargeError
    );
  });

  test('cancellableDelay rejects promptly when cancelled', async () => {
    const source = new vscode.CancellationTokenSource();
    const delayed = cancellableDelay(10_000, source.token);

    source.cancel();

    await assert.rejects(
      delayed,
      (error: unknown) => error instanceof vscode.CancellationError
    );
    source.dispose();
  });
});
