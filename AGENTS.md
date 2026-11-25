# AGENTS.md

Plainly is a content editor for static sites, made for small-business owners (cafés, salons) who don't code. They edit text and photos in a Russian interface, and each save is a commit to their site's GitHub repository. It is a fork of Pages CMS: a Next.js App Router app in TypeScript with better-auth, Drizzle on PostgreSQL (Supabase in production) and a GitHub App, deployed on Vercel at app.plainly.page.

Write new agent instructions here. CLAUDE.md stays the single line `@AGENTS.md`.

## Setup

Follow the README's Quick start: `npm ci`, PostgreSQL 16, `.env.local` copied from `.env.example`, `npm run db:migrate`. `CRYPTO_KEY` must be base64 of 32 bytes (`openssl rand -base64 32`): `lib/crypto.ts` imports it as a raw AES key, so a plain random string throws the first time an installation token is cached. When port 3000 is taken, `npm run dev` moves to 3001 with only a warning; set `BASE_URL` to the port it prints, because better-auth and the GitHub App callbacks are built from it.

## Checks

Before you finish, run what CI runs: `npm run lint && npm run build && npm run db:migrate`, with `.env.local` pointing at a local database. `npm run build` also type-checks. Lint must report 0 errors; leave the warning count no higher than you found it. There is no test suite.

## Layout

- `app/(main)/[owner]/[repo]/[branch]/` is the editor, `app/(auth)/` is sign-in, and `app/api/` holds the routes the editor calls. Field types live in `fields/core/`, one folder each, registered in `fields/registry.ts`.
- Content lives only in the sites' repositories. Postgres holds users, sessions, collaborators and a cache of repository content (`cache_*` and `config` tables in `db/schema.ts`), which `app/api/webhook/github/route.ts` and periodic checks keep in step with GitHub. Write content through GitHub, never only to the cache.

## Conventions

- Migrations run in `postbuild` (`scripts/postbuild-migrate.mjs`) only when `VERCEL_ENV=production`, and a failed migration fails the deploy. Preview builds skip them and have no database variables. Keep production's `DATABASE_URL` out of Preview: there, every branch's build would migrate the production database. A migration from `npm run db:generate` ships on the next merge to main, so read its SQL before committing. Ship schema changes by merging: promoting or rolling back a Vercel deployment reuses its build and runs no migration.
- `DATABASE_URL` is Supabase's transaction pooler (port 6543). It can't run prepared statements (hence `prepare: false` in `db/index.ts`) or migrations, so `drizzle.config.ts` uses `DIRECT_DATABASE_URL`, the session-mode connection. Each pool setting in `db/index.ts` has its reason in a comment. When a page hangs, fix the query pattern first: the `/admin` hang was eleven concurrent queries racing a pool of five, and three earlier pool tweaks did not fix it (commit 89bb72f).
- Before adding a fetch to a list item or a link, multiply its cost by N. One page load fans out into parallel API routes, each on its own Vercel instance. Links to heavy pages use `prefetch={false}`. The `/admin` entry is a button (`components/admin-button.tsx`) because `prefetch={false}` still prefetches on hover.
- `app/loading.tsx` streams a loading shell before any page work, so `redirect()` and `notFound()` in a page or layout become client-side, behind HTTP 200 (signed out, `/` answers 200 with a meta refresh to `/sign-in`). A decision that needs a real status code goes in `proxy.ts`, Next 16's name for middleware. Check status codes with `curl -w '%{http_code}'`, not a browser.
- Email sign-in is better-auth's `emailOTP` plugin (`lib/auth.ts`), sending a 6-digit code through `lib/mailer.ts` (Resend or SMTP). The send runs as a background task, so a mail failure still returns success and the page says the code was sent. The only trace is a `[Better Auth]: Failed to run background task` line in the server log; read it whenever a code "sent" but never arrived.
- Every repository Plainly edits needs the GitHub App installed. A GitHub sign-in commits with the user's own token where it has access; everyone else, including every email sign-in, reaches a repository only as an invited collaborator and commits with the App's installation token (`getToken` in `lib/token.ts`). Keep email-only editing working: most editors have no GitHub account.
- `npm run setup:github-app` creates the App from the manifest in `scripts/setup-github-app.mjs`: private, contents write and metadata read, with `BASE_URL` in its callback, webhook and setup URLs. Take the webhook secret from GitHub's manifest-conversion response, as the script does. When `BASE_URL` changes, update those URLs in the App's settings on GitHub.
- `.pages.yml` is each site's content model and the contract with every site. `lib/config.ts` parses it against `lib/config-schema.ts`; keep existing configs valid when you change either.
- Images are downscaled to 2000 px and converted to WebP in the browser (`lib/super-cms/resize.ts`) before upload. Keep that step client-side: Vercel caps request bodies at 4.5 MB.
- UI copy is Russian, plain and non-technical, with no em dashes. Use shadcn token names, a 4.5:1 contrast floor, and the primary color only for interactive elements. Page widths use the container tokens in `app/globals.css`: `max-w-narrow` for forms, settings and the home page, `max-w-editor` for the entry editor, `max-w-wide` for admin and cache views.
- Emails can't use the app's CSS: `components/email/theme.ts` holds hex copies of the light theme. When you change a color in `app/globals.css`, change it there too.
- Commit messages are conventional commits (`fix:`, `feat:`, `chore:`), with a body that says why.
