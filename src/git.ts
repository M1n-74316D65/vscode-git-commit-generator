import * as vscode from 'vscode';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { GitDiff, GitDiffStats } from './types';
import { filterDiffSections, matchesGlob } from './glob';
import { LogManager } from './logger';

const execFileAsync = promisify(execFile);

// Constants
const GIT_COMMAND_TIMEOUT_MS = 30000;
const MAX_DIFF_SIZE_BYTES = 1024 * 1024; // 1MB
const EXEC_MAX_BUFFER = 8 * 1024 * 1024; // 8MB, comfortably above MAX_DIFF_SIZE_BYTES
const UNTRACKED_DIFF_CONCURRENCY = 4;
const DEFAULT_RECENT_COMMITS_COUNT = 10;
const MAX_RECENT_COMMITS_COUNT = 50;

/**
 * Coerce the recentCommitsCount setting into a safe integer for shell interpolation.
 * Falls back to the default on NaN/garbage, clamps to 0..MAX.
 */
export function sanitizeRecentCommitsCount(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_RECENT_COMMITS_COUNT;
  }
  return Math.min(Math.max(Math.round(parsed), 0), MAX_RECENT_COMMITS_COUNT);
}

interface GitApiRepository {
  rootUri: vscode.Uri;
  inputBox?: { value: string };
}

interface GitApi {
  repositories: GitApiRepository[];
  getRepository?: (uri: vscode.Uri) => GitApiRepository | null | undefined;
}

interface GitCommandError extends Error {
  code?: number | string;
  stdout?: string;
}

async function runGit(
  args: string[],
  cwd?: string,
  acceptedExitCodes: number[] = [0]
): Promise<string> {
  try {
    const { stdout } = await execFileAsync('git', args, {
      cwd,
      timeout: GIT_COMMAND_TIMEOUT_MS,
      maxBuffer: EXEC_MAX_BUFFER,
      encoding: 'utf8',
    });
    return stdout;
  } catch (error) {
    const gitError = error as GitCommandError;
    if (
      typeof gitError.code === 'number' &&
      acceptedExitCodes.includes(gitError.code) &&
      typeof gitError.stdout === 'string'
    ) {
      return gitError.stdout;
    }
    throw error;
  }
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let nextIndex = 0;

  const workers = Array.from(
    { length: Math.min(concurrency, values.length) },
    async () => {
      for (;;) {
        const index = nextIndex++;
        if (index >= values.length) {
          return;
        }
        results[index] = await mapper(values[index]);
      }
    }
  );

  await Promise.all(workers);
  return results;
}

export class GitManager {
  private cwd: string;

  constructor(cwd: string) {
    this.cwd = cwd;
  }

  /**
   * Find the git repository root in the current workspace
   */
  static async findGitRepositories(): Promise<string[]> {
    const git = await this.getGitApi();
    if (git?.repositories.length) {
      return [...new Set(git.repositories.map((repository) => repository.rootUri.fsPath))];
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return [];
    }

    // Try to find git root in parallel for all workspace folders
    const roots = await Promise.all(workspaceFolders.map(async (folder) => {
      try {
        return (await runGit(['rev-parse', '--show-toplevel'], folder.uri.fsPath)).trim();
      } catch (error) {
        LogManager.error('Git repository root resolution failed', error);
        return undefined;
      }
    }));

    return [...new Set(roots.filter((root): root is string => Boolean(root)))];
  }

  static resolveRepositoryRoot(
    repositoryRoots: string[],
    preferredUri?: vscode.Uri
  ): string | undefined {
    if (preferredUri?.scheme === 'file') {
      const preferredPath = preferredUri.fsPath;
      const containingRoots = repositoryRoots
        .filter((root) => (
          preferredPath === root ||
          preferredPath.startsWith(`${root}/`) ||
          preferredPath.startsWith(`${root}\\`)
        ))
        .sort((left, right) => right.length - left.length);

      if (containingRoots.length > 0) {
        return containingRoots[0];
      }
    }

    return repositoryRoots.length === 1 ? repositoryRoots[0] : undefined;
  }

  /**
   * Check if git is available in the system
   */
  static async isGitAvailable(): Promise<boolean> {
    try {
      await execFileAsync('git', ['--version'], {
        timeout: 5000,
        maxBuffer: EXEC_MAX_BUFFER,
      });
      return true;
    } catch {
      return false;
    }
  }

  private static async getGitApi(): Promise<GitApi | undefined> {
    try {
      const gitExtension = vscode.extensions.getExtension('vscode.git');
      if (!gitExtension) {
        return undefined;
      }

      if (!gitExtension.isActive) {
        await gitExtension.activate();
      }

      return gitExtension.exports.getAPI(1) as GitApi;
    } catch (error) {
      LogManager.error('VS Code Git extension API lookup failed', error);
      return undefined;
    }
  }

  private static resolveRepository(
    git: GitApi,
    preferredUri?: vscode.Uri
  ): GitApiRepository | undefined {
    if (preferredUri && git.getRepository) {
      const directMatch = git.getRepository(preferredUri);
      if (directMatch) {
        return directMatch;
      }
    }

    const exactMatch = git.repositories.find(
      (repository) => repository.rootUri.fsPath === preferredUri?.fsPath
    );
    if (exactMatch) {
      return exactMatch;
    }

    const containingRepositories = git.repositories.filter((repository) => {
      const root = repository.rootUri.fsPath;
      const path = preferredUri?.fsPath;
      return Boolean(path && (path === root || path.startsWith(`${root}/`)));
    });

    if (containingRepositories.length > 0) {
      return containingRepositories.sort(
        (left, right) => right.rootUri.fsPath.length - left.rootUri.fsPath.length
      )[0];
    }

    return git.repositories[0];
  }

  /**
   * Get a diff for the given scope ('staged' = staged changes only,
   * 'all' = all changes relative to HEAD including unstaged).
   * Paths matching excludePatterns (glob, e.g. `**\/package-lock.json`)
   * are dropped from the diff before stats are computed.
   * Returns undefined when the resulting diff is empty;
   * throws when the git command fails so the caller can report the real error.
   */
  async getDiff(
    scope: 'staged' | 'all',
    excludePatterns: string[] = []
  ): Promise<GitDiff | undefined> {
    const commonDiffArgs = ['diff', '--no-ext-diff', '--no-textconv'];
    let diffOutput: string;

    if (scope === 'staged') {
      diffOutput = await runGit([...commonDiffArgs, '--staged'], this.cwd);
    } else {
      const hasHead = await this.hasHead();
      if (hasHead) {
        diffOutput = await runGit([...commonDiffArgs, 'HEAD'], this.cwd);
        const untrackedDiff = await this.getUntrackedDiff(excludePatterns);
        if (untrackedDiff) {
          diffOutput = [diffOutput.trimEnd(), untrackedDiff].filter(Boolean).join('\n');
        }
      } else {
        diffOutput = await this.getUnbornRepositoryDiff(excludePatterns);
      }
    }

    const filtered = filterDiffSections(diffOutput, excludePatterns);

    if (!filtered.trim()) {
      return undefined;
    }

    // Check diff size
    if (Buffer.byteLength(filtered, 'utf8') > MAX_DIFF_SIZE_BYTES) {
      LogManager.warn('Git diff exceeds the preferred prompt size');
    }

    const stats = GitManager.computeStatsFromDiff(filtered);

    return {
      content: filtered,
      stats,
    };
  }

  /**
   * Compute diff stats directly from unified diff content
   * (exact, unlike parsing the `--stat` summary line).
   */
  static computeStatsFromDiff(diff: string): GitDiffStats {
    let filesChanged = 0;
    let insertions = 0;
    let deletions = 0;

    for (const line of diff.split('\n')) {
      if (line.startsWith('diff --git ')) {
        filesChanged++;
      } else if (line.startsWith('+++') || line.startsWith('---')) {
        continue;
      } else if (line.startsWith('+')) {
        insertions++;
      } else if (line.startsWith('-')) {
        deletions++;
      }
    }

    return { filesChanged, insertions, deletions };
  }

  /**
   * Get recent commits for context
   */
  async getRecentCommits(count: number): Promise<string[]> {
    const safeCount = sanitizeRecentCommitsCount(count);
    if (safeCount === 0) {
      return [];
    }

    try {
      const stdout = await runGit(
        ['log', '--oneline', '-n', String(safeCount)],
        this.cwd
      );

      return stdout
        .trim()
        .split('\n')
        .filter((line) => line.length > 0);
    } catch (error) {
      LogManager.error('Recent Git commit lookup failed', error);
      return [];
    }
  }

  private async hasHead(): Promise<boolean> {
    try {
      await runGit(['rev-parse', '--verify', 'HEAD'], this.cwd);
      return true;
    } catch {
      return false;
    }
  }

  private async getUntrackedDiff(excludePatterns: string[]): Promise<string> {
    const output = await runGit(
      ['ls-files', '--others', '--exclude-standard', '-z'],
      this.cwd
    );
    return this.getPathsAsNewFileDiff(output, excludePatterns);
  }

  private async getUnbornRepositoryDiff(excludePatterns: string[]): Promise<string> {
    const output = await runGit(
      ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
      this.cwd
    );
    return this.getPathsAsNewFileDiff(output, excludePatterns);
  }

  private async getPathsAsNewFileDiff(
    nulSeparatedPaths: string,
    excludePatterns: string[]
  ): Promise<string> {
    const paths = nulSeparatedPaths
      .split('\0')
      .filter(Boolean)
      .filter((path) => !excludePatterns.some((pattern) => matchesGlob(pattern, path)));

    const sections = await mapWithConcurrency(
      paths,
      UNTRACKED_DIFF_CONCURRENCY,
      async (path) => {
        try {
          await vscode.workspace.fs.stat(
            vscode.Uri.joinPath(vscode.Uri.file(this.cwd), ...path.split('/'))
          );
        } catch {
          return '';
        }

        return runGit(
          [
            'diff',
            '--no-index',
            '--no-ext-diff',
            '--no-textconv',
            '--',
            '/dev/null',
            path,
          ],
          this.cwd,
          [0, 1]
        );
      }
    );

    return sections.filter(Boolean).join('\n').trimEnd();
  }

  /**
   * Parse git diff stats
   */
  static parseStats(statOutput: string): GitDiffStats {
    const lines = statOutput.trim().split('\n');
    const lastLine = lines[lines.length - 1];

    // Parse the summary line like: " 5 files changed, 100 insertions(+), 50 deletions(-)"
    const fileMatch = lastLine.match(/(\d+) file(s?) changed/);
    const insertionMatch = lastLine.match(/(\d+) insertion/);
    const deletionMatch = lastLine.match(/(\d+) deletion/);

    return {
      filesChanged: fileMatch ? parseInt(fileMatch[1]) : 0,
      insertions: insertionMatch ? parseInt(insertionMatch[1]) : 0,
      deletions: deletionMatch ? parseInt(deletionMatch[1]) : 0,
    };
  }

  /**
   * Set commit message in the Git SCM input box
   */
  async setCommitMessage(message: string): Promise<boolean> {
    try {
      const git = await GitManager.getGitApi();
      if (!git) {
        LogManager.error('VS Code Git extension API is unavailable');
        return false;
      }

      const repositories = git.repositories;
      if (!repositories || repositories.length === 0) {
        LogManager.error('No Git repositories are available');
        return false;
      }

      // Resolve the repository matching the diffed cwd first,
      // falling back to the active editor's repository
      const cwdUri = vscode.Uri.file(this.cwd);
      let repo = GitManager.resolveRepository(git, cwdUri);

      if (!repo && vscode.window.activeTextEditor) {
        repo = GitManager.resolveRepository(git, vscode.window.activeTextEditor.document.uri);
      }

      if (!repo) {
        repo = git.repositories[0];
      }

      if (!repo || !repo.inputBox) {
        LogManager.error('The target Git SCM input is unavailable');
        return false;
      }

      repo.inputBox.value = message;
      return true;
    } catch (error) {
      LogManager.error('Writing the Git SCM input failed', error);
      return false;
    }
  }
}
