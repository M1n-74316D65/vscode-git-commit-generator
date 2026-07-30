import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import { GitDiff, GitDiffStats } from './types';
import { filterDiffSections } from './glob';
import { LogManager } from './logger';

const execAsync = promisify(exec);

// Constants
const GIT_COMMAND_TIMEOUT_MS = 30000;
const MAX_DIFF_SIZE_BYTES = 1024 * 1024; // 1MB
const EXEC_MAX_BUFFER = 8 * 1024 * 1024; // 8MB, comfortably above MAX_DIFF_SIZE_BYTES
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

export class GitManager {
  private cwd: string;

  constructor(cwd: string) {
    this.cwd = cwd;
  }

  /**
   * Find the git repository root in the current workspace
   */
  static async findGitRepository(): Promise<string | undefined> {
    const git = await this.getGitApi();
    const activeUri = vscode.window.activeTextEditor?.document.uri;

    if (git) {
      const repo = this.resolveRepository(git, activeUri);
      if (repo) {
        return repo.rootUri.fsPath;
      }
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return undefined;
    }

    // Prefer the workspace folder containing the active editor, then the rest
    const orderedFolders = [...workspaceFolders].sort((a, b) => {
      const activePath = activeUri?.fsPath;
      const score = (folder: vscode.WorkspaceFolder) =>
        activePath && (activePath === folder.uri.fsPath || activePath.startsWith(`${folder.uri.fsPath}/`)) ? 0 : 1;
      return score(a) - score(b);
    });

    // Try to find git root in parallel for all workspace folders
    const promises = orderedFolders.map(async (folder) => {
      try {
        const { stdout } = await execAsync('git rev-parse --show-toplevel', {
          cwd: folder.uri.fsPath,
          timeout: GIT_COMMAND_TIMEOUT_MS,
          maxBuffer: EXEC_MAX_BUFFER,
        });
        return stdout.trim();
      } catch (error) {
        LogManager.error('Git repository root resolution failed', error);
        return undefined;
      }
    });

    const results = await Promise.all(promises);
    return results.find((result) => result !== undefined);
  }

  /**
   * Check if git is available in the system
   */
  static async isGitAvailable(): Promise<boolean> {
    try {
      await execAsync('git --version', { timeout: 5000, maxBuffer: EXEC_MAX_BUFFER });
      return true;
    } catch {
      return false;
    }
  }

  static async hasGitRepository(): Promise<boolean> {
    if (await this.findGitRepository()) {
      return true;
    }

    const git = await this.getGitApi();
    return Boolean(git?.repositories.length);
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
    const diffArgs = scope === 'staged' ? 'git diff --staged' : 'git diff HEAD';

    const { stdout: diffOutput } = await execAsync(diffArgs, {
      cwd: this.cwd,
      timeout: GIT_COMMAND_TIMEOUT_MS,
      maxBuffer: EXEC_MAX_BUFFER,
    });

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
      const { stdout } = await execAsync(
        `git log --oneline -n ${safeCount}`,
        { cwd: this.cwd, timeout: GIT_COMMAND_TIMEOUT_MS, maxBuffer: EXEC_MAX_BUFFER }
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
