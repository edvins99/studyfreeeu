import fs from 'node:fs';

const root = new URL('../../', import.meta.url);
const load = name => JSON.parse(fs.readFileSync(new URL(`data/${name}.json`, root), 'utf8'));
const save = (name, rows) => fs.writeFileSync(new URL(`data/${name}.json`, root), JSON.stringify(rows, null, 2) + '\n');
const universities = load('universities');
const countries = load('countries');
const programs = load('programs');
const today = '2026-10-14';
if (universities.some(u => ['SE', 'FI'].includes(u.country_code) && u.last_verified === today)) {
  throw new Error('One-time migration already applied. Restore the pre-update data before rerunning.');
}
const sources = {
  sweden: ['KTH — student union membership is optional at state-run universities', 'https://www.kth.se/blogs/president/2023/03/student-democracy-worth-protecting'],
  swedenCosts: ['Study in Sweden — fees and optional student union membership', 'https://studyinsweden.se/plan-your-studies/fees-costs/'],
  dates: ['University Admissions Sweden — autumn 2027 national admission rounds', 'https://www.universityadmissions.se/en/key-dates-and-deadlines/autumn-semester-dates/'],
  chalmers: ['Chalmers — compulsory student union membership', 'https://www.chalmers.se/en/education/your-studies/rights-and-obligations/'],
  chalmersFees: ['Chalmers Student Union — membership fees', 'https://chalmersstudentkar.se/faq-general'],
  finland: ['Study in Finland — union membership and costs', 'https://www.studyinfinland.fi/funding-your-studies/fees-and-cost-living'],
  kela: ['Kela — 2026 healthcare fee and social-security exemptions', 'https://www.kela.fi/student-healthcare-fee-higher-education'],
  aalto: ['AYY — membership fee 2026/27', 'https://www.ayy.fi/en/membership-and-student-card/membership-fee'],
  helsinki: ['HYY — membership fee 2026/27', 'https://hyy.fi/en/members/membership'],
  oulu: ['University of Oulu — 2027 bachelor admission timelines', 'https://www.oulu.fi/en/apply/how-apply/applying-bachelors-programmes/bachelors-admissions-deadlines'],
  ek: ['Business Academy Copenhagen (EK) — current institution and merger', 'https://www.ek.dk/english'],
  ekDegrees: ['EK — full degrees offered only in Danish', 'https://www.ek.dk/english/about-us/programmes-at-ek'],
};
function cite(record, ...keys) {
  record.sources ??= [];
  for (const key of keys) {
    const [label, url] = sources[key];
    if (!record.sources.some(s => s.url === url)) record.sources.push({label, url});
  }
}
function note(record, text) {
  record.notes = [record.notes, text].filter(Boolean).join(' ');
}
const changed = new Set();
function checked(u, scope) {
  u.last_verified = today;
  u.verification_history ??= [];
  u.verification_history.push({date: today, scope, note: 'Targeted review only; other institution/programme details were not reverified.'});
  changed.add(u.id);
}
const swedenRound = 'Autumn 2027 national first round: opens 16 October 2026; application deadline 15 January 2027; supporting documents and proof of fee exemption due 1 February 2027. Second round: 15 March–15 April 2027, with fewer English-taught options. Programme-specific/artistic selection and direct-admission deadlines may differ; check the programme page.';
const healthcare = 'Kela healthcare fee is separate from student union membership: €35.35/term in calendar year 2026. Exempt if covered by social security in another EU/EEA country, Switzerland, the UK or EU institutions; citizenship alone is not sufficient. Send Kela the EHIC/GHIC or other required evidence. Doctoral and exchange students are outside this fee scheme. The 2027 rate is not yet verified.';
for (const u of universities) {
  if (u.country_code === 'SE') {
    u.application_deadlines = swedenRound;
    cite(u, 'dates');
    if (u.id === 'se-chalmers') {
      u.mandatory_semester_fee = 'Compulsory Chalmers Student Union membership: SEK 280/semester for Bachelor’s/Master’s students; SEK 220/semester for doctoral students. Exchange students: SEK 200/semester.';
      u.est_annual_mandatory_cost_eur = 50;
      cite(u, 'chalmers', 'chalmersFees');
      note(u, 'Annual cost is approximately €50 for two semesters (SEK 560); EUR conversion is indicative, not a fixed fee.');
    } else if (u.est_annual_mandatory_cost_eur > 0) {
      u.mandatory_semester_fee = 'No compulsory student union fee; membership is voluntary. Optional membership and study materials are excluded from the mandatory-cost estimate.';
      u.est_annual_mandatory_cost_eur = 0;
      u.tuition_status = 'Tuition-Free';
      cite(u, 'sweden', 'swedenCosts');
    }
    checked(u, u.id === 'se-chalmers' ? 'national admission dates and compulsory union fee' : 'national admission dates; any corrected union fee is voluntary');
  }
  if (u.country_code === 'FI') {
    const uas = /university of applied sciences/i.test(u.name);
    if (uas) {
      u.mandatory_semester_fee = 'Student union membership is optional at universities of applied sciences. Kela healthcare: €35.35/term in 2026 only if liable; €0 with a qualifying social-security exemption.';
      u.est_annual_mandatory_cost_eur = 70.7;
      note(u, 'Indicative healthcare budget: €70.70/year if liable, €0 if exempt. Based on the 2026 rate; the spring 2027 rate is not yet verified. Optional union membership is excluded.');
    } else {
      const exact = u.id === 'fi-aalto' ? 66 : u.id === 'fi-helsinki' ? 85 : null;
      const union = exact ?? u.est_annual_mandatory_cost_eur;
      u.mandatory_semester_fee = exact !== null
        ? `Compulsory Bachelor’s/Master’s student union membership: €${union} for academic year 2026/27. Doctoral membership is optional. Healthcare is paid separately to Kela if liable.`
        : `Bachelor’s/Master’s student union membership is compulsory; budget approximately €${union}/year (institution-specific 2026/27 amount not yet verified). Healthcare is paid separately to Kela if liable; check doctoral union conditions separately.`;
      u.est_annual_mandatory_cost_eur = Math.round((union + 70.7) * 100) / 100;
      note(u, `Annual budget: ${exact !== null ? 'verified 2026/27' : 'indicative, not institution-verified'} union fee €${union} plus €70.70 healthcare if liable. Qualifying external social-security coverage exempts healthcare. Healthcare uses the 2026 rate; the spring 2027 rate is not yet verified.`);
      if (exact !== null) cite(u, u.id === 'fi-aalto' ? 'aalto' : 'helsinki');
    }
    u.other_mandatory_fees = healthcare;
    cite(u, 'finland', 'kela');
    checked(u, 'union/healthcare fee distinctions and exemption rules; only Aalto/Helsinki institution-specific union amounts were newly verified');
  }
  if (u.id === 'fi-oulu') {
    u.application_deadlines = 'Autumn 2027: joint application 7 January 2027 08:00–21 January 2027 15:00 (UTC+2); supporting documents due 28 January 2027 15:00 (UTC+2). International Business Management Bachelor only: rolling admission 1 October 2026–25 February 2027 15:00 (UTC+2), or earlier if places fill; not applicable to all programmes.';
    cite(u, 'oulu');
  }
  if (u.id === 'dk-copenhagen-business-academy-cphbusiness') {
    u.name = 'Business Academy Copenhagen (EK; formerly Cphbusiness/KEA)';
    u.official_website = sources.ek[1];
    u.admissions_url = sources.ekDegrees[1];
    u.english_bachelor = false;
    u.language_requirements = 'Full degree programmes are taught in Danish; check programme-specific Danish language requirements. English-taught exchange semesters do not constitute a full English-taught degree.';
    u.application_deadlines = 'Full-degree admissions: check the current Danish programme page and optagelse.dk; no full English-taught degree intake. English exchange semesters have separate partner-nomination deadlines.';
    u.application_platform = 'optagelse.dk / current Danish programme page for full degrees; separate partner-university nomination for exchange';
    u.notes = 'Cphbusiness and KEA merged into Business Academy Copenhagen (EK). EK explicitly states that its full degree programmes are offered only in Danish. English-language exchange opportunities are not full degree programmes. The legacy id/URL is retained to preserve existing links.';
    cite(u, 'ek', 'ekDegrees');
    checked(u, 'successor institution, current website and full-degree teaching language');
  }
}
const se = countries.find(c => c.code === 'SE');
se.tuition_status = 'Tuition-Free';
se.public_universities = 'No tuition or application fee for EU/EEA/Swiss citizens; student union membership is voluntary at state-run universities.';
se.mandatory_fees = 'No general compulsory student union fee at state-run universities; voluntary memberships are excluded. Institution-specific exceptions exist: Chalmers requires union membership (SEK 280/semester for Bachelor’s/Master’s students).';
se.mandatory_fee_estimate_eur_year = 0;
se.document_submission = {
  opens: '16 October 2026 (autumn 2027 national first round)',
  closes: '15 January 2027 applications; 1 February 2027 supporting documents and proof of fee exemption',
  documents: 'Upload required certificates, transcripts and citizenship/fee-exemption evidence to universityadmissions.se; follow programme-specific requirements.',
  note: 'Second round: 15 March–15 April 2027, fewer English-taught options. Artistic/direct admissions may have different dates. These are national application dates, not individually verified programme deadlines.',
};
cite(se, 'sweden', 'swedenCosts', 'chalmers', 'chalmersFees', 'dates');
se.last_verified = today;
const fi = countries.find(c => c.code === 'FI');
fi.public_universities = 'Tuition-free for EU/EEA/Swiss citizens. Union membership is compulsory for Bachelor’s/Master’s students at universities but optional at universities of applied sciences; healthcare is a separate conditional fee.';
fi.bachelor = fi.master = '€0 tuition for EU/EEA/Swiss citizens. University union fees and conditional Kela healthcare fees may apply; UAS union membership is optional.';
fi.mandatory_fees = 'University Bachelor’s/Master’s union fee varies by institution (e.g. Aalto €66 and Helsinki €85 in 2026/27); UAS membership is optional. Separate Kela healthcare fee: €35.35/term in calendar year 2026, exempt with qualifying social-security coverage in another EU/EEA country, Switzerland, UK or EU institutions. Citizenship alone does not establish healthcare exemption. The 2027 healthcare rate is not yet verified.';
fi.mandatory_fee_estimate_eur_year = 150.7;
fi.residency_conditions = 'EU/EEA/Swiss citizens are exempt from degree tuition. Other applicants pay a €100 application fee for Bachelor’s and Master’s applications unless exempt. Kela healthcare exemption depends on social-security coverage, not citizenship alone.';
fi.document_submission = {
  opens: '7 January 2027 (January joint application; check the individual programme)',
  closes: '21 January 2027 at 15:00 Finnish time (UTC+2)',
  documents: 'Upload required certificates to Studyinfo by each programme’s document deadline; application and supporting-document deadlines are distinct.',
  note: 'Separate/direct and rolling admissions have different dates. Oulu International Business Management Bachelor rolling admission: 1 October 2026–25 February 2027, or earlier if filled. Check each programme.',
};
cite(fi, 'finland', 'kela', 'aalto', 'helsinki', 'oulu');
fi.last_verified = today;
note(fi, 'The national annual estimate is illustrative (€80 union budget + €70.70 conditional healthcare using the 2026 rate); it is not a uniform mandatory charge or a confirmed 2026/27 total.');
const byId = new Map(universities.map(u => [u.id, u]));
let inherited = 0;
for (const p of programs) {
  const u = byId.get(p.university_id);
  if (!changed.has(u.id)) continue;
  let touched = false;
  if (u.country_code === 'SE' || u.country_code === 'FI') {
    p.tuition_status = u.tuition_status;
    p.mandatory_fees = u.country_code === 'FI' && p.degree_level === 'PhD'
      ? 'Doctoral students are exempt from the Kela student healthcare fee. Check institution-specific student union conditions; Bachelor’s/Master’s fee estimates do not apply.'
      : [u.mandatory_semester_fee, u.other_mandatory_fees].filter(Boolean).join(' ');
    touched = true;
  }
  if (u.id === 'dk-copenhagen-business-academy-cphbusiness') {
    p.university = u.name;
    p.language = 'Danish';
    p.program_name = p.program_name.replace(' (also in English)', '').replace(' (English-taught)', '');
    p.english_requirements = 'Full degree is taught in Danish; verify Danish language requirements with EK. English exchange options are separate.';
    p.application_url = sources.ekDegrees[1];
    p.official_source_url = sources.ekDegrees[1];
    p.application_deadline = 'Check the current Danish degree programme page / optagelse.dk; no full English-taught degree intake.';
    touched = true;
  }
  if (touched) {
    note(p, `${today}: inherited university-level fee/language policy corrected; this does not verify the specific programme title, duration, availability or admission deadline.`);
    inherited++;
  }
}
save('universities', universities);
save('countries', countries);
save('programs', programs);
console.log(JSON.stringify({universitiesUpdated: changed.size, countriesUpdated: 2, programmePolicyUpdates: inherited, totalUniversities: universities.length, totalProgrammeEntries: programs.length}));