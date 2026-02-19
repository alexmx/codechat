import { randomUUID, createHash } from 'node:crypto';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import type { Session, Review, FileSummary } from './types.js';

function getDataDir(): string {
  const xdg = process.env.XDG_DATA_HOME || join(homedir(), '.local', 'share');
  return join(xdg, 'codechat', 'sessions');
}

function repoHash(repoPath: string): string {
  return createHash('sha256').update(repoPath).digest('hex').slice(0, 16);
}

function repoSessionPath(repoPath: string): string {
  return join(getDataDir(), `${repoHash(repoPath)}.json`);
}

export async function createSession(repoPath: string): Promise<Session> {
  const now = new Date().toISOString();
  const session: Session = {
    id: randomUUID(),
    repoPath,
    createdAt: now,
    updatedAt: now,
    reviews: [],
  };
  await saveSession(session);
  return session;
}

export async function loadSession(sessionId: string): Promise<Session> {
  // Scan — only used when --session-id is explicitly provided (rare path)
  const dir = getDataDir();
  const entries = await readdir(dir);
  for (const entry of entries) {
    if (!entry.endsWith('.json')) continue;
    try {
      const data = await readFile(join(dir, entry), 'utf-8');
      const session = JSON.parse(data) as Session;
      if (session.id === sessionId) return session;
    } catch {
      continue;
    }
  }
  throw new Error(`Session not found: ${sessionId}`);
}

export async function saveSession(session: Session): Promise<void> {
  const dir = getDataDir();
  await mkdir(dir, { recursive: true });
  session.updatedAt = new Date().toISOString();
  await writeFile(repoSessionPath(session.repoPath), JSON.stringify(session, null, 2), 'utf-8');
}

export async function findSessionByRepo(repoPath: string): Promise<Session | null> {
  try {
    const data = await readFile(repoSessionPath(repoPath), 'utf-8');
    return JSON.parse(data) as Session;
  } catch {
    return null;
  }
}

export function createReview(session: Session, diff: string, files: FileSummary[]): Review {
  const review: Review = {
    id: randomUUID(),
    sessionId: session.id,
    createdAt: new Date().toISOString(),
    status: 'pending',
    diff,
    files,
    comments: [],
  };
  session.reviews.push(review);
  return review;
}
