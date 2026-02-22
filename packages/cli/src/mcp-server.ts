import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { version } from './version.js';
import { executeReview, WorkflowError } from './workflow.js';

export async function startMcpServer(): Promise<void> {
  const server = new McpServer({
    name: 'codechat',
    version,
  });

  server.tool(
    'codechat_review',
    `Open a browser UI for the user to review uncommitted changes and leave inline comments. Blocks until the user submits. Returns a ReviewResult JSON with { sessionId, status, comments }.

Workflow:
1. When the result comes back, summarize each unresolved comment (file, line, what the reviewer said) and state your plan for each. Skip already-resolved comments.
2. Make the fixes.
3. Call codechat_reply to record your responses.
4. If status is "changes_requested" after replying, ask the user if they'd like another review round — then call codechat_review again.
5. Repeat until status is "approved".

Proactively offer a review when you've made significant code changes and want the user to verify before proceeding — don't wait to be asked.

Sessions are automatically resumed by repository path — calling this again on the same repo continues the existing session with all previous comments and replies preserved. Do not pass sessionId unless you need to resume a different session.`,
    {
      repoPath: z.string().describe('Absolute path to the git repository'),
      sessionId: z.string().optional().describe('Session ID to resume a specific past session. Usually not needed — sessions are auto-discovered by repoPath.'),
      description: z.string().optional().describe('Brief description of the changes (e.g. "Add user authentication"). Stored with the session.'),
      newSession: z.boolean().optional().describe('Force a fresh session instead of resuming the existing one. Only use when the user explicitly asks to start over.'),
    },
    async ({ repoPath, sessionId, description, newSession }) => {
      try {
        const outcome = await executeReview({
          repoPath,
          sessionId,
          description,
          newSession,
          openBrowser: true,
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
    'codechat_reply',
    `Record replies to review comments after making fixes. Returns immediately with the updated ReviewResult.

Always call this after making fixes — do not call codechat_review again just to submit replies. Set resolved to false on a reply when you have a clarifying question instead of a fix.`,
    {
      repoPath: z.string().describe('Absolute path to the git repository'),
      replies: z.array(z.object({
        commentId: z.string().describe('The comment ID being addressed'),
        body: z.string().describe('Your reply explaining what you did or asking for clarification'),
        resolved: z.boolean().optional().describe('Mark as resolved (default: true). Set to false to ask a follow-up question.'),
      })).describe('Replies addressing comments from the previous review round.'),
    },
    async ({ repoPath, replies }) => {
      try {
        const outcome = await executeReview({
          repoPath,
          replies,
          skipReview: true,
          openBrowser: false,
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

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
