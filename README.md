# NewsVerse

![NewsVerse](public/brand/newsverse-logo-sm.png)

**Dunyodagi eng so‘nggi yangiliklar bir joyda!** — a multilingual, automated news platform
with a real backend, real ingestion from publisher feeds, a protected editorial dashboard and
trilingual publishing (Uzbek · English · Russian).

This is a working application, not a mockup. On a fresh start it creates its database, seeds the
category taxonomy and a set of **clearly labelled demonstration articles**, registers 14 real
publisher feeds and starts collecting headlines on a schedule.

---

## What is actually implemented

| Area | Status |
| --- | --- |
| Public site: home, article, category, latest, trending, search, saved, account, about, sources, privacy, terms | Working |
| Trilingual UI + localized URLs, metadata, hreflang, date/number formats | Working |
| Article translations with honest "showing the original" fallback labels | Working |
| Registration with username, sign-in by e-mail **or** username, sign-out, DB-backed sessions, password reset, account export/delete | Working |
| E-mail verification, e-mail change verification, password change with session revocation | Working (links logged until a mail provider is connected) |
| Roles: reader, author, moderator, editor, admin, super_admin with rank-based guards | Working |
| RSS/Atom ingestion with dedupe, near-duplicate grouping, image extraction, attribution | Working, live feeds |
| Durable job queue with retries, exponential backoff, idempotency, source rate limits | Working |
| In-process scheduler that runs without any browser open | Working |
| Admin dashboard: overview, articles CRUD, sources, automation, categories, comments, reports, users, newsletter, audit, settings, preview | Working |
| Comments with moderation, reports/corrections, bookmarks, reading history, newsletter signup | Working |
| SEO: sitemap, robots, RSS feed, JSON-LD NewsArticle + Breadcrumb, OpenGraph, manifest | Working |
| Unit tests (Vitest) | 30 tests passing |
| AI summaries/translation/classification | Optional — requires `AI_API_KEY`; falls back deterministically without it |
| Sponsored labels, opinion labels, ads/monetization toggles | Labels and switches exist; **no payment provider is integrated** |
| Google sign-in | Not enabled (no OAuth credentials configured) |
| Admin panel translations | Partial — navigation is dictionary-driven, CRUD labels are still English |
| World map, AI assistant, audio/TTS, comment replies | Not built (see [docs/UPGRADE-STATUS.md](docs/UPGRADE-STATUS.md)) |
| Web push notifications | Not implemented |
| Email delivery (reset links, digests) | Not configured; reset links are written to the server log |

Nothing in the UI claims a payment succeeded, shows invented revenue, or pretends an
unconfigured integration is live.

---

## Stack

- **Next.js 15 (App Router) + React 19 + TypeScript**, server components for public pages.
- **Tailwind CSS** with a custom design system (dark-first, red #FF1538).
- **SQLite via Node's built-in `node:sqlite`** — no native build step, no database server.
- **Server-rendered sessions** in the database, HttpOnly cookies, scrypt password hashing.
- **In-process durable scheduler** with a SQLite-backed job table.

### Why SQLite instead of PostgreSQL

The brief preferred PostgreSQL. This build targets a machine where no Postgres server or Docker
daemon is available, and native modules (`better-sqlite3`) cannot compile. `node:sqlite` gives a
real, persistent, transactional database with zero setup, which keeps the acceptance tests
genuine rather than stubbed.

The data layer is deliberately thin (`src/server/db/index.ts`, `src/server/repo/*`): plain SQL with
bound parameters. Moving to PostgreSQL means replacing that driver with `pg`/Drizzle and porting
the schema in `migrations/` — the repositories and pages do not change shape. See
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#moving-to-postgresql).

**Requires Node.js 24+** (for `node:sqlite`). Node 22.5+ works with `--experimental-sqlite`.

---

## Quick start

```bash
npm install
cp .env.example .env        # then set APP_SECRET
npm run dev                 # http://localhost:3000 → redirects to /uz
```

The first request (or server boot) applies migrations, seeds taxonomy, feeds, settings and demo
content. Everything is idempotent.

### Create an administrator

```bash
ADMIN_EMAIL=you@example.com \
ADMIN_PASSWORD='a-long-password' \
ADMIN_NAME='Your Name' \
npm run admin:create

# A super administrator (can manage other administrators):
ADMIN_ROLE=super_admin ADMIN_EMAIL=owner@example.com ADMIN_PASSWORD='another-long-password' npm run admin:create
```

Then sign in at `/uz/login` (or `/en/login`) and open `/uz/admin`.
Administrators are the only accounts that can reach admin pages and admin APIs; editors can too,
authors cannot.

### Useful scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm test` | Vitest unit suite (30 tests) |
| `npm run db:migrate` | Apply pending SQL migrations |
| `npm run db:seed` | Ensure taxonomy/settings/demo content exist |
| `npm run admin:create` | Create or promote an administrator |
| `npm run ingest:once` | Run one collection pass over every enabled source |
| `npm run sources:expand` | Add missing feeds, reset intervals to hourly, raise the item cap |

---

## How automated collection works

1. **Scheduler** (`src/instrumentation.ts` → `src/server/boot.ts` → `src/server/ingest/jobs.ts`)
   ticks every 20s inside the Node server process. It starts on boot, so it keeps collecting with
   no browser open and no visitor present.
2. Each source becomes a **job** in the `jobs` table with an idempotency key, `next_run_at`,
   attempt counter and backoff. Jobs are claimed atomically, so two ticks cannot run the same job.
3. `ingestSource()` fetches the feed politely (per-host rate limit, timeouts, 5 MB cap, SSRF
   guard against loopback/private hosts), parses RSS or Atom, extracts titles, summaries, dates,
   authors, categories, images and video.
4. **Dedupe**: canonical URL match → title-token hash → near-duplicate similarity → same-event
   grouping (`event_key`) across publishers.
5. **Moderation** per source: `auto` publishes trusted sources, `review` queues everything,
   `hybrid` publishes high-trust sources and queues the rest. High-risk categories
   (politics, health, economy, security, breaking) always require review.
6. **AI (optional)**: summary, category suggestion, translation drafts. With no provider key the
   pipeline uses the publisher's own excerpt and marks translations as unavailable. AI output is
   labelled in the UI (`common.aiSummary`, `common.aiTranslated`).
7. **Failure handling**: errors are logged to `ingestion_logs`, retried with exponential backoff,
   and after repeated failures raise an alert visible in the admin automation panel.

Content integrity: NewsVerse stores a short excerpt, source name, canonical link and timestamps.
It does not republish full copyrighted articles. Every imported card links to the publisher.

### The 30 preconfigured feeds

BBC World/Business/Technology/Sport/Politics/Science/Health, The Guardian World/Technology/
Business/Sport/Science, Al Jazeera, TechCrunch, Ars Technica, The Verge, Wired, Engadget,
Space.com, NASA, ESPN, Variety, UN News, France 24, Deutsche Welle, Euronews, Gazeta.uz,
Daryo.uz, UzA, Meduza. Every source collects **hourly** with up to **50 items per run**.
For a daily cycle set the source interval to `1440` in **Admin → Sources** (or change all
through `sources:expand`'s interval plus the admin form). Add or disable feeds in the admin;
test a feed before saving.

### Running collection without the built-in scheduler

Set `INGEST_AUTO_START=0` and call `GET/POST /api/cron/tick` with
`Authorization: Bearer $CRON_SECRET` (or `?secret=`). Point a system cron, GitHub Action or
Cloud Scheduler at it every 5–15 minutes. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## Configuration

All configuration is server-side and documented in [.env.example](.env.example). Secrets never
reach the browser: AI keys, `APP_SECRET` and `CRON_SECRET` are read only in server modules.

Editorial settings that administrators can change (stored in `settings`) include site name,
contact email, comment/newsletter toggles, SEO defaults, moderation mode, auto-publish trust
threshold, breaking keywords, AI on/off, failure alerts, and monetization switches.

---

## Security notes

- Passwords: scrypt (N=16384) with per-password salt, constant-time comparison.
- Sessions: random 32-byte tokens, only a SHA-256 hash stored, HttpOnly + SameSite=Lax cookies,
  server-side revocation on logout, suspension and password reset.
- Authorization is enforced per request in layouts, pages **and** APIs. Admin pages call
  `adminGate()` so no data is rendered before the role check. Middleware bounces anonymous
  admin visits early (convenience, not the security boundary).
- CSRF: same-origin checks on every state-changing request (`isSameOrigin`), plus SameSite cookies.
- Rate limiting on login, registration, password reset, comments and reports.
- Validation with Zod on every endpoint; URLs restricted to `http(s)`; imported text is escaped
  and rendered as text, never HTML.
- Ingestion fetch is SSRF-guarded (no localhost/private/link-local/metadata hosts).
- Security headers (CSP, nosniff, DENY framing, permissions policy) set in `next.config.ts`.
- Audit log for privileged mutations; admin routes excluded from indexing (`robots: noindex`).
- Account export and deletion are self-service.

---

## Testing

```bash
npm test          # 30 unit tests: i18n completeness, slugify, dedupe, validation, hashing, parsing
npm run build     # production build must stay green
```

Acceptance checks that were executed against a running server are listed in
[docs/TESTING.md](docs/TESTING.md), including what could not be verified in this environment.

---

## Deployment

- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — Docker, reverse proxy, environment, scheduler,
  scaling, PostgreSQL migration path.
- [docs/BACKUPS.md](docs/BACKUPS.md) — consistent SQLite backups and restore drill.
- [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) — common failures and fixes.
- [docs/TESTING.md](docs/TESTING.md) — executed acceptance results.
- [docs/UPGRADE-STATUS.md](docs/UPGRADE-STATUS.md) — what this upgrade delivered, what is still
  missing, and which external services are required.

```bash
docker compose up -d --build
docker compose exec web env ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run admin:create
```

The container needs a persistent volume at `/app/data` — the database file is the whole state.

---

## Demonstration content

Articles with `is_demo = 1` are fictional demonstration pieces, labelled "Demo" in the UI and
excluded from trending logic as real engagement accrues. Real imported stories always carry their
publisher name and a link to the original. Set `SEED_DEMO=0` before first boot to skip demo content
entirely.

## License / attribution

Publisher content remains the property of its publisher; NewsVerse stores excerpts and links only.
Respect each feed's terms and robots policy before enabling it.
