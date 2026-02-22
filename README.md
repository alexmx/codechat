# CodeChat

**Human-in-the-loop code review for AI agents.**

Review your AI agent's code changes like a pull request — but locally. CodeChat opens a browser UI where you review the diff, leave inline comments, and submit. The agent reads your comments, makes fixes, and replies — a tight feedback loop that keeps you in control without breaking the agent's flow.

<p align="center">
<img width="900" alt="Screenshot 2026-02-22 at 21 41 44" src="https://github.com/user-attachments/assets/daca68cf-70f8-4ae5-9902-7f102b722f0a" />
<p/>
 
## Features

- **Browser-based review UI** — Syntax-highlighted diffs with inline commenting, dark/light theme
- **Real-time updates** — File changes are pushed to the browser as they happen
- **Session management** — Resume any past review session by ID
- **MCP integration** — Connect to any AI coding agent as an MCP server
- **Works with any git repo** — Reviews all uncommitted changes

## Installation

### Homebrew

```bash
brew install alexmx/tools/codechat
```

To update:

```bash
brew upgrade alexmx/tools/codechat
```

### Mise

```bash
mise use --global github:alexmx/codechat
```

Or in `mise.toml` for a project-scoped install:

```toml
[tools]
"github:alexmx/codechat" = "latest"
```

## Quick Start

1. Set up the MCP server:

```bash
codechat mcp --setup
```

```
Add codechat as an MCP server to your AI coding agent:

  Claude Code:          claude mcp add --transport stdio codechat -- codechat mcp
  Codex CLI:            codex mcp add codechat -- codechat mcp
  VS Code / Copilot:    code --add-mcp '{"name":"codechat","command":"codechat","args":["mcp"]}'
  Cursor:               cursor --add-mcp '{"name":"codechat","command":"codechat","args":["mcp"]}'
```

2. Ask the agent to review its changes. It calls `codechat_review`, you see:

```
Review server running at http://127.0.0.1:52341/abc-123
Session: abc-123
Reviewing 3 file(s)
```

3. Review in the browser, leave comments, submit.
4. The agent gets your comments, makes fixes, calls `codechat_reply`.
5. Ask the agent to open the review again if you want another round.

### Manage sessions

```bash
codechat sessions            # list sessions for this repo
codechat sessions <id>       # print full session JSON
codechat -s <id>             # resume a specific session in the browser
```

## CLI Reference

```
Usage: codechat [options]
       codechat sessions [<id>]
       codechat mcp [--setup]
```

| Option | Description |
|--------|-------------|
| `-s, --session <id>` | Resume a session |
| `-d, --description <text>` | Describe the changes |
| `-p, --port <n>` | Server port (default: random) |
| `-t, --timeout <min>` | Session timeout (default: 30) |
| `--no-open` | Don't open the browser |
| `-v, --version` | Show version |
| `-h, --help` | Show help |

| Command | Description |
|---------|-------------|
| `codechat` | Review current uncommitted changes |
| `codechat sessions` | List sessions for this repo |
| `codechat sessions <id>` | Print full session JSON |
| `codechat mcp` | Start MCP server over stdio |
| `codechat mcp --setup` | Print setup instructions for AI agents |

## MCP Server

CodeChat exposes two MCP tools designed for the review loop:

### `codechat_review`

Opens the browser UI and blocks until the user submits. Returns a `ReviewResult` with all comments.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `repoPath` | string | yes | Absolute path to the git repository |
| `sessionId` | string | no | Session ID to resume (auto-discovered by default) |
| `description` | string | no | Brief description stored with the session |

### `codechat_reply`

Records agent replies to review comments. Returns immediately with the updated result.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `repoPath` | string | yes | Absolute path to the git repository |
| `replies` | array | yes | Replies addressing comments from the previous round |

Each reply in the array:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `commentId` | string | yes | The comment ID being addressed |
| `body` | string | yes | What you did or a clarifying question |
| `resolved` | boolean | no | Mark as resolved (default: true). Set to false to ask a follow-up. |

## License

MIT License - see [LICENSE](LICENSE) for details.
