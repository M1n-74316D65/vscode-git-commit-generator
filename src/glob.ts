/**
 * Minimal zero-dependency glob matcher supporting `**`, `*` and `?`.
 * Paths are matched with `/` separators (git diff output style).
 */

function escapeRegExpChar(char: string): string {
  return char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function globToRegExp(glob: string): RegExp {
  let pattern = '';
  let i = 0;

  while (i < glob.length) {
    const char = glob[i];

    if (char === '*') {
      if (glob[i + 1] === '*') {
        if (glob[i + 2] === '/') {
          // `**/` matches zero or more path segments
          pattern += '(?:[^/]+/)*';
          i += 3;
        } else {
          // trailing or embedded `**` matches anything
          pattern += '.*';
          i += 2;
        }
      } else {
        // `*` matches within a single path segment
        pattern += '[^/]*';
        i += 1;
      }
    } else if (char === '?') {
      pattern += '[^/]';
      i += 1;
    } else {
      pattern += escapeRegExpChar(char);
      i += 1;
    }
  }

  return new RegExp(`^${pattern}$`);
}

/**
 * Check whether a `/`-separated path matches a glob pattern.
 */
export function matchesGlob(pattern: string, path: string): boolean {
  if (!pattern) {
    return false;
  }
  return globToRegExp(pattern).test(path);
}

/**
 * Drop file sections from a unified diff whose paths match any of the
 * given glob patterns. Sections are split on `diff --git a/x b/y` headers;
 * any preamble before the first header is preserved.
 */
export function filterDiffSections(diff: string, patterns: string[]): string {
  const activePatterns = patterns.filter((pattern) => pattern.trim().length > 0);
  if (activePatterns.length === 0) {
    return diff;
  }

  const lines = diff.split('\n');
  const kept: string[] = [];
  let skipping = false;

  for (const line of lines) {
    if (line.startsWith('diff --git ')) {
      const match = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
      skipping = match
        ? activePatterns.some(
            (pattern) => matchesGlob(pattern, match[2]) || matchesGlob(pattern, match[1])
          )
        : false;
    }
    if (!skipping) {
      kept.push(line);
    }
  }

  return kept.join('\n');
}
