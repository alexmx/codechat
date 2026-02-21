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
import open from 'open';

const server = new McpServer({
  name: 'codechat',
  version: '0.1.0',
});

server.tool(
  'codechat_review',
  'Start an interactive code review for uncommitted changes. Opens a browser UI where the user can leave inline comments and approve or request changes. Blocks until the user submits their review.',
  {
    repoPath: z.string().describe('Absolute path to the git repository'),
    sessionId: z.string().optional().describe('Reuse an existing session ID'),
    message: z.string().optional().describe('Description of what changed, shown to the reviewer'),
    replies: z.array(z.object({
      commentId: z.string().describe('The comment ID to reply to'),
      body: z.string().describe('The reply text'),
    })).optional().describe('Replies to comments from the previous review round'),
  },
  async ({ repoPath, sessionId, message, replies }) => {
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
  'Retrieve the current state of a code review session, including all comments.',
  {
    sessionId: z.string().describe('The session ID to retrieve'),
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
