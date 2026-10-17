import { ic } from './icons.mjs';

const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Presentation only: retain the source-backed text, links and fee conditions.
export function detailDesign(body, { country, facts, countryUrl, universityUrl, university = false }) {
  let number = 0;
  const sections = [];
  body = body.replace(/<div class="panel">\s*<h2>([^<]+)<\/h2>/g, (_, title) => {
    const id = university && title === 'Admissions &amp; entry requirements' ? 'admissions-guide' : `detail-section-${++number}`;
    const cost = /fees|costs|Tuition policy/.test(title);
    const admission = /Admission|Deadlines/.test(title);
    const icon = cost ? 'euro' : admission ? 'calendar' : /sources|facts/.test(title) ? 'shield' : /programme|Programs|specialities/i.test(title) ? 'book' : /Contact/.test(title) ? 'mail' : 'landmark';
    const label = /overview|Tuition rules/.test(title) ? 'Overview' : /Tuition policy|Mandatory fees/.test(title) ? 'Fees' : /Admission/.test(title) ? 'Admissions' : /Living costs/.test(title) ? 'Living costs' : null;
    if (label) sections.push({ id, label });
    return `<div class="panel detail-panel${cost ? ' detail-cost' : ''}${admission ? ' detail-admission' : ''}" id="${id}"><h2><span class="detail-icon">${ic(icon)}</span><span>${title}</span></h2>`;
  });
  const factsHtml = `<div class="container"><dl class="detail-facts">${facts.map(([icon, label, value]) => `<div${!value || value === 'Not yet verified' ? ' class="is-unverified"' : ''}><dt>${ic(icon)} ${escape(label)}</dt><dd>${escape(value || 'Not yet verified')}</dd></div>`).join('')}</dl><nav class="detail-jumps" aria-label="On this page"><span>Explore this guide</span>${sections.map(({ id, label }) => `<a href="#${id}">${label} ${ic('arrow')}</a>`).join('')}</nav></div>`;
  body = body.replace('</section>', `${factsHtml}</section>`);
  const next = `<section class="section detail-next"><div class="container"><div class="detail-next-inner"><div><span class="detail-eyebrow">YOUR NEXT CHAPTER</span><h2>Make room for your next possibility.</h2><p>Explore your options in ${escape(country.name)}, check the official requirements and build your shortlist.</p></div><div class="detail-next-actions"><a class="btn primary" href="${escape(universityUrl)}">Explore universities ${ic('arrow')}</a>${countryUrl ? `<a class="btn" href="${escape(countryUrl)}">Living costs &amp; country guide ${ic('globe')}</a>` : ''}</div></div></div></section>`;
  return `<div class="detail-page${university ? ' university-detail' : ''} cf-${escape(country.code)}">${body}${next}</div>`;
}
