export interface GitDiffStats {
  filesChanged: number;
  insertions: number;
  deletions: number;
}

export interface GitDiff {
  content: string;
  stats: GitDiffStats;
}

export type CommitStyle = 
  | 'conventional'
  | 'angular'
  | 'atom'
  | 'eslint'
  | 'jquery'
  | 'ember'
  | 'linux'
  | 'symfony'
  | 'rails'
  | 'graphql'
  | 'docker'
  | 'karma'
  | 'semantic'
  | 'plain'
  | 'bitbucket';

export interface GenerationContext {
  diff: string;
  language: string;
  style: CommitStyle;
  useGitmojis: boolean;
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
  style: CommitStyle;
  useGitmojis: boolean;
  includeBody: boolean;
  bodyThreshold: number;
  recentCommitsCount: number;
  modelFamily: 'gpt-4o' | 'gpt-4o-mini' | 'claude-3.5-sonnet';
}
