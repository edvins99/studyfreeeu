-- StudyFreeEU — normalized PostgreSQL schema
-- Target: PostgreSQL 14+ (Supabase compatible)
-- Design goal: thousands of universities, tens of thousands of programs,
-- multiple academic years, and full source/verification auditing.

-- ---------------------------------------------------------------------------
-- Reference / lookup entities
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS academic_years (
    id              SERIAL PRIMARY KEY,
    label           TEXT NOT NULL UNIQUE,          -- e.g. '2026/2027'
    starts_on       DATE,
    ends_on         DATE,
    is_current      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS languages (
    id              SERIAL PRIMARY KEY,
    code            TEXT NOT NULL UNIQUE,          -- ISO 639-1 / 639-3
    name            TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS study_fields (
    id              SERIAL PRIMARY KEY,
    slug            TEXT NOT NULL UNIQUE,
    name            TEXT NOT NULL,
    parent_id       INTEGER REFERENCES study_fields(id) ON DELETE SET NULL
);

-- ---------------------------------------------------------------------------
-- Geography / jurisdiction
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS countries (
    id                  SERIAL PRIMARY KEY,
    code                TEXT NOT NULL UNIQUE,      -- ISO 3166-1 alpha-2
    name                TEXT NOT NULL,
    slug                TEXT NOT NULL UNIQUE,
    is_eu_member        BOOLEAN NOT NULL DEFAULT FALSE,
    region              TEXT,
    priority            SMALLINT,                  -- research priority (1 = highest)
    tuition_status      TEXT,                      -- see CHECK below via enum
    eu_tuition_summary  TEXT,
    public_policy       TEXT,
    private_policy      TEXT,
    bachelor_policy     TEXT,
    master_policy       TEXT,
    phd_policy          TEXT,
    english_taught_note TEXT,
    mandatory_fees_note TEXT,
    residency_conditions TEXT,
    language_requirements TEXT,
    application_system  TEXT,
    currency            TEXT,
    verification_status TEXT NOT NULL DEFAULT 'Needs Verification',
    last_verified       DATE,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Institutions
-- ---------------------------------------------------------------------------

CREATE TYPE institution_type AS ENUM ('Public', 'Private', 'Mixed');
CREATE TYPE tuition_status_type AS ENUM (
    'Tuition-Free',
    'Tuition-Free + Mandatory Fees',
    'Conditional Tuition-Free',
    'Low Tuition',
    'Paid',
    'Unknown / Needs Verification'
);

CREATE TABLE IF NOT EXISTS universities (
    id                  SERIAL PRIMARY KEY,
    slug                TEXT NOT NULL UNIQUE,
    name                TEXT NOT NULL,
    country_id          INTEGER NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
    city                TEXT,
    institution_type    institution_type NOT NULL DEFAULT 'Public',
    official_website    TEXT,
    admissions_url      TEXT,
    tuition_info_url    TEXT,
    bachelor_available  BOOLEAN,
    master_available    BOOLEAN,
    phd_available       BOOLEAN,
    english_bachelor    BOOLEAN,
    english_master      BOOLEAN,
    english_phd         BOOLEAN,
    tuition_status      tuition_status_type NOT NULL DEFAULT 'Unknown / Needs Verification',
    mandatory_fee_note  TEXT,
    est_annual_mandatory_cost_eur NUMERIC(10,2),
    language_requirements TEXT,
    english_test        TEXT,
    admission_requirements TEXT,
    application_platform TEXT,
    online_application_url TEXT,
    housing_url         TEXT,
    scholarship_url     TEXT,
    notes               TEXT,
    verification_status TEXT NOT NULL DEFAULT 'Needs Verification',
    last_verified       DATE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_universities_country ON universities(country_id);
CREATE INDEX IF NOT EXISTS idx_universities_status  ON universities(tuition_status);

CREATE TABLE IF NOT EXISTS university_study_fields (
    university_id   INTEGER NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    study_field_id  INTEGER NOT NULL REFERENCES study_fields(id)  ON DELETE CASCADE,
    PRIMARY KEY (university_id, study_field_id)
);

-- ---------------------------------------------------------------------------
-- Programs
-- ---------------------------------------------------------------------------

CREATE TYPE degree_level AS ENUM ('Bachelor', 'Master', 'PhD', 'Other');

CREATE TABLE IF NOT EXISTS programs (
    id                  SERIAL PRIMARY KEY,
    slug                TEXT,
    name                TEXT NOT NULL,
    university_id       INTEGER NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    degree_level        degree_level NOT NULL,
    study_field_id      INTEGER REFERENCES study_fields(id) ON DELETE SET NULL,
    language_id         INTEGER REFERENCES languages(id) ON DELETE SET NULL,
    duration            TEXT,
    ects                SMALLINT,
    tuition_eu          TEXT,
    mandatory_fees      TEXT,
    admission_requirements TEXT,
    english_requirements TEXT,
    application_deadline TEXT,
    start_semester      TEXT,
    program_url         TEXT,
    application_url     TEXT,
    tuition_status      tuition_status_type NOT NULL DEFAULT 'Unknown / Needs Verification',
    verification_status TEXT NOT NULL DEFAULT 'Needs Verification',
    last_verified       DATE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_programs_university ON programs(university_id);
CREATE INDEX IF NOT EXISTS idx_programs_level      ON programs(degree_level);
CREATE INDEX IF NOT EXISTS idx_programs_status     ON programs(tuition_status);

-- ---------------------------------------------------------------------------
-- Tuition rules (versioned by academic year + audience)
-- ---------------------------------------------------------------------------

CREATE TYPE audience_type AS ENUM ('EU_EEA', 'NON_EU_EEA', 'NATIONAL', 'OTHER');

CREATE TABLE IF NOT EXISTS tuition_rules (
    id                  SERIAL PRIMARY KEY,
    scope               TEXT NOT NULL,             -- 'COUNTRY' | 'UNIVERSITY' | 'PROGRAM'
    country_id          INTEGER REFERENCES countries(id) ON DELETE CASCADE,
    university_id       INTEGER REFERENCES universities(id) ON DELETE CASCADE,
    program_id          INTEGER REFERENCES programs(id) ON DELETE CASCADE,
    academic_year_id    INTEGER REFERENCES academic_years(id) ON DELETE SET NULL,
    audience            audience_type NOT NULL,
    degree_level        degree_level,
    status              tuition_status_type NOT NULL,
    tuition_amount_eur  NUMERIC(10,2),             -- 0 = free
    conditions          TEXT,                      -- e.g. 'language of instruction = national'
    effective_from      DATE,
    effective_to        DATE,
    notes               TEXT,
    source_id           INTEGER,
    last_verified       DATE,
    CHECK (scope IN ('COUNTRY','UNIVERSITY','PROGRAM'))
);
CREATE INDEX IF NOT EXISTS idx_rules_scope ON tuition_rules(scope, country_id, university_id, program_id);

-- ---------------------------------------------------------------------------
-- Fees
-- ---------------------------------------------------------------------------

CREATE TYPE fee_kind AS ENUM ('SEMESTER', 'STUDENT_UNION', 'ADMINISTRATIVE', 'REGISTRATION', 'APPLICATION', 'OTHER');

CREATE TABLE IF NOT EXISTS fees (
    id                  SERIAL PRIMARY KEY,
    university_id       INTEGER REFERENCES universities(id) ON DELETE CASCADE,
    program_id          INTEGER REFERENCES programs(id) ON DELETE CASCADE,
    academic_year_id    INTEGER REFERENCES academic_years(id) ON DELETE SET NULL,
    kind                fee_kind NOT NULL,
    amount              NUMERIC(10,2),
    currency            TEXT,
    amount_eur          NUMERIC(10,2),
    is_mandatory        BOOLEAN NOT NULL DEFAULT TRUE,
    audience            audience_type NOT NULL DEFAULT 'EU_EEA',
    recurrence          TEXT,                      -- 'per_semester' | 'per_year' | 'one_off'
    notes               TEXT,
    source_id           INTEGER,
    last_verified       DATE
);

-- ---------------------------------------------------------------------------
-- Admission requirements & deadlines
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS admission_requirements (
    id                  SERIAL PRIMARY KEY,
    university_id       INTEGER REFERENCES universities(id) ON DELETE CASCADE,
    program_id          INTEGER REFERENCES programs(id) ON DELETE CASCADE,
    requirement         TEXT NOT NULL,
    category            TEXT,                      -- 'academic' | 'language' | 'document'
    notes               TEXT,
    source_id           INTEGER,
    last_verified       DATE
);

CREATE TABLE IF NOT EXISTS deadlines (
    id                  SERIAL PRIMARY KEY,
    university_id       INTEGER REFERENCES universities(id) ON DELETE CASCADE,
    program_id          INTEGER REFERENCES programs(id) ON DELETE CASCADE,
    academic_year_id    INTEGER REFERENCES academic_years(id) ON DELETE SET NULL,
    intake              TEXT,                      -- 'Autumn 2027'
    opens_on            DATE,
    closes_on           DATE,
    audience            audience_type NOT NULL DEFAULT 'EU_EEA',
    source_id           INTEGER,
    last_verified       DATE
);

-- ---------------------------------------------------------------------------
-- Sources & verification history
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sources (
    id                  SERIAL PRIMARY KEY,
    type                TEXT,                      -- 'Official EU portal' | 'University official page' | ...
    publisher           TEXT,
    title               TEXT,
    url                 TEXT NOT NULL,
    applies_to          TEXT[],                    -- country codes
    notes               TEXT,
    first_seen          DATE,
    is_official         BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS record_sources (
    id                  SERIAL PRIMARY KEY,
    entity_type         TEXT NOT NULL,             -- 'country' | 'university' | 'program' | 'rule' | 'fee'
    entity_id           INTEGER NOT NULL,
    source_id           INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    note                TEXT
);

CREATE TABLE IF NOT EXISTS verification_history (
    id                  SERIAL PRIMARY KEY,
    entity_type         TEXT NOT NULL,
    entity_id           INTEGER NOT NULL,
    previous_status     TEXT,
    new_status          TEXT NOT NULL,
    last_checked_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    verified_by         TEXT,
    source_url          TEXT,
    note                TEXT
);
CREATE INDEX IF NOT EXISTS idx_verif_entity ON verification_history(entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- Research progress tracker
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS research_progress (
    id                  SERIAL PRIMARY KEY,
    country_id          INTEGER NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
    universities_discovered INTEGER NOT NULL DEFAULT 0,
    universities_verified   INTEGER NOT NULL DEFAULT 0,
    programs_discovered     INTEGER NOT NULL DEFAULT 0,
    programs_verified       INTEGER NOT NULL DEFAULT 0,
    remaining_work      TEXT,
    status              TEXT NOT NULL DEFAULT 'Not started',
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Convenience view: scholarship-adjusted "effectively free" is intentionally
-- NOT merged into tuition_status; it is a separate concept.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_university_search AS
SELECT
    u.id, u.slug, u.name, u.city, u.institution_type, u.tuition_status,
    c.code AS country_code, c.name AS country_name, c.is_eu_member,
    u.est_annual_mandatory_cost_eur,
    u.english_bachelor, u.english_master, u.english_phd,
    u.bachelor_available, u.master_available, u.phd_available,
    u.last_verified, u.verification_status
FROM universities u
JOIN countries c ON c.id = u.country_id;
