import { isGitRepo, getRepoRoot, getDiff, parseFileSummaries } from './git.js';
import { resolveSession, loadSession, saveSession } from './session.js';
import { startReviewServer } from './server.js';
import { getWebDistPath } from './paths.js';
import type { ReviewResult, Session } from './types.js';
import open from 'open';

export class WorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkflowError';
  }
}

export interface ReviewOptions {
  repoPath: string;
  sessionId?: string;
  message?: string;
  replies?: { commentId: string; body: string; resolved?: boolean }[];
  skipReview?: boolean;
  port?: number;
  /** Session timeout in milliseconds */
  timeout?: number;
  /** Whether to open the browser (default: true) */
  openBrowser?: boolean;
}

export type ReviewOutcome =
  | { kind: 'empty_diff' }
  | { kind: 'skipped'; result: ReviewResult }
  | { kind: 'reviewed'; result: ReviewResult; url: string };

export async function executeReview(options: ReviewOptions): Promise<ReviewOutcome> {
  if (!(await isGitRepo(options.repoPath))) {
    throw new WorkflowError('Not a git repository.');
  }

  const canonicalPath = await getRepoRoot(options.repoPath);
  const diff = await getDiff(canonicalPath);

  if (!diff.trim()) {
    return { kind: 'empty_diff' };
  }

  const files = parseFileSummaries(diff);

  let session;
  try {
    session = await resolveSession(canonicalPath, diff, files, {
      sessionId: options.sessionId,
      message: options.message,
      replies: options.replies,
    });
  } catch (err) {
    throw new WorkflowError((err as Error).message);
  }

  if (options.skipReview) {
    const pendingComments = session.comments.filter((c) => !c.resolved);
    session.status = pendingComments.length > 0 ? 'changes_requested' : 'approved';
    await saveSession(session);
    const result: ReviewResult = {
      sessionId: session.id,
      status: session.status,
      comments: session.comments,
    };
    return { kind: 'skipped', result };
  }

  const webDistPath = await getWebDistPath();

  const reviewServer = await startReviewServer({
    session,
    webDistPath,
    port: options.port,
    timeout: options.timeout,
  });

  process.stderr.write(`Review server running at ${reviewServer.url}\n`);
  process.stderr.write(`Session: ${session.id}\n`);
  process.stderr.write(`Reviewing ${files.length} file(s)\n`);

  if (options.openBrowser !== false) {
    await open(reviewServer.url);
  }

  const result = await reviewServer.result;
  return { kind: 'reviewed', result, url: reviewServer.url };
}

export async function getSessionById(sessionId: string): Promise<Session> {
  try {
    return await loadSession(sessionId);
  } catch (err) {
    throw new WorkflowError((err as Error).message);
  }
}
