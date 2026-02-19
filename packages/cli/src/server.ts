import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { join, extname } from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { WebSocketServer, type WebSocket } from 'ws';
import { z } from 'zod';
import type {
  Session,
  Review,
  Comment,
  ReviewResult,
  ReviewServer,
  ServerMessage,
} from './types.js';
import { saveSession } from './session.js';

const AddCommentSchema = z.object({
  type: z.literal('add_comment'),
  data: z.object({
    filePath: z.string(),
    line: z.number().int(),
    side: z.enum(['old', 'new']),
    body: z.string().min(1),
  }),
});

const DeleteCommentSchema = z.object({
  type: z.literal('delete_comment'),
  data: z.object({ id: z.string() }),
});

const SubmitReviewSchema = z.object({
  type: z.literal('submit_review'),
});

const ClientMessageSchema = z.discriminatedUnion('type', [
  AddCommentSchema,
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
  review: Review;
  webDistPath: string;
  port?: number;
}

export async function startReviewServer(options: ServerOptions): Promise<ReviewServer> {
  const { session, review, webDistPath, port = 0 } = options;

  return new Promise<ReviewServer>((resolveServer) => {
    let resolveResult: (result: ReviewResult) => void;
    const resultPromise = new Promise<ReviewResult>((r) => {
      resolveResult = r;
    });

    const httpServer = createServer(async (req, res) => {
      await serveStatic(webDistPath, req, res);
    });

    const wss = new WebSocketServer({ server: httpServer });

    wss.on('connection', (ws: WebSocket) => {
      send(ws, { type: 'init', data: review });

      ws.on('message', async (raw: Buffer) => {
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
            const { filePath, line, side, body } = msg.data;
            const comment: Comment = {
              id: randomUUID(),
              filePath,
              line,
              side,
              body,
              createdAt: new Date().toISOString(),
            };
            review.comments.push(comment);
            await saveSession(session);
            broadcast(wss, { type: 'comment_added', data: comment });
            break;
          }

          case 'delete_comment': {
            const { id } = msg.data;
            review.comments = review.comments.filter((c) => c.id !== id);
            await saveSession(session);
            broadcast(wss, { type: 'comment_deleted', data: { id } });
            break;
          }

          case 'submit_review': {
            const status = review.comments.length > 0 ? 'changes_requested' : 'approved';
            review.status = status;
            await saveSession(session);
            broadcast(wss, { type: 'review_complete' });

            const result: ReviewResult = {
              sessionId: session.id,
              reviewId: review.id,
              status,
              comments: review.comments,
            };

            // Close all WebSocket clients first
            for (const client of wss.clients) {
              client.close();
            }
            wss.close();

            // Force-close all open sockets so httpServer.close() can complete
            httpServer.closeAllConnections();
            httpServer.close(() => resolveResult(result));
            break;
          }
        }
      });
    });

    httpServer.listen(port, '127.0.0.1', () => {
      const addr = httpServer.address();
      const actualPort = typeof addr === 'object' && addr ? addr.port : port;
      resolveServer({
        port: actualPort,
        url: `http://127.0.0.1:${actualPort}`,
        result: resultPromise,
      });
    });
  });
}
