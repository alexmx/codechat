import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { watch, type FSWatcher } from 'node:fs';
import { join, extname } from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { WebSocketServer, type WebSocket } from 'ws';
import { z } from 'zod';
import type {
  Session,
  Comment,
  ReviewResult,
  ReviewServer,
  ServerMessage,
} from './types.js';
import { getDiff, parseFileSummaries } from './git.js';
import { saveSession } from './session.js';

const AddCommentSchema = z.object({
  type: z.literal('add_comment'),
  data: z.object({
    filePath: z.string(),
    line: z.number().int(),
    endLine: z.number().int().optional(),
    side: z.enum(['old', 'new']),
    body: z.string().min(1),
  }),
});

const EditCommentSchema = z.object({
  type: z.literal('edit_comment'),
  data: z.object({ id: z.string(), body: z.string().min(1) }),
});

const DeleteCommentSchema = z.object({
  type: z.literal('delete_comment'),
  data: z.object({ id: z.string() }),
});

const SubmitReviewSchema = z.object({
  type: z.literal('submit_review'),
  data: z.object({
    summary: z.string().optional(),
  }).optional(),
});

const ClientMessageSchema = z.discriminatedUnion('type', [
  AddCommentSchema,
  EditCommentSchema,
  DeleteCommentSchema,
  SubmitReviewSchema,
]);

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

async function serveStatic(
  webDistPath: string,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const url = req.url === '/' ? '/index.html' : req.url!;
  const filePath = join(webDistPath, url);

  // Prevent directory traversal
  if (!filePath.startsWith(webDistPath)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) throw new Error('Not a file');

    const ext = extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const content = await readFile(filePath);

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch {
    // SPA fallback: serve index.html for unknown routes
    try {
      const indexContent = await readFile(join(webDistPath, 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(indexContent);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  }
}

function send(ws: WebSocket, msg: ServerMessage): void {
  ws.send(JSON.stringify(msg));
}

function broadcast(wss: WebSocketServer, msg: ServerMessage): void {
  const data = JSON.stringify(msg);
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      client.send(data);
    }
  }
}

interface ServerOptions {
  session: Session;
  webDistPath: string;
  port?: number;
  timeout?: number;
}

const DEFAULT_TIMEOUT = 30 * 60 * 1000; // 30 minutes
// Grace period after all browser tabs close before auto-submitting the review
const DISCONNECT_GRACE = 5_000;

export async function startReviewServer(options: ServerOptions): Promise<ReviewServer> {
  const { session, webDistPath, port = 0, timeout = DEFAULT_TIMEOUT } = options;

  return new Promise<ReviewServer>((resolveServer) => {
    let resolveResult: (result: ReviewResult) => void;
    const resultPromise = new Promise<ReviewResult>((r) => {
      resolveResult = r;
    });

    let submitted = false;
    let disconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let timeoutTimer: ReturnType<typeof setTimeout> | null = null;
    let fileWatcher: FSWatcher | null = null;
    let watchDebounce: ReturnType<typeof setTimeout> | null = null;

    const httpServer = createServer(async (req, res) => {
      await serveStatic(webDistPath, req, res);
    });

    const wss = new WebSocketServer({ server: httpServer });

    let reviewSummary: string | undefined;

    async function doSubmit(): Promise<void> {
      if (submitted) return;
      submitted = true;

      const pendingComments = session.comments.filter((c) => !c.resolved);
      const status = pendingComments.length > 0 ? 'changes_requested' : 'approved';
      session.status = status;
      await saveSession(session);

      broadcast(wss, { type: 'review_complete' });

      const result: ReviewResult = {
        sessionId: session.id,
        status,
        comments: session.comments,
        ...(reviewSummary ? { summary: reviewSummary } : {}),
      };

      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (disconnectTimer) clearTimeout(disconnectTimer);
      if (watchDebounce) clearTimeout(watchDebounce);
      if (fileWatcher) {
        fileWatcher.close();
        fileWatcher = null;
      }

      for (const client of wss.clients) {
        client.close();
      }
      wss.close();

      httpServer.closeAllConnections();
      httpServer.close(() => resolveResult(result));
    }

    wss.on('connection', (ws: WebSocket) => {
      // Cancel any pending disconnect timer (tab refresh / reconnect)
      if (disconnectTimer) {
        clearTimeout(disconnectTimer);
        disconnectTimer = null;
      }

      send(ws, { type: 'init', data: session });

      ws.on('close', () => {
        if (submitted) return;
        const activeClients = [...wss.clients].filter((c) => c.readyState === c.OPEN);
        if (activeClients.length === 0) {
          disconnectTimer = setTimeout(() => {
            doSubmit().catch((err) => process.stderr.write(`Submit error: ${err}\n`));
          }, DISCONNECT_GRACE);
        }
      });

      ws.on('message', async (raw: Buffer) => {
        if (submitted) return;

        let json: unknown;
        try {
          json = JSON.parse(raw.toString());
        } catch {
          return;
        }

        const parsed = ClientMessageSchema.safeParse(json);
        if (!parsed.success) return;
        const msg = parsed.data;

        switch (msg.type) {
          case 'add_comment': {
            const { filePath, line, endLine, side, body } = msg.data;
            const comment: Comment = {
              id: randomUUID(),
              filePath,
              line,
              ...(endLine && endLine !== line ? { endLine } : {}),
              side,
              body,
              createdAt: new Date().toISOString(),
              resolved: false,
            };
            session.comments.push(comment);
            await saveSession(session);
            broadcast(wss, { type: 'comment_added', data: comment });
            break;
          }

          case 'edit_comment': {
            const { id, body } = msg.data;
            const comment = session.comments.find((c) => c.id === id);
            if (!comment || comment.resolved) break;
            comment.body = body;
            await saveSession(session);
            broadcast(wss, { type: 'comment_edited', data: { id, body } });
            break;
          }

          case 'delete_comment': {
            const { id } = msg.data;
            const comment = session.comments.find((c) => c.id === id);
            if (!comment || comment.resolved) break;
            session.comments = session.comments.filter((c) => c.id !== id);
            await saveSession(session);
            broadcast(wss, { type: 'comment_deleted', data: { id } });
            break;
          }

          case 'submit_review': {
            if (msg.data?.summary) {
              reviewSummary = msg.data.summary;
            }
            await doSubmit();
            break;
          }
        }
      });
    });

    httpServer.listen(port, '127.0.0.1', () => {
      const addr = httpServer.address();
      const actualPort = typeof addr === 'object' && addr ? addr.port : port;

      // Start the overall timeout
      timeoutTimer = setTimeout(() => {
        doSubmit().catch((err) => process.stderr.write(`Submit error: ${err}\n`));
      }, timeout);

      // Watch for file changes and update diff live
      try {
        fileWatcher = watch(session.repoPath, { recursive: true }, (_event, filename) => {
          if (submitted) return;
          if (typeof filename === 'string' && (filename === '.git' || filename.startsWith('.git/') || filename.includes('/node_modules/') || filename.startsWith('node_modules/'))) return;
          if (watchDebounce) clearTimeout(watchDebounce);
          watchDebounce = setTimeout(async () => {
            try {
              const newDiff = await getDiff(session.repoPath);
              if (newDiff === session.diff) return;
              const newFiles = parseFileSummaries(newDiff);
              session.diff = newDiff;
              session.files = newFiles;
              broadcast(wss, { type: 'diff_updated', data: { diff: newDiff, files: newFiles } });
            } catch {
              // getDiff may fail transiently (e.g. mid-write); ignore and retry on next event
            }
          }, 500);
        });
      } catch {
        // fs.watch may not be available; proceed without live updates
      }

      resolveServer({
        port: actualPort,
        url: `http://127.0.0.1:${actualPort}/${session.id}`,
        result: resultPromise,
      });
    });
  });
}
