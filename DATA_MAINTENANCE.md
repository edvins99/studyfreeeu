# DATA_MAINTENANCE.md

How to keep StudyFreeEU accurate over time. Tuition policies change by academic
year, so maintenance is a first-class part of the product, not an afterthought.

---

## Golden rules

1. **No claim without a source.** A tuition status must link to an official source
   (university page, national portal, ministry, EU portal). `validate-data.mjs`
   fails the build otherwise.
2. **No guessing.** Missing data is written as `Not yet verified`, never invented.
3. **Record the date.** Every record carries `last_verified` (ISO date) and a
   `verification_status`.
4. **Record conflicts.** If two official sources disagree, keep both, explain in
   `notes`, and show the safest (usually higher-cost) interpretation.
5. **Version by academic year.** New years get new rows in `tuition_rules`; old
   years are retained.

---

## Where records live

| Layer | Location |
|---|---|
| Countries | `data/countries.json` |
| Universities | `data/universities.json` |
| Programmes | `data/programs.json` |
| Sources registry | `data/sources.json` |
| Database | PostgreSQL via `db/schema.sql` + `scripts/seed-db.mjs` |

Edit the JSON, then re-run validation and the build:

```bash
node scripts/validate-data.mjs      # must pass
node scripts/build.mjs              # regenerates the static site
```

---

## Verification cadence

| Age of `last_verified` | Action |
|---|---|
| < 6 months | No action |
| ≥ 6 months | Schedule re-verification (highlighted **amber** in the Admin console) |
| ≥ 12 months | Escalate (highlighted **red**); treat the record as stale |

Open `/admin/` in the deployed site to see the **Data maintenance console**: it
lists universities, programmes and countries, colour-codes stale records, lets you
change tuition status / verification status / mandatory cost inline, and exports
the updated JSON for commit.

> The Admin console is a **static** editing surface (no server, no auth). Edits
> live in your browser and are only persisted when you export the JSON and commit
> it. Do not expose it as the only write path once a real backend exists — put it
> behind authentication first (see `ROADMAP.md`).

---

## Routine: adding a university

1. Confirm the **country** already has a verified policy row (if not, do the
   country first — see below).
2. Add an object to `data/universities.json` with a unique `id` and `slug`
   (`<country>-<short-name>`), fill every field you can verify, and use
   `"Not yet verified"` for the rest.
3. Add at least one official source URL to the record's `sources`.
4. Set `last_verified` to today and a truthful `verification_status`.
5. Run `validate-data.mjs` → `build.mjs` → commit.

## Routine: adding a country policy

1. Research the **national portal + ministry** first; then spot-check two
   universities.
2. Fill the country object, including the `tuition_status` that best matches the
   seven-category model.
3. Add sources; set `verification_status` and `last_verified`.
4. Update `RESEARCH_PROGRESS.md` (counts + status).

## Routine: quarterly review

1. Open `/admin/`, filter to records ≥ 6 months old.
2. For each: open the official source, confirm the figures, and:
   - if unchanged → bump `last_verified`;
   - if changed → update the value, add a `verification_history` note, keep both
     sources if they conflict.
3. Re-run validation + build and commit.

---

## Adding a new academic year

1. Insert the year into `academic_years` (SQL) / add it to the relevant records.
2. Add new `tuition_rules` rows scoped to that year (do **not** overwrite the
   previous year).
3. Update the year-bearing strings (e.g. "2026/2027") and `last_verified` dates.
4. Rebuild. The schema supports new years with **no structural change**.

---

## Automated verification (future)

`verification_history` already stores `last_checked_at`, `verified_by`,
`verification_status` and `source_url`. A scheduled job can:

- fetch each record's `source_url`,
- extract the fee/tuition section,
- diff against the stored value,
- create a review task (or auto-bump `last_verified` when unchanged).

Until that exists, the Admin console + `RESEARCH_PROGRESS.md` are the working
system.

---

## Data-quality checks performed by `validate-data.mjs`

- Every country/university/programme uses an allowed `tuition_status` value.
- Any record marked *Verified* has at least one source.
- No duplicate country codes / university ids.
- Programme records reference an existing university and carry an official source.

Warnings (not failures) are raised when a record claims a tuition-free status but
is still marked *Needs Verification* — a nudge to finish the job.
