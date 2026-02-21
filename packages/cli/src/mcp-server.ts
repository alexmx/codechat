#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { isGitRepo, getRepoRoot, getDiff, parseFileSummaries } from './git.js';
import {
  createSession,
  loadSession,
  findSessionByRepo,
  resumeSession,
  saveSession,
} from './session.js';
import { startReviewServer } from './server.js';
import { getWebDistPath } from './paths.js';
import type { ReviewResult } from './types.js';
import open from 'open';

const server = new McpServer({
  name: 'codechat',
  version: '0.1.0',
});

server.tool(
  'codechat_review',
  `Request a code review for uncommitted changes. Returns a ReviewResult JSON with { sessionId, status, comments }.

Workflow:
1. First call: Opens a browser UI for the user to review the diff and leave inline comments. Blocks until the user submits.
2. When the result comes back, ALWAYS summarize NEW (unresolved) comments to the user before doing anything else:
   - List each unresolved comment with its file, line number, and what the reviewer said.
   - State what you plan to do for each one (fix it, ask a question, etc.).
   - Skip already-resolved comments — no need to repeat them.
3. Make the fixes, then call this tool again with replies addressing each comment and skipReview set to true.
4. When replying, set resolved: true (default) for addressed comments, or resolved: false to ask the user a clarifying question.
5. If skipReview is true, the tool returns immediately without opening the browser — the review loop is complete.
6. If the user asks to review or see the changes, call without skipReview so the browser opens.

The session persists automatically by repository path — you do not need to pass sessionId on subsequent calls.`,
  {
    repoPath: z.string().describe('Absolute path to the git repository'),
    sessionId: z.string().optional().describe('Explicit session ID override. Usually not needed — the session is auto-discovered by repoPath.'),
    message: z.string().optional().describe('Short summary of what you changed since the last round, shown to the reviewer in the UI header'),
    replies: z.array(z.object({
      commentId: z.string().describe('The comment ID being addressed'),
      body: z.string().describe('Your reply explaining what you did or asking for clarification'),
      resolved: z.boolean().optional().describe('Mark as resolved (default: true). Set to false to ask the user a follow-up question without resolving.'),
    })).optional().describe('Address comments from the previous round. Each reply is shown to the user alongside their original comment.'),
    skipReview: z.boolean().optional().describe('When true, return the result immediately without opening the browser. Only set this when you are submitting replies as part of the review loop — never when the user asks to review or see their changes.'),
  },
  async ({ repoPath, sessionId, message, replies, skipReview }) => {
    if (!(await isGitRepo(repoPath))) {
      return {
        content: [{ type: 'text' as const, text: 'Error: Not a git repository.' }],
        isError: true,
      };
    }

    const canonicalPath = await getRepoRoot(repoPath);
    const diff = await getDiff(canonicalPath);

    if (!diff.trim()) {
      return {
        content: [{ type: 'text' as const, text: 'No uncommitted changes found.' }],
      };
    }

    const files = parseFileSummaries(diff);

    let session;
    if (sessionId) {
      try {
        session = await loadSession(sessionId);
        resumeSession(session, diff, files, { message, replies });
        await saveSession(session);
      } catch {
        return {
          content: [{ type: 'text' as const, text: `Session not found: ${sessionId}` }],
          isError: true,
        };
      }
    } else {
      const existing = await findSessionByRepo(canonicalPath);
      if (existing) {
        session = existing;
        resumeSession(session, diff, files, { message, replies });
        await saveSession(session);
      } else {
        session = await createSession(canonicalPath, diff, files, message);
      }
    }

    // If the agent explicitly opted into skipping the browser, return the result
    // immediately — the agent is done submitting replies and doesn't need the UI.
    if (skipReview) {
      const pendingComments = session.comments.filter((c) => !c.resolved);
      session.status = pendingComments.length > 0 ? 'changes_requested' : 'approved';
      await saveSession(session);
      const result: ReviewResult = {
        sessionId: session.id,
        status: session.status,
        comments: session.comments,
      };
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }

    const webDistPath = await getWebDistPath();
    const reviewServer = await startReviewServer({ session, webDistPath });

    process.stderr.write(`CodeChat review: ${reviewServer.url}\n`);

    await open(reviewServer.url);

    const result = await reviewServer.result;

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.tool(
  'codechat_get_session',
  'Retrieve the current state of a review session without starting a new review round. Useful for re-reading comments or checking session status. Returns the full session JSON including all comments and their resolved/reply state.',
  {
    sessionId: z.string().describe('The session ID (returned as sessionId in the ReviewResult from codechat_review)'),
  },
  async ({ sessionId }) => {
    try {
      const session = await loadSession(sessionId);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(session, null, 2) }],
      };
    } catch {
      return {
        content: [{ type: 'text' as const, text: `Session not found: ${sessionId}` }],
        isError: true,
      };
    }
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  process.stderr.write(`MCP server error: ${err.message}\n`);
  process.exit(1);
});
