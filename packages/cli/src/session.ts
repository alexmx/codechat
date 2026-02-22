import { randomUUID, createHash } from 'node:crypto';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { mkdir, readFile, writeFile, readdir, unlink, stat } from 'node:fs/promises';
import type { Session, FileSummary } from './types.js';

const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

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
  description?: string,
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
    ...(description ? { description } : {}),
  };
  await saveSession(session);
  pruneExpiredSessions();
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
  try {
    return JSON.parse(data) as Session;
  } catch {
    throw new Error(`Session file corrupted: ${sessionId}`);
  }
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
  const matches = entries.filter((e) => e.startsWith(prefix) && e.endsWith('.json'));
  if (matches.length === 0) return null;

  // Return the most recently updated session for this repo
  let latest: Session | null = null;
  for (const match of matches) {
    try {
      const data = await readFile(join(dir, match), 'utf-8');
      const session = JSON.parse(data) as Session;
      if (!latest || session.updatedAt > latest.updatedAt) {
        latest = session;
      }
    } catch (err) {
      process.stderr.write(`Warning: could not read session file ${match}: ${err}\n`);
    }
  }
  return latest;
}

export async function listSessionsByRepo(repoPath: string): Promise<Session[]> {
  const dir = getDataDir();
  const prefix = repoHash(repoPath) + '_';
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }
  const matches = entries.filter((e) => e.startsWith(prefix) && e.endsWith('.json'));
  const sessions: Session[] = [];
  for (const match of matches) {
    try {
      const data = await readFile(join(dir, match), 'utf-8');
      sessions.push(JSON.parse(data) as Session);
    } catch { /* skip corrupted */ }
  }
  return sessions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Fire-and-forget cleanup of sessions older than 30 days. */
function pruneExpiredSessions(): void {
  const dir = getDataDir();
  const cutoff = Date.now() - SESSION_MAX_AGE_MS;
  readdir(dir).then(async (entries) => {
    for (const entry of entries) {
      if (!entry.endsWith('.json')) continue;
      try {
        const s = await stat(join(dir, entry));
        if (s.mtimeMs < cutoff) await unlink(join(dir, entry));
      } catch { /* ignore */ }
    }
  }).catch(() => { /* ignore */ });
}

export interface ResolveSessionOptions {
  description?: string;
  replies?: { commentId: string; body: string; resolved?: boolean }[];
}

/** Resume an existing session with fresh changes, resolving only comments the agent replied to. */
export function resumeSession(
  session: Session,
  diff: string,
  files: FileSummary[],
  options?: ResolveSessionOptions,
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
}

/**
 * Resolve or create a session for a given repo.
 * - If sessionId is provided, loads that specific session and resumes it.
 * - Otherwise, auto-discovers by repoPath:
 *   - Resumes if the session is still pending or replies are provided.
 *   - Creates a fresh session if the previous review was completed.
 */
export async function resolveSession(
  repoPath: string,
  diff: string,
  files: FileSummary[],
  options?: ResolveSessionOptions & { sessionId?: string },
): Promise<Session> {
  const { sessionId, ...resumeOpts } = options ?? {};

  if (sessionId) {
    const session = await loadSession(sessionId);
    resumeSession(session, diff, files, resumeOpts);
    await saveSession(session);
    return session;
  }

  const existing = await findSessionByRepo(repoPath);
  if (existing && (existing.status === 'pending' || resumeOpts.replies?.length)) {
    resumeSession(existing, diff, files, resumeOpts);
    await saveSession(existing);
    return existing;
  }

  return createSession(repoPath, diff, files, resumeOpts.description);
}
