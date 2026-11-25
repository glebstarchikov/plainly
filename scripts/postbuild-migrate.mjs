#!/usr/bin/env node
// Runs as `postbuild`. Only a Vercel production build applies database migrations.
// Previews have no database variables, and an ungated postbuild with production's would
// run every branch's migrations against the production database. Everywhere else (local
// builds, CI), run `npm run db:migrate` yourself.
import { spawnSync } from "node:child_process";

const vercelEnv = process.env.VERCEL_ENV;

// Fail closed. VERCEL_ENV comes from Vercel's system variables, which a project setting can
// turn off. Without this check, a production build would then skip its migrations, deploy
// new code on the old schema and still go green. VERCEL marks a Vercel build, and only
// production has DIRECT_DATABASE_URL (this script never reads .env files).
if (!vercelEnv && (process.env.VERCEL || process.env.DIRECT_DATABASE_URL)) {
  const found = process.env.VERCEL ? "VERCEL" : "DIRECT_DATABASE_URL";
  console.error(
    `[postbuild] ${found} is set but VERCEL_ENV is not, so this may be a production build with ` +
      `Vercel's system environment variables turned off. Turn "Enable access to System Environment ` +
      `Variables" back on in the project settings, or unset ${found} for this build.`,
  );
  process.exit(1);
}

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
if (result.signal) {
  console.error(`[postbuild] The migrations were killed by ${result.signal}.`);
}
// A failed migration fails the build, so the deploy never goes live on an old schema.
process.exit(result.status ?? 1);
