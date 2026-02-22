#!/usr/bin/env node

import { parseArgs } from 'node:util';
import { version } from './version.js';
import { executeReview, getSessionById, listSessions, WorkflowError } from './workflow.js';

function printUsage(): void {
  console.error(`
Usage: codechat [options]
       codechat sessions [<id>]
       codechat mcp [--setup]

Options:
  -s, --session <id>         Resume a session
  -d, --description <text>   Describe the changes
  -p, --port <n>             Server port
  -t, --timeout <min>        Session timeout (default: 30)
  --no-open                  Don't open browser
  -v, --version              Show version
  -h, --help                 Show this help
`);
}

function printMcpSetup(): void {
  console.log(`Add codechat as an MCP server to your AI coding agent:

  Claude Code:          claude mcp add --transport stdio codechat -- codechat mcp
  Codex CLI:            codex mcp add codechat -- codechat mcp
  VS Code / Copilot:    code --add-mcp '{"name":"codechat","command":"codechat","args":["mcp"]}'
  Cursor:               cursor --add-mcp '{"name":"codechat","command":"codechat","args":["mcp"]}'`);
}

async function runReview(options: {
  session?: string;
  description?: string;
  port?: string;
  timeout?: string;
  'no-open'?: boolean;
}): Promise<void> {
  const outcome = await executeReview({
    repoPath: process.cwd(),
    sessionId: options.session,
    description: options.description,
    port: options.port ? parseInt(options.port, 10) : undefined,
    timeout: options.timeout ? parseInt(options.timeout, 10) * 60_000 : undefined,
    openBrowser: !options['no-open'],
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

async function runSessions(sessionId?: string): Promise<void> {
  if (sessionId) {
    const session = await getSessionById(sessionId);
    console.log(JSON.stringify(session, null, 2));
    return;
  }

  const sessions = await listSessions(process.cwd());
  if (sessions.length === 0) {
    console.error('No sessions found for this repository.');
    return;
  }
  for (const s of sessions) {
    const date = new Date(s.updatedAt).toLocaleString();
    const comments = s.comments.length;
    const pending = s.comments.filter((c) => !c.resolved).length;
    const desc = s.description ? `  ${s.description}` : '';
    const commentInfo = comments > 0
      ? ` (${comments} comment${comments !== 1 ? 's' : ''}${pending > 0 ? `, ${pending} pending` : ''})`
      : '';
    console.log(`${s.id}  ${s.status.padEnd(17)}  ${date}${commentInfo}${desc}`);
  }
}

async function runMcp(): Promise<void> {
  const { startMcpServer } = await import('./mcp-server.js');
  await startMcpServer();
}

process.on('SIGINT', () => {
  process.stderr.write('\nReview cancelled.\n');
  process.exit(130);
});

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      session: { type: 'string', short: 's' },
      description: { type: 'string', short: 'd' },
      port: { type: 'string', short: 'p' },
      timeout: { type: 'string', short: 't' },
      'no-open': { type: 'boolean' },
      setup: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'v' },
    },
    allowPositionals: true,
  });

  const command = positionals[0];

  if (values.version) {
    console.log(version);
    process.exit(0);
  }

  if (values.help) {
    printUsage();
    process.exit(0);
  }

  if (command === 'sessions') {
    await runSessions(positionals[1]);
  } else if (command === 'mcp') {
    if (values.setup) {
      printMcpSetup();
      process.exit(0);
    }
    await runMcp();
  } else if (!command) {
    await runReview(values);
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
