export interface GitDiffStats {
  filesChanged: number;
  insertions: number;
  deletions: number;
}

export interface GitDiff {
  content: string;
  stats: GitDiffStats;
}

export interface GenerationContext {
  diff: string;
  language: string;
  style: 'gitmoji-conventional' | 'conventional-only';
  recentCommits: string[];
  includeBody: boolean;
  stats: GitDiffStats;
}

export interface CommitMessage {
  subject: string;
  body?: string;
}

export interface ExtensionConfig {
  language: 'auto' | 'en' | 'es';
  style: 'gitmoji-conventional' | 'conventional-only';
  includeBody: boolean;
  bodyThreshold: number;
  recentCommitsCount: number;
  modelFamily: 'gpt-4o' | 'gpt-4o-mini' | 'claude-3.5-sonnet';
  useCopilot: boolean;
}
