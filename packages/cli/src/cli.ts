#!/usr/bin/env node

import { parseArgs } from 'node:util';
import { executeReview, getSessionById, WorkflowError } from './workflow.js';

function printUsage(): void {
  console.error(`
Usage: codechat <command> [options]

Commands:
  review        Start an interactive code review (default)
  get-session   Retrieve a session by ID

Review options:
  -s, --session-id <id>     Reuse an existing session
  -m, --message <text>      Description of what changed
  -r, --replies <json|->    JSON array of replies (use - for stdin)
  --skip-review             Return result without opening browser
  -p, --port <number>       Use a specific port (default: random)
  -t, --timeout <minutes>   Session timeout in minutes (default: 30)
  --no-open                 Don't open the browser automatically
  -h, --help                Show this help
`);
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

async function runReview(options: {
  'session-id'?: string;
  message?: string;
  replies?: string;
  'skip-review'?: boolean;
  port?: string;
  timeout?: string;
  'no-open'?: boolean;
}): Promise<void> {
  let replies;
  if (options.replies) {
    const raw = options.replies === '-' ? await readStdin() : options.replies;
    try {
      replies = JSON.parse(raw);
    } catch {
      console.error('Error: --replies must be valid JSON.');
      process.exit(1);
    }
  }

  const outcome = await executeReview({
    repoPath: process.cwd(),
    sessionId: options['session-id'],
    message: options.message,
    replies,
    skipReview: options['skip-review'],
    port: options.port ? parseInt(options.port, 10) : undefined,
    timeout: options.timeout ? parseInt(options.timeout, 10) * 60_000 : undefined,
    openBrowser: !options['no-open'] && !options['skip-review'],
  });

  switch (outcome.kind) {
    case 'empty_diff':
      console.error('No uncommitted changes found.');
      process.exit(0);
      break;
    case 'skipped':
    case 'reviewed':
      console.log(JSON.stringify(outcome.result, null, 2));
      break;
  }
}

async function runGetSession(sessionId: string): Promise<void> {
  const session = await getSessionById(sessionId);
  console.log(JSON.stringify(session, null, 2));
}

process.on('SIGINT', () => {
  process.stderr.write('\nReview cancelled.\n');
  process.exit(130);
});

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      'session-id': { type: 'string', short: 's' },
      message: { type: 'string', short: 'm' },
      replies: { type: 'string', short: 'r' },
      'skip-review': { type: 'boolean' },
      port: { type: 'string', short: 'p' },
      timeout: { type: 'string', short: 't' },
      'no-open': { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: true,
  });

  const command = positionals[0] ?? 'review';

  if (values.help || command === 'help') {
    printUsage();
    process.exit(0);
  }

  if (command === 'review') {
    await runReview(values);
  } else if (command === 'get-session') {
    const sessionId = positionals[1] || values['session-id'];
    if (!sessionId) {
      console.error('Usage: codechat get-session <session-id>');
      process.exit(1);
    }
    await runGetSession(sessionId);
  } else {
    console.error(`Unknown command: ${command}`);
    process.exit(1);
  }
}

main().catch((err) => {
  if (err instanceof WorkflowError) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
  console.error(err.message);
  process.exit(1);
});
