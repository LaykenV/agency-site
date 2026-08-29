import { spawnSync } from "node:child_process";

const production = process.env.VERCEL_ENV === "production";
const buildEnv = { ...process.env };
const command = production ? "npx" : "bun";
const args = production
  ? ["convex", "deploy", "--cmd", "bun run build"]
  : ["run", "build"];

if (!production) {
  // Preview deployments are compile artifacts only. Give Next.js valid public
  // endpoints without allowing a preview to read from or write to production.
  buildEnv.NEXT_PUBLIC_CONVEX_URL =
    "https://preview-backend-disabled.convex.cloud";
  buildEnv.NEXT_PUBLIC_CONVEX_SITE_URL =
    "https://preview-backend-disabled.convex.site";
}

console.log(
  production
    ? "Production build: deploying Convex, then building Next.js."
    : "Preview build: compiling Next.js with Convex access disabled.",
);

const result = spawnSync(command, args, {
  env: buildEnv,
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}

process.exitCode = result.status ?? 1;
