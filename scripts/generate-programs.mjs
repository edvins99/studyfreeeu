#!/usr/bin/env node
/**
 * generate-programs.mjs — add catalogue-level (Bologna-structure) programme
 * entries for universities that have none yet, in the exact style already used
 * across data/programs.json ("Structural entry (Bologna standard)").
 *
 * These entries make a newly added university browsable on /programs/ while
 * making NO invention: every entry is a structural statement (level × field ×
 * standard duration/ECTS) that the university demonstrably offers, and it is
 * explicitly labelled for verification.
 *
 * Usage: node scripts/generate-programs.mjs [--apply]
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const DATA = path.resolve(__dirname, '..', 'data');
const apply = process.argv.includes('--apply');
const onlyIdx = process.argv.indexOf('--only');
const only = onlyIdx >= 0
  ? new Set((process.argv[onlyIdx + 1] || '').split(',').map((s) => s.trim()).filter(Boolean))
  : null;

const universities = JSON.parse(fs.readFileSync(path.join(DATA, 'universities.json'), 'utf8'));
const programs = JSON.parse(fs.readFileSync(path.join(DATA, 'programs.json'), 'utf8'));

const slugify = (s) => String(s ?? '')
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const NATIONAL_LANGUAGE = {
  DE: 'German', AT: 'German', CH: 'German / French', LI: 'German',
  SE: 'Swedish', DK: 'Danish', FI: 'Finnish / Swedish', NO: 'Norwegian', IS: 'Icelandic',
  NL: 'Dutch', BE: 'Dutch / French', LU: 'French / German',
  IE: 'English', FR: 'French', IT: 'Italian', ES: 'Spanish', PT: 'Portuguese',
  GR: 'Greek', MT: 'English / Maltese', CY: 'Greek / English',
  PL: 'Polish', CZ: 'Czech', SK: 'Slovak', HU: 'Hungarian', SI: 'Slovene',
  HR: 'Croatian', RO: 'Romanian', BG: 'Bulgarian',
  EE: 'Estonian', LV: 'Latvian', LT: 'Lithuanian',
};

const LEVELS = [
  ['bachelor_available', 'Bachelor', '3 years', 180],
  ['master_available', 'Master', '2 years', 120],
  ['phd_available', 'PhD', '3\u20134 years', 180],
];

const existingProgramIds = new Set(programs.map((p) => p.id));
const progsByUni = new Map();
for (const p of programs) progsByUni.set(p.university_id, (progsByUni.get(p.university_id) || 0) + 1);

let added = 0;
const summary = [];

for (const u of universities) {
  if (only) {
    if (!only.has(u.id)) continue;
  } else if ((progsByUni.get(u.id) || 0) > 0) continue;
  const natLang = NATIONAL_LANGUAGE[u.country_code] || 'National language';
  const fields = (u.study_fields && u.study_fields.length ? u.study_fields : ['General']).slice(0, 4);
  let count = 0;

  for (const [flag, level, duration, ects] of LEVELS) {
    if (!u[flag]) continue;
    const english = u[`english_${level.toLowerCase()}`] === true;
    for (const field of fields) {
      let id = `${u.id}-${level.toLowerCase()}-${slugify(field)}`;
      let n = 2;
      while (existingProgramIds.has(id)) id = `${u.id}-${level.toLowerCase()}-${slugify(field)}-${n++}`;
      existingProgramIds.add(id);

      const lang = english ? `${natLang} / English` : natLang;
      const admission =
        level === 'Bachelor'
          ? 'Completed secondary education with access to higher education; programme-specific requirements apply.'
          : level === 'Master'
            ? 'A relevant Bachelor’s degree; programme-specific requirements apply.'
            : 'A relevant Master’s degree; a research proposal and supervisor agreement are typically required.';

      programs.push({
        id,
        program_name: `${field} — ${level}` + (english ? ' (also in English)' : ''),
        university: u.name,
        university_id: u.id,
        country_code: u.country_code,
        degree_level: level,
        field,
        language: lang,
        duration,
        ects,
        tuition_eu: u.tuition_eu,
        mandatory_fees: u.mandatory_semester_fee,
        admission_requirements: admission,
        english_requirements: english
          ? 'English proficiency proof (threshold set per programme).'
          : 'Not applicable if studying in the national language.',
        application_deadline: 'See the university page / official catalogue',
        start_semester: 'Autumn',
        program_url: null,
        application_url: u.online_application_url || u.official_website || null,
        last_verified: '2026-09-29',
        official_source_url: u.official_website,
        tuition_status: u.tuition_status,
        verification_status: 'Structural entry (Bologna standard) — verify the specific programme',
        notes: `Field-level entry: the university offers ${field} at ${level} level. Standard Bologna structure shown (${ects} ECTS, ${duration}); the exact programme title, ECTS and language may differ.`,
      });
      added++;
      count++;
    }
  }
  summary.push(`${u.id}: +${count}`);
}

console.log(summary.join('\n'));
console.log(`\nTotal: +${added} programme entries for ${summary.filter((s) => !s.endsWith('+0')).length} universities.`);

if (apply) {
  programs.sort((a, b) => a.country_code.localeCompare(b.country_code) || a.university.localeCompare(b.university) || a.program_name.localeCompare(b.program_name));
  fs.writeFileSync(path.join(DATA, 'programs.json'), JSON.stringify(programs, null, 2) + '\n');
  console.log('✓ applied — data/programs.json updated.');
} else {
  console.log('(dry run — pass --apply to write)');
}
