-- StudyFreeEU migration 0001_init
-- Run: psql "$DATABASE_URL" -f db/migrations/0001_init.sql
-- This migration is idempotent (uses IF NOT EXISTS / DO blocks).

BEGIN;

-- Reuse the canonical schema definition. In production use a migration runner
-- (e.g. node-pg-migrate, Prisma Migrate, Supabase CLI) and paste each step here.
\ir ../schema.sql

INSERT INTO academic_years (label, is_current) VALUES ('2026/2027', FALSE)
    ON CONFLICT (label) DO NOTHING;
INSERT INTO academic_years (label, is_current) VALUES ('2025/2026', TRUE)
    ON CONFLICT (label) DO NOTHING;

INSERT INTO languages (code, name) VALUES
    ('en','English'), ('de','German'), ('fr','French'), ('it','Italian'),
    ('es','Spanish'), ('fi','Finnish'), ('sv','Swedish'), ('da','Danish'),
    ('no','Norwegian'), ('is','Icelandic'), ('cs','Czech'), ('pl','Polish'),
    ('sl','Slovene'), ('et','Estonian'), ('el','Greek'), ('hu','Hungarian'),
    ('nl','Dutch'), ('pt','Portuguese'), ('hr','Croatian'), ('lv','Latvian'),
    ('lt','Lithuanian'), ('ro','Romanian'), ('sk','Slovak'), ('bg','Bulgarian'),
    ('mt','Maltese'), ('ga','Irish')
    ON CONFLICT (code) DO NOTHING;

INSERT INTO study_fields (slug, name) VALUES
    ('computer-science','Computer Science'),
    ('engineering','Engineering'),
    ('business','Business & Economics'),
    ('natural-sciences','Natural Sciences'),
    ('humanities','Humanities'),
    ('social-sciences','Social Sciences'),
    ('law','Law'),
    ('medicine','Medicine & Health'),
    ('design','Design & Architecture'),
    ('education','Education')
    ON CONFLICT (slug) DO NOTHING;

COMMIT;
