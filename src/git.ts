import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import { GitDiff, GitDiffStats } from './types';
import { ConfigManager } from './config';

const execAsync = promisify(exec);

export class GitManager {
  private cwd: string;

  constructor(cwd: string) {
    this.cwd = cwd;
  }

  static async findGitRepository(): Promise<string | undefined> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return undefined;
    }

    // Try to find git root
    for (const folder of workspaceFolders) {
      try {
        const { stdout } = await execAsync('git rev-parse --show-toplevel', {
          cwd: folder.uri.fsPath,
        });
        return stdout.trim();
      } catch {
        continue;
      }
    }

    return undefined;
  }

  async getStagedDiff(): Promise<GitDiff | undefined> {
    try {
      // Get staged diff
      const { stdout: diffOutput } = await execAsync('git diff --staged', {
        cwd: this.cwd,
      });

      if (!diffOutput.trim()) {
        return undefined;
      }

      // Get stats
      const { stdout: statOutput } = await execAsync('git diff --staged --stat', {
        cwd: this.cwd,
      });

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

  async getRecentCommits(count: number): Promise<string[]> {
    if (count === 0) {
      return [];
    }

    try {
      const { stdout } = await execAsync(`git log --oneline -${count}`, {
        cwd: this.cwd,
      });

      return stdout.trim().split('\n').filter(line => line.length > 0);
    } catch (error) {
      console.error('Error getting recent commits:', error);
      return [];
    }
  }

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
      const repo = repositories.find((r: any) => 
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
}
