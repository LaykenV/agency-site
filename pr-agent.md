# PR-Agent setup

This repository runs the open-source PR-Agent GitHub Action on every pull
request. It sends PR diffs to `openrouter/z-ai/glm-5.3-flash` through
OpenRouter. It does not use Qodo's hosted service.

## Files and secret

- `.pr_agent.toml` sets the model, context limit, persistent comments, and
  automatic commands.
- `.github/workflows/pr-agent.yml` runs PR-Agent on PR and comment events.
- The Actions secret `OPENROUTER_API_KEY` is required. GitHub supplies
  `GITHUB_TOKEN`.

The action is pinned to `the-pr-agent/pr-agent@v0.43.0`. Restricted mode keeps
repository contents read-only. The one-million-token override is necessary
because this GLM model is not in PR-Agent's built-in token table.

## Event flow

| Event                                           | What runs                 |
| ----------------------------------------------- | ------------------------- |
| PR opened, reopened, or marked ready            | `/describe` and `/review` |
| Push to an open PR                              | `/review`                 |
| Comment `/review`, `/describe`, or `/ask "..."` | The requested tool        |

The bot-sender guard prevents PR-Agent comments from retriggering the workflow.
The concurrency group cancels a stale review when another push arrives.
Persistent summary and inline comments update in place instead of duplicating
old findings. PR-Agent also reads the root `AGENTS.md`.

## Agent workflow

The versioned `file-pr` skill runs the clean-tree, existing-PR, verification,
and diff preflight before opening a real PR with a problem-first body. The
`babysit-pr` skill polls checks and review threads, verifies findings against
source, fixes real defects, explains false positives, and repeats until the
latest commit is clean.

Neither skill merges without explicit approval. Merging to `main` triggers the
Vercel production build. `scripts/vercel-build.mjs` deploys Convex first, then
builds the Next.js site. The babysitter watches the exact merge commit's Vercel
status and then runs `bun run smoke:production`.

Preview builds never deploy Convex. They compile the Next.js site against
disabled placeholder endpoints, so preview deployments cannot read or mutate
production data. Use local development for interactive backend testing.

Direct pushes to `main` remain available when the owner explicitly asks for a
small change. The default agent workflow is still a branch and PR.
