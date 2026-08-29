---
name: file-pr
description: Open a reviewable pull request in this repository when the user asks to file, open, or create a PR, or says "file and babysit". Runs the complete preflight and creates a real PR for PR-Agent review. Do not use when the user explicitly asks for a direct push to main.
---

# File PR

Open one real pull request that a human and PR-Agent can review.

## Preflight

1. Confirm the current branch is not `main`. If it is, create a short
   conventional branch for the current concern.
2. Require a clean tree. Preserve unrelated user work; do not stash or commit it
   without permission.
3. Stop if this branch already has an open PR:

   ```sh
   gh pr list --head "$(git branch --show-current)" --state open --json number,url
   ```

4. Run `bun run verify` and `git diff --check`. Fix failures before filing.
5. Fetch `origin/main`, then read every commit and the complete diff:

   ```sh
   git fetch origin main
   git log --oneline origin/main..HEAD
   git diff origin/main...HEAD
   ```

Keep one concern per PR. Split unrelated work instead of explaining it with
"also".

## Title and body

Use a lowercase conventional prefix such as `fix:`, `feat:`, `docs:`,
`chore:`, or `test:`. Describe the user-facing reason, not the files changed.

Write the body problem first, then explain the fix. Do not include a file
changelog. End with the actual model and harness, for example:

```markdown
<What was wrong and why it mattered.>

<How this change fixes it.>

Assisted by <model> responding via <harness>.
```

For UI work, include before and after screenshots. Use `.github/pr-assets/` as
a local staging directory and never commit those images.

## File and hand off

Push the branch and create the final title and body in one command. Open a real
PR, never a draft. Do not race PR-Agent by immediately editing the body.

```sh
git push -u origin <branch>
gh pr create --title "<title>" --body "<body>"
```

Confirm the PR-Agent and Verify checks started. If the user said "file and
babysit", continue with `babysit-pr`. Never merge without explicit approval.
