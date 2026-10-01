/* StudyFreeEU — country flag artwork + flag-colour themes.
 *
 * Emoji flags do not render on Windows (they show as "DE", "SE"…), so every
 * flag is drawn as a small inline SVG (viewBox 30×20) and shipped once in
 * assets/css/flags.css as a CSS custom property. Each country also gets:
 *   --flag    the flag image (data URI)
 *   --stripe  a hard-stop gradient of the flag colours (for accent bars)
 *   --fa      the main accent colour (borders, tints, focus rings)
 * Apply a theme by adding the class `cf-XX` (ISO code) to any element.
 */

const W = 30, H = 20;
const h3 = (a, b, c) => `<rect width="30" height="20" fill="${a}"/><rect y="6.667" width="30" height="6.667" fill="${b}"/><rect y="13.333" width="30" height="6.667" fill="${c}"/>`;
const v3 = (a, b, c) => `<rect width="30" height="20" fill="${a}"/><rect x="10" width="10" height="20" fill="${b}"/><rect x="20" width="10" height="20" fill="${c}"/>`;
const h2 = (a, b) => `<rect width="30" height="20" fill="${a}"/><rect y="10" width="30" height="10" fill="${b}"/>`;
const cross = (bg, fg, x, w, y, h) => `<rect width="30" height="20" fill="${bg}"/><rect x="${x}" width="${w}" height="20" fill="${fg}"/><rect y="${y}" width="30" height="${h}" fill="${fg}"/>`;

const greece = () => {
  let s = '<rect width="30" height="20" fill="#fff"/>';
  for (let i = 0; i < 9; i += 2) s += `<rect y="${(i * 20 / 9).toFixed(3)}" width="30" height="${(20 / 9).toFixed(3)}" fill="#0D5EAF"/>`;
  s += '<rect width="11.111" height="11.111" fill="#0D5EAF"/><rect x="4.444" width="2.222" height="11.111" fill="#fff"/><rect y="4.444" width="11.111" height="2.222" fill="#fff"/>';
  return s;
};
const croatiaShield = () => {
  let s = '';
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) s += `<rect x="${12 + c * 1.5}" y="${4.5 + r * 1.5}" width="1.5" height="1.5" fill="${(r + c) % 2 ? '#fff' : '#FF0000'}"/>`;
  return s + '<path d="M12 10.5h6c0 2.2-1.4 3.6-3 4.2-1.6-.6-3-2-3-4.2z" fill="#FF0000"/><path d="M13.5 10.5h1.5v1.5h-1.5zM16.5 10.5h1.5v1.5h-1.5zM15 12h1.5v1.5H15z" fill="#fff"/><path d="M12 4.5h6v6c0 2.2-1.4 3.6-3 4.2-1.6-.6-3-2-3-4.2z" fill="none" stroke="#171796" stroke-width=".35"/>';
};

/* code: { svg, stripe: [[colour, weight]…], accent } */
export const FLAGS = {
  DE: { svg: h3('#000', '#DD0000', '#FFCE00'), stripe: [['#000', 1], ['#DD0000', 1], ['#FFCE00', 1]], accent: '#DD0000' },
  AT: { svg: h3('#C8102E', '#fff', '#C8102E'), stripe: [['#C8102E', 1], ['#fff', 1], ['#C8102E', 1]], accent: '#C8102E' },
  FI: { svg: cross('#fff', '#002F6C', 8.333, 5, 7.273, 5.455), stripe: [['#fff', 1], ['#002F6C', 1.2], ['#fff', 1]], accent: '#002F6C' },
  SE: { svg: cross('#006AA7', '#FECC02', 9.375, 3.75, 8, 4), stripe: [['#006AA7', 1], ['#FECC02', 1], ['#006AA7', 1]], accent: '#006AA7' },
  DK: { svg: cross('#C8102E', '#fff', 9.73, 3.24, 8.57, 2.86), stripe: [['#C8102E', 1], ['#fff', .6], ['#C8102E', 1]], accent: '#C8102E' },
  NO: { svg: cross('#BA0C2F', '#fff', 8.18, 5.45, 7.5, 5) + '<rect x="9.55" width="2.73" height="20" fill="#00205B"/><rect y="8.75" width="30" height="2.5" fill="#00205B"/>', stripe: [['#BA0C2F', 2], ['#fff', .5], ['#00205B', 1], ['#fff', .5], ['#BA0C2F', 2]], accent: '#BA0C2F' },
  IS: { svg: cross('#02529C', '#fff', 8.4, 4.8, 7.78, 4.44) + '<rect x="9.6" width="2.4" height="20" fill="#DC1E35"/><rect y="8.89" width="30" height="2.22" fill="#DC1E35"/>', stripe: [['#02529C', 2], ['#fff', .5], ['#DC1E35', 1], ['#fff', .5], ['#02529C', 2]], accent: '#02529C' },
  GR: { svg: greece(), stripe: [['#0D5EAF', 1], ['#fff', 1], ['#0D5EAF', 1], ['#fff', 1], ['#0D5EAF', 1]], accent: '#0D5EAF' },
  CZ: { svg: h2('#fff', '#D7141A') + '<path d="M0 0l15 10L0 20z" fill="#11457E"/>', stripe: [['#11457E', 1], ['#fff', 1], ['#D7141A', 1]], accent: '#11457E' },
  PL: { svg: h2('#fff', '#DC143C'), stripe: [['#fff', 1], ['#DC143C', 1]], accent: '#DC143C' },
  SI: { svg: h3('#fff', '#005DA4', '#ED1C24') + '<path d="M6.3 3.6h4.4v4.1c0 1.6-1.1 2.6-2.2 3.1-1.1-.5-2.2-1.5-2.2-3.1z" fill="#005DA4" stroke="#ED1C24" stroke-width=".35"/><path d="M6.6 8.4l1.1-1.6.8 1 .8-1 1.1 1.6z" fill="#fff"/>', stripe: [['#fff', 1], ['#005DA4', 1], ['#ED1C24', 1]], accent: '#005DA4' },
  EE: { svg: h3('#0072CE', '#000', '#fff'), stripe: [['#0072CE', 1], ['#000', 1], ['#fff', 1]], accent: '#0072CE' },
  FR: { svg: v3('#0055A4', '#fff', '#EF4135'), stripe: [['#0055A4', 1], ['#fff', 1], ['#EF4135', 1]], accent: '#0055A4' },
  NL: { svg: h3('#AE1C28', '#fff', '#21468B'), stripe: [['#AE1C28', 1], ['#fff', 1], ['#21468B', 1]], accent: '#AE1C28' },
  IE: { svg: v3('#169B62', '#fff', '#FF883E'), stripe: [['#169B62', 1], ['#fff', 1], ['#FF883E', 1]], accent: '#169B62' },
  HU: { svg: h3('#CE2939', '#fff', '#477050'), stripe: [['#CE2939', 1], ['#fff', 1], ['#477050', 1]], accent: '#CE2939' },
  BE: { svg: v3('#000', '#FDDA24', '#EF3340'), stripe: [['#000', 1], ['#FDDA24', 1], ['#EF3340', 1]], accent: '#EF3340' },
  BG: { svg: h3('#fff', '#00966E', '#D62612'), stripe: [['#fff', 1], ['#00966E', 1], ['#D62612', 1]], accent: '#00966E' },
  HR: { svg: h3('#FF0000', '#fff', '#171796') + croatiaShield(), stripe: [['#FF0000', 1], ['#fff', 1], ['#171796', 1]], accent: '#171796' },
  CY: { svg: '<rect width="30" height="20" fill="#fff"/><path d="M7.5 9.6l3.2-2 3.8.5 3.1-1.5 3.6-.9 1.6.7-2.1 1.8-2.6 1.7-3 .5-2.6.8-3.1-.3z" fill="#D57800"/><path d="M11.2 13.6c2.4 1.7 5.2 1.7 7.6 0" fill="none" stroke="#4E5B31" stroke-width="1" stroke-linecap="round"/>', stripe: [['#fff', 1], ['#D57800', 1], ['#4E5B31', 1]], accent: '#D57800' },
  IT: { svg: v3('#009246', '#fff', '#CE2B37'), stripe: [['#009246', 1], ['#fff', 1], ['#CE2B37', 1]], accent: '#009246' },
  LV: { svg: '<rect width="30" height="20" fill="#9E3039"/><rect y="8" width="30" height="4" fill="#fff"/>', stripe: [['#9E3039', 2], ['#fff', 1], ['#9E3039', 2]], accent: '#9E3039' },
  LT: { svg: h3('#FDB913', '#006A44', '#C1272D'), stripe: [['#FDB913', 1], ['#006A44', 1], ['#C1272D', 1]], accent: '#006A44' },
  LU: { svg: h3('#EF3340', '#fff', '#00A3E0'), stripe: [['#EF3340', 1], ['#fff', 1], ['#00A3E0', 1]], accent: '#00A3E0' },
  MT: { svg: '<rect width="30" height="20" fill="#CF142B"/><rect width="15" height="20" fill="#fff"/><rect x="2" y="2" width="4" height="4" fill="#C9C9C9" stroke="#CF142B" stroke-width=".35"/><path d="M3.6 2.6h.8v2.8h-.8zM2.6 3.6h2.8v.8H2.6z" fill="#9b9b9b"/>', stripe: [['#fff', 1], ['#CF142B', 1]], accent: '#CF142B' },
  PT: { svg: '<rect width="30" height="20" fill="#FF0000"/><rect width="12" height="20" fill="#006600"/><circle cx="12" cy="10" r="3.8" fill="#FFE900"/><path d="M10.4 8.2h3.2v2.6c0 1-.8 1.7-1.6 2-.8-.3-1.6-1-1.6-2z" fill="#fff" stroke="#FF0000" stroke-width=".5"/>', stripe: [['#006600', 2], ['#FFE900', .5], ['#FF0000', 3]], accent: '#006600' },
  RO: { svg: v3('#002B7F', '#FCD116', '#CE1126'), stripe: [['#002B7F', 1], ['#FCD116', 1], ['#CE1126', 1]], accent: '#002B7F' },
  SK: { svg: h3('#fff', '#0B4EA2', '#EE1C25') + '<path d="M6.2 4h7v6c0 2.6-1.8 4.2-3.5 4.9-1.7-.7-3.5-2.3-3.5-4.9z" fill="#EE1C25" stroke="#fff" stroke-width=".6"/><path d="M9.25 5.4h.9v6.6h-.9zM7.8 7h3.8v.8H7.8zM7.3 8.7h4.8v.8H7.3z" fill="#fff"/><path d="M6.7 12.2c.9-.9 1.9-.9 2.95-.3 1.1-.6 2.1-.6 3.05.3-.6 1.3-1.8 2.2-3 2.6-1.2-.4-2.4-1.3-3-2.6z" fill="#0B4EA2"/>', stripe: [['#fff', 1], ['#0B4EA2', 1], ['#EE1C25', 1]], accent: '#0B4EA2' },
  ES: { svg: '<rect width="30" height="20" fill="#AA151B"/><rect y="5" width="30" height="10" fill="#F1BF00"/>', stripe: [['#AA151B', 1], ['#F1BF00', 2], ['#AA151B', 1]], accent: '#AA151B' },
  CH: { svg: '<rect width="30" height="20" fill="#DA291C"/><rect x="13" y="4" width="4" height="12" fill="#fff"/><rect x="9" y="8" width="12" height="4" fill="#fff"/>', stripe: [['#DA291C', 1], ['#fff', .6], ['#DA291C', 1]], accent: '#DA291C' },
  LI: { svg: h2('#002B7F', '#CE1126') + '<path d="M5.4 7.2h4.2l.45-2.7-1.25 1-.95-1.7-.95 1.7-1.25-1z" fill="#FFD83D" stroke="#1a1a1a" stroke-width=".2"/>', stripe: [['#002B7F', 1], ['#CE1126', 1]], accent: '#002B7F' },
};

export const flagSvg = (code) => {
  const f = FLAGS[code];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${f ? f.svg : '<rect width="30" height="20" fill="#003399"/>'}</svg>`;
};

const dataUri = (svg) => `url("data:image/svg+xml,${svg.replace(/"/g, "'").replace(/#/g, '%23').replace(/</g, '%3C').replace(/>/g, '%3E')}")`;

export const stripeGradient = (code) => {
  const f = FLAGS[code];
  if (!f) return 'linear-gradient(90deg,#003399,#003399)';
  const total = f.stripe.reduce((s, [, w]) => s + w, 0);
  let acc = 0;
  const stops = f.stripe.map(([c, w]) => {
    const from = (acc / total) * 100; acc += w; const to = (acc / total) * 100;
    return `${c} ${from.toFixed(2)}% ${to.toFixed(2)}%`;
  });
  return `linear-gradient(90deg,${stops.join(',')})`;
};

/* Build the flags stylesheet: one `.cf-XX` rule per country. */
export function flagsCss() {
  return '/* generated by scripts/build.mjs from scripts/flags.mjs — do not edit */\n' +
    Object.entries(FLAGS).map(([code, f]) =>
      `.cf-${code}{--flag:${dataUri(flagSvg(code))};--stripe:${stripeGradient(code)};--fa:${f.accent}}`
    ).join('\n') + '\n';
}

/* Small flag element; size = 'sm' | 'md' | 'lg' | 'xl'. */
export const flagIcon = (code, size = 'md', label = '') =>
  `<span class="flag-ico fi-${size} cf-${code}"${label ? ` role="img" aria-label="${label}"` : ' aria-hidden="true"'}></span>`;
