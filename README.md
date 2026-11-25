# Plainly

Plainly is a content editor for static sites: the site's owner edits text and photos in a Russian interface, and each save is a commit to the site's GitHub repository. You sign in with email or GitHub and edit the content described in the site's `.pages.yml`. Photos are reduced and saved as WebP in the browser before they are uploaded.

![Plainly sign-in page, with the Russian prompt, a GitHub button, and an email field](docs/sign-in.png)

Editing a repository needs a GitHub App of your own; the Quick start sets one up.

## Quick start

Needs Node.js 24 and PostgreSQL 16.

Install dependencies:

```bash
npm ci
```

Start a database that matches `DATABASE_URL` in `.env.example`. With Docker, on any OS:

```bash
docker run --name plainly-db -e POSTGRES_USER=plainly -e POSTGRES_PASSWORD=plainly -e POSTGRES_DB=plainly -p 5432:5432 -d postgres:16
```

Any other PostgreSQL 16 works too; point `DATABASE_URL` at it.

Copy the environment template. `.env.local` stays uncommitted.

```bash
cp .env.example .env.local
```

In `.env.local`, set `CRYPTO_KEY` to the output of `openssl rand -base64 32`. It must be in that format, because it is used as an AES-256 key. The GitHub App helper below writes a new `BETTER_AUTH_SECRET`; if you skip the helper, set that the same way.

Signing in takes one of these:

- **Email:** set `RESEND_API_KEY`, or `SMTP_HOST` and the other `SMTP_` values, in `.env.local`. Without either, the page still says the code was sent, but no email goes out and the dev server logs "No email provider configured".
- **GitHub:** the GitHub App below. Its client ID and secret also power the GitHub button.

To edit a real repository, create a GitHub App and let the helper write its credentials into `.env.local`:

```bash
npm run setup:github-app -- --base-url http://localhost:3000 --env .env.local
```

The helper prints a GitHub URL. Open it, create the app, then install it on the repository you want to edit. Useful options: `--owner-type personal|org`, `--org <slug>`, `--app-name "Plainly (local)"`, `--no-open`.

Apply the migrations and start the app:

```bash
npm run db:migrate
npm run dev
```

Open http://localhost:3000. You land on the sign-in page shown above.

## Deploying

Production runs on Vercel with a Supabase database. `.env.example` lists every variable the code reads.

- `DATABASE_URL` is Supabase's transaction pooler (port 6543). Migrations need a session-mode connection, so set `DIRECT_DATABASE_URL` to the session pooler or the direct URL.
- `npm run build` applies migrations only on a Vercel production build (`VERCEL_ENV=production`), and a failed migration fails the deploy. Preview builds skip them and have no database. Everywhere else, run `npm run db:migrate` yourself. "Promote to Production" on a preview rebuilds it as a production build, which runs that branch's migrations, so ship schema changes by merging to main.
- The GitHub App holds the app's address in its callback, webhook and setup URLs. When the address changes, update them in the App's settings on GitHub.

## Stack

Next.js App Router, TypeScript, better-auth (email one-time code and GitHub), Drizzle ORM, PostgreSQL, a GitHub App (`@octokit/app` and `@octokit/rest`), TipTap, CodeMirror, Resend or SMTP, and Vercel.

## Status

Maintained, November 2026.

## Licence

[MIT](LICENSE). Plainly is a fork of [Pages CMS](https://pagescms.org) by Ronan Berder, credited in [NOTICE](NOTICE). The main changes are the Plainly name, the Russian interface and in-browser WebP downscaling, plus fixes for running on Vercel with Supabase. LICENSE keeps both copyright notices, as the MIT terms require.
