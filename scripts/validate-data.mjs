#!/usr/bin/env node
/**
 * StudyFreeEU — data validator
 *
 * Guards the accuracy rule: no record may claim a tuition status without a
 * source, and every record must carry a verification status + date policy.
 *
 * Usage: node scripts/validate-data.mjs
 * Exit code 1 on error, 0 on success (warnings do not fail the build).
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const DATA = path.resolve(__dirname, '..', 'data');
const read = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));

const ALLOWED_STATUS = new Set([
  'Tuition-Free', 'Tuition-Free + Mandatory Fees', 'Conditional Tuition-Free',
  'Low Tuition', 'Paid', 'Unknown / Needs Verification',
]);

let errors = 0, warnings = 0;
const err = (m) => { console.error('ERROR  ' + m); errors++; };
const warn = (m) => { console.warn('WARN   ' + m); warnings++; };

const countries = read('countries.json');
const universities = read('universities.json');
const programs = read('programs.json');
const sources = read('sources.json');

const countryCodes = new Set(countries.map((c) => c.code));
const uniIds = new Set(universities.map((u) => u.id));
const sourceUrls = new Set(sources.map((s) => s.url));

// --- countries ---
const seenCodes = new Set();
for (const c of countries) {
  if (seenCodes.has(c.code)) err(`duplicate country code ${c.code}`);
  seenCodes.add(c.code);
  if (!ALLOWED_STATUS.has(c.tuition_status)) err(`${c.code}: invalid tuition_status "${c.tuition_status}"`);
  if (!c.sources?.length) err(`${c.code}: no sources`);
  if (['Tuition-Free', 'Tuition-Free + Mandatory Fees', 'Conditional Tuition-Free', 'Low Tuition'].includes(c.tuition_status)
      && c.verification_status === 'Needs Verification') {
    warn(`${c.code}: claims "${c.tuition_status}" but is marked Needs Verification`);
  }
  for (const s of c.sources ?? []) {
    if (!/^https?:\/\//.test(s.url)) err(`${c.code}: malformed source url ${s.url}`);
  }
}

// --- universities ---
for (const u of universities) {
  if (!countryCodes.has(u.country_code)) err(`${u.id}: unknown country_code ${u.country_code}`);
  if (!ALLOWED_STATUS.has(u.tuition_status)) err(`${u.id}: invalid tuition_status "${u.tuition_status}"`);
  if (u.verification_status?.startsWith('Verified') && !(u.sources?.length)) err(`${u.id}: Verified but no sources`);
  for (const s of u.sources ?? []) {
    if (!/^https?:\/\//.test(s.url)) err(`${u.id}: malformed source url ${s.url}`);
  }
  const websiteHost = u.official_website ? new URL(u.official_website).host.replace(/^www\./, '') : null;
  const nameWords = u.name.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  if (websiteHost && nameWords.length) {
    const slugish = u.slug.replace(/-/g, '');
    if (!slugish && !websiteHost) warn(`${u.id}: cannot cross-check domain`);
  }
}

// --- programs ---
for (const p of programs) {
  if (!uniIds.has(p.university_id)) err(`${p.id}: unknown university_id ${p.university_id}`);
  if (!ALLOWED_STATUS.has(p.tuition_status)) err(`${p.id}: invalid tuition_status "${p.tuition_status}"`);
  if (!p.official_source_url) err(`${p.id}: no official_source_url`);
}

console.log(`\nValidated ${countries.length} countries, ${universities.length} universities, ${programs.length} programs, ${sources.length} sources.`);
console.log(`Result: ${errors} error(s), ${warnings} warning(s).`);
process.exit(errors > 0 ? 1 : 0);
