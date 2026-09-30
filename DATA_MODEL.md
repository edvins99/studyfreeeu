# DATA_MODEL.md

StudyFreeEU uses a normalized relational model designed for **thousands of
universities, tens of thousands of programmes, and multiple academic years**,
without ever hard-coding institutions into the front end.

The canonical definition is [`db/schema.sql`](db/schema.sql). The JSON files under
`data/` are a portable mirror of the same shape; `scripts/seed-db.mjs` loads them.

---

## Entity overview

```
countries ──< universities ──< programs
    │              │  │            │
    │              │  └──< university_study_fields >── study_fields
    │              │
    │              └──< tuition_rules      (versioned by academic_year + audience)
    │              └──< fees
    │              └──< admission_requirements
    │              └──< deadlines
    │
    └──< research_progress

sources ──< record_sources (polymorphic link to any entity)
verification_history (audit trail per entity)
academic_years, languages, study_fields (reference data)
```

## Entities

### `countries`
One row per jurisdiction. `is_eu_member` separates EU member states from the
"Other European Countries" section. Holds country-level policy text (public,
private, Bachelor, Master, PhD, English-taught), mandatory-fee notes, residency
and language conditions, application system, currency, verification status and
`last_verified`.

### `universities`
One row per institution. Natural key: `slug`. Holds website/admission/tuition
URLs, degree-level availability, English-taught availability per level,
`tuition_status` (enum), mandatory-fee note, `est_annual_mandatory_cost_eur`,
language/test requirements, application platform, and verification fields.

`tuition_status` enum: `Tuition-Free`, `Tuition-Free + Mandatory Fees`,
`Conditional Tuition-Free`, `Low Tuition`, `Paid`, `Unknown / Needs Verification`.

### `programs`
Programme-level records: `degree_level` enum (`Bachelor|Master|PhD|Other`),
field, language, duration, ECTS, tuition for EU citizens, mandatory fees,
admission/English requirements, deadline, start semester, program/application URL,
plus `tuition_status` and verification fields.

### `tuition_rules` (versioned)
The heart of "policy can change by academic year". Each rule is scoped to a
country, university **or** programme, targeted at an `audience`
(`EU_EEA | NON_EU_EEA | NATIONAL | OTHER`) and optionally a `degree_level`, for a
given `academic_year`, with `tuition_amount_eur`, `conditions`, effective dates and
a source. New years are inserted as new rows — no schema change required.

### `fees`
Itemised mandatory and optional charges (`kind`: `SEMESTER | STUDENT_UNION |
ADMINISTRATIVE | REGISTRATION | APPLICATION | OTHER`), with amount, currency,
`amount_eur` (normalized for cross-country comparison), recurrence and `is_mandatory`.

### `admission_requirements` / `deadlines`
Requirements (academic / language / document) and dated intake windows per
university or programme, each with a source and verification date.

### `sources` + `record_sources`
A registry of official sources; `record_sources` links any entity to the sources
that support it (polymorphic `entity_type` + `entity_id`).

### `verification_history`
Append-only audit trail capturing `previous_status`, `new_status`,
`last_checked_at`, `verified_by` and `source_url` for every change.

### `research_progress`
Tracks, per country, universities/programmes discovered vs. verified, remaining
work and status — powering `RESEARCH_PROGRESS.md`.

## Reference data
`academic_years`, `languages`, `study_fields` (self-referencing for sub-fields).

## Views
`v_university_search` — a denormalized read model for search pages/APIs.

## Why JSON first, SQL second

The JSON knowledge base is:
- **diff-friendly** (every change is reviewable in a pull request),
- **validated in CI** by `scripts/validate-data.mjs`,
- **portable** (the static site reads it directly; Postgres/Supabase can be
  populated from the same files at any time).

Nothing about the front end depends on the DB engine, so you can start static and
graduate to a live database without touching the UI layer.
