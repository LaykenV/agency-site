# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

WaaS (Website-as-a-Service) platform for Acadiana Web Design. Next.js 15 frontend + Convex cloud backend. See `CLAUDE.md` for full architecture and command reference.

### Development commands

All commands use `bun` as the package manager (lockfile: `bun.lock`). Standard commands are documented in `CLAUDE.md` and `package.json` scripts.

### Environment setup

- **Bun** must be installed (`curl -fsSL https://bun.sh/install | bash`). Add `~/.bun/bin` to PATH.
- **Node.js 22+** is compatible (tested with v22.22.0).
- `.env.local` is required but gitignored. Minimum viable file for frontend-only dev:
  ```
  NEXT_PUBLIC_CONVEX_URL=https://placeholder.convex.cloud
  NEXT_PUBLIC_CONVEX_SITE_URL=https://placeholder.convex.site
  SITE_URL=http://localhost:3000
  NEXT_PUBLIC_APP_URL=localhost:3000
  ```
  Replace with real Convex deployment URLs for full functionality.

### Key caveats

- **Convex backend is cloud-hosted** (no local database). Running `bun run dev:backend` requires Convex authentication (`npx convex login`). Without it, only `bun run dev:frontend` works.
- The `predev` script (`convex dev --until-success && convex dashboard`) runs automatically before `bun run dev`. If Convex is not authenticated, use `bun run dev:frontend` to skip backend setup.
- **Build succeeds with placeholder Convex URLs.** The `getToken()` call in the root layout is wrapped in try-catch, so auth errors during static generation are non-fatal.
- Static pages (homepage, `/services/*`, `/[city]/*`, blog) render without Convex. Data-dependent pages (`/onboarding`, `/portal/*`, `/admin`) need a live Convex backend.
- **Lint** runs via `bun run lint` (Next.js ESLint). Existing warnings are pre-existing (unused vars, `<img>` vs `<Image />`).
