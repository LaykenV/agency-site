---
name: babysit-pr
description: Watch an Agency Site pull request, resolve current CI and PR-Agent feedback, and follow an explicitly authorized merge through the exact Vercel deployment and production smoke. Use when the user asks to babysit, monitor, or watch a PR, or says "file and babysit". Never treats a green review as merge permission.
---

# Babysit PR

Keep a pull request moving until the latest commit is review-clean, then ask
before merging and verify the exact production release.

## Identify and poll

Use the number supplied by the user or the PR for the current branch. Each poll
records `headRefOid`, checks, reviews, comments, labels, and mergeability:

```sh
gh pr view <number> --json headRefOid,statusCheckRollup,reviews,comments,labels,mergeable,url
```

Read inline threads through GraphQL:

```sh
gh api graphql -f query='
query($owner:String!,$repo:String!,$num:Int!){
  repository(owner:$owner,name:$repo){
    pullRequest(number:$num){
      reviewThreads(first:50){
        nodes{ id isResolved isOutdated
          comments(first:10){ nodes{ author{login} body createdAt updatedAt } } }
      }
    }
  }
}' -F owner=LaykenV -F repo=agency-site -F num=<number>
```

Act only on state newer than the last push. PR-Agent rewrites its persistent
review, so older findings are superseded. Poll about every 90 seconds without
posting status chatter.

## Triage

- Verify every finding against the cited source and actual behavior.
- Fix a real problem with the smallest in-scope change, run `bun run verify`,
  commit, and push. The push triggers a new review.
- For a false positive or out-of-scope preference, reply with a short reason
  and resolve the thread. Do not silently dismiss it.
- Retry an identified infrastructure flake. Do not change code to appease one.
- If `origin/main` moved, rebase and use `--force-with-lease`.

Stop and summarize after three fix-push cycles or about thirty minutes if the
PR is not converging. Never close a PR or dismiss a human review without asking.

## Merge gate

Ready means Verify, PR-Agent, and Vercel checks are green on the latest commit,
the branch is mergeable, and no important thread remains.

Ask: "All passing. Merging runs the production build, which deploys the Convex
backend and Vercel site, then I will smoke-test it. Good to merge?"

Anything short of a clear yes means merge nothing. On approval:

```sh
gh pr merge <number> --squash --delete-branch
git switch main
git pull --ff-only
```

If unrelated user work blocks the checkout, stop after the merge and preserve
it.

## Exact production release

Record the merge commit. The production Vercel build runs
`scripts/vercel-build.mjs`, which deploys Convex before building the Next.js
site. Poll the commit's combined status until the `Vercel` context succeeds:

```sh
gh api repos/LaykenV/agency-site/commits/<mergeCommit>/status
```

Treat failure details as evidence. Retry only a confirmed infrastructure flake.
After Vercel succeeds, run:

```sh
bun run smoke:production
```

Report ready only when both checks pass for that merge commit. Include the
commit, Vercel deployment URL, and production URL. A production defect gets a
new hotfix PR unless the user explicitly directs a small push to `main`.
