import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import parseDiff from 'parse-diff';
import type { FileSummary } from './types.js';

const exec = promisify(execFile);

export async function isGitRepo(cwd: string): Promise<boolean> {
  try {
    const { stdout } = await exec('git', ['rev-parse', '--is-inside-work-tree'], { cwd });
    return stdout.trim() === 'true';
  } catch {
    return false;
  }
}

export async function getRepoRoot(cwd: string): Promise<string> {
  const { stdout } = await exec('git', ['rev-parse', '--show-toplevel'], { cwd });
  return stdout.trim();
}

async function hasCommits(cwd: string): Promise<boolean> {
  try {
    await exec('git', ['rev-parse', 'HEAD'], { cwd });
    return true;
  } catch {
    return false;
  }
}

async function getUntrackedFiles(cwd: string): Promise<string[]> {
  const { stdout } = await exec(
    'git',
    ['ls-files', '--others', '--exclude-standard'],
    { cwd },
  );
  return stdout.trim().split('\n').filter(Boolean);
}

async function generateUntrackedDiff(cwd: string, filePath: string): Promise<string> {
  try {
    const content = await readFile(join(cwd, filePath), 'utf-8');
    const lines = content.split('\n');
    // Remove trailing empty line from split if file ends with newline
    if (lines.length > 0 && lines[lines.length - 1] === '') {
      lines.pop();
    }
    const diffLines = lines.map((line) => `+${line}`).join('\n');
    return [
      `diff --git a/${filePath} b/${filePath}`,
      'new file mode 100644',
      '--- /dev/null',
      `+++ b/${filePath}`,
      `@@ -0,0 +1,${lines.length} @@`,
      diffLines,
    ].join('\n');
  } catch {
    // Binary or unreadable file — skip
    return '';
  }
}

export async function getDiff(cwd: string): Promise<string> {
  let trackedDiff = '';

  if (await hasCommits(cwd)) {
    const { stdout } = await exec('git', ['diff', 'HEAD'], { cwd, maxBuffer: 10 * 1024 * 1024 });
    trackedDiff = stdout;
  } else {
    const { stdout } = await exec('git', ['diff', '--cached'], { cwd, maxBuffer: 10 * 1024 * 1024 });
    trackedDiff = stdout;
  }

  // Also include untracked files
  const untrackedFiles = await getUntrackedFiles(cwd);
  const untrackedDiffs = await Promise.all(
    untrackedFiles.map((f) => generateUntrackedDiff(cwd, f)),
  );

  const parts = [trackedDiff, ...untrackedDiffs].filter(Boolean);
  return parts.join('\n');
}

export function parseFileSummaries(rawDiff: string): FileSummary[] {
  const files = parseDiff(rawDiff);
  return files.map((f) => ({
    path: f.to === '/dev/null' ? f.from! : f.to!,
    oldPath: f.from !== f.to ? f.from ?? undefined : undefined,
    status: f.new
      ? 'added'
      : f.deleted
        ? 'deleted'
        : f.from !== f.to
          ? 'renamed'
          : 'modified',
    additions: f.additions,
    deletions: f.deletions,
  }));
}
