# ROADMAP.md

## Shipped in v1.0 (this release)

- [x] Normalized PostgreSQL schema (`db/schema.sql`) + idempotent migration
- [x] JSON knowledge base: 31 countries (27 EU + 4 other), 43 universities,
      19 programme records, 27 sources
- [x] Validation guard that blocks unsourced tuition claims (`validate-data.mjs`)
- [x] Seed script to load Postgres/Supabase (`seed-db.mjs`)
- [x] Static site generator with clean, SEO-friendly directory URLs
- [x] Home, Universities (search + filters + pagination), University pages,
      Country pages, Programs, Study Fields, Compare, How It Works, About
- [x] Compare up to 4 universities (side by side) with `localStorage`
- [x] Favourites / bookmarks with `localStorage`
- [x] Admin data-maintenance console with 6-month / 12-month staleness bands
- [x] 5 SEO landing pages (not thin/duplicate)
- [x] `sitemap.xml`, `robots.txt`, structured data (JSON-LD)
- [x] Documentation: README, DEPLOYMENT, DATA_SOURCES, DATA_MODEL,
      DATA_MAINTENANCE, RESEARCH_PROGRESS, ROADMAP

## Near term (v1.1 – v1.2)

- [ ] Verify the 15 "Needs Verification" countries against national portals and
      promote them to Verified, populating `tuition_rules` + `fees`.
- [ ] Expand programme-level data for the priority-1 countries (deadlines, ECTS,
      English language requirements, application portals).
- [ ] Add a **favourites page** (currently favourites are stored but only surfaced
      as save state) and export-to-PDF of a shortlist.
- [ ] "English-taught programmes with €0 tuition" as a first-class saved search.
- [ ] Per-region tuition handling (DE states, ES autonomous communities, BE
      communities, CH cantons) as first-class rows.

## Medium term (v2.0)

- [ ] Live PostgreSQL/Supabase backend with server-side search and pagination.
- [ ] Official **admin dashboard with authentication** (RBAC) writing to
      `verification_history`.
- [ ] **Automated verification**: scheduled crawler that re-reads fee pages,
      diffs changes, and opens review tasks; stores `last_checked_at`,
      `verified_by`, `verification_status`, `source_url`.
- [ ] Change alerts: "this university's tuition changed for 2027/2028".
- [ ] Multi-year comparison (2025/26 vs 2026/27 vs 2027/28).

## Longer term

- [ ] Scholarship layer (category 7) modelled as its own entity, linking
      scholarships to programmes and netting out a true "effective cost".
- [ ] Cost-of-living layer (housing, transport, insurance) for a full student-budget
      estimate — kept clearly separate from mandatory university cost.
- [ ] Language-learning pathway data (e.g. one-year Czech/Polish prep programmes
      that unlock tuition-free study).
- [ ] Public API + open dataset export (CC-BY) with citation instructions.
- [ ] Accessibility audit to WCAG 2.2 AA and full internationalisation of the UI.

## Explicit non-goals

- Fabricating or "estimating" universities, programmes, fees or deadlines to make
  the dataset look larger.
- Merging scholarship-funded study into the "tuition-free" status.
