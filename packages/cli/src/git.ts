import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
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

export async function hasCommits(cwd: string): Promise<boolean> {
  try {
    await exec('git', ['rev-parse', 'HEAD'], { cwd });
    return true;
  } catch {
    return false;
  }
}

export async function getDiff(cwd: string): Promise<string> {
  if (await hasCommits(cwd)) {
    const { stdout } = await exec('git', ['diff', 'HEAD'], { cwd, maxBuffer: 10 * 1024 * 1024 });
    return stdout;
  }

  // Fresh repo with no commits — diff staged files
  const { stdout: staged } = await exec('git', ['diff', '--cached'], { cwd, maxBuffer: 10 * 1024 * 1024 });
  return staged;
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
