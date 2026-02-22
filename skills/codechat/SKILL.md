---
name: codechat
description: Use codechat to request human code review of your changes. Use when the user asks to review code, get feedback on changes, or when you want the user to review your work before proceeding.
argument-hint: [review]
---

# codechat — Human-in-the-Loop Code Review

`codechat` opens a browser UI where the user reviews your diff, leaves inline comments, and submits — like a pull request but locally.

**If the MCP tools `codechat_review` and `codechat_reply` are available, use those instead of the CLI.** The MCP tools integrate directly into the conversation. The guidance below applies to both — the workflow and behavior rules are the same.

## CLI Usage

Run `codechat` from the repository root. It blocks until the user submits, then prints a JSON result to stdout:

```bash
codechat -d "Add user authentication"
```

The JSON result contains `sessionId`, `status` (`"approved"` or `"changes_requested"`), and an array of `comments` with `id`, `filePath`, `line`, `body`, and `resolved`.

Other commands:

```bash
codechat sessions            # list sessions for this repo
codechat sessions <id>       # print full session JSON
codechat -s <id>             # resume a specific session
```

## Workflow

### 1. Review

Run `codechat` (CLI) or call `codechat_review` (MCP). The user reviews the diff in the browser and submits comments.

### 2. Summarize

Before making any changes, always summarize the unresolved comments to the user:

- **src/auth.ts:42** — "This should validate the token expiry" → I'll add an expiry check.
- **src/auth.ts:58** — "Add rate limiting here" → I'll add a rate limiter middleware.

Skip already-resolved comments from previous rounds.

### 3. Fix and respond

Make the code changes. Then:
- **MCP**: call `codechat_reply` with your replies. Set `resolved: true` when you've addressed a comment, `resolved: false` when you have a clarifying question.
- **CLI**: run `codechat` again — the session auto-resumes and the user sees the updated diff alongside previous comments.

### 4. Repeat if needed

If `status` is `"changes_requested"` after replying, ask the user if they'd like another review round. Repeat until `status` is `"approved"`.

## Behavior

- **Proactively offer a review** when you've made significant code changes — don't wait to be asked.
- **Always summarize comments** before making changes. The user needs to know you understood their feedback.
- **Always resume the existing session** — calling `codechat_review` or running `codechat` on the same repo automatically continues the current session with all previous comments and replies preserved. Never pass a new description or omit the repo path hoping to start fresh.
- **Don't call `codechat_review` just to submit replies** — use `codechat_reply` (MCP) or note your changes and run `codechat` again for a new round (CLI).
