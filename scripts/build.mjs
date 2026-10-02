#!/usr/bin/env node
/**
 * StudyFreeEU — static site generator
 *
 * Reads the JSON knowledge base under data/ and emits a fully pre-rendered,
 * SEO-friendly static site (clean directory URLs) into OUT_DIR.
 * No runtime, no server, no CDN — safe for the managed nginx static host.
 *
 * Usage: node scripts/build.mjs [outDir]
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { flagsCss, flagIcon } from './flags.mjs';
import { ic, euStars } from './icons.mjs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const WEB = path.join(ROOT, 'web');
const OUT = process.argv[2] || process.env.OUT_DIR ||
  path.resolve(ROOT, 'dist');
const CONTACT_EMAIL = 'studyfreeeu@gmail.com';
const SITE = (process.env.SITE_URL || 'https://edvins99.github.io/studyfreeeu').replace(/\/$/, '');

const read = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
const countries = read('countries.json');
const universities = read('universities.json');
const programs = read('programs.json').filter((p) => universities.some((u) => u.id === p.university_id));
const sources = read('sources.json');

const byCode = new Map(countries.map((c) => [c.code, c]));
const uniById = new Map(universities.map((u) => [u.id, u]));

/* ------------------------------------------------------------------ utils */
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const prefix = (depth) => '../'.repeat(depth);
function write(rel, html) {
  const full = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, html);
}
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dest, e.name);
    if (e.isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d);
  }
}

/* ------------------------------------------------------------------------
 * Deploy-friendly chunking.
 * The publishing ingress for this project accepts only small payloads
 * (≤ ~100 KB per file), so large client payloads — the university/programme
 * card lists and the client-side datasets — are emitted as numbered chunk
 * files loaded with plain <script> tags instead of being inlined.
 * HTML chunks are split only between complete elements and injected
 * synchronously during parsing (document.currentScript), so the resulting DOM
 * is identical to the previous inlined markup and the existing filter code in
 * app.js keeps working unchanged.
 * ---------------------------------------------------------------------- */
function chunkItems(items, render, maxBytes = 55000) {
  const chunks = [];
  let cur = '';
  for (const it of items) {
    const piece = render(it);
    if (cur && cur.length + piece.length > maxBytes) { chunks.push(cur); cur = ''; }
    cur += piece;
  }
  if (cur) chunks.push(cur);
  return chunks;
}
function writePartials(folder, chunks, depth) {
  return chunks.map((c, i) => {
    const name = `${folder}/chunk-${String(i + 1).padStart(2, '0')}.js`;
    write(
      `assets/partials/${name}`,
      `document.currentScript.insertAdjacentHTML('beforebegin', ${JSON.stringify(c)
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029')});\n`,
    );
    return `<script src="${prefix(depth)}assets/partials/${name}"></script>`;
  }).join('\n');
}
function writeDataChunks(varName, name, items, depth, mapFn = (x) => x, maxBytes = 55000) {
  const chunks = [];
  let cur = [];
  let curSize = 0;
  for (const it of items) {
    const j = JSON.stringify(mapFn(it));
    if (cur.length && curSize + j.length > maxBytes) { chunks.push(cur); cur = []; curSize = 0; }
    cur.push(j);
    curSize += j.length + 1;
  }
  if (cur.length) chunks.push(cur);
  return chunks.map((c, i) => {
    const file = `assets/data/${name}-${String(i + 1).padStart(2, '0')}.js`;
    write(file, `window.${varName}=(window.${varName}||[]).concat([${c.join(',')}]);\n`);
    return `<script src="${prefix(depth)}${file}"></script>`;
  }).join('\n');
}
const STATUS_CLASS = {
  'Tuition-Free': 'b-free',
  'Tuition-Free + Mandatory Fees': 'b-fees',
  'Conditional Tuition-Free': 'b-cond',
  'Low Tuition': 'b-low',
  'Paid': 'b-paid',
  'Unknown / Needs Verification': 'b-unknown'
};
const BADGE_LABEL = {
  'Tuition-Free': '€0 tuition',
  'Tuition-Free + Mandatory Fees': '€0 tuition + fees',
  'Conditional Tuition-Free': '€0 with conditions',
  'Low Tuition': 'Low tuition',
};
const statusBadge = (s) => `<span class="badge ${STATUS_CLASS[s] || 'b-unknown'}" title="${esc(s)}">${esc(BADGE_LABEL[s] || s)}</span>`;
const levelShort = (u) => [u.bachelor_available && 'Bachelor', u.master_available && 'Master', u.phd_available && 'PhD'].filter(Boolean).join(' · ');
const money = (v) => (v == null ? 'Not yet verified' : '€' + Number(v).toLocaleString('en-IE'));
const levelsOf = (u) => [u.bachelor_available && 'b', u.master_available && 'm', u.phd_available && 'p'].filter(Boolean).join(',');
const levelWords = (u) => [u.bachelor_available && 'Bachelor', u.master_available && 'Master', u.phd_available && 'PhD'].filter(Boolean).join(', ');
const engWords = (u) => [u.english_bachelor && 'Bachelor', u.english_master && 'Master', u.english_phd && 'PhD'].filter(Boolean).join(', ');
const fieldsOf = (u) => (u.study_fields || []).map((f) => f.toLowerCase()).join(',');
const hasEnglish = (u) => !!(u.english_bachelor || u.english_master || u.english_phd);
const flag = (cc, size = 'md') => flagIcon(cc.toUpperCase(), size);
const SHORT_STATUS = {
  'Tuition-Free': '€0 tuition',
  'Tuition-Free + Mandatory Fees': '€0 + fees',
  'Conditional Tuition-Free': 'Conditional',
  'Low Tuition': 'Low tuition',
  'Paid': 'Paid',
  'Unknown / Needs Verification': 'Verify'
};
const shortStatus = (s) => SHORT_STATUS[s] || s;

const NAV = [
  ['Universities', 'universities/index.html'],
  ['Programs', 'programs/index.html'],
  ['Countries', 'countries/index.html'],
  ['Deadlines', 'deadlines/index.html'],
  ['Study Fields', 'fields/index.html'],
  ['Glossary', 'glossary/index.html'],
  ['How It Works', 'how-it-works/index.html'],
  ['About', 'about/index.html'],
  ['Contact', 'contact/index.html']
];

function layout({ title, description, depth, body, canonical, extraHead = '', active = '' }) {
  const p = prefix(depth);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE}/${canonical || ''}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:image" content="${SITE}/assets/img/og-image.jpg">
<meta property="og:url" content="${SITE}/${canonical || ''}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${SITE}/assets/img/og-image.jpg">
<meta name="theme-color" content="#003399">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%23003399'/%3E%3Ctext x='16' y='22' font-size='16' font-family='Arial' font-weight='bold' fill='%23ffcc00' text-anchor='middle'%3EEU%3C/text%3E%3C/svg%3E">
<link rel="preload" href="${p}assets/fonts/inter-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${p}assets/css/styles.css">
<link rel="stylesheet" href="${p}assets/css/flags.css">
${extraHead}
</head>
<body>
<header class="site-header">
  <div class="container header-inner">
    <a class="brand" href="${p}index.html"><span class="brand-mark">${euStars('bm-stars', 34, 7)}</span><span>Study<b>Free</b>EU</span></a>
    <button class="nav-toggle" aria-label="Menu" aria-expanded="false"><span></span><span></span><span></span></button>
    <nav class="nav" aria-label="Main">
      ${NAV.map(([label, href]) => `<a href="${p}${href}" class="${active === label ? 'active' : ''}">${label}</a>`).join('\n      ')}
    </nav>
  </div>
</header>
<main>
${body}
</main>
<div class="compare-bar" id="compare-bar">
  <div class="container compare-inner">
    <b>Compare</b>
    <div class="compare-chips"></div>
    <button class="btn" type="button" class="js-compare-clear" onclick="localStorage.removeItem('sfe_compare');location.reload()">Clear</button>
    <a class="btn primary js-compare-go" href="${p}compare/index.html">Compare now →</a>
  </div>
</div>
<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <div>
        <div class="brand" style="color:#fff"><span class="brand-mark">${euStars('bm-stars', 34, 7)}</span><span>Study<b>Free</b>EU</span></div>
        <p class="small" style="color:#9fb2da;margin-top:10px">An independent, source-backed directory of European universities and English-taught programmes where EU citizens can study without paying standard tuition fees.</p>
        <p class="small" style="margin-top:10px"><a class="footer-mail" href="mailto:${CONTACT_EMAIL}">${ic('mail')} ${CONTACT_EMAIL}</a></p>
      </div>
      <div><h4>Explore</h4><ul>
        <li><a href="${p}universities/index.html">Universities</a></li>
        <li><a href="${p}programs/index.html">Programs</a></li>
        <li><a href="${p}countries/index.html">Countries</a></li>
        <li><a href="${p}fields/index.html">Study Fields</a></li>
        <li><a href="${p}deadlines/index.html">Deadlines</a></li>
      </ul></div>
      <div><h4>Learn</h4><ul>
        <li><a href="${p}how-it-works/index.html">How It Works</a></li>
        <li><a href="${p}about/index.html">About &amp; Sources</a></li>
        <li><a href="${p}contact/index.html">Contact</a></li>
        <li><a href="${p}glossary/index.html">Glossary</a></li>
        <li><a href="${p}compare/index.html">Compare universities</a></li>
        <li><a href="${p}admin/index.html">Data console</a></li>
      </ul></div>
      <div><h4>Popular guides</h4><ul>
        <li><a href="${p}tuition-free-universities-for-eu-students/index.html">Tuition-free for EU students</a></li>
        <li><a href="${p}english-taught-tuition-free-bachelors/index.html">English-taught Bachelor's</a></li>
        <li><a href="${p}english-taught-tuition-free-masters/index.html">English-taught Master's</a></li>
        <li><a href="${p}free-computer-science-degrees-europe/index.html">Free CS degrees</a></li>
        <li><a href="${p}free-business-degrees-europe/index.html">Free business degrees</a></li>
        <li><a href="${p}tuition-free-phd-in-europe/index.html">Tuition-free PhD</a></li>
      </ul></div>
    </div>
    <div class="footer-bottom">
      <p>Tuition rules may change. Always verify current fees and admission requirements on the university's official website before applying. This site is informational and is not affiliated with any university or the European Union.</p>
      <p>Data version 2026/2027 · last built ${new Date().toISOString().slice(0, 10)}</p>
    </div>
  </div>
</footer>
<script src="${p}assets/js/app.js" defer></script>
</body>
</html>`;
}

const disclaimer = `<div class="disclaimer"><b>Always verify.</b> Tuition rules may change. Always verify current fees and admission requirements on the university's official website before applying.</div>`;

/* ------------------------------------------------------------- components */
function uniCard(u, depth) {
  const p = prefix(depth);
  const c = byCode.get(u.country_code);
  return `<article class="uni-card card cf-${u.country_code} flag-top"
    data-id="${u.id}" data-name="${esc((u.name + ' ' + u.country + ' ' + u.city).toLowerCase())}"
    data-city="${esc((u.city || '').toLowerCase())}" data-country="${u.country_code}"
    data-status="${esc(u.tuition_status)}" data-levels="${levelsOf(u)}"
    data-english="${hasEnglish(u) ? 1 : 0}" data-cost="${u.est_annual_mandatory_cost_eur == null ? '' : u.est_annual_mandatory_cost_eur}"
    data-fields="${esc(fieldsOf(u))}">
    <div class="uc-head">
      <span class="uc-flag">${flag(u.country_code)}</span>
      <div class="uc-title">
        <h3><a href="${p}universities/${u.slug}/index.html">${esc(u.name)}</a></h3>
        <div class="meta">${esc(u.city)}, ${esc(u.country)} · ${esc(u.type)}</div>
      </div>
    </div>
    <div class="badges">
      ${statusBadge(u.tuition_status)}
      ${hasEnglish(u) ? '<span class="badge b-en">English-taught</span>' : ''}
    </div>
    <p class="uc-tuition">${esc(u.tuition_eu)}</p>
    <dl class="uc-facts">
      <div><dt>Mandatory cost / yr</dt><dd>${money(u.est_annual_mandatory_cost_eur)}</dd></div>
      <div><dt>Degree levels</dt><dd>${levelShort(u) || '—'}</dd></div>
    </dl>
    <div class="card-actions">
      <a class="btn primary" href="${p}universities/${u.slug}/index.html">View details</a>
      <button class="btn icon js-fav" type="button" data-id="${u.id}" aria-label="Save ${esc(u.name)}" title="Save">☆</button>
      <button class="btn icon js-compare" type="button" data-id="${u.id}" data-name="${esc(u.name)}" aria-label="Compare ${esc(u.name)}" title="Compare">⇄</button>
    </div>
  </article>`;
}

function programCard(pr, depth) {
  const p = prefix(depth);
  const u = uniById.get(pr.university_id);
  const c = byCode.get(pr.country_code);
  const free = pr.tuition_status === 'Tuition-Free' || pr.tuition_status === 'Tuition-Free + Mandatory Fees';
  const cost = free ? 0 : (pr.tuition_status === 'Low Tuition' ? 2000 : '');
  return `<article class="uni-card card cf-${pr.country_code} flag-top"
    data-id="${pr.id}" data-name="${esc((pr.program_name + ' ' + pr.university + ' ' + pr.field + ' ' + pr.language).toLowerCase())}"
    data-city="" data-country="${pr.country_code}" data-status="${esc(pr.tuition_status)}"
    data-levels="${pr.degree_level === 'Bachelor' ? 'b' : pr.degree_level === 'Master' ? 'm' : 'p'}"
    data-english="${(pr.language || '').toLowerCase().indexOf('english') !== -1 ? 1 : 0}"
    data-cost="${cost}" data-fields="${esc((pr.field || '').toLowerCase())}">
    <h3>${esc(pr.program_name)}</h3>
    <div class="meta">${ic('cap')} ${esc(pr.degree_level)} · ${esc(pr.language)} · ${pr.duration || '—'}${pr.ects ? ' · ' + pr.ects + ' ECTS' : ''}</div>
    <div class="meta">${c ? flag(c.code, 'sm') + ' ' + esc(c.name) : ''} · <a href="${p}universities/${u.slug}/index.html">${esc(u.name)}</a></div>
    <div class="badges">${statusBadge(pr.tuition_status)}<span class="badge b-plain">${esc(pr.field)}</span>${(pr.language || '').toLowerCase().indexOf('english') !== -1 ? '<span class="badge b-en">English-taught</span>' : ''}</div>
    <div class="cost-line"><span>Tuition (EU)</span><b>${esc(pr.tuition_eu)}</b></div>
    <div class="cost-line"><span>Mandatory fees</span><b>${esc(pr.mandatory_fees || 'Not yet verified')}</b></div>
    <div class="cost-line"><span>Deadline</span><b>${esc(pr.application_deadline)}</b></div>
    <p class="small muted" style="margin:6px 0 0"><b>Entry requirements:</b> ${esc(pr.admission_requirements)}</p>
  </article>`;
}

function countryCard(c, depth) {
  const p = prefix(depth);
  const n = universities.filter((u) => u.country_code === c.code).length;
  return `<article class="card country-card cf-${c.code} flag-top">
    <div class="badges" style="margin-bottom:8px">
      ${statusBadge(c.tuition_status)}
      ${c.is_eu ? '<span class="badge b-plain">EU MEMBER</span>' : '<span class="badge b-plain">OTHER EUROPE</span>'}
    </div>
    <h3 class="cc-title">${flag(c.code, 'lg')}<a href="${p}countries/${c.slug}/index.html">${esc(c.name)}</a></h3>
    <p class="small muted" style="margin:6px 0">${esc(c.eu_tuition)}</p>
    <p class="small">${n} universit${n === 1 ? 'y' : 'ies'} in database · priority ${c.priority}</p>
  </article>`;
}

/* --------------------------------------------------------------- 1. home */
function buildHome() {
  const euCountries = countries.filter((c) => c.is_eu);
  const otherCountries = countries.filter((c) => !c.is_eu);
  const isFree = (u) => u.tuition_status === 'Tuition-Free' || u.tuition_status === 'Tuition-Free + Mandatory Fees';
  const freeUnis = universities.filter(isFree);
  const condUnis = universities.filter((u) => u.tuition_status === 'Conditional Tuition-Free');
  const countIn = (code) => universities.filter((u) => u.country_code === code).length;
  const uniLabel = (code) => { const n = countIn(code); return n ? `${n} universit${n === 1 ? 'y' : 'ies'}` : 'Policy guide'; };

  // Nordic focus band (Sweden · Denmark · Finland) — reader request
  const nordicCountries = ['SE', 'DK', 'FI'].map((code) => byCode.get(code)).filter(Boolean);
  const pickBy = (code, re) => universities.find((u) => u.country_code === code && re.test(u.name));
  const nordicFeatured = [
    pickBy('SE', /Lund University/), pickBy('SE', /KTH/),
    pickBy('DK', /University of Copenhagen$/), pickBy('DK', /Copenhagen Business School/),
    pickBy('FI', /Aalto/), pickBy('FI', /University of Helsinki/),
  ].filter(Boolean);

  // Featured: one €0-tuition university per country (round-robin), outside the Nordic band
  const featured = [];
  const seen = new Set(nordicFeatured.map((u) => u.id));
  const nordic = new Set(['SE', 'DK', 'FI']);
  const byCountry = new Map();
  for (const u of freeUnis) {
    if (seen.has(u.id) || nordic.has(u.country_code)) continue;
    if (!byCountry.has(u.country_code)) byCountry.set(u.country_code, []);
    byCountry.get(u.country_code).push(u);
  }
  const score = (u) => (hasEnglish(u) ? 2 : 0) + (u.est_annual_mandatory_cost_eur != null ? 1 : 0);
  for (const list of byCountry.values()) list.sort((a, b) => score(b) - score(a));
  const order = [...byCountry.keys()].sort((a, b) => (byCode.get(a)?.priority ?? 99) - (byCode.get(b)?.priority ?? 99));
  for (let round = 0; featured.length < 6 && round < 5; round++) {
    for (const code of order) { const u = byCountry.get(code)[round]; if (u && featured.length < 6) featured.push(u); }
  }

  // Hero panel: most popular countries
  const heroCountries = ['DE', 'SE', 'FI', 'DK', 'AT', 'NO'].map((code) => byCode.get(code)).filter(Boolean);
  const feeExample = universities.find((u) => u.slug === 'university-of-munster') ||
    universities.find((u) => u.country_code === 'DE' && u.est_annual_mandatory_cost_eur);

  const nordicBand = `
<section class="section" id="nordic-focus">
  <div class="container">
    <div class="section-head split">
      <div>
        <span class="kicker">${ic('star')} Readers' favourite</span>
        <h2>Nordic focus: Sweden, Denmark &amp; Finland</h2>
        <p>The three most-requested countries in our inbox: tuition-free public universities for EU citizens with a wide choice of English-taught programmes.</p>
      </div>
    </div>
    <div class="grid cols-3">
      ${nordicCountries.map((c) => {
        const list = universities.filter((u) => u.country_code === c.code);
        const english = list.filter(hasEnglish).length;
        return `<article class="card country-feature cf-${c.code} flag-top">
          <div class="cf-head">
            ${flag(c.code, 'lg')}
            <h3><a href="countries/${c.slug}/index.html">${esc(c.name)}</a></h3>
            ${statusBadge(c.tuition_status)}
          </div>
          <div class="cf-stats">
            <div><b>${list.length}</b><span>universities</span></div>
            <div><b>${english}</b><span>in English</span></div>
            <div><b>${c.mandatory_fee_estimate_eur_year ? money(c.mandatory_fee_estimate_eur_year) : '€0'}</b><span>fees / year</span></div>
          </div>
          <p class="small muted">${esc(c.eu_tuition)}</p>
          <div class="cf-actions">
            <a class="btn primary" href="universities/index.html?country=${c.code}">Universities</a>
            <a class="btn" href="programs/index.html?country=${c.code}&amp;eng=1">English programmes</a>
          </div>
        </article>`;
      }).join('')}
    </div>
    <div class="grid cols-3" style="margin-top:16px">${nordicFeatured.map((u) => uniCard(u, 0)).join('')}</div>
    <p class="small muted" style="margin-top:14px">Also popular with our readers: <a href="universities/index.html?country=DE">Germany</a> (€0 tuition + semester fees), <a href="universities/index.html?country=NO">Norway</a> and <a href="universities/index.html?country=AT">Austria</a>.</p>
  </div>
</section>`;

  const body = `
<section class="hero">
  ${euStars('hero-stars')}
  <div class="container hero-grid">
    <div class="hero-copy">
      <span class="eyebrow">For EU citizens · English-taught degrees</span>
      <h1>Study in Europe for free <span class="h1-soft">or almost free.</span></h1>
      <p class="sub">Universities where EU citizens can earn an English-taught degree with €0 tuition or a low fee of up to ≈ $3,000 a year — with every mandatory fee shown upfront.</p>
      <div class="search-cta">
        ${ic('search', 'search-ic')}
        <input id="hero-search" type="search" placeholder="Search a university, country, city or programme…" aria-label="Search" data-prefix="">
        <button id="hero-search-btn" type="button">Search</button>
      </div>
      <ul class="hero-trust">
        <li>${ic('shield')} Official sources</li>
        <li>${ic('receipt')} Every fee shown</li>
        <li>${ic('check')} No account needed</li>
      </ul>
    </div>
    <aside class="hero-panel" aria-label="Popular countries">
      <div class="hp-head"><span>Popular countries</span><a href="countries/index.html">All ${countries.length} →</a></div>
      <ul class="hp-list">
        ${heroCountries.map((c) => `<li><a class="cf-${c.code}" href="countries/${c.slug}/index.html">${flag(c.code, 'lg')}<span class="hp-name">${esc(c.name)}<small>${uniLabel(c.code)}</small></span>${statusBadge(c.tuition_status)}</a></li>`).join('')}
      </ul>
    </aside>
  </div>
</section>

<section class="stats-wrap">
  <div class="container">
    <div class="stats-card">
      <div class="stat">${ic('landmark')}<div><b>${universities.length}</b><span>universities mapped</span></div></div>
      <div class="stat">${ic('book')}<div><b>${programs.length.toLocaleString('en-IE')}</b><span>programme entries</span></div></div>
      <div class="stat">${ic('globe')}<div><b>${euCountries.length}</b><span>EU countries covered</span></div></div>
      <div class="stat">${ic('euro')}<div><b>${freeUnis.length + condUnis.length}</b><span>with €0 tuition</span></div></div>
      <div class="stat">${ic('sparkles')}<div><b>${universities.filter((u) => u.tuition_status === 'Low Tuition').length}</b><span>with low tuition</span></div></div>
    </div>
    <div class="quick">
      <span class="quick-label">Popular searches</span>
      <div class="pill-nav">
        <a href="#nordic-focus">${ic('star')} Nordic focus</a>
        <a href="universities/index.html?status=Tuition-Free%20%2B%20Mandatory%20Fees">${ic('euro')} €0 tuition + fees</a>
        <a href="programs/index.html?eng=1&amp;maxcost=0">${ic('lang')} English-taught &amp; €0</a>
        <a href="universities/index.html?level=b">${ic('cap')} Bachelor's</a>
        <a href="universities/index.html?level=m">${ic('cap')} Master's</a>
        <a href="universities/index.html?field=computer%20science">${ic('laptop')} Computer Science</a>
        <a href="compare/index.html">${ic('compare')} Compare</a>
      </div>
    </div>
  </div>
</section>

${nordicBand}

<section class="section alt">
  <div class="container">
    <div class="section-head">
      <span class="kicker">${ic('arrow')} Start here</span>
      <h2>Three fast routes to a shortlist</h2>
      <p>No account, no clutter — pick how you want to search.</p>
    </div>
    <div class="tiles">
      <a class="tile" href="universities/index.html"><span class="ico">${ic('landmark')}</span><h3>Find a university</h3><p>Search ${universities.length} universities by country, degree level, tuition status and estimated mandatory cost.</p><span class="go">Browse universities ${ic('arrow')}</span></a>
      <a class="tile" href="programs/index.html"><span class="ico">${ic('book')}</span><h3>Find a programme</h3><p>Filter programmes — including the “English-taught &amp; €0 tuition” set — by field, level and cost.</p><span class="go">Browse programmes ${ic('arrow')}</span></a>
      <a class="tile" href="compare/index.html"><span class="ico">${ic('compare')}</span><h3>Compare &amp; shortlist</h3><p>Save favourites and compare up to four universities on tuition, fees, admissions and deadlines.</p><span class="go">Open comparison ${ic('arrow')}</span></a>
    </div>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="section-head split">
      <div>
        <span class="kicker">${ic('euro')} Featured</span>
        <h2>€0 tuition for EU citizens</h2>
        <p>A pick from across Europe. Every entry is backed by an official source; fees shown are the <b>estimated mandatory university cost</b>, not living costs.</p>
      </div>
      <a class="btn" href="universities/index.html">Browse all ${universities.length} ${ic('arrow')}</a>
    </div>
    <div class="grid cols-3">${featured.map((u) => uniCard(u, 0)).join('')}</div>
  </div>
</section>

<section class="section alt" id="countries">
  <div class="container">
    <div class="section-head split">
      <div>
        <span class="kicker">${ic('globe')} Browse by country</span>
        <h2>All 27 EU member states</h2>
        <p>Tuition policy for EU citizens at a glance. Universities are listed where you can study in English for free or for a low fee (up to ≈ $3,000 / €2,700 per year).</p>
      </div>
      <a class="btn" href="countries/index.html">All countries &amp; policies ${ic('arrow')}</a>
    </div>
    <div class="cc-grid">
      ${euCountries.map((c) => `<a class="cc cf-${c.code}" href="countries/${c.slug}/index.html"><span class="flag">${flag(c.code, 'lg')}</span><span><span class="nm">${esc(c.name)}</span><br><span class="st">${esc(shortStatus(c.tuition_status))} · ${uniLabel(c.code)}</span></span></a>`).join('')}
    </div>
    ${otherCountries.length ? `
    <h3 class="sub-h">Other European countries <span class="muted small">EEA &amp; close partners, kept separate from EU member states</span></h3>
    <div class="cc-grid">
      ${otherCountries.map((c) => `<a class="cc cf-${c.code}" href="countries/${c.slug}/index.html"><span class="flag">${flag(c.code, 'lg')}</span><span><span class="nm">${esc(c.name)}</span><br><span class="st">${esc(shortStatus(c.tuition_status))} · ${uniLabel(c.code)}</span></span></a>`).join('')}
    </div>` : ''}
  </div>
</section>

<section class="section">
  <div class="container honest">
    <div>
      <span class="kicker">${ic('shield')} Honest numbers</span>
      <h2>We never just say “FREE”</h2>
      <p class="muted">“Tuition-free” rarely means you pay nothing. Every record shows <b>tuition</b>, then the <b>mandatory semester fee</b>, then an <b>estimated mandatory university cost per year</b> — plus admission requirements and deadlines.</p>
      <ol class="how-list">
        <li><span>1</span><div><b>Pick a route</b><p>€0 tuition, English-taught &amp; €0, Master's, Bachelor's or a specific field.</p></div></li>
        <li><span>2</span><div><b>Filter the list</b><p>By country, degree level, tuition status, language and maximum mandatory cost.</p></div></li>
        <li><span>3</span><div><b>Compare &amp; save</b><p>Shortlist favourites and compare up to four universities side by side.</p></div></li>
      </ol>
      <p><a href="how-it-works/index.html">How we classify tuition ${ic('arrow')}</a></p>
    </div>
    ${feeExample ? `<div class="fee-card cf-${feeExample.country_code} flag-top">
      <div class="fee-top">${flag(feeExample.country_code, 'lg')}<div><span class="muted small">Example record</span><h3><a href="universities/${feeExample.slug}/index.html">${esc(feeExample.name)}</a></h3></div></div>
      <div class="fee-row"><span>Tuition (EU citizens)</span><b class="ok">${esc(feeExample.tuition_eu)}</b></div>
      <div class="fee-row"><span>Mandatory semester fee</span><b>${esc(feeExample.mandatory_semester_fee || 'Not yet verified')}</b></div>
      <div class="fee-row total"><span>Est. mandatory cost / year</span><b>${money(feeExample.est_annual_mandatory_cost_eur)}</b></div>
      <p class="small muted" style="margin:12px 0 0">Mandatory university cost only — living costs are shown separately on each country page.</p>
    </div>` : ''}
  </div>
</section>

<section class="section alt">
  <div class="container">
    <div class="section-head"><span class="kicker">${ic('book')} Guides</span><h2>Popular guides</h2></div>
    <div class="guides">
      <a href="tuition-free-universities-for-eu-students/index.html">${ic('landmark')} Tuition-free universities for EU students <span class="arw">${ic('arrow')}</span></a>
      <a href="english-taught-tuition-free-masters/index.html">${ic('cap')} English-taught tuition-free Master's <span class="arw">${ic('arrow')}</span></a>
      <a href="english-taught-tuition-free-bachelors/index.html">${ic('cap')} English-taught tuition-free Bachelor's <span class="arw">${ic('arrow')}</span></a>
      <a href="free-computer-science-degrees-europe/index.html">${ic('laptop')} Free Computer Science degrees <span class="arw">${ic('arrow')}</span></a>
      <a href="free-engineering-degrees-europe/index.html">${ic('layers')} Free Engineering degrees <span class="arw">${ic('arrow')}</span></a>
      <a href="tuition-free-phd-in-europe/index.html">${ic('sparkles')} Tuition-free PhD in Europe <span class="arw">${ic('arrow')}</span></a>
    </div>
    ${disclaimer}
  </div>
</section>

<section class="cta-band">
  ${euStars('cta-stars')}
  <div class="container cta-inner">
    <div>
      <h2>Found a mistake or missing university?</h2>
      <p>Tuition rules change every year. Tell us and we'll check it against the official source.</p>
    </div>
    <a class="btn gold" href="contact/index.html">${ic('mail')} Contact us</a>
  </div>
</section>`;
  write('index.html', layout({
    title: 'StudyFreeEU — Find Tuition-Free Universities in Europe for EU Citizens',
    description: 'Discover universities and English-taught degree programmes where EU citizens can study in Europe with no standard tuition fees — with mandatory fees, admission info and official sources.',
    depth: 0, body, canonical: '', active: ''
  }));
}

/* --------------------------------------------------- 2. universities index */
function buildUniversitiesIndex() {
  const opts = (list) => list.map((c) => `<option value="${c.code}" data-slug="${c.slug}">${esc(c.name)}${c.is_eu ? '' : ' (other)'}</option>`).join('');
  const fieldSet = new Set(); universities.forEach((u) => (u.study_fields || []).forEach((f) => fieldSet.add(f)));
  const body = `
<section class="section" style="padding-bottom:0">
  <div class="container">
    <div class="breadcrumb"><a href="../index.html">Home</a> / Universities</div>
    <div class="page-header" style="border:0;padding-bottom:0">
      <h1>Universities</h1>
      <p class="small nordic-line" style="margin:6px 0 0">${ic('star')} <b>Nordic focus:</b> <a href="?country=SE">Sweden</a> · <a href="?country=DK">Denmark</a> · <a href="?country=FI">Finland</a></p>
      <p class="muted">${universities.length} universities across Europe. Filter by tuition status, degree level, language and estimated mandatory cost.</p>
      <p><a class="btn" href="by-country/index.html">${ic('globe')} Grouped by country ${ic('arrow')}</a></p>
    </div>
  </div>
</section>
<section class="section" style="padding-top:22px">
  <div class="container layout">
    <aside class="filters" aria-label="Filters">
      <h3>Filters</h3>
      <div class="field"><label for="f-search">Search</label><input id="f-search" type="search" placeholder="University, city…"></div>
      <div class="field"><label for="f-country">Country</label><select id="f-country"><option value="">All countries</option>${opts(countries)}</select></div>
      <div class="field"><label for="f-level">Degree level</label><select id="f-level"><option value="">Any level</option><option value="b">Bachelor's</option><option value="m">Master's</option><option value="p">PhD</option></select></div>
      <div class="field"><label for="f-status">Tuition status</label><select id="f-status"><option value="">Any status</option>
        <option>Tuition-Free</option><option>Tuition-Free + Mandatory Fees</option><option>Conditional Tuition-Free</option><option>Low Tuition</option></select></div>
      <div class="field"><label for="f-field">Study field</label><select id="f-field"><option value="">Any field</option>${[...fieldSet].sort().map((f) => `<option value="${esc(f.toLowerCase())}">${esc(f)}</option>`).join('')}</select></div>
      <div class="field"><label for="f-maxcost">Max estimated mandatory cost / year (€)</label><input id="f-maxcost" type="number" min="0" step="50" placeholder="e.g. 300"></div>
      <label class="check"><input id="f-english" type="checkbox"> English-taught only</label>
      <label class="check"><input id="f-eufree" type="checkbox" checked disabled> Tuition-free for EU citizens <span class="muted small">(this database)</span></label>
      <button id="f-reset" class="btn" type="button">Reset filters</button>
      <div class="legend">
        <span><i class="dot" style="background:var(--green)"></i> Tuition-free</span>
        <span><i class="dot" style="background:#1d4ed8"></i> Free + fees</span>
        <span><i class="dot" style="background:#b45309"></i> Conditional</span>
      </div>
    </aside>
    <div>
      <div class="toolbar">
        <span class="count" id="result-count"></span>
        <label class="small">Sort
          <select id="sort"><option value="name">Name (A–Z)</option><option value="cost-asc">Estimated cost (low → high)</option><option value="cost-desc">Estimated cost (high → low)</option><option value="country">Country</option></select>
        </label>
      </div>
      <div class="country-banner hidden" id="country-banner" data-prefix="../"></div>
      <div class="results" id="results">${writePartials('unis', chunkItems(universities, (u) => uniCard(u, 1)), 1)}</div>
      <div id="empty" class="empty hidden">No universities match these filters. Try widening them.</div>
      <div class="pagination"></div>
    </div>
  </div>
</section>`;
  write('universities/index.html', layout({
    title: 'All Universities — Tuition-Free Study in Europe | StudyFreeEU',
    description: 'Browse every university in the StudyFreeEU database with its tuition status for EU citizens, mandatory fees, degree levels and English-taught programme availability.',
    depth: 1, body, canonical: 'universities/', active: 'Universities'
  }));
}

/* ------------------------------------------------- 3. university details */
function buildUniversityPages() {
  for (const u of universities) {
    const c = byCode.get(u.country_code);
    const ups = programs.filter((p) => p.university_id === u.id);
    const srcs = [...(u.sources || []), ...(c.sources || [])];
    const body = `
<section class="section" style="padding-bottom:0">
  <div class="container">
    <div class="breadcrumb"><a href="../../index.html">Home</a> / <a href="../index.html">Universities</a> / ${esc(u.name)}</div>
    <div class="page-header country-hero cf-${u.country_code}">
      <span class="country-hero-flag">${flag(u.country_code, 'xl')}</span>
      <div class="badges">
        ${statusBadge(u.tuition_status)}
        ${u.type === 'Public' ? '<span class="badge b-plain">Public university</span>' : '<span class="badge b-plain">Private</span>'}
        ${hasEnglish(u) ? '<span class="badge b-en">English-taught</span>' : ''}
      </div>
      <h1>${esc(u.name)}</h1>
      <p class="muted">${esc(u.city)}, ${esc(u.country)} · <a href="../../countries/${c.slug}/index.html">${esc(u.country)} tuition policy</a></p>
    </div>
  </div>
</section>
<section class="section" style="padding-top:0">
  <div class="container info-grid">
    <div>
      <div class="panel">
        <h2>University overview</h2>
        <dl class="kv">
          <dt>Country</dt><dd>${esc(u.country)}</dd>
          <dt>City</dt><dd>${esc(u.city)}</dd>
          <dt>Type</dt><dd>${esc(u.type)}</dd>
          <dt>Official website</dt><dd><a href="${u.official_website}" rel="nofollow noopener" target="_blank">${esc(u.official_website)}</a></dd>
          <dt>Study fields</dt><dd>${(u.study_fields || []).map((f) => `<span class="tag">${esc(f)}</span>`).join(' ')}</dd>
          <dt>Our note</dt><dd>${esc(u.notes)}</dd>
        </dl>
      </div>
      <div class="panel">
        <h2>Available specialities &amp; what’s distinctive</h2>
        <div class="tags" style="margin-bottom:10px">${(u.specialities || u.study_fields || []).map((f) => `<span class="tag">${esc(f)}</span>`).join(' ')}</div>
        ${u.unique_strength ? `<p>${esc(u.unique_strength)}</p>` : '<p class="muted small">Institutional profile not yet recorded.</p>'}
        <p class="small muted">The list shows the fields offered at this institution; programme-level availability (language, level, fees) is on the university’s official website.</p>
      </div>
      ${u.programme_structure ? `
      <div class="panel">
        <h2>Programme structure &amp; languages</h2>
        <div class="table-wrap"><table><thead><tr><th>Level</th><th>Standard duration</th><th>Standard ECTS</th><th>Language(s) of instruction</th></tr></thead><tbody>
        ${u.programme_structure.map((s) => `<tr><td>${esc(s.level)}</td><td>${esc(s.duration)}</td><td class="num">${s.ects}</td><td>${esc(s.languages)}</td></tr>`).join('')}
        </tbody></table></div>
        <p class="small muted">ECTS and duration follow the Bologna structure (Bachelor 180 ECTS / 3 years, Master 120 ECTS / 2 years, PhD ≈ 180 ECTS). Individual programmes may differ — verify in the official catalogue.</p>
        <p><a class="btn" href="../../programs/index.html?country=${u.country_code}">Programme entries for ${esc(u.country)} →</a></p>
      </div>` : ''}
      <div class="panel">
        <h2>Tuition policy &amp; mandatory fees</h2>
        <div class="money">
          <div class="m"><span>Tuition (EU citizens)</span><b>${esc(u.tuition_eu)}</b></div>
          <div class="m"><span>Mandatory semester fee</span><b>${esc(u.mandatory_semester_fee || 'Not yet verified')}</b></div>
          <div class="m"><span>Est. mandatory cost / year</span><b>${money(u.est_annual_mandatory_cost_eur)}</b></div>
        </div>
        <p class="small muted">This figure is the <b>mandatory university cost</b> (tuition + compulsory fees), not living costs. ${esc(u.other_mandatory_fees ? 'Other mandatory fees: ' + u.other_mandatory_fees : '')}</p>
        ${u.tuition_status === 'Conditional Tuition-Free' ? '<p class="small"><b>Conditional:</b> free only under specific conditions (language of instruction, study duration or study-place type). See the country policy for details.</p>' : ''}
        ${disclaimer}
      </div>
      <div class="panel">
        <h2>Programs in our database</h2>
        ${ups.length ? `<div class="table-wrap"><table><thead><tr><th>Programme</th><th>Level</th><th>Language</th><th>EU tuition</th><th>Deadline</th></tr></thead><tbody>
          ${ups.map((p) => `<tr><td>${esc(p.program_name)}</td><td>${esc(p.degree_level)}</td><td>${esc(p.language)}</td><td>${esc(p.tuition_eu)}</td><td>${esc(p.application_deadline)}</td></tr>`).join('')}
        </tbody></table></div>` : '<p class="muted small">No programme-level records yet. See the <a href="../../programs/index.html">programs catalogue</a> and the university website.</p>'}
      </div>
      <div class="panel">
        <h2>English-taught programmes</h2>
        <p>${hasEnglish(u) ? `English-taught offering: <b>${engWords(u)}</b>.` : 'No English-taught degree programmes recorded for this institution.'}</p>
        <p class="small muted">Language requirements: ${esc(u.language_requirements || 'Not yet verified')}. English test: ${esc(u.english_test || 'Not yet verified')}.</p>
      </div>
      <div class="panel">
        <h2>Admissions &amp; entry requirements</h2>
        ${u.admission ? `
        <h3>Who can apply</h3><p>${esc(u.admission.eligibility)}</p>
        <h3>Language requirements</h3><p>${esc(u.admission.language)}</p>
        <h3>English test</h3><p>${esc(u.admission.english_test)}</p>
        <h3>Documents generally required</h3>
        <ul>${(u.admission.documents || []).map((d) => `<li>${esc(d)}</li>`).join('')}</ul>
        <h3>Application deadlines (typical)</h3><p>${esc(u.admission.deadlines)}</p>
        <h3>How to apply</h3><p>${esc(u.application_platform || 'Not yet verified')}${u.admission.apply_url ? ` · <a href="${u.admission.apply_url}" rel="nofollow noopener" target="_blank">Admissions portal →</a>` : ''}</p>
        ${u.admission.notes ? `<p class="small muted">${esc(u.admission.notes)}</p>` : ''}
        <p class="small muted">These are the <b>typical</b> requirements for this institution and its national admission system. Exact documents, subject requirements and deadlines are set per programme — date shown for the 2026/2027 cycle.</p>
        ` : `<dl class="kv">
          <dt>Admission requirements</dt><dd>${esc(u.admission_requirements || 'Not yet verified')}</dd>
          <dt>Application deadlines</dt><dd>${esc(u.application_deadlines || 'Not yet verified')}</dd>
        </dl>`}
        <dl class="kv">
          <dt>Application platform</dt><dd>${esc(u.application_platform || 'Not yet verified')}</dd>
          <dt>Housing</dt><dd>${u.housing_url ? `<a href="${u.housing_url}" rel="nofollow noopener" target="_blank">Housing information</a>` : 'Not yet verified'}</dd>
          <dt>Scholarships</dt><dd>${u.scholarship_url ? `<a href="${u.scholarship_url}" rel="nofollow noopener" target="_blank">Scholarship information</a>` : 'Not yet verified'}</dd>
        </dl>
      </div>
      ${u.deadlines ? `
      <div class="panel">
        <h2>Deadlines &amp; document submission</h2>
        ${u.deadlines_verified ? `<div class="disclaimer" style="background:#e6f4f1;border-color:#c8e6df;color:#0f766e"><b>Official dates${u.deadlines_verified.status === 'partial' ? ' (partly verified)' : ' — verified'}.</b> ${esc(u.deadlines_verified.window)} <a href="${u.deadlines_verified.source_url}" rel="nofollow noopener" target="_blank">Source →</a> <span class="badge ${u.deadlines_verified.status === 'verified' ? 'b-free' : 'b-cond'}">${u.deadlines_verified.status === 'verified' ? 'VERIFIED' : 'PARTLY VERIFIED'}</span></div>` : ''}
        <dl class="kv">
          <dt>Applications open</dt><dd>${esc(u.deadlines.opens)}</dd>
          <dt>Applications close</dt><dd>${esc(u.deadlines.closes)}</dd>
          <dt>Documents to submit</dt><dd>${esc(u.deadlines.documents)}</dd>
          <dt>Note</dt><dd>${esc(u.deadlines.note)}</dd>
        </dl>
        <p class="small muted">Typical dates for the 2026/2027 cycle from the national admission system. Always confirm the exact deadline on this university’s official admissions page (linked above).</p>
      </div>` : ''}
      ${u.contact ? `
      <div class="panel">
        <h2>Contact — admissions</h2>
        <dl class="kv">
          <dt>Website</dt><dd><a href="${u.contact.website}" rel="nofollow noopener" target="_blank">${esc(u.contact.website)}</a></dd>
          <dt>Admissions page</dt><dd><a href="${u.contact.admissions_url}" rel="nofollow noopener" target="_blank">Open admissions / contact page →</a></dd>
          <dt>Admissions email</dt><dd>${u.contact.email ? `<a href="mailto:${u.contact.email}">${esc(u.contact.email)}</a>` : 'Not yet verified — use the admissions page'}</dd>
          <dt>Admissions phone</dt><dd>${u.contact.phone ? esc(u.contact.phone) : 'Not yet verified'}</dd>
          <dt>Address</dt><dd>${esc(u.contact.address || 'Not yet verified')}</dd>
        </dl>
        <p class="small muted">${esc(u.contact.note)}</p>
        ${u.contact.verified ? '<span class="badge b-free">CONTACT VERIFIED</span>' : '<span class="badge b-unknown">CONTACT: VERIFY</span>'}
      </div>` : ''}
      <div class="panel">
        <h2>Official sources</h2>
        <ul class="src-list">
          ${srcs.map((s) => `<li><a href="${s.url}" rel="nofollow noopener" target="_blank">${esc(s.label)}</a><br><span class="muted small">${esc(s.url)}</span></li>`).join('')}
        </ul>
      </div>
    </div>
    <aside>
      <div class="panel">
        <h2>Quick facts</h2>
        <dl class="kv" style="grid-template-columns:1fr">
          <dt>Degree levels</dt><dd>${levelWords(u) || '—'}</dd>
          <dt>Bachelor's</dt><dd>${u.bachelor_available ? 'Yes' : 'No'}</dd>
          <dt>Master's</dt><dd>${u.master_available ? 'Yes' : 'No'}</dd>
          <dt>PhD</dt><dd>${u.phd_available ? 'Yes' : 'No'}</dd>
          <dt>Verification</dt><dd>${esc(u.verification_status)}</dd>
          <dt>Last verified</dt><dd>${u.last_verified || 'Not yet verified'}</dd>
        </dl>
        <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn js-fav" type="button" data-id="${u.id}">☆ Save</button>
          <button class="btn js-compare" type="button" data-id="${u.id}" data-name="${esc(u.name)}">⇄ Compare</button>
        </div>
      </div>
    </aside>
  </div>
</section>`;
    write(`universities/${u.slug}/index.html`, layout({
      title: `${u.name} — Tuition for EU Citizens, Fees & Programs | StudyFreeEU`,
      description: `${u.name} (${u.city}, ${u.country}): EU tuition status, mandatory fees, degree levels, English-taught programmes, admissions and official sources.`,
      depth: 2, body, canonical: `universities/${u.slug}/`, active: 'Universities',
      extraHead: `<script type="application/ld+json">${JSON.stringify({
        '@context': 'https://schema.org', '@type': 'CollegeOrUniversity',
        name: u.name, address: { '@type': 'PostalAddress', addressLocality: u.city, addressCountry: u.country_code },
        url: u.official_website
      })}</script>`
    }));
  }
}

/* ------------------------------------------------- 3b. universities by country */
function buildUniversitiesByCountry() {
  const order = [...countries].sort((a, b) => (a.is_eu === b.is_eu ? a.name.localeCompare(b.name) : (a.is_eu ? -1 : 1)));
  const sections = order.map((c) => {
    const list = universities.filter((u) => u.country_code === c.code);
    if (!list.length) return '';
    return `<section class="section country-section cf-${c.code}" id="${c.slug}" style="padding:22px 0">
      <div class="container">
        <div class="section-head" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <h2 class="country-h2">${flag(c.code, 'lg')} ${esc(c.name)}</h2>
          ${statusBadge(c.tuition_status)}
          <span class="muted small">${list.length} universit${list.length === 1 ? 'y' : 'ies'}</span>
          <a class="btn" style="margin-left:auto" href="../../countries/${c.slug}/index.html">Country policy →</a>
        </div>
        <div class="grid cols-3">${list.map((u) => uniCard(u, 2)).join('')}</div>
      </div>
    </section>`;
  }).filter(Boolean);
  const idx = order.filter((c) => universities.some((u) => u.country_code === c.code))
    .map((c) => `<a class="cc cf-${c.code}" href="#${c.slug}"><span class="flag">${flag(c.code, 'lg')}</span><span><span class="nm">${esc(c.name)}</span><br><span class="st">${universities.filter((u) => u.country_code === c.code).length} universities</span></span></a>`).join('');
  const body = `
<section class="section" style="padding-bottom:0"><div class="container">
  <div class="breadcrumb"><a href="../../index.html">Home</a> / <a href="../index.html">Universities</a> / By country</div>
  <div class="page-header" style="border:0;padding-bottom:0"><h1>Universities by country</h1>
  <p class="muted">All ${universities.length} universities, grouped by country — EU member states first, then other European countries. Jump to a country below.</p></div>
</div></section>
<section class="section" style="padding-top:20px"><div class="container">
  <div class="cc-grid">${idx}</div>
</div></section>
${writePartials('bycountry', chunkItems(sections, (s) => s), 2)}`;
  write('universities/by-country/index.html', layout({
    title: 'Universities by Country — Tuition-Free Study in Europe | StudyFreeEU',
    description: 'All European universities in the StudyFreeEU database, grouped by country, with their tuition status for EU citizens.',
    depth: 2, body, canonical: 'universities/by-country/', active: 'Universities'
  }));
}

/* ------------------------------------------------- 4. country pages */
function buildCountryPages() {
  const sorted = [...countries].sort((a, b) => (a.is_eu === b.is_eu ? a.priority - b.priority : (a.is_eu ? -1 : 1)));
  const body = `
<section class="section" style="padding-bottom:0"><div class="container">
  <div class="breadcrumb"><a href="../index.html">Home</a> / Countries</div>
  <div class="page-header" style="border:0;padding-bottom:0"><h1>Countries</h1><p class="muted">Tuition policy for EU citizens by country. EU member states first, then other European countries.</p></div>
</div></section>
<section class="section" style="padding-top:22px"><div class="container">
  <h2 style="font-size:1.2rem">EU member states</h2>
  <p class="small nordic-line" style="margin:6px 0 12px">${ic('star')} <b>Nordic focus:</b> <a href="sweden/index.html">Sweden</a> · <a href="denmark/index.html">Denmark</a> · <a href="finland/index.html">Finland</a></p>
  <div class="grid cols-4" style="margin-bottom:32px">${sorted.filter((c) => c.is_eu).map((c) => countryCard(c, 1)).join('')}</div>
  <h2 style="font-size:1.2rem">Other European countries</h2>
  <div class="grid cols-4">${sorted.filter((c) => !c.is_eu).map((c) => countryCard(c, 1)).join('')}</div>
</div></section>`;
  write('countries/index.html', layout({
    title: 'Countries — Tuition-Free Study Policies in Europe | StudyFreeEU',
    description: 'Tuition rules for EU citizens in every EU member state, plus EEA and other European countries: fees, language requirements and application systems.',
    depth: 1, body, canonical: 'countries/', active: 'Countries'
  }));

  for (const c of countries) {
    const unis = universities.filter((u) => u.country_code === c.code);
    const body = `
<section class="section" style="padding-bottom:0"><div class="container">
  <div class="breadcrumb"><a href="../../index.html">Home</a> / <a href="../index.html">Countries</a> / ${esc(c.name)}</div>
  <div class="page-header country-hero cf-${c.code}">
    <span class="country-hero-flag">${flag(c.code, 'xl')}</span>
    <div class="badges">${statusBadge(c.tuition_status)}${c.is_eu ? '<span class="badge b-plain">EU MEMBER</span>' : '<span class="badge b-plain">OTHER EUROPEAN COUNTRY</span>'}</div>
    <h1>Tuition-Free Universities in ${esc(c.name)}</h1>
    ${['SE', 'DK', 'FI'].includes(c.code) ? '<p style="margin:6px 0 0"><span class="badge b-free">★ Nordic focus country</span></p>' : ''}
    <p class="muted">${esc(c.eu_tuition)}</p>
  </div>
</div></section>
<section class="section" style="padding-top:0"><div class="container info-grid">
  <div>
    <div class="panel"><h2>Tuition rules for EU citizens</h2><p>${esc(c.eu_summary)}</p>
      <h3>Public universities</h3><p>${esc(c.public_universities)}</p>
      <h3>Private universities</h3><p>${esc(c.private_universities)}</p>
      <h3>By degree level</h3>
      <ul><li><b>Bachelor's:</b> ${esc(c.bachelor)}</li><li><b>Master's:</b> ${esc(c.master)}</li><li><b>PhD:</b> ${esc(c.phd)}</li></ul>
      <h3>English-taught programmes</h3><p>${esc(c.english_taught)}</p>
    </div>
    <div class="panel"><h2>Mandatory fees</h2><p>${esc(c.mandatory_fees)}</p>
      <p class="small muted">Estimated mandatory university cost per year: <b>${money(c.mandatory_fee_estimate_eur_year)}</b>.</p>
    </div>
    <div class="panel"><h2>Admission system &amp; application process</h2><p>${esc(c.application_system)}</p>
      <h3>Residency conditions</h3><p>${esc(c.residency_conditions)}</p>
      <h3>Language requirements</h3><p>${esc(c.language_requirements)}</p>
    </div>
    ${c.document_submission ? `
    <div class="panel">
      <h2>Deadlines &amp; document submission</h2>
      <dl class="kv">
        <dt>Applications open</dt><dd>${esc(c.document_submission.opens)}</dd>
        <dt>Applications close</dt><dd>${esc(c.document_submission.closes)}</dd>
        <dt>Document submission</dt><dd>${esc(c.document_submission.documents)}</dd>
        <dt>Note</dt><dd>${esc(c.document_submission.note)}</dd>
      </dl>
      <p class="small muted">Typical dates for the 2026/2027 cycle — verify the exact deadline on the official admissions page.</p>
      <p><a href="../../deadlines/index.html">Compare deadlines across countries →</a></p>
    </div>` : ''}
    ${c.cost_of_living_monthly ? `
    <div class="panel">
      <h2>Living costs, housing &amp; scholarships</h2>
      <dl class="kv">
        <dt>Living costs (approx.)</dt><dd>${esc(c.cost_of_living_monthly)}</dd>
        <dt>Student housing</dt><dd>${esc(c.housing)}</dd>
        <dt>Scholarships</dt><dd>${esc(c.scholarships)}</dd>
        <dt>EU/EEA mobility</dt><dd>As an EU/EEA citizen you do not need a visa or residence permit to study here; register with the local authorities after arrival. Non-EU/EEA students need a visa/residence permit.</dd>
      </dl>
      <p class="small muted">Living-cost figures are approximate (2026 estimates) and separate from the mandatory university cost above.</p>
    </div>` : ''}
    <div class="panel"><h2>Universities in our database (${unis.length})</h2>
      ${unis.length ? `<div class="grid" style="grid-template-columns:1fr">${unis.map((u) => uniCard(u, 2)).join('')}</div>` : '<p class="muted small">Research for this country is queued. See <a href="../../about/index.html">research progress</a>.</p>'}
    </div>
    ${disclaimer}
    <div class="panel"><h2>Official sources</h2><ul class="src-list">
      ${(c.sources || []).map((s) => `<li><a href="${s.url}" rel="nofollow noopener" target="_blank">${esc(s.label)}</a><br><span class="muted small">${esc(s.url)}</span></li>`).join('')}
    </ul></div>
  </div>
  <aside>
    <div class="panel"><h2>Quick facts</h2><dl class="kv" style="grid-template-columns:1fr">
      <dt>Region</dt><dd>${esc(c.region)}</dd>
      <dt>EU member</dt><dd>${c.is_eu ? 'Yes' : 'No'}</dd>
      <dt>Academic year</dt><dd>${esc(c.academic_year)}</dd>
      <dt>Currency</dt><dd>${esc(c.currency)}</dd>
      <dt>Verification</dt><dd>${esc(c.verification_status)}</dd>
      <dt>Last verified</dt><dd>${c.last_verified || 'Not yet verified'}</dd>
    </dl></div>
    <div class="panel"><h2>Related</h2>
      <p class="small"><a href="../../universities/index.html?country=${c.code}">All ${esc(c.name)} universities →</a></p>
      <p class="small"><a href="../../tuition-free-universities-for-eu-students/index.html">Tuition-free for EU students →</a></p>
    </div>
  </aside>
</div></section>`;
    write(`countries/${c.slug}/index.html`, layout({
      title: `Tuition-Free Universities in ${c.name} for EU Citizens | StudyFreeEU`,
      description: `Tuition rules for EU citizens in ${c.name}: ${c.eu_tuition}. Semester fees, admission system, language requirements and universities with no standard tuition.`,
      depth: 2, body, canonical: `countries/${c.slug}/`, active: 'Countries'
    }));
  }
}

/* ---------------------------------------------------- 5. programs index */
function buildProgramsIndex() {
  const fieldSet = new Set(programs.map((p) => p.field));
  const body = `
<section class="section" style="padding-bottom:0"><div class="container">
  <div class="breadcrumb"><a href="../index.html">Home</a> / Programs</div>
  <div class="page-header" style="border:0;padding-bottom:0">
    <h1>Degree programs</h1>
    <p class="muted">${programs.length} programme entries. Use the <b>English-taught &amp; €0 tuition</b> filter to find exactly where EU citizens can study in English without tuition.</p>
    <p><a class="btn primary" href="index.html?eng=1&amp;maxcost=0">${ic('lang')} English-taught programs with €0 tuition</a></p>
  </div>
</div></section>
<section class="section" style="padding-top:22px"><div class="container layout">
  <aside class="filters" aria-label="Filters">
    <h3>Filters</h3>
    <div class="field"><label for="f-search">Search</label><input id="f-search" type="search" placeholder="Programme, university…"></div>
    <div class="field"><label for="f-country">Country</label><select id="f-country"><option value="">All countries</option>${countries.map((c) => `<option value="${c.code}" data-slug="${c.slug}">${esc(c.name)}</option>`).join('')}</select></div>
    <div class="field"><label for="f-level">Degree level</label><select id="f-level"><option value="">Any level</option><option value="b">Bachelor's</option><option value="m">Master's</option><option value="p">PhD</option></select></div>
    <div class="field"><label for="f-status">Tuition status</label><select id="f-status"><option value="">Any status</option>
      <option>Tuition-Free</option><option>Tuition-Free + Mandatory Fees</option><option>Conditional Tuition-Free</option><option>Low Tuition</option><option>Paid</option></select></div>
    <div class="field"><label for="f-field">Field of study</label><select id="f-field"><option value="">Any field</option>${[...fieldSet].sort().map((f) => `<option value="${esc(f.toLowerCase())}">${esc(f)}</option>`).join('')}</select></div>
    <div class="field"><label for="f-maxcost">Max estimated mandatory cost / year (€)</label><input id="f-maxcost" type="number" min="0" step="100" placeholder="e.g. 0"></div>
    <label class="check"><input id="f-english" type="checkbox"> English-taught only</label>
    <button id="f-reset" class="btn" type="button">Reset filters</button>
  </aside>
  <div>
    <div class="toolbar"><span class="count" id="result-count"></span>
      <label class="small">Sort <select id="sort"><option value="name">Name (A–Z)</option><option value="cost-asc">Cost (low → high)</option><option value="cost-desc">Cost (high → low)</option><option value="country">Country</option></select></label>
    </div>
    <div class="country-banner hidden" id="country-banner" data-prefix="../"></div>
    <div class="results" id="results">${writePartials('progs', chunkItems(programs, (p) => programCard(p, 1)), 1)}</div>
    <div id="empty" class="empty hidden">No programmes match these filters.</div>
    <div class="pagination"></div>
  </div>
</div></section>`;
  write('programs/index.html', layout({
    title: 'Programs — English-Taught, Tuition-Free Study in Europe | StudyFreeEU',
    description: 'Programme-level data for European universities: degree level, language, tuition for EU citizens, mandatory fees and deadlines. Filter for English-taught programmes with €0 tuition.',
    depth: 1, body, canonical: 'programs/', active: 'Programs'
  }));
}

/* ------------------------------------------------------- 6. fields page */
function buildFieldsPage() {
  const counts = new Map();
  const byField = new Map();
  universities.forEach((u) => (u.study_fields || []).forEach((f) => {
    counts.set(f, (counts.get(f) || 0) + 1);
    if (!byField.has(f)) byField.set(f, new Map());
    const m = byField.get(f); m.set(u.country_code, (m.get(u.country_code) || 0) + 1);
  }));
  const items = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const main = items.filter(([, n]) => n >= 10);
  const more = items.filter(([, n]) => n < 10);
  const max = main.length ? main[0][1] : 1;
  const ICON = { 'Natural Sciences': 'flask', 'Engineering': 'cog', 'Humanities': 'book', 'Social Sciences': 'users', 'Medicine': 'steth',
    'Business': 'briefcase', 'Computer Science': 'laptop', 'Law': 'scale', 'Economics': 'chart', 'Health': 'heart', 'Education': 'cap',
    'Architecture': 'landmark', 'Business & Economics': 'chart', 'Design': 'palette', 'Agriculture': 'leaf' };
  const href = (f) => `../universities/index.html?field=${encodeURIComponent(f.toLowerCase())}`;
  const body = `
<section class="section page-hero" style="padding-bottom:0"><div class="container">
  <div class="breadcrumb"><a href="../index.html">Home</a> / Study Fields</div>
  <div class="page-header" style="border:0;padding-bottom:0">
    <span class="kicker">${ic('layers')} ${main.length + more.length} fields</span>
    <h1>Study fields</h1><p class="muted">Pick a field to see every university where EU citizens can study it with €0 or low tuition.</p>
  </div>
</div></section>
<section class="section" style="padding-top:26px"><div class="container">
  <div class="field-grid">
    ${main.map(([f, n], i) => {
      const top = [...byField.get(f).entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
      return `<a class="field-card" href="${href(f)}" style="--h:${(i * 37) % 360}">
        <span class="fc-ico">${ic(ICON[f] || 'sparkles')}</span>
        <h3>${esc(f)}</h3>
        <div class="fc-count"><b>${n}</b> universit${n === 1 ? 'y' : 'ies'}</div>
        <div class="fc-bar"><span style="width:${Math.max(6, Math.round((n / max) * 100))}%"></span></div>
        <div class="fc-flags" title="Most universities in">${top.map(([cc]) => flag(cc, 'sm')).join('')}<span class="fc-go">${ic('arrow')}</span></div>
      </a>`;
    }).join('')}
  </div>
  ${more.length ? `<h2 class="sub-h" style="margin-top:44px">More specialised fields <span class="muted small">${more.length} fields offered at fewer universities</span></h2>
  <div class="chip-cloud">${more.map(([f, n]) => `<a href="${href(f)}">${esc(f)} <span>${n}</span></a>`).join('')}</div>` : ''}
</div></section>`;
  write('fields/index.html', layout({
    title: 'Study Fields — Tuition-Free Study in Europe | StudyFreeEU',
    description: 'Explore European universities by field of study, filtered to institutions where EU citizens can study without standard tuition fees.',
    depth: 1, body, canonical: 'fields/', active: 'Study Fields'
  }));
}

/* ------------------------------------------------ 7. how it works + about */
function buildStatic() {
  const hiw = `
<section class="section page-hero" style="padding-bottom:0"><div class="container">
  <div class="breadcrumb"><a href="../index.html">Home</a> / How It Works</div>
  <div class="page-header" style="border:0;padding-bottom:0">
    <span class="kicker">${ic('sparkles')} Three steps</span>
    <h1>How it works</h1><p class="muted">From the homepage to a shortlist of suitable universities in under three clicks.</p>
  </div>
</div></section>
<section class="section" style="padding-top:26px"><div class="container">
  <ol class="hiw-steps">
    <li><span class="hs-n">1</span><span class="hs-ic">${ic('search')}</span><h3>Pick a route</h3><p>Use the homepage shortcuts: €0 tuition (fees only), English-taught &amp; €0 tuition, Master's, Bachelor's, or a specific field.</p></li>
    <li><span class="hs-n">2</span><span class="hs-ic">${ic('filter')}</span><h3>Filter the list</h3><p>On the universities page, narrow by country, degree level, tuition status, English-taught and maximum estimated mandatory cost.</p></li>
    <li><span class="hs-n">3</span><span class="hs-ic">${ic('compare')}</span><h3>Compare &amp; save</h3><p>Save favourites and compare up to four universities side by side on tuition, fees, English programmes, admissions and deadlines.</p></li>
  </ol>

  <div class="section-head" style="margin-top:64px">
    <span class="kicker">${ic('layers')} Our classification</span>
    <h2>The seven tuition categories we use</h2>
    <p>We never reduce a university to the word “free”. Every record falls into one of these categories.</p>
  </div>
  <div class="cat-grid">
    ${[
      ['€0 tuition', 'No tuition at all.', 'Main database', 'free'],
      ['€0 tuition + mandatory fees', 'No tuition, but compulsory semester, union or administrative fees.', 'Main database', 'free'],
      ['Low tuition', 'Small, often capped or income-based tuition.', 'Listed, clearly flagged', 'low'],
      ['Conditional tuition-free', 'Free only under conditions: national language, study duration or study-place type.', 'Listed, clearly flagged', 'cond'],
      ['Nationality / residency-limited', 'Free only for specific nationalities or residency categories.', 'Noted per record', 'note'],
      ['Level-limited', 'Free only at certain degree levels (e.g. PhD only).', 'Noted per record', 'note'],
      ['Scholarship-made affordable', 'A paid programme made effectively free by a scholarship.', 'Separate concept', 'sep'],
    ].map(([t, d, where, k], i) => `<div class="cat cat-${k}"><span class="cat-n">${i + 1}</span><h3>${t}</h3><p>${d}</p><span class="cat-where">${where}</span></div>`).join('')}
  </div>

  <div class="tip-grid" style="margin-top:40px">
    <div class="tip">${ic('receipt', 'tip-ic')}<div><h3>Why not just say “FREE”?</h3><p class="small">Because it misleads. Every record shows tuition, then the mandatory semester fee, then an estimated mandatory university cost per year. A semester ticket is not free, and neither is an ÖH or CVEC charge.</p></div></div>
    <div class="tip">${ic('shield', 'tip-ic')}<div><h3>How we verify</h3><p class="small">Tuition claims are tied to official sources (university pages, national portals, ministries, the EU education portal). Records that are not yet verified are labelled <span class="pill-note">Needs Verification</span> and never presented as fact.</p></div></div>
  </div>

  <div class="section-head" style="margin-top:64px">
    <span class="kicker">${ic('chat')} FAQ</span>
    <h2>Frequently asked questions</h2>
  </div>
  <div class="faq">
    ${[
      ['Is “tuition-free” really free?', 'No standard tuition — but you almost always pay a mandatory semester/student fee (e.g. a German Semesterbeitrag or the Austrian ÖH fee). Every record shows tuition, the mandatory fee and an estimated mandatory cost per year.'],
      ['Do EU citizens pay more than nationals?', 'Generally no — EU/EEA citizens are treated like nationals in the countries covered here, except where the rule is language- or study-place-based (e.g. Czechia, Poland, Slovakia, Estonia, Latvia, Lithuania, Croatia).'],
      ['Do I need a visa?', 'As an EU/EEA citizen you do not need a visa or residence permit to study in another EU/EEA country; you register locally after arrival.'],
      ['Are there English-taught options?', 'Yes — use the “English-taught only” filter and the “English-taught &amp; €0 tuition” preset on the programmes page.'],
      ['How current is the data?', 'Each record carries a “last verified” date and a verification status; the academic year in focus is 2026/2027. Always confirm on the official page before applying.'],
    ].map(([q, a], i) => `<details${i === 0 ? ' open' : ''}><summary>${q}<span class="faq-ic">${ic('chevron')}</span></summary><div class="faq-a"><p>${a}</p></div></details>`).join('')}
  </div>
  ${disclaimer}
</div></section>`;
  write('how-it-works/index.html', layout({
    title: 'How It Works — Using the Tuition-Free Study Database | StudyFreeEU',
    description: 'How StudyFreeEU helps EU citizens find tuition-free universities: the seven tuition categories, filtering, comparing and verifying every claim against official sources.',
    depth: 1, body: hiw, canonical: 'how-it-works/', active: 'How It Works'
  }));

  const euCount = countries.filter((c) => c.is_eu).length;
  const about = `
<section class="section" style="padding-bottom:0"><div class="container">
  <div class="breadcrumb"><a href="../index.html">Home</a> / About</div>
  <div class="page-header" style="border:0;padding-bottom:0"><h1>About StudyFreeEU</h1><p class="muted">An independent, source-backed directory of tuition-free study for EU citizens in Europe.</p></div>
</div></section>
<section class="section" style="padding-top:22px"><div class="container info-grid">
  <div>
    <div class="panel"><h2>What this is</h2>
      <p>StudyFreeEU answers one question well: <b>where in Europe can an EU citizen study without paying standard tuition fees?</b> It combines a university search engine, a European study database and a tuition comparison platform.</p>
      <p>It covers all ${euCount} EU member states plus a separate section for other European countries (EEA and close partners).</p></div>
    <div class="panel"><h2>Accuracy rule</h2>
      <p>We never fabricate universities, programmes, fees, deadlines, admission requirements, URLs or tuition policies. Where a fact cannot be verified, it is labelled <span class="pill-note">Not yet verified</span> instead of guessed. Every tuition claim carries a source and a verification date.</p>
      <p class="small muted">Academic year in focus: 2026/2027 (some national figures still quote 2025/2026 until updated by the authorities).</p></div>
    <div class="panel"><h2>Research progress</h2>
      <div class="table-wrap"><table><thead><tr><th>Country</th><th>EU</th><th>Universities</th><th>Status</th></tr></thead><tbody>
      ${[...countries].sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name)).map((c) => {
        const n = universities.filter((u) => u.country_code === c.code).length;
        return `<tr><td>${esc(c.name)}</td><td>${c.is_eu ? 'Yes' : 'No'}</td><td class="num">${n}</td><td>${esc(c.verification_status)}</td></tr>`;
      }).join('')}
      </tbody></table></div>
      <p class="small muted" style="margin-top:10px">Country-level policy is researched first; individual universities and programmes are added continuously. See <code>RESEARCH_PROGRESS.md</code> in the repository for the tracker.</p></div>
    ${disclaimer}
  </div>
  <aside>
    <div class="panel"><h2>Data sources</h2><ul class="src-list">
      ${sources.map((s) => `<li><a href="${s.url}" rel="nofollow noopener" target="_blank">${esc(s.title)}</a><br><span class="muted small">${esc(s.publisher)} · ${esc(s.type)}</span></li>`).join('')}
    </ul></div>
    <div class="panel"><h2>Technology</h2><p class="small">Static, pre-rendered site generated from a normalized JSON knowledge base that mirrors a PostgreSQL schema (<code>db/schema.sql</code>). Search, filters, comparison and favourites work fully client-side.</p></div>
  </aside>
</div></section>`;
  write('about/index.html', layout({
    title: 'About & Sources — StudyFreeEU',
    description: 'About StudyFreeEU: our accuracy rule, research progress per country, and the official data sources behind every tuition claim.',
    depth: 1, body: about, canonical: 'about/', active: 'About'
  }));
}

/* ------------------------------------------------------ 8. compare page */
function buildCompare() {
  const body = `
<section class="section" style="padding-bottom:0"><div class="container">
  <div class="breadcrumb"><a href="../index.html">Home</a> / Compare</div>
  <div class="page-header" style="border:0;padding-bottom:0"><h1>Compare universities</h1><p class="muted">Compare up to four universities side by side: tuition, mandatory fees, English programmes, admissions, deadlines, location and degree levels.</p></div>
</div></section>
<section class="section" style="padding-top:22px"><div class="container">
  <div id="compare-table"></div>
</div></section>
${writeDataChunks('SFE_UNIVERSITIES', 'unis-lite', universities, 1, (u) => ({
    id: u.id, slug: u.slug, name: u.name, country: u.country, city: u.city, type: u.type,
    tuition_status: u.tuition_status, tuition_eu: u.tuition_eu,
    mandatory_semester_fee: u.mandatory_semester_fee, est_annual_mandatory_cost_eur: u.est_annual_mandatory_cost_eur,
    bachelor_available: u.bachelor_available, master_available: u.master_available, phd_available: u.phd_available,
    english_bachelor: u.english_bachelor, english_master: u.english_master, english_phd: u.english_phd,
    admission_requirements: u.admission_requirements, application_deadlines: u.application_deadlines, last_verified: u.last_verified,
    contact: u.contact, deadlines: u.deadlines
  }))}`;
  write('compare/index.html', layout({
    title: 'Compare Universities — Tuition, Fees & Programs | StudyFreeEU',
    description: 'Compare up to four European universities side by side on tuition for EU citizens, mandatory fees, English-taught programmes, admissions and deadlines.',
    depth: 1, body, canonical: 'compare/', active: ''
  }));
}

/* ------------------------------------------------------- 9. admin console */
function buildAdmin() {
  const body = `
<section class="section" style="padding-bottom:0"><div class="container">
  <div class="breadcrumb"><a href="../index.html">Home</a> / Data console</div>
  <div class="page-header" style="border:0;padding-bottom:0"><h1>Data maintenance console</h1>
  <p class="muted">Review and update tuition status, verification status and mandatory costs. Records older than 6 and 12 months are highlighted for re-verification. This is a static editing surface — export the JSON and commit it to <code>data/</code>.</p></div>
</div></section>
<section class="section" style="padding-top:22px"><div class="container">${writeDataChunks('SFE_UNIVERSITIES', 'unis', universities, 1)}
${writeDataChunks('SFE_PROGRAMS', 'progs', programs, 1)}
${writeDataChunks('SFE_COUNTRIES', 'countries', countries, 1)}
<div id="admin-root"><div class="empty">Loading dataset…</div></div></div></section>`;
  write('admin/index.html', layout({
    title: 'Data Console — StudyFreeEU',
    description: 'Internal data maintenance console for reviewing verification status and re-verification of tuition records.',
    depth: 1, body, canonical: 'admin/', active: ''
  }));
}

/* ------------------------------------------------- 10. SEO landing pages */
function seoLanding({ slug, h1, title, description, intro, list, note, related }) {
  const body = `
<section class="section" style="padding-bottom:0"><div class="container">
  <div class="breadcrumb"><a href="../index.html">Home</a> / ${esc(h1)}</div>
  <div class="page-header" style="border:0;padding-bottom:0"><h1>${esc(h1)}</h1></div>
</div></section>
<section class="section" style="padding-top:6px"><div class="container">
  <div class="panel"><p>${intro}</p>${note || ''}</div>
  <div class="grid cols-3">${list}</div>
  <div class="panel" style="margin-top:20px"><h2>Frequently asked questions</h2>
    <h3>Is tuition really €0?</h3><p class="small">There is no standard tuition, but mandatory semester/student fees usually apply — the estimated mandatory cost per year is shown on every card.</p>
    <h3>Are these programmes taught in English?</h3><p class="small">Use the “English-taught only” filter; English-taught options are most common at Master’s level.</p>
    <h3>How current is this list?</h3><p class="small">Each record carries a “last verified” date; the academic year in focus is 2026/2027. Always confirm on the official page before applying.</p>
  </div>
  <div class="panel" style="margin-top:20px"><h2>Keep exploring</h2><ul>
    ${related.map(([t, h]) => `<li><a href="../${h}">${esc(t)}</a></li>`).join('')}
  </ul></div>
  ${disclaimer}
</div></section>`;
  write(`${slug}/index.html`, layout({ title, description, depth: 1, body, canonical: `${slug}/`, active: '' }));
}

function buildSeoPages() {
  const free = (u) => u.tuition_status === 'Tuition-Free' || u.tuition_status === 'Tuition-Free + Mandatory Fees';

  seoLanding({
    slug: 'tuition-free-universities-for-eu-students',
    h1: 'Tuition-Free Universities for EU Students',
    title: 'Tuition-Free Universities for EU Students in Europe | StudyFreeEU',
    description: 'Universities across Europe where EU citizens pay €0 tuition — with the mandatory semester fees that still apply, verified against official sources.',
    intro: 'EU citizens enjoy tuition-free study in several European countries — most notably Germany, Austria, the Nordics and parts of Central Europe. The catch is that “tuition-free” almost always comes with a <b>mandatory semester fee</b>. Below are universities in our database where EU citizens pay no standard tuition.',
    note: '<p class="small muted">Estimated mandatory cost per year = compulsory fees only (semester contribution, student union, administration). It excludes living costs.</p>',
    list: universities.filter(free).slice(0, 12).map((u) => uniCard(u, 1)).join(''),
    related: [
      ['All universities', 'universities/index.html'],
      ['Countries & tuition policy', 'countries/index.html'],
      ["English-taught Bachelor's", 'english-taught-tuition-free-bachelors/index.html'],
      ["English-taught Master's", 'english-taught-tuition-free-masters/index.html']
    ]
  });

  seoLanding({
    slug: 'english-taught-tuition-free-bachelors',
    h1: "English-Taught Tuition-Free Bachelor's Degrees",
    title: "English-Taught Tuition-Free Bachelor's Degrees in Europe | StudyFreeEU",
    description: "Bachelor's degrees taught in English where EU citizens pay no tuition, across the Nordics, Germany, Austria and more.",
    intro: "English-taught Bachelor's degrees with €0 tuition are rarer than Master's, but they exist — especially in Finland, Iceland and a few other systems. This page lists universities in our database offering English-taught Bachelor's programmes with no standard tuition for EU citizens. Always confirm the programme's language and fee on the university's official page.",
    list: universities.filter((u) => u.english_bachelor && free(u)).slice(0, 12).map((u) => uniCard(u, 1)).join('') ||
      '<div class="empty">No fully verified English-taught, tuition-free Bachelor\'s records yet — check the <a href="../programs/index.html?eng=1&amp;maxcost=0">programmes filter</a>.</div>',
    related: [
      ['Programmes: English & €0 tuition', 'programs/index.html?eng=1&maxcost=0'],
      ["English-taught Master's", 'english-taught-tuition-free-masters/index.html'],
      ['All universities', 'universities/index.html']
    ]
  });

  seoLanding({
    slug: 'english-taught-tuition-free-masters',
    h1: "English-Taught Tuition-Free Master's Degrees",
    title: "English-Taught Tuition-Free Master's Degrees in Europe | StudyFreeEU",
    description: "Master's programmes taught in English where EU citizens pay no tuition — Germany, the Nordics, Austria and more, with mandatory fees shown.",
    intro: "The Master's level is where Europe's English-taught, tuition-free offering is strongest. Germany, the Nordic countries and Austria offer large English-taught catalogues with no tuition for EU/EEA citizens. Here are universities in our database with English-taught Master's programmes and €0 tuition for EU citizens.",
    list: universities.filter((u) => u.english_master && free(u)).slice(0, 12).map((u) => uniCard(u, 1)).join(''),
    related: [
      ['Programmes: English & €0 tuition', 'programs/index.html?eng=1&maxcost=0'],
      ["English-taught Bachelor's", 'english-taught-tuition-free-bachelors/index.html'],
      ['Countries & tuition policy', 'countries/index.html']
    ]
  });

  seoLanding({
    slug: 'free-computer-science-degrees-europe',
    h1: 'Free Computer Science Degrees in Europe',
    title: 'Free Computer Science Degrees in Europe for EU Citizens | StudyFreeEU',
    description: 'Computer Science programmes in Europe with no tuition for EU citizens — including English-taught options in Germany, the Nordics and beyond.',
    intro: "Computer Science is one of the most widely available fields in Europe's tuition-free systems, and English-taught CS programmes are common at Master's level. Below are universities in our database with CS offerings, filtered to those where EU citizens pay no standard tuition.",
    list: universities.filter((u) => (u.study_fields || []).includes('Computer Science') && free(u)).slice(0, 12).map((u) => uniCard(u, 1)).join(''),
    related: [
      ['Programmes in Computer Science', 'programs/index.html?field=computer%20science'],
      ['Study fields', 'fields/index.html'],
      ['All universities', 'universities/index.html']
    ]
  });

  seoLanding({
    slug: 'free-engineering-degrees-europe',
    h1: 'Free Engineering Degrees in Europe',
    title: 'Free Engineering Degrees in Europe for EU Citizens | StudyFreeEU',
    description: 'Engineering degrees in Europe with no tuition for EU citizens, including English-taught Master\'s options.',
    intro: "Engineering is a flagship offering of Europe's tuition-free systems — from Germany's technical universities to the Nordic institutes. Here are engineering-focused universities in our database where EU citizens pay no standard tuition.",
    list: universities.filter((u) => (u.study_fields || []).includes('Engineering') && free(u)).slice(0, 12).map((u) => uniCard(u, 1)).join(''),
    related: [
      ['Programmes in Engineering', 'programs/index.html?field=engineering'],
      ['Study fields', 'fields/index.html'],
      ['All universities', 'universities/index.html']
    ]
  });

  seoLanding({
    slug: 'free-business-degrees-europe',
    h1: 'Free Business & Economics Degrees in Europe',
    title: 'Free Business and Economics Degrees in Europe for EU Citizens | StudyFreeEU',
    description: 'Business, economics and management degrees in Europe with no tuition for EU citizens, including English-taught options.',
    intro: "Business, economics and management are widely available in Europe's tuition-free public systems, and many English-taught options exist at Master's level. Here are universities in our database with business/economics offerings where EU citizens pay no standard tuition.",
    list: universities.filter((u) => (u.study_fields || []).some((f) => /Business|Economics/.test(f)) && free(u)).slice(0, 12).map((u) => uniCard(u, 1)).join(''),
    related: [
      ['Programmes in Business', 'programs/index.html?field=business'],
      ['Study fields', 'fields/index.html'],
      ['All universities', 'universities/index.html']
    ]
  });

  seoLanding({
    slug: 'tuition-free-phd-in-europe',
    h1: 'Tuition-Free PhD in Europe',
    title: 'Tuition-Free PhD in Europe for EU Citizens | StudyFreeEU',
    description: 'Doctoral study in Europe with no tuition for EU citizens — and why PhD positions are often salaried or funded.',
    intro: "Doctoral (PhD) study in most European systems carries no tuition, and in many countries doctoral candidates are employed or hold a scholarship. Here are universities in our database with PhD programmes and no standard tuition for EU citizens.",
    list: universities.filter((u) => u.phd_available && free(u)).slice(0, 12).map((u) => uniCard(u, 1)).join(''),
    related: [
      ['All universities', 'universities/index.html'],
      ['Countries & tuition policy', 'countries/index.html'],
      ['How it works', 'how-it-works/index.html']
    ]
  });
}

/* ------------------------------------------------- 9c. glossary page */
function buildGlossary() {
  const T = [
    ['ECTS', 'European Credit Transfer and Accumulation System — a common credit system. A full academic year is typically 60 ECTS (Bachelor’s ≈ 180, Master’s ≈ 120).'],
    ['Bachelor / Master / PhD', 'The three-cycle degree structure: undergraduate (first cycle), postgraduate (second cycle) and doctoral (third cycle).'],
    ['Semester fee (Semesterbeitrag)', 'A mandatory contribution many “tuition-free” universities charge per semester, covering administration, student services and often a public-transport ticket.'],
    ['Students’ union fee (ÖH fee)', 'The compulsory Austrian students’ union contribution (approx. €24.70 per semester) paid even when tuition is €0.'],
    ['CVEC', 'The French “Contribution Vie Étudiante et de Campus”, a small mandatory campus-life contribution added to tuition.'],
    ['ISEE', 'The Italian income indicator used to calculate income-based university tuition.'],
    ['Propina', 'The Portuguese term for the maximum annual public-university tuition fee, set nationally and indexed.'],
    ['State-funded place', 'A government-funded study place (used in the Nordics, Baltics, Czechia, Poland, Hungary, Romania, etc.) that is free of tuition and usually allocated by merit.'],
    ['Conditional tuition-free', 'Free only under a condition — most often the language of instruction (study in the national language) or staying within the regular study duration.'],
    ['Nostrification', 'The recognition of a foreign school-leaving or higher-education qualification by the host country’s authorities (used in Czechia, Slovakia, etc.).'],
    ['Legalisation / apostille', 'Official confirmation that a document is authentic, often required for foreign certificates (e.g. Poland, Bulgaria).'],
    ['Declaration of value / CIMEA', 'Italian mechanisms to assess and compare a foreign qualification.'],
    ['uni-assist', 'A central service used by many German universities to check international credentials before admission.'],
    ['EEA', 'European Economic Area — the EU plus Iceland, Liechtenstein and Norway. EEA and Swiss citizens share the EU tuition rules described here.'],
    ['Erasmus+', 'The EU programme supporting study, training and exchanges across European countries.'],
    ['Academic year 2026/2027', 'The academic year in focus in this database; some national sources still quote 2025/2026 until the authorities update them.']
  ];
  const GROUP = { 'ECTS': 'Degrees', 'Bachelor / Master / PhD': 'Degrees', 'Academic year 2026/2027': 'Degrees', 'Erasmus+': 'Degrees', 'EEA': 'Eligibility',
    'State-funded place': 'Eligibility', 'Conditional tuition-free': 'Eligibility', 'Semester fee (Semesterbeitrag)': 'Fees', 'Students’ union fee (ÖH fee)': 'Fees',
    'CVEC': 'Fees', 'ISEE': 'Fees', 'Propina': 'Fees' };
  const grp = (k) => GROUP[k] || 'Documents';
  const GICON = { Degrees: 'cap', Eligibility: 'shield', Fees: 'euro', Documents: 'file' };
  const groups = ['Fees', 'Eligibility', 'Documents', 'Degrees'];
  const body = `
<section class="section page-hero" style="padding-bottom:0"><div class="container">
  <div class="breadcrumb"><a href="../index.html">Home</a> / Glossary</div>
  <div class="page-header" style="border:0;padding-bottom:0">
    <span class="kicker">${ic('book')} ${T.length} terms explained</span>
    <h1>Glossary</h1><p class="muted">Quick definitions of the fees, documents and terms you’ll meet when applying to a European university.</p>
  </div>
</div></section>
<section class="section" style="padding-top:26px"><div class="container">
  <div class="gloss-tools">
    <div class="gloss-search">${ic('search')}<input id="gloss-q" type="search" placeholder="Search a term… e.g. ECTS, apostille, ÖH" aria-label="Search glossary"></div>
    <div class="gloss-tabs" role="tablist">
      <button type="button" class="is-on" data-g="">All <span>${T.length}</span></button>
      ${groups.map((g) => `<button type="button" data-g="${g}">${ic(GICON[g])} ${g} <span>${T.filter(([k]) => grp(k) === g).length}</span></button>`).join('')}
    </div>
  </div>
  <div class="gloss-grid" id="gloss-grid">
    ${T.map(([k, v]) => `<article class="gloss-card" data-g="${grp(k)}" data-q="${esc((k + ' ' + v).toLowerCase())}">
      <span class="gc-tag g-${grp(k).toLowerCase()}">${ic(GICON[grp(k)])} ${grp(k)}</span>
      <h3>${esc(k)}</h3><p>${esc(v)}</p></article>`).join('')}
  </div>
  <div id="gloss-empty" class="empty hidden">No term matches your search.</div>
  ${disclaimer}
</div></section>`;
  write('glossary/index.html', layout({
    title: 'Glossary — European University Terms Explained | StudyFreeEU',
    description: 'Definitions of key European higher-education terms: ECTS, semester fee, ÖH fee, CVEC, ISEE, propina, state-funded place, nostrification, uni-assist and more.',
    depth: 1, body, canonical: 'glossary/', active: 'Glossary'
  }));
}

/* ------------------------------------------------- 9b. deadlines page */
function buildDeadlines() {
  const rows = [...countries].sort((a, b) => (a.is_eu === b.is_eu ? a.name.localeCompare(b.name) : (a.is_eu ? -1 : 1)));
  const verified = universities.filter((u) => u.deadlines_verified).sort((a, b) => a.country.localeCompare(b.country) || a.name.localeCompare(b.name));
  const body = `
<section class="section page-hero" style="padding-bottom:0"><div class="container">
  <div class="breadcrumb"><a href="../index.html">Home</a> / Deadlines</div>
  <div class="page-header" style="border:0;padding-bottom:0">
    <span class="kicker">${ic('calendar')} Deadlines 2026/2027</span>
    <h1>Application &amp; document deadlines</h1><p class="muted">Typical application windows and document rules for EU citizens in ${countries.length} countries, for the <b>2026/2027</b> cycle.</p>
  </div>
</div></section>
<section class="section" style="padding-top:26px"><div class="container">
  <div class="dl-tools">
    <div class="gloss-search">${ic('search')}<input id="dl-q" type="search" placeholder="Find a country…" aria-label="Find a country"></div>
    <span class="muted small">${ic('info')} Typical dates for EU/EEA applicants — always confirm on the official admissions page.</span>
  </div>
  <div class="dl-grid" id="dl-grid">
    ${rows.map((c) => `<article class="dl-card cf-${c.code} flag-top" data-q="${esc(c.name.toLowerCase())}">
      <header>${flag(c.code, 'lg')}<h3><a href="../countries/${c.slug}/index.html">${esc(c.name)}</a></h3>${c.is_eu ? '' : '<span class="badge b-plain">Other Europe</span>'}</header>
      <div class="dl-dates">
        <div class="dl-d open">${ic('calOpen')}<div><span>Applications open</span><b>${esc(c.document_submission?.opens || '—')}</b></div></div>
        <div class="dl-d close">${ic('calClose')}<div><span>Applications close</span><b>${esc(c.document_submission?.closes || '—')}</b></div></div>
      </div>
      <p class="dl-docs">${ic('file')}<span>${esc(c.document_submission?.documents || 'See the country page for document rules.')}</span></p>
      <a class="dl-more" href="../countries/${c.slug}/index.html">Country details ${ic('arrow')}</a>
    </article>`).join('')}
  </div>
  <div id="dl-empty" class="empty hidden">No country matches your search.</div>

  <div class="section-head" style="margin-top:56px">
    <span class="kicker">${ic('shield')} Checked at the source</span>
    <h2>Verified deadlines — selected universities</h2>
    <p>Dates confirmed against the universities’ own pages (2026-09-22).</p>
  </div>
  <div class="vd-list">
    ${verified.map((u) => `<a class="vd-row cf-${u.country_code}" href="../universities/${u.slug}/index.html">
      ${flag(u.country_code, 'md')}
      <span class="vd-name"><b>${esc(u.name)}</b><small>${esc(u.country)}</small></span>
      <span class="vd-win">${ic('clock')} ${esc(u.deadlines_verified.window)}</span>
      <span class="badge ${u.deadlines_verified.status === 'verified' ? 'b-free' : 'b-cond'}">${u.deadlines_verified.status === 'verified' ? 'Verified' : 'Partly verified'}</span>
    </a>`).join('')}
  </div>

  <div class="tip-grid">
    <div class="tip">${ic('file', 'tip-ic')}<div><h3>How to submit documents</h3><p class="small">Most countries require <b>certified copies</b> of your certificates and transcripts, often with <b>certified translations</b>; originals are checked at enrolment. Some require <b>legalisation/apostille</b> (e.g. Poland, Bulgaria) or a <b>recognition procedure</b> (e.g. Czechia, Slovakia, Romania, Spain, Italy).</p></div></div>
    <div class="tip">${ic('clock', 'tip-ic')}<div><h3>Don’t miss the window</h3><p class="small">EU/EEA applicants usually have a later deadline than non-EU applicants, but not always (e.g. Belgium, the Netherlands). Apply 4–6 weeks before the deadline if documents must be verified by a central service such as uni-assist.</p></div></div>
  </div>
  ${disclaimer}
</div></section>`;
  write('deadlines/index.html', layout({
    title: 'Application & Document Deadlines in Europe — for EU Citizens | StudyFreeEU',
    description: 'Typical application windows and document-submission rules for tuition-free study in Europe, by country, for EU citizens.',
    depth: 1, body, canonical: 'deadlines/', active: 'Deadlines'
  }));
}

/* ------------------------------------------------------- 11. sitemap etc */
function buildMeta() {
  const urls = ['', 'universities/', 'universities/by-country/', 'programs/', 'countries/', 'deadlines/', 'fields/', 'glossary/', 'how-it-works/', 'about/', 'contact/', 'compare/',
    'tuition-free-universities-for-eu-students/', 'english-taught-tuition-free-bachelors/',
    'english-taught-tuition-free-masters/', 'free-computer-science-degrees-europe/', 'free-engineering-degrees-europe/',
    'free-business-degrees-europe/', 'tuition-free-phd-in-europe/']
    .concat(universities.map((u) => `universities/${u.slug}/`))
    .concat(countries.map((c) => `countries/${c.slug}/`));
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${SITE}/${u}</loc></url>`).join('\n')}
</urlset>`;
  write('sitemap.xml', sitemap);
  write('robots.txt', `User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: ${SITE}/sitemap.xml\n`);
}


/* ------------------------------------------------------------ contact */
function buildContact() {
  const mail = CONTACT_EMAIL;
  const subj = (t) => `mailto:${mail}?subject=${encodeURIComponent(t)}`;
  const body = `
<section class="section" style="padding-bottom:0"><div class="container">
  <div class="breadcrumb"><a href="../index.html">Home</a> / Contact</div>
  <div class="page-header" style="border:0;padding-bottom:0"><h1>Contact us</h1>
  <p class="muted">Questions, corrections or suggestions? Write to us — we read every message.</p></div>
</div></section>
<section class="section" style="padding-top:22px"><div class="container">
  <div class="contact-hero">
    <div class="contact-ico">${ic('mail')}</div>
    <div class="contact-main">
      <span class="contact-label">Email</span>
      <a class="contact-email" href="mailto:${mail}">${mail}</a>
      <p class="small muted" style="margin:6px 0 0">Please write in English or Latvian.</p>
    </div>
    <div class="contact-actions">
      <a class="btn primary" href="mailto:${mail}">Send an email</a>
      <button class="btn js-copy-email" type="button" data-email="${mail}">Copy address</button>
    </div>
  </div>

  <h2 style="font-size:1.2rem;margin:30px 0 12px">What you can write to us about</h2>
  <div class="grid cols-3">
    <a class="card contact-topic" href="${subj('Data correction')}"><h3>${ic('pencil')} Report a correction</h3><p class="small muted">A fee, deadline or tuition rule has changed? Send the university name and a link to the official source.</p><span class="go">Email a correction →</span></a>
    <a class="card contact-topic" href="${subj('University suggestion')}"><h3>${ic('cap')} Suggest a university</h3><p class="small muted">Know a university with €0 or low tuition for EU citizens and English-taught degrees that we have not listed yet?</p><span class="go">Suggest a university →</span></a>
    <a class="card contact-topic" href="${subj('Question / feedback')}"><h3>${ic('chat')} Questions &amp; feedback</h3><p class="small muted">Ideas for the site, partnership requests or anything else about StudyFreeEU.</p><span class="go">Send feedback →</span></a>
  </div>

  <div class="disclaimer" style="margin-top:26px"><b>Please note.</b> StudyFreeEU is an independent information site — we are not a university and cannot process applications or make admission decisions. For applications, admission requirements and official fees, contact the university directly via the admissions page linked on each university profile.</div>
</div></section>`;
  write('contact/index.html', layout({
    title: 'Contact — StudyFreeEU',
    description: `Contact StudyFreeEU at ${mail}: report a data correction, suggest a tuition-free university or send questions and feedback.`,
    depth: 1, body, canonical: 'contact/', active: 'Contact'
  }));
}

/* ------------------------------------------------------------------ build */
console.log('Building StudyFreeEU →', OUT);
fs.mkdirSync(OUT, { recursive: true });
copyDir(path.join(WEB, 'assets'), path.join(OUT, 'assets'));
write('assets/css/flags.css', flagsCss());
fs.mkdirSync(path.join(OUT, 'assets', 'data'), { recursive: true });
// Only the small registry files are shipped as raw JSON. The two large datasets
// (universities.json, programs.json) exceed this project's per-file deploy
// payload limit and ship as chunked JS instead (see writeDataChunks); raw
// copies are intentionally NOT emitted for them.
for (const f of ['countries.json', 'sources.json']) {
  fs.copyFileSync(path.join(DATA, f), path.join(OUT, 'assets', 'data', f));
}
buildHome();
buildUniversitiesIndex();
buildUniversitiesByCountry();
buildUniversityPages();
buildCountryPages();
buildProgramsIndex();
buildFieldsPage();
buildDeadlines();
buildGlossary();
buildStatic();
buildContact();
buildCompare();
buildAdmin();
buildSeoPages();
buildMeta();

// count output
let files = 0;
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); e.isDirectory() ? walk(f) : files++; } })(OUT);
console.log(`Done. ${files} files written to ${OUT}`);
