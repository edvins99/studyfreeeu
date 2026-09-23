#!/usr/bin/env node
/**
 * StudyFreeEU — seed script
 *
 * Reads the JSON knowledge base under data/ and upserts it into PostgreSQL.
 * Idempotent: re-running updates existing rows by natural key (slug / code / url).
 *
 * Usage:
 *   export DATABASE_URL="postgres://user:pass@host:5432/studyfreeeu"
 *   npm run db:migrate      # creates schema
 *   npm run db:seed         # loads data
 *
 * Requires: pg  (npm install pg)
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const DATA = path.resolve(__dirname, '..', 'data');

const read = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));

const STATUS_MAP = {
  'Tuition-Free': 'Tuition-Free',
  'Tuition-Free + Mandatory Fees': 'Tuition-Free + Mandatory Fees',
  'Conditional Tuition-Free': 'Conditional Tuition-Free',
  'Low Tuition': 'Low Tuition',
  'Paid': 'Paid',
  'Unknown / Needs Verification': 'Unknown / Needs Verification',
};

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set. Example:');
    console.error('  DATABASE_URL="postgres://postgres:postgres@localhost:5432/studyfreeeu" npm run db:seed');
    process.exit(1);
  }

  const client = new pg.Client({ connectionString });
  await client.connect();

  const countries = read('countries.json');
  const universities = read('universities.json');
  const programs = read('programs.json');
  const sources = read('sources.json');

  const countryIdByCode = new Map();
  const uniIdBySlug = new Map();

  try {
    await client.query('BEGIN');

    // ---- sources -----------------------------------------------------------
    const sourceIdByUrl = new Map();
    for (const s of sources) {
      const r = await client.query(
        `INSERT INTO sources (type, publisher, title, url, applies_to, notes, is_official)
         VALUES ($1,$2,$3,$4,$5,$6,TRUE)
         ON CONFLICT DO NOTHING RETURNING id`,
        [s.type, s.publisher, s.title, s.url, s.applies_to ?? null, s.notes ?? null]
      );
      let id = r.rows[0]?.id;
      if (!id) {
        const q = await client.query('SELECT id FROM sources WHERE url = $1', [s.url]);
        id = q.rows[0]?.id;
      }
      sourceIdByUrl.set(s.url, id);
    }

    // ---- countries ---------------------------------------------------------
    for (const c of countries) {
      const r = await client.query(
        `INSERT INTO countries
          (code,name,slug,is_eu_member,region,priority,tuition_status,eu_tuition_summary,
           public_policy,private_policy,bachelor_policy,master_policy,phd_policy,
           english_taught_note,mandatory_fees_note,residency_conditions,language_requirements,
           application_system,currency,verification_status,last_verified)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
         ON CONFLICT (code) DO UPDATE SET
           name=EXCLUDED.name, slug=EXCLUDED.slug, is_eu_member=EXCLUDED.is_eu_member,
           region=EXCLUDED.region, priority=EXCLUDED.priority, tuition_status=EXCLUDED.tuition_status,
           eu_tuition_summary=EXCLUDED.eu_tuition_summary, public_policy=EXCLUDED.public_policy,
           private_policy=EXCLUDED.private_policy, bachelor_policy=EXCLUDED.bachelor_policy,
           master_policy=EXCLUDED.master_policy, phd_policy=EXCLUDED.phd_policy,
           english_taught_note=EXCLUDED.english_taught_note, mandatory_fees_note=EXCLUDED.mandatory_fees_note,
           residency_conditions=EXCLUDED.residency_conditions, language_requirements=EXCLUDED.language_requirements,
           application_system=EXCLUDED.application_system, currency=EXCLUDED.currency,
           verification_status=EXCLUDED.verification_status, last_verified=EXCLUDED.last_verified,
           updated_at=now()
         RETURNING id`,
        [c.code, c.name, c.slug, c.is_eu, c.region, c.priority, c.tuition_status, c.eu_summary,
         c.public_universities, c.private_universities, c.bachelor, c.master, c.phd,
         c.english_taught, c.mandatory_fees, c.residency_conditions, c.language_requirements,
         c.application_system, c.currency, c.verification_status, c.last_verified]
      );
      countryIdByCode.set(c.code, r.rows[0].id);
    }

    // ---- universities ------------------------------------------------------
    for (const u of universities) {
      const cid = countryIdByCode.get(u.country_code);
      const r = await client.query(
        `INSERT INTO universities
          (slug,name,country_id,city,institution_type,official_website,admissions_url,tuition_info_url,
           bachelor_available,master_available,phd_available,english_bachelor,english_master,english_phd,
           tuition_status,mandatory_fee_note,est_annual_mandatory_cost_eur,language_requirements,
           english_test,admission_requirements,application_platform,online_application_url,
           housing_url,scholarship_url,notes,verification_status,last_verified)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)
         ON CONFLICT (slug) DO UPDATE SET
           name=EXCLUDED.name, country_id=EXCLUDED.country_id, city=EXCLUDED.city,
           institution_type=EXCLUDED.institution_type, official_website=EXCLUDED.official_website,
           tuition_status=EXCLUDED.tuition_status, mandatory_fee_note=EXCLUDED.mandatory_fee_note,
           est_annual_mandatory_cost_eur=EXCLUDED.est_annual_mandatory_cost_eur,
           english_bachelor=EXCLUDED.english_bachelor, english_master=EXCLUDED.english_master,
           english_phd=EXCLUDED.english_phd, notes=EXCLUDED.notes,
           verification_status=EXCLUDED.verification_status, last_verified=EXCLUDED.last_verified,
           updated_at=now()
         RETURNING id`,
        [u.slug, u.name, cid, u.city, u.type, u.official_website, u.admissions_url, u.tuition_info_url,
         u.bachelor_available, u.master_available, u.phd_available, u.english_bachelor, u.english_master, u.english_phd,
         STATUS_MAP[u.tuition_status] ?? 'Unknown / Needs Verification', u.mandatory_semester_fee,
         u.est_annual_mandatory_cost_eur, u.language_requirements, u.english_test, u.admission_requirements,
         u.application_platform, u.online_application_url, u.housing_url, u.scholarship_url, u.notes,
         u.verification_status, u.last_verified]
      );
      uniIdBySlug.set(u.slug, r.rows[0].id);
    }

    // ---- programs ----------------------------------------------------------
    for (const p of programs) {
      const uid = uniIdBySlug.get(p.university_id);
      if (!uid) continue;
      await client.query(
        `INSERT INTO programs
          (name,university_id,degree_level,duration,ects,tuition_eu,mandatory_fees,
           admission_requirements,english_requirements,application_deadline,start_semester,
           program_url,application_url,tuition_status,verification_status,last_verified)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        [p.program_name, uid, p.degree_level, p.duration, p.ects, p.tuition_eu, p.mandatory_fees,
         p.admission_requirements, p.english_requirements, p.application_deadline, p.start_semester,
         p.program_url, p.application_url, STATUS_MAP[p.tuition_status] ?? 'Unknown / Needs Verification',
         p.verification_status, p.last_verified]
      );
    }

    // ---- research progress -------------------------------------------------
    const counts = await client.query(
      `SELECT c.id,
              COUNT(u.id) AS unis
         FROM countries c LEFT JOIN universities u ON u.country_id = c.id
        GROUP BY c.id`
    );
    for (const row of counts.rows) {
      const verified = await client.query(
        `SELECT COUNT(*)::int AS n FROM universities
          WHERE country_id = $1 AND verification_status LIKE 'Verified%'`, [row.id]);
      await client.query(
        `INSERT INTO research_progress
           (country_id, universities_discovered, universities_verified, status)
         VALUES ($1,$2,$3,$4)`,
        [row.id, Number(row.unis), verified.rows[0].n,
         Number(row.unis) > 0 ? 'In progress' : 'Not started']
      );
    }

    await client.query('COMMIT');
    console.log(`Seeded ${countries.length} countries, ${universities.length} universities, ${programs.length} programs, ${sources.length} sources.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
