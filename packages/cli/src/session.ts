import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import type { Session, Review, FileSummary } from './types.js';

function getDataDir(): string {
  const xdg = process.env.XDG_DATA_HOME || join(process.env.HOME!, '.local', 'share');
  return join(xdg, 'codechat', 'sessions');
}

function sessionPath(sessionId: string): string {
  return join(getDataDir(), `${sessionId}.json`);
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
  const data = await readFile(sessionPath(sessionId), 'utf-8');
  return JSON.parse(data) as Session;
}

export async function saveSession(session: Session): Promise<void> {
  const dir = getDataDir();
  await mkdir(dir, { recursive: true });
  session.updatedAt = new Date().toISOString();
  await writeFile(sessionPath(session.id), JSON.stringify(session, null, 2), 'utf-8');
}

export async function findSessionByRepo(repoPath: string): Promise<Session | null> {
  const dir = getDataDir();
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return null;
  }

  for (const entry of entries) {
    if (!entry.endsWith('.json')) continue;
    try {
      const data = await readFile(join(dir, entry), 'utf-8');
      const session = JSON.parse(data) as Session;
      if (session.repoPath === repoPath) return session;
    } catch {
      continue;
    }
  }

  return null;
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
