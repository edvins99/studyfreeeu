# StudyFreeEU

**Find tuition-free universities in Europe — for EU citizens.**

StudyFreeEU is an independent, source-backed directory of European higher-education
institutions and degree programmes where **EU citizens can study without paying
standard tuition fees**, together with the **mandatory semester and administrative
fees that still apply**.

It is built as a combination of a university search engine, a European study
database and a tuition comparison platform.

---

## What it answers

- Where can an EU citizen study tuition-free in Europe?
- Which universities offer tuition-free Bachelor's / Master's degrees?
- Which programmes are taught in English?
- What mandatory semester or administrative fees still apply?
- Are tuition-free conditions different for EU/EEA and non-EU citizens?

## The seven tuition categories

We never reduce a university to the word "FREE". Every record distinguishes:

1. **€0 tuition**
2. **€0 tuition + mandatory fees** ← the main focus of this database
3. **Low tuition**
4. **Conditional tuition-free** (e.g. free only in the national language, or within regular duration)
5. **Tuition-free only for specific nationalities/residency categories**
6. **Tuition-free only at certain degree levels**
7. **Scholarships that make a paid programme effectively free** (a separate concept, not merged into tuition status)

The primary database focuses on categories **1 and 2**.

---

## Repository layout

```
StudyFreeEU/
├─ data/                     # The knowledge base (source of truth)
│  ├─ countries.json         # 31 countries: 27 EU members + 4 other European countries
│  ├─ universities.json      # 120 universities with tuition/fee/admission fields
│  ├─ programs.json          # 624 programme entries (level × field × language × ECTS)
│  └─ sources.json           # Registry of 38 official data sources
├─ db/
│  ├─ schema.sql             # Normalized PostgreSQL schema (Supabase compatible)
│  └─ migrations/0001_init.sql
├─ scripts/
│  ├─ build.mjs              # Static site generator (pre-renders the whole site)
│  ├─ validate-data.mjs      # Accuracy guard (fails if a claim lacks a source)
│  └─ seed-db.mjs            # Loads data/ into PostgreSQL
├─ web/assets/               # Hand-written CSS + JS shipped with the site
├─ README.md                 # ← you are here
├─ DEPLOYMENT.md             # Static hosting + Postgres/Supabase deployment
├─ DATA_SOURCES.md           # Every major official data source, explained
├─ DATA_MODEL.md             # Database architecture
├─ DATA_MAINTENANCE.md       # How to keep the data accurate over time
├─ RESEARCH_PROGRESS.md      # Country-by-country research tracker
└─ ROADMAP.md                # What to add next
```

## Generated site (output)

The generator writes a fully pre-rendered static site with clean directory URLs:

```
index.html                              # Home
universities/index.html                 # Search + filters + pagination
universities/<slug>/index.html          # One SEO page per university
countries/index.html                    # All countries
countries/<slug>/index.html             # One SEO page per country
programs/index.html                     # Programmes + "English & €0 tuition" filter
fields/index.html                       # Study fields
compare/index.html                      # Side-by-side comparison (up to 4)
deadlines/index.html                    # Application & document deadlines (per country + verified universities)
glossary/index.html                     # Key terms explained
universities/by-country/index.html      # Universities grouped by country
admin/index.html                        # Data maintenance console
how-it-works/  about/                   # Editorial pages
tuition-free-universities-for-eu-students/ … # SEO landing pages
sitemap.xml  robots.txt
assets/{css,js,data}
```

## Tech stack

- **Data layer:** JSON knowledge base → PostgreSQL (`db/schema.sql`) via `scripts/seed-db.mjs`
- **Coverage:** all 27 EU member states carry a verified country-level tuition policy; 15 previously pending countries were deep-verified against national portals, ministries, Eurydice and university pages
- **Per record:** admission requirements, application + document deadlines, available specialities with an institutional profile, and admission contacts
- **Programmes:** 1458 entries across 120 universities — level × field × language with standard Bologna ECTS (Bachelor 180 / Master 120 / PhD ≈ 180); programme-structure tables on every university page; 23 programmes verified against official catalogues
- **New universities (rounds 2–4):** 61 added in total, bringing the database to **112** (round 2: TU Berlin, Hamburg, TU Dresden, JKU Linz, Tampere, LUT, KTH, Chalmers, Aalborg, Bergen, Utrecht, Leiden, Sapienza, Politecnico di Milano, UAB Barcelona, Ghent, Galway, Masaryk; round 3: Freiburg, Göttingen, Stuttgart, Mannheim, Cologne, FAU Erlangen-Nürnberg, Milan, Padua, Turin, Naples Federico II, Politecnico di Torino, Pisa, Oulu, Jyväskylä, Gothenburg, Linköping, Umeå, Southern Denmark, Roskilde, UiT Tromsø, Innsbruck; round 4: Valencia, Granada, Seville, UAM Madrid, Pompeu Fabra, UPC Barcelona, Porto, Coimbra, NOVA Lisbon, Grenoble Alpes, Aix-Marseille, Strasbourg, Bordeaux, Lyon 1, Warsaw University of Technology, AGH Kraków, Wrocław, Adam Mickiewicz, Patras, Crete, Szeged, Debrecen).
- **Verified deadlines:** 53 universities carry official application windows or dates confirmed against their own pages / national admission authorities; the remaining (newly added) universities use the country-typical window, clearly labelled.
- **Admission contacts:** verified email/phone/address for 83 universities; every other university links to its official admissions page (with a “verify” label).
- **Extras:** living costs / housing / scholarships per country, a glossary of terms, a FAQ, and a country-grouped university view
- **Front end:** static generation, hand-written CSS + vanilla JS (no framework, no CDN)
- **Search / filters / compare / favourites:** fully client-side (works with zero backend)
- **Hosting:** any static host (the reference deployment is AutoClaw's managed static host)

> Why static? The tuition data changes rarely and the query surface is a filter + a
> comparison. Pre-rendering gives instant pages and strong SEO while keeping the
> data layer swappable for a live PostgreSQL/Supabase backend when needed.

## Quick start

```bash
# 1. Validate the dataset (accuracy guard)
node scripts/validate-data.mjs

# 2. Generate the static site
node scripts/build.mjs            # writes to ../projects/website-<id>/ by default
OUT_DIR=./dist node scripts/build.mjs   # or choose your own output dir

# 3. (Optional) Use a real PostgreSQL database
cp .env.example .env              # set DATABASE_URL
npm install pg
node scripts/seed-db.mjs
```

## Accuracy rule

We never fabricate universities, programmes, fees, deadlines, admission
requirements, URLs or tuition policies. If information cannot be verified it is
labelled **Not yet verified** instead of guessed. `scripts/validate-data.mjs`
enforces that a tuition claim always carries a source and a verification status.

## Disclaimer

Tuition rules may change. Always verify current fees and admission requirements on
the university's official website before applying. All programme data is also
linked back to the official university website, and the site is entirely local —
all assets are shipped with the site, no CDN, no cookies, no tracking. This
project is informational and is not affiliated with any university or the EU.
