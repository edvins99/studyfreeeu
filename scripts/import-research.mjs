#!/usr/bin/env node
/**
 * import-research.mjs — merge researched university/programme records into the
 * StudyFreeEU database (data/universities.json, data/programs.json).
 *
 * Accepts research files in two schemas:
 *   A) "old" studyeu-free research schema  (fields: website, bachelor, master,
 *      phd, mandatory_semester_fee_eur, source_urls, verification_status: verified|needs_verification, …)
 *      — full country files and "addendum" files ("addendum": true).
 *   B) "new" studyfreeeu addition schema   (fields: official_website,
 *      bachelor_available, …, sources: [{label,url}], free-text verification_status)
 *
 * Duplicate protection: a record is skipped when a university with the same
 * name (case-insensitive, within the same country) or the same slug already
 * exists. Programmes are skipped when the same programme name already exists
 * for the same university.
 *
 * Usage:
 *   node scripts/import-research.mjs <file.json> [<file2.json> …] [--apply]
 * Without --apply the script only reports what it would add (dry run).
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const files = args.filter((a) => !a.startsWith('--'));
if (files.length === 0) {
  console.error('Usage: node scripts/import-research.mjs <file.json> … [--apply]');
  process.exit(1);
}

const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const universities = read(path.join(DATA, 'universities.json'));
const programs = read(path.join(DATA, 'programs.json'));
const countries = read(path.join(DATA, 'countries.json'));
const countryByCode = new Map(countries.map((c) => [c.code.toUpperCase(), c]));
const countryByName = new Map(countries.map((c) => [c.name.toLowerCase(), c]));
const countryBySlug = new Map(countries.map((c) => [c.slug.toLowerCase(), c]));

const slugify = (s) => String(s ?? '')
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');
const isHttp = (v) => typeof v === 'string' && /^https?:\/\//i.test(v.trim());
const clean = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);

const existingSlugs = new Set(universities.map((u) => u.slug));
const existingIds = new Set(universities.map((u) => u.id));
const existingProgramIds = new Set(programs.map((p) => p.id));
const nameKey = (country, name) => `${country}::${String(name).toLowerCase()}`;
const existingNames = new Set(universities.map((u) => nameKey(u.country, u.name)));

const TUITION_TEXT = {
  'Tuition-Free': '€0 tuition for EU/EEA citizens',
  'Tuition-Free + Mandatory Fees': '€0 tuition for EU/EEA citizens (mandatory semester fees apply)',
  'Conditional Tuition-Free': '€0 tuition if conditions are met — see country policy',
  'Low Tuition': 'Low tuition — see official fee schedule',
  'Paid': 'Standard tuition fee applies',
};

let addedUnis = 0;
let addedPrograms = 0;
const skipped = [];
const notes = [];

function uniqueSlug(base) {
  let slug = base;
  let n = 2;
  while (existingSlugs.has(slug)) slug = `${base}-${n++}`;
  existingSlugs.add(slug);
  return slug;
}
function uniqueId(base) {
  let id = base;
  let n = 2;
  while (existingIds.has(id)) id = `${base}-${n++}`;
  existingIds.add(id);
  return id;
}

function convertUniversity(rec, countryRec, fileSources) {
  const name = clean(rec.name);
  if (!name) return null;

  const isNewSchema = 'official_website' in rec || 'bachelor_available' in rec;

  // ---- shared / normalised values ----
  const website = clean(isNewSchema ? rec.official_website : rec.website);
  const bachelor = isNewSchema ? rec.bachelor_available === true : rec.bachelor === true;
  const master = isNewSchema ? rec.master_available === true : rec.master === true;
  const phd = isNewSchema ? rec.phd_available === true : rec.phd === true;

  let englishB, englishM, englishP;
  if (isNewSchema || typeof (rec.english_bachelor) === 'boolean') {
    englishB = rec.english_bachelor === true;
    englishM = rec.english_master === true;
    englishP = rec.english_phd === true;
  } else {
    const tri = (v) => String(v ?? '').toLowerCase();
    englishB = tri(rec.english_bachelor) === 'yes';
    englishM = tri(rec.english_master) === 'yes';
    englishP = tri(rec.english_phd) === 'yes';
    if (
      tri(rec.english_bachelor) === 'unknown' &&
      tri(rec.english_master) === 'unknown'
    ) {
      notes.push(`${name}: English-taught availability not verified`);
    }
  }

  const status = clean(rec.tuition_status) || 'Unknown / Needs Verification';

  // ---- sources: [{label,url}] ----
  const sources = [];
  const seenUrl = new Set();
  const pushSource = (label, u) => {
    if (!isHttp(u) || seenUrl.has(u)) return;
    seenUrl.add(u);
    sources.push({ label: clean(label) || new URL(u).host, url: u.trim() });
  };
  if (Array.isArray(rec.sources)) {
    for (const s of rec.sources) {
      if (s && typeof s === 'object') pushSource(s.label || s.title, s.url);
      else if (typeof s === 'string') pushSource(null, s);
    }
  }
  if (Array.isArray(rec.source_urls)) rec.source_urls.forEach((u) => pushSource(null, u));
  if (Array.isArray(fileSources)) {
    for (const s of fileSources) {
      if (isHttp(website) && s && s.url === website) continue;
      if (s && typeof s === 'object' && countryRec) {
        // only add file-level sources that look institution-specific
        continue;
      }
    }
  }
  if (website && sources.length === 0) pushSource(`${name} official website`, website);

  // ---- verification status (free text, matching the live dataset style) ----
  let verification;
  if (isNewSchema) {
    verification = clean(rec.verification_status) || 'Partially verified (national policy verified)';
  } else {
    verification =
      rec.verification_status === 'verified'
        ? 'Verified (official university page)'
        : 'Partially verified (national policy verified; institution fees pending)';
  }

  // ---- mandatory fees ----
  let feeText = clean(rec.mandatory_semester_fee);
  let feeEur = null;
  if (isNewSchema) {
    feeEur = typeof rec.est_annual_mandatory_cost_eur === 'number' ? rec.est_annual_mandatory_cost_eur : null;
  } else {
    if (typeof rec.mandatory_semester_fee_eur === 'number') {
      feeEur = Math.round(rec.mandatory_semester_fee_eur * 2); // semester → year
    } else if (feeText) {
      const m = feeText.match(/(\d[\d .,]*)/);
      if (m) {
        let raw = m[1].trim().replace(/\s/g, '');
        if (raw.includes('.') && raw.includes(',')) raw = raw.replace(/\./g, '').replace(',', '.');
        else if (/,/.test(raw) && /,\d{3}$/.test(raw)) raw = raw.replace(/,/g, '');
        else raw = raw.replace(',', '.');
        const n = Number(raw);
        if (Number.isFinite(n) && n > 0) feeEur = Math.round(n * 2);
      }
    }
  }

  const slug = uniqueSlug(clean(rec.slug) || slugify(name));
  const id = uniqueId(`${countryRec.code.toLowerCase()}-${slugify(name)}`);

  const extraNotes = [];
  if (clean(rec.notes)) extraNotes.push(clean(rec.notes));

  return {
    id,
    name,
    slug,
    country_code: countryRec.code,
    country: countryRec.name,
    city: clean(rec.city) || 'Not yet verified',
    type: clean(rec.type) || 'Public',
    official_website: isHttp(website) ? website.trim() : null,
    tuition_info_url: isHttp(rec.tuition_info_url) ? rec.tuition_info_url.trim() : null,
    admissions_url: isHttp(rec.admissions_url) ? rec.admissions_url.trim() : null,
    bachelor_available: bachelor,
    master_available: master,
    phd_available: phd,
    tuition_eu: clean(rec.tuition_eu) || TUITION_TEXT[status] || 'Not yet verified',
    mandatory_semester_fee:
      'mandatory_semester_fee' in rec
        ? feeText
        : feeText || 'Semester/administrative contribution — see official site',
    other_mandatory_fees: clean(rec.other_mandatory_fees),
    est_annual_mandatory_cost_eur: feeEur,
    english_bachelor: englishB,
    english_master: englishM,
    english_phd: englishP,
    study_fields: (Array.isArray(rec.study_fields) ? rec.study_fields : []).map(clean).filter(Boolean),
    language_requirements: clean(rec.language_requirements),
    english_test: clean(rec.english_test),
    application_deadlines: clean(rec.application_deadlines),
    admission_requirements: clean(rec.admission_requirements),
    application_platform: clean(rec.application_platform),
    online_application_url: isHttp(rec.online_application_url) ? rec.online_application_url.trim() : null,
    housing_url: isHttp(rec.housing_url) ? rec.housing_url.trim() : null,
    scholarship_url: isHttp(rec.scholarship_url) ? rec.scholarship_url.trim() : null,
    notes: extraNotes.join(' ') || null,
    last_verified: clean(rec.last_verified) || '2026-09-29',
    tuition_status: status,
    sources,
    verification_status: verification,
  };
}

function convertProgram(rec, uni, countryRec) {
  const programName = clean(rec.program_name || rec.name);
  if (!programName) return null;
  const levelRaw = String(rec.degree_level || rec.level || 'Master').toLowerCase();
  const level = /bachelor/.test(levelRaw) ? 'Bachelor' : /phd|doctor/.test(levelRaw) ? 'PhD' : 'Master';
  const ects = typeof rec.ects === 'number' ? rec.ects : null;
  let pid = `${uni.id}-${slugify(programName)}`;
  let n = 2;
  while (existingProgramIds.has(pid)) pid = `${uni.id}-${slugify(programName)}-${n++}`;
  existingProgramIds.add(pid);

  const sourceUrl = isHttp(rec.source_url) ? rec.source_url.trim()
    : isHttp(rec.official_source_url) ? rec.official_source_url.trim()
    : uni.official_website;

  const isNewSchema = 'official_source_url' in rec || 'program_name' in rec;
  const verified = isNewSchema
    ? /^verified/i.test(String(rec.verification_status || ''))
    : rec.verified === true;

  return {
    id: pid,
    program_name: programName,
    university: uni.name,
    university_id: uni.id,
    country_code: countryRec.code,
    degree_level: level,
    field: clean(rec.field) || 'Other',
    language: clean(rec.language) || 'Not yet verified',
    duration: clean(rec.duration) || 'Not yet verified',
    ects,
    tuition_eu: clean(rec.tuition_eu) || TUITION_TEXT[uni.tuition_status] || 'Not yet verified',
    mandatory_fees: clean(rec.mandatory_fees) || uni.mandatory_semester_fee,
    admission_requirements: clean(rec.admission_requirements) || 'Not yet verified',
    english_requirements: clean(rec.english_requirements) || 'Not yet verified',
    application_deadline: clean(rec.application_deadline || rec.deadline) || 'Not yet verified',
    start_semester: clean(rec.start_semester) || 'Not yet verified',
    program_url: isHttp(rec.program_url) ? rec.program_url.trim() : null,
    application_url: isHttp(rec.application_url) ? rec.application_url.trim() : null,
    last_verified: clean(rec.last_verified) || '2026-09-29',
    official_source_url: sourceUrl,
    tuition_status: clean(rec.tuition_status) || uni.tuition_status,
    verification_status: verified ? 'Verified (official programme page)' : 'Needs Verification',
    notes: clean(rec.notes) || '',
  };
}

// ---------------------------------------------------------------------------
for (const file of files) {
  let raw;
  try {
    raw = read(file);
  } catch (e) {
    console.error(`✗ ${path.basename(file)}: invalid JSON (${e.message})`);
    continue;
  }

  const c = raw.country ?? {};
  const code = (clean(c.code) || '').toUpperCase();
  let countryRec = countryByCode.get(code) || countryByName.get(String(clean(c.name) || '').toLowerCase());
  if (!countryRec) {
    // fall back to the filename: research-<country-slug>-additions.json
    const m = path.basename(file).match(/^research-([a-z-]+?)(?:-additions)?\.json$/i);
    if (m) countryRec = countryBySlug.get(m[1].toLowerCase());
  }
  if (!countryRec) {
    console.error(`✗ ${path.basename(file)}: unknown country "${code || clean(c.name)}" — skipped`);
    continue;
  }

  const uniList = Array.isArray(raw.universities) ? raw.universities : [];
  const progList = Array.isArray(raw.programs) ? raw.programs : [];
  const fileLabel = path.basename(file);
  let fileAddedU = 0;
  let fileAddedP = 0;

  // 1) universities
  const newOnes = [];
  for (const rec of uniList) {
    const name = clean(rec?.name);
    if (!name) continue;
    if (existingNames.has(nameKey(countryRec.name, name))) {
      skipped.push(`${fileLabel}: duplicate university "${name}" (${countryRec.code}) — skipped`);
      continue;
    }
    const uni = convertUniversity(rec, countryRec, raw.sources);
    if (!uni) continue;
    existingNames.add(nameKey(countryRec.name, name));
    newOnes.push(uni);
    universities.push(uni);
    fileAddedU++;
  }

  // 2) programs — resolve university by name within the country
  const byName = new Map(universities.filter((u) => u.country_code === countryRec.code).map((u) => [u.name.toLowerCase(), u]));
  for (const rec of progList) {
    const uniName = clean(rec?.university);
    if (!uniName) continue;
    const uni = byName.get(uniName.toLowerCase());
    if (!uni) {
      skipped.push(`${fileLabel}: programme "${clean(rec.program_name || rec.name)}" references unknown university "${uniName}" — skipped`);
      continue;
    }
    const prog = convertProgram(rec, uni, countryRec);
    if (!prog) continue;
    programs.push(prog);
    fileAddedP++;
  }

  addedUnis += fileAddedU;
  addedPrograms += fileAddedP;
  console.log(`${fileLabel}: +${fileAddedU} universities, +${fileAddedP} programmes (${countryRec.name})`);
}

console.log(`\nTotal: +${addedUnis} universities, +${addedPrograms} programmes, ${skipped.length} skipped.`);
if (notes.length) {
  console.log(`Notes (${notes.length}):`);
  notes.slice(0, 10).forEach((n) => console.log(`  · ${n}`));
}
if (skipped.length) {
  console.log(`Skipped (first 15):`);
  skipped.slice(0, 15).forEach((s) => console.log(`  · ${s}`));
  if (skipped.length > 15) console.log(`  … and ${skipped.length - 15} more`);
}

if (apply) {
  universities.sort((a, b) => a.country.localeCompare(b.country) || a.name.localeCompare(b.name));
  programs.sort((a, b) => a.country_code.localeCompare(b.country_code) || a.university.localeCompare(b.university) || a.program_name.localeCompare(b.program_name));
  fs.writeFileSync(path.join(DATA, 'universities.json'), JSON.stringify(universities, null, 2) + '\n');
  fs.writeFileSync(path.join(DATA, 'programs.json'), JSON.stringify(programs, null, 2) + '\n');
  console.log('\n✓ applied — data/universities.json and data/programs.json updated.');
} else {
  console.log('\n(dry run — pass --apply to write)');
}
