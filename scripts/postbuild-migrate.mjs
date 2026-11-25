#!/usr/bin/env node
// Runs as `postbuild`. Only a Vercel production build applies database migrations.
// Preview builds have no database URL, and giving them production's would run every
// branch's migrations against the production database. Everywhere else (local builds,
// CI), run `npm run db:migrate` yourself.
import { spawnSync } from "node:child_process";

const vercelEnv = process.env.VERCEL_ENV;

if (vercelEnv !== "production") {
  const reason = vercelEnv ? `VERCEL_ENV is "${vercelEnv}"` : "VERCEL_ENV is not set";
  console.log(
    `[postbuild] Skipping database migrations: ${reason}, and only Vercel production builds migrate. ` +
      `Run "npm run db:migrate" to migrate a database yourself.`,
  );
  process.exit(0);
}

console.log('[postbuild] VERCEL_ENV is "production": applying database migrations.');
const result = spawnSync("npm", ["run", "db:migrate"], { stdio: "inherit" });

if (result.error) {
  console.error(`[postbuild] Could not start the migrations: ${result.error.message}`);
  process.exit(1);
}
// A failed migration fails the build, so the deploy never goes live on an old schema.
process.exit(result.status ?? 1);
