# CodeChat

## What is CodeChat?

CodeChat is a human-in-the-loop code review tool for AI agents. It opens a browser UI where the user reviews diffs, leaves inline comments, and submits — like a pull request but locally. Available as a CLI and an MCP server.

## Project Structure

```
codechat/
├── package.json                     # pnpm monorepo root
├── pnpm-workspace.yaml
├── .codechat-version                # Single source of truth for version
├── packages/cli/
│   ├── src/
│   │   ├── cli.ts                   # CLI entry point, arg parsing, command routing
│   │   ├── workflow.ts              # Core orchestration — executeReview()
│   │   ├── mcp-server.ts            # MCP tools: codechat_review, codechat_reply
│   │   ├── server.ts                # HTTP + WebSocket review server
│   │   ├── session.ts               # Session CRUD, auto-resolution by repo
│   │   ├── git.ts                   # Diff generation, repo detection
│   │   ├── types.ts                 # Shared types, WebSocket protocol
│   │   ├── paths.ts                 # Web asset path resolution
│   │   └── index.ts                 # Public API re-exports
│   └── tsup.config.ts               # Bundles cli, mcp-server, index entry points
├── packages/web/
│   ├── src/
│   │   ├── App.tsx                   # Root component, layout, sidebar
│   │   ├── components/              # DiffView, CommentWidget, ReviewHeader, etc.
│   │   ├── context/ReviewContext.tsx # WebSocket connection + session state
│   │   └── hooks/                   # useWebSocket, useTheme, useGutterDrag
│   └── vite.config.ts
```

## Build & Run

```bash
pnpm install              # install all dependencies
pnpm build                # build both packages (cli + web)
pnpm build:cli            # build CLI only
pnpm build:web            # build web UI only
pnpm dev                  # watch mode for both packages
pnpm dev:web              # vite dev server for web UI only
```

**Requirements:** Node.js 20+, pnpm (managed via corepack).

**Dependencies:**
- `tsup` — CLI bundler (ESM, 3 entry points)
- `vite` + `react` + `tailwindcss` — Web UI
- `ws` — WebSocket server
- `@modelcontextprotocol/sdk` — MCP server framework
- `react-diff-view` + `refractor` — Syntax-highlighted diffs

To test the CLI locally after building:

```bash
node packages/cli/dist/cli.js --help
node packages/cli/dist/cli.js              # start a review in current repo
node packages/cli/dist/cli.js mcp --setup  # print MCP setup instructions
```

## Version Management & Releases

**Version source:** `.codechat-version` file in repository root.

- Single source of truth for version number
- GitHub Actions reads `.codechat-version`, sets package versions, builds, and publishes
- CLI exposes version via `codechat --version`

**Release process:**

1. Update `.codechat-version` with new version
2. Commit and push to main
3. Workflow creates git tag, builds tarball, publishes GitHub release
4. Homebrew formula in `alexmx/homebrew-tools` is updated automatically

## CLI Commands

```
codechat [options]           # review uncommitted changes
codechat sessions [<id>]     # list sessions or print full session JSON
codechat mcp [--setup]       # start MCP server or print setup instructions
```

| Option | Description |
|--------|-------------|
| `-s, --session <id>` | Resume a session |
| `-d, --description <text>` | Describe the changes |
| `-p, --port <n>` | Server port (default: random) |
| `-t, --timeout <min>` | Session timeout (default: 30) |
| `--no-open` | Don't open the browser |

## MCP Tools

- **`codechat_review`** — Opens browser UI, blocks until user submits. Params: `repoPath`, `sessionId?`, `description?`.
- **`codechat_reply`** — Records replies to comments, returns immediately. Params: `repoPath`, `replies`.

Both delegate to `executeReview()` in `workflow.ts`.

## Adding a New CLI Command

1. Add the command branch in `cli.ts` under `main()`
2. Implement the handler function in `cli.ts` (simple) or `workflow.ts` (shared with MCP)
3. If MCP needs it, add a `server.tool()` call in `mcp-server.ts`
4. Add any new types to `types.ts`
5. Update `printUsage()` in `cli.ts`

## Adding a Web Component

1. Create the component in `packages/web/src/components/`
2. Access session state via `useReview()` from `ReviewContext`
3. Send messages to the server via `send()` from `useReview()`
4. Style with Tailwind classes + CSS variables for theme support (dark/light)
