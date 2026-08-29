import { spawnSync } from "node:child_process";

const production = process.env.VERCEL_ENV === "production";
const command = production ? "npx" : "bun";
const args = production
  ? ["convex", "deploy", "--cmd", "bun run build"]
  : ["run", "build"];

console.log(
  production
    ? "Production build: deploying Convex, then building Next.js."
    : "Preview build: building Next.js without deploying Convex.",
);

const result = spawnSync(command, args, {
  env: process.env,
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}

process.exitCode = result.status ?? 1;
