#!/usr/bin/env node

import { parseArgs } from 'node:util';
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

function printUsage(): void {
  console.error(`
Usage: codechat review [options]

Start an interactive code review for uncommitted changes.

Options:
  -s, --session-id <id>   Reuse an existing session
  -m, --message <text>    Description of what changed (shown in review UI)
  -p, --port <number>     Use a specific port (default: random)
  --no-open               Don't open the browser automatically
  -h, --help              Show this help
`);
}

async function runReview(options: {
  'session-id'?: string;
  message?: string;
  port?: string;
  'no-open'?: boolean;
}): Promise<void> {
  const cwd = process.cwd();

  if (!(await isGitRepo(cwd))) {
    console.error('Error: Not a git repository.');
    process.exit(1);
  }

  const repoPath = await getRepoRoot(cwd);

  const diff = await getDiff(repoPath);
  if (!diff.trim()) {
    console.error('No uncommitted changes found.');
    process.exit(0);
  }

  const files = parseFileSummaries(diff);

  let session;
  if (options['session-id']) {
    session = await loadSession(options['session-id']);
    resumeSession(session, diff, files, { message: options.message });
    await saveSession(session);
  } else {
    const existing = await findSessionByRepo(repoPath);
    if (existing) {
      session = existing;
      resumeSession(session, diff, files, { message: options.message });
      await saveSession(session);
    } else {
      session = await createSession(repoPath, diff, files, options.message);
    }
  }

  const webDistPath = await getWebDistPath();
  const port = options.port ? parseInt(options.port, 10) : 0;

  console.error('Starting CodeChat review server...');

  const server = await startReviewServer({
    session,
    webDistPath,
    port,
  });

  console.error(`Review server running at ${server.url}`);
  console.error(`Session: ${session.id}`);
  console.error(`Reviewing ${files.length} file(s)\n`);

  if (!options['no-open']) {
    await open(server.url);
  }

  const result = await server.result;
  console.log(JSON.stringify(result, null, 2));
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
      port: { type: 'string', short: 'p' },
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
  } else {
    console.error(`Unknown command: ${command}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
