#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { executeReview, getSessionById, WorkflowError } from './workflow.js';

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
    sessionId: z.string().optional().describe('Explicit session ID to resume. Usually not needed — sessions are auto-discovered by repoPath. Use this to resume a completed session if the user changes their mind.'),
    message: z.string().optional().describe('Short summary of what you changed since the last round, shown to the reviewer in the UI header'),
    replies: z.array(z.object({
      commentId: z.string().describe('The comment ID being addressed'),
      body: z.string().describe('Your reply explaining what you did or asking for clarification'),
      resolved: z.boolean().optional().describe('Mark as resolved (default: true). Set to false to ask the user a follow-up question without resolving.'),
    })).optional().describe('Address comments from the previous round. Each reply is shown to the user alongside their original comment.'),
    skipReview: z.boolean().optional().describe('When true, return the result immediately without opening the browser. Only set this when you are submitting replies as part of the review loop — never when the user asks to review or see their changes.'),
    port: z.number().int().positive().optional().describe('Specific port for the review server (default: random available port)'),
    timeout: z.number().int().positive().optional().describe('Session timeout in minutes (default: 30). The review auto-submits when this expires.'),
  },
  async ({ repoPath, sessionId, message, replies, skipReview, port, timeout }) => {
    try {
      const outcome = await executeReview({
        repoPath,
        sessionId,
        message,
        replies,
        skipReview,
        port,
        timeout: timeout ? timeout * 60_000 : undefined,
        openBrowser: !skipReview,
      });

      if (outcome.kind === 'empty_diff') {
        return { content: [{ type: 'text' as const, text: 'No uncommitted changes found.' }] };
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(outcome.result, null, 2) }],
      };
    } catch (err) {
      if (err instanceof WorkflowError) {
        return { content: [{ type: 'text' as const, text: err.message }], isError: true };
      }
      throw err;
    }
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
      const session = await getSessionById(sessionId);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(session, null, 2) }],
      };
    } catch (err) {
      if (err instanceof WorkflowError) {
        return { content: [{ type: 'text' as const, text: err.message }], isError: true };
      }
      throw err;
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
