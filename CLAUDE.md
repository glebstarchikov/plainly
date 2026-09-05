# CLAUDE.md

**Plainly** — a git-based content editor for static sites, the editing layer for AI- and code-generated
websites. Non-technical owners edit content through a friendly Russian-language interface; every change
commits straight to the site's GitHub repo and goes live on the next rebuild.

Built on [Pages CMS](https://pagescms.org) (MIT), rebranded and localised. Loaded into every session,
so it stays lean — deeper detail is in `README.md` and `CONTRIBUTING.md`.

**Specs and plans for this app live in a different repo: [`~/super-cms`](../super-cms)**
(`docs/superpowers/`). This repo is the code.

## Stack

- **Next.js App Router** + TypeScript. **Drizzle ORM + PostgreSQL** (`db/schema.ts`, `db/migrations/`).
- **better-auth** with email OTP — editors sign in with a 6-digit code, **no GitHub account required**.
- **A GitHub App** (`@octokit/app`, `@octokit/rest`) is what actually reads and commits repo content.
- **Editors:** TipTap (rich text), CodeMirror (code/markdown/JSON/HTML). **UI:** `@base-ui/react`,
  `@tanstack/react-table`, `@dnd-kit` for ordering.
- **Email:** Resend + `@react-email/components`. **Hosting:** Vercel.

## Commands

```
npm run dev            npm run build          npm run lint
npm run db:generate    npm run db:migrate     npm run auth:generate
npm run setup:github-app
```

`postbuild` runs `db:migrate`, so a deploy applies migrations automatically. Be deliberate about what
you generate — a bad migration ships on the next push.

## Core model

- Each managed site declares its editable content model in a **`.pages.yml`** at that repo's root.
  That file is the contract between Plainly and the site; changing how it's parsed affects every site.
- Images are **downscaled and converted to WebP in the browser** before upload — keep that client-side;
  it's what keeps commits small.
- Saving an edit = a commit to the target repo → static rebuild → publish. There is no separate content
  database to fall out of sync, and it should stay that way.

## Watch out for

- **`app/loading.tsx` exists at the app root.** That makes Next flush a skeleton before a page's async
  work completes, so `redirect()`/`notFound()` inside a page runs client-side and the HTTP response is
  already committed as 200. Routing decisions that need a real status code belong in middleware. (Same
  root cause bit `~/bib`; verify with `curl -w '%{http_code}'`, not a browser.)
- **Query floods.** `/admin` once hung until Vercel's 300s kill from a query flood, and repo cards were
  prefetching on every viewport entry. Before adding a fetch to a list item, ask what it costs times N.
- **Branding drift.** Emails were still Pages CMS green well after the rebrand. When changing brand
  tokens, grep the `@react-email` templates too — they don't share the app's CSS.

## Conventions

- Design system: the house style (`~/design/design.md` + `core.css` + one theme file, `house-style`
  skill). shadcn token names only, 4.5:1 contrast floor, primary means interactive, no em-dashes in UI copy.
- UI copy is **Russian**. Keep it plain and non-technical — the audience is café and salon owners.
- Secrets in `.env.local` (needs `DATABASE_URL`, `BETTER_AUTH_SECRET`, `CRYPTO_KEY`); Vercel env for prod.
- Conventional commits.
