# Deployment

StudyFreeEU ships as a **static site** generated from the JSON knowledge base, and
optionally backed by a **PostgreSQL / Supabase** database for dynamic use cases.

---

## 1. Static deployment (default, zero backend)

### Build

```bash
node scripts/validate-data.mjs
OUT_DIR=./dist node scripts/build.mjs
```

This produces a self-contained folder (`dist/`) with `index.html` at the root.
Every asset is bundled locally — **no CDN, no external fonts, no external API
calls** — so the site works under a strict Content-Security-Policy.

### Host anywhere

| Host | What to do |
|---|---|
| Managed static host (reference) | Upload the `dist/` contents as the site root; entry file `index.html`. |
| Netlify | Drag `dist/` into the deploy area, or `netlify deploy --dir dist`. Publish dir: `dist`. |
| Vercel | `vercel --prod dist` (framework preset: *Other*). |
| GitHub Pages | Push `dist/` to the `gh-pages` branch. Add a `.nojekyll` file. |
| Nginx / Apache / IIS | Point the document root at `dist/`. Directory-index `index.html` is required. |

The site uses clean directory URLs (`/countries/germany/`), which all of the above
serve natively via `index.html` directory indexes. No rewrite rules are needed.

### Environment variables

None are required for the static build. Optional:

| Variable | Purpose |
|---|---|
| `OUT_DIR` | Output directory for `scripts/build.mjs`. Defaults to the managed project dir. |

---

## 2. PostgreSQL / Supabase (optional, for a dynamic backend)

Use this when you want server-side search, an API, or a CMS-style admin flow.

### Steps

```bash
cp .env.example .env         # fill in DATABASE_URL
npm install                  # installs `pg`

# Create the schema (idempotent)
psql "$DATABASE_URL" -f db/migrations/0001_init.sql

# Load the knowledge base
node scripts/seed-db.mjs
```

### Supabase specifics

1. Create a project at supabase.com and copy the connection string (**Settings →
   Database → Connection string → URI**) into `DATABASE_URL`.
2. Run the migration and seed as above.
3. For a Postgres-backed front end, expose read-only views (e.g. the provided
   `v_university_search`) via Supabase's auto-generated REST/GraphQL API, and keep
   write access behind Row-Level Security + an authenticated admin role.
4. Store `SUPABASE_ANON_KEY` only in client apps; never ship the
   `SUPABASE_SERVICE_ROLE_KEY` to the browser.

### Schema overview

See [`DATA_MODEL.md`](DATA_MODEL.md). Migrations live in `db/migrations/` and are
append-only; add `0002_*.sql` for changes rather than editing `0001_init.sql`.

---

## 3. CI (recommended)

```yaml
# .github/workflows/build.yml
name: build
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: node scripts/validate-data.mjs
      - run: OUT_DIR=dist node scripts/build.mjs
      - uses: actions/upload-artifact@v4
        with: { name: dist, path: dist }
```

`validate-data.mjs` exits non-zero when an accuracy rule is broken, so a bad
tuition claim cannot be merged.

---

## 4. Post-deploy checklist

- [ ] `sitemap.xml` reachable and listed in `robots.txt`.
- [ ] Spot-check three university pages against the live official websites.
- [ ] Confirm the disclaimer banner appears on university and country pages.
- [ ] Confirm no console errors and that the compare/favourites features persist
      across reloads (they use `localStorage`).
