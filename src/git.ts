import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import { GitDiff, GitDiffStats } from './types';

const execAsync = promisify(exec);

// Constants
const GIT_COMMAND_TIMEOUT_MS = 30000;
const MAX_DIFF_SIZE_BYTES = 1024 * 1024; // 1MB

export class GitManager {
  private cwd: string;

  constructor(cwd: string) {
    this.cwd = cwd;
  }

  /**
   * Find the git repository root in the current workspace
   */
  static async findGitRepository(): Promise<string | undefined> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return undefined;
    }

    // Try to find git root in parallel for all workspace folders
    const promises = workspaceFolders.map(async (folder) => {
      try {
        const { stdout } = await execAsync('git rev-parse --show-toplevel', {
          cwd: folder.uri.fsPath,
          timeout: GIT_COMMAND_TIMEOUT_MS,
        });
        return stdout.trim();
      } catch {
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
      await execAsync('git --version', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get staged changes diff
   */
  async getStagedDiff(): Promise<GitDiff | undefined> {
    try {
      // First check if there are staged changes
      const { stdout: statusOutput } = await execAsync(
        'git diff --staged --name-only',
        { cwd: this.cwd, timeout: GIT_COMMAND_TIMEOUT_MS }
      );

      if (!statusOutput.trim()) {
        return undefined;
      }

      // Get staged diff with size limit
      const { stdout: diffOutput } = await execAsync('git diff --staged', {
        cwd: this.cwd,
        timeout: GIT_COMMAND_TIMEOUT_MS,
      });

      if (!diffOutput.trim()) {
        return undefined;
      }

      // Check diff size
      if (Buffer.byteLength(diffOutput, 'utf8') > MAX_DIFF_SIZE_BYTES) {
        console.warn('Diff is very large, may be truncated by LLM');
      }

      // Get stats in parallel
      const { stdout: statOutput } = await execAsync(
        'git diff --staged --stat',
        { cwd: this.cwd, timeout: GIT_COMMAND_TIMEOUT_MS }
      );

      const stats = this.parseStats(statOutput);

      return {
        content: diffOutput,
        stats,
      };
    } catch (error) {
      console.error('Error getting staged diff:', error);
      return undefined;
    }
  }

  /**
   * Get recent commits for context
   */
  async getRecentCommits(count: number): Promise<string[]> {
    if (count === 0) {
      return [];
    }

    try {
      const { stdout } = await execAsync(
        `git log --oneline -${count}`,
        { cwd: this.cwd, timeout: GIT_COMMAND_TIMEOUT_MS }
      );

      return stdout
        .trim()
        .split('\n')
        .filter((line) => line.length > 0);
    } catch (error) {
      console.error('Error getting recent commits:', error);
      return [];
    }
  }

  /**
   * Parse git diff stats
   */
  private parseStats(statOutput: string): GitDiffStats {
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
      // Access the built-in Git extension API
      const gitExtension = vscode.extensions.getExtension('vscode.git');
      if (!gitExtension) {
        console.error('Git extension not found');
        return false;
      }

      // Activate the extension if needed
      if (!gitExtension.isActive) {
        await gitExtension.activate();
      }

      const git = gitExtension.exports.getAPI(1);
      if (!git) {
        console.error('Could not get Git API');
        return false;
      }

      const repositories = git.repositories;
      if (!repositories || repositories.length === 0) {
        console.error('No Git repositories found');
        return false;
      }

      // Find the repository matching our cwd
      const repo =
        repositories.find(
          (r: any) =>
            this.cwd.startsWith(r.rootUri.fsPath) ||
            r.rootUri.fsPath === this.cwd
        ) || repositories[0];

      if (!repo || !repo.inputBox) {
        console.error('Repository or inputBox not available');
        return false;
      }

      repo.inputBox.value = message;
      return true;
    } catch (error) {
      console.error('Error setting commit message:', error);
      return false;
    }
  }

  /**
   * Get repository status
   */
  async getStatus(): Promise<{ staged: number; modified: number; untracked: number }> {
    try {
      const { stdout } = await execAsync(
        'git status --porcelain',
        { cwd: this.cwd, timeout: GIT_COMMAND_TIMEOUT_MS }
      );

      const lines = stdout.trim().split('\n').filter((line) => line.length > 0);

      let staged = 0;
      let modified = 0;
      let untracked = 0;

      for (const line of lines) {
        const status = line.substring(0, 2);
        if (status[0] !== ' ' && status[0] !== '?') {
          staged++;
        }
        if (status[1] === 'M' || status[1] === 'D') {
          modified++;
        }
        if (status === '??') {
          untracked++;
        }
      }

      return { staged, modified, untracked };
    } catch (error) {
      console.error('Error getting git status:', error);
      return { staged: 0, modified: 0, untracked: 0 };
    }
  }
}
