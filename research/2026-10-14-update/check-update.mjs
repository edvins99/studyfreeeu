import fs from 'node:fs';
import assert from 'node:assert/strict';
const root = new URL('../../', import.meta.url);
const read = f => JSON.parse(fs.readFileSync(new URL(`data/${f}.json`, root), 'utf8'));
const us = read('universities'), ps = read('programs'), cs = read('countries');
assert.equal(us.length, 326);
assert.equal(ps.length, 3521);
assert.equal(cs.length, 31);
const byId = new Map(us.map(u => [u.id, u]));
const correctedSE = ['se-kth','se-liu','se-lund','se-stockholm','se-umu','se-gothenburg','se-uppsala'];
for (const id of correctedSE) {
  const u = byId.get(id);
  assert.equal(u.est_annual_mandatory_cost_eur, 0);
  assert.equal(u.tuition_status, 'Tuition-Free');
  for (const p of ps.filter(p => p.university_id === id)) {
    assert.equal(p.tuition_status, 'Tuition-Free');
    assert.match(p.mandatory_fees, /voluntary/);
  }
}
for (const u of us.filter(u => u.country_code === 'FI')) {
  assert.match(u.other_mandatory_fees, /€35.35\/term/);
  assert.match(u.other_mandatory_fees, /citizenship alone is not sufficient/);
  assert.match(u.other_mandatory_fees, /2027 rate is not yet verified/);
  if (/university of applied sciences/i.test(u.name)) {
    assert.equal(u.est_annual_mandatory_cost_eur, 70.7);
    assert.match(u.mandatory_semester_fee, /optional/);
  }
}
assert.equal(byId.get('fi-aalto').est_annual_mandatory_cost_eur, 136.7);
assert.equal(byId.get('fi-helsinki').est_annual_mandatory_cost_eur, 155.7);
const ek = byId.get('dk-copenhagen-business-academy-cphbusiness');
assert.equal(ek.english_bachelor, false);
assert.match(ek.name, /Business Academy Copenhagen/);
for (const p of ps.filter(p => p.university_id === ek.id)) {
  assert.equal(p.language, 'Danish');
  assert.doesNotMatch(p.program_name, /English/);
}
for (const u of us.filter(u => u.country_code === 'SE')) assert.match(u.application_deadlines, /16 October 2026/);
for (const p of ps.filter(p => p.country_code === 'FI' && p.degree_level === 'PhD')) assert.match(p.mandatory_fees, /exempt/);
const html = u => fs.readFileSync(new URL(`dist/universities/${u.slug}/index.html`, root), 'utf8');
assert.match(html(ek), /No English-taught degree programmes recorded/);
assert.match(html(byId.get('fi-aalto')), /€66/);
assert.match(html(byId.get('fi-helsinki')), /€85/);
assert.match(html(byId.get('se-kth')), /voluntary/);
assert.match(html(byId.get('se-chalmers')), /SEK 280/);
console.log('Targeted regression checks passed; record counts, fee inheritance, exemptions, EK language and rendered pages verified.');