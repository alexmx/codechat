import { randomUUID, createHash } from 'node:crypto';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { mkdir, readFile, writeFile, readdir, unlink } from 'node:fs/promises';
import type { Session, FileSummary } from './types.js';

function getDataDir(): string {
  const xdg = process.env.XDG_DATA_HOME || join(homedir(), '.local', 'share');
  return join(xdg, 'codechat', 'sessions');
}

function repoHash(repoPath: string): string {
  return createHash('sha256').update(repoPath).digest('hex').slice(0, 16);
}

function sessionFileName(repoPath: string, sessionId: string): string {
  return `${repoHash(repoPath)}_${sessionId}.json`;
}

function sessionFilePath(repoPath: string, sessionId: string): string {
  return join(getDataDir(), sessionFileName(repoPath, sessionId));
}

export async function createSession(
  repoPath: string,
  diff: string,
  files: FileSummary[],
  message?: string,
): Promise<Session> {
  const now = new Date().toISOString();
  const session: Session = {
    id: randomUUID(),
    repoPath,
    createdAt: now,
    updatedAt: now,
    status: 'pending',
    diff,
    files,
    comments: [],
    ...(message ? { message } : {}),
  };
  // Remove any previous session file for this repo
  await removeRepoSessions(repoPath);
  await saveSession(session);
  return session;
}

export async function loadSession(sessionId: string): Promise<Session> {
  const dir = getDataDir();
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    throw new Error(`Session not found: ${sessionId}`);
  }
  const match = entries.find((e) => e.endsWith(`_${sessionId}.json`));
  if (!match) throw new Error(`Session not found: ${sessionId}`);
  const data = await readFile(join(dir, match), 'utf-8');
  return JSON.parse(data) as Session;
}

export async function saveSession(session: Session): Promise<void> {
  const dir = getDataDir();
  await mkdir(dir, { recursive: true });
  session.updatedAt = new Date().toISOString();
  await writeFile(
    sessionFilePath(session.repoPath, session.id),
    JSON.stringify(session, null, 2),
    'utf-8',
  );
}

export async function findSessionByRepo(repoPath: string): Promise<Session | null> {
  const dir = getDataDir();
  const prefix = repoHash(repoPath) + '_';
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return null;
  }
  const match = entries.find((e) => e.startsWith(prefix) && e.endsWith('.json'));
  if (!match) return null;
  try {
    const data = await readFile(join(dir, match), 'utf-8');
    return JSON.parse(data) as Session;
  } catch {
    return null;
  }
}

async function removeRepoSessions(repoPath: string): Promise<void> {
  const dir = getDataDir();
  const prefix = repoHash(repoPath);
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.startsWith(prefix) && entry.endsWith('.json')) {
      try { await unlink(join(dir, entry)); } catch { /* ignore */ }
    }
  }
}

/** Resume an existing session with fresh changes, resolving only comments the agent replied to. */
export function resumeSession(
  session: Session,
  diff: string,
  files: FileSummary[],
  options?: { message?: string; replies?: { commentId: string; body: string; resolved?: boolean }[] },
): void {
  session.diff = diff;
  session.files = files;
  session.status = 'pending';

  const replyMap = new Map(options?.replies?.map((r) => [r.commentId, r]));

  for (const comment of session.comments) {
    const reply = replyMap.get(comment.id);
    if (reply) {
      comment.agentReply = reply.body;
      if (reply.resolved !== false) {
        comment.resolved = true;
      }
    }
  }

  if (options?.message !== undefined) {
    session.message = options.message;
  }
}
