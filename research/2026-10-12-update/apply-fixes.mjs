import fs from 'node:fs';
const P=(f)=>new URL(`../../data/${f}`,import.meta.url);
const rd=(f)=>JSON.parse(fs.readFileSync(P(f),'utf8')), wr=(f,d)=>fs.writeFileSync(P(f),JSON.stringify(d,null,2)+'\n');
const D='2026-10-12';
// global string replacements (France, Ireland, Austria ÖH)
const REP=[
 ["National rate: €178/year Bachelor's, €254/year Master's","National rate: €178/year Bachelor's, €255/year Master's (2026-2027)"],
 ["National tuition rates: €178/year Bachelor's, €254/year Master's (2025-2026).","National tuition rates: €178/year Bachelor's, €255/year Master's, €398/year PhD (2026-2027)."],
 ["€254 per year for a Master's","€255 per year for a Master's (2026-2027)"],
 ["≈ €254 per year (national rate).","≈ €255 per year (national rate, 2026-2027)."],
 ["Additional contributions such as the CVEC campus contribution (around €100–€175 per year) may apply","CVEC campus contribution €105 per year (2026-2027)"],
 ["CVEC campus contribution (approx. €100–€175 per year)","CVEC campus contribution €105 per year (2026-2027)"],
 ["Student contribution charge €2,500 (2025/26) if eligible","Student contribution €2,350 (2026/27, after Budget 2027 €150 cut) if eligible"],
 ["Student contribution charge of €2,500 for 2025/26 (may rise), payable by eligible students","Student contribution €2,350 for 2026/27 (after Budget 2027 €150 cut), payable by eligible students"],
 ["student contribution ≈ €2,500–€3,000/year","student contribution €2,350/year (2026/27)"],
 ["student contribution charge (€2,500 for 2025/26)","student contribution charge (€2,350 for 2026/27 after the Budget 2027 €150 cut)"],
 ["student contribution charge of €2,500 (2025/26)","student contribution charge of €2,350 (2026/27)"],
 ["Student contribution €2,500 (2025/26)","Student contribution €2,350 (2026/27)"],
 ["ÖH student union fee ≈ €25/semester","ÖH student union fee ≈ €26.20/semester (2026/27)"],
 ["ÖH students' union fee (approx. €24.70 per semester)","ÖH students' union fee (approx. €26.20 per semester, 2026/27)"],
 ["ÖH students' union fee of approximately €24.70 per","ÖH students' union fee of approximately €26.20 per"],
 ["ÖH students' union fee of approximately €24","ÖH students' union fee of approximately €26.20"],
 ["ÖH fee (approx. €24.70/semester)","ÖH fee (approx. €26.20/semester, 2026/27)"],
];
const fix=(v)=>{if(typeof v==='string'){for(const[a,b]of REP)v=v.split(a).join(b);return v}
 if(Array.isArray(v))return v.map(fix); if(v&&typeof v==='object'){for(const k in v)v[k]=fix(v[k]);return v} return v};
const IE_SRC={label:'Maynooth University — 2026/27 student contribution €2,350 (Budget 2027)',url:'https://www.maynoothuniversity.ie/student-fees-grants/undergraduate'};
const FR_SRC={label:"Service-Public.fr — frais d'inscription 2026-2027",url:'https://www.service-public.gouv.fr/particuliers/actualites/A17481'};
const AT_SRC={label:'FH Technikum Wien — ÖH fee €26.20 (2026/27)',url:'https://www.technikum-wien.at/studieninformationen/studienbeitrage-und-studienbeihilfen/'};
// German semester contributions, WS 2026/27 (official pages)
const DE={
 'fau-erlangen-n-rnberg':[82,'€82.00 per semester (Studierendenwerk contribution; semester ticket optional)','https://www.fau.de/studium/bewerbung-und-zulassung/alle-fristen-und-termine/'],
 'free-university-of-berlin':[376.80,'€376.80 per semester (new enrolment, winter semester 2026/27; incl. semester ticket)','https://www.fu-berlin.de/studium/studieren/studienorganisation/gebuehren/index.html'],
 'heidelberg-university':[189.80,'€189.80 per semester (winter semester 2026/27)','https://www.uni-heidelberg.de/de/studium/studienorganisation/beitraege-gebuehren'],
 'lmu-munich':[97,'€97.00 per semester (winter semester 2026/27; semester ticket optional)','https://www.lmu.de/de/workspace-fuer-studierende/1x1-des-studiums/rueckmeldung/'],
 'technical-university-of-munich':[97,'€97.00 per semester (Munich/Garching/Weihenstephan; semester ticket optional)','https://www.tum.de/studium/studienfinanzierung'],
 'tu-dresden':[361,'€361.00 per semester (winter semester 2026/27; incl. semester ticket)','https://tu-dresden.de/studium/im-studium/studienorganisation/rueckmeldung'],
 'university-of-cologne':[355.65,'€355.65 per semester (winter semester 2026/27; incl. semester ticket)','https://studsek.uni-koeln.de/studium/rueckmeldung__semesterbeitrag/uebersicht_semesterbeitraege_seit_dem_sommersemester_2015/index_ger.html'],
 'university-of-freiburg':[190,'€190.00 per semester (current amount)','https://uni-freiburg.de/studium/im-studium/semesterbeitrag-studiengebuehren/'],
 'university-of-mannheim':[194,'€194.00 per semester (autumn/winter semester 2026/27)','https://www.uni-mannheim.de/studium/im-studium/studienorganisation/beitraege-und-gebuehren/'],
 'university-of-stuttgart':[184,'€184.00 per semester (current amount)','https://uni-stuttgart.de/rueckmeldung'],
 'university-of-hamburg':[402,'€402.00 per semester (winter semester 2026/27; incl. semester ticket)','https://www.uni-hamburg.de/campuscenter/studienorganisation/studienverlauf/beitraege-gebuehren/semesterbeitrag.html'],
 'otto-von-guericke-university-magdeburg':[329.30,'€329.30 per semester (winter semester 2026/27)','https://www.ovgu.de/rueckmeldung.html'],
 'bonn-rhein-sieg-university-of-applied-sciences':[367,'€367.00 per semester (winter semester 2026/27)','https://www.h-brs.de/de/d5/gebuehren'],
};
// placeholder annual costs (300–400) that were never verified → clear rather than guess
const DE_UNVERIFIED={'karlsruhe-institute-of-technology':'Semester contribution incl. Studierendenwerk €92 + administration fee; total not yet verified','rwth-aachen-university':'Semester contribution incl. semester ticket; total for 2026/27 not yet verified','university-of-bonn':'Semester contribution incl. semester ticket (student body share €248.07 for 2026/27); total not yet verified','university-of-g-ttingen':'Semester contribution incl. semester ticket; total for 2026/27 not yet verified','technical-university-of-berlin':'€149.56 per semester excl. semester ticket (winter semester 2026/27); add semester ticket — verify total'};
const DE_UNV_SRC={'technical-university-of-berlin':'https://www.tu.berlin/studierendensekretariat/themen-a-z/semesterbeitraege','university-of-bonn':'https://sp.uni-bonn.de/dokumente/idx/Ordnungen/BO.html','university-of-g-ttingen':'https://www.uni-goettingen.de/de/40054.html','karlsruhe-institute-of-technology':'https://www.sle.kit.edu/imstudium/gebuehren.php'};
const log=[];
const unis=fix(rd('universities.json'));
for(const u of unis){
 const add=(s)=>{if(!u.sources.some(x=>x.url===s.url))u.sources.push(s)};
 if(u.country_code==='IE'){u.est_annual_mandatory_cost_eur=2350;add(IE_SRC);u.last_verified=D;log.push(`IE ${u.name}: €2,500→€2,350`)}
 if(u.country_code==='FR'&&u.est_annual_mandatory_cost_eur===400){u.est_annual_mandatory_cost_eur=360;add(FR_SRC);u.last_verified=D;log.push(`FR ${u.name}: Master €255, CVEC €105, est €360`)}
 if(u.country_code==='AT'&&u.est_annual_mandatory_cost_eur===50){u.est_annual_mandatory_cost_eur=52;add(AT_SRC);u.last_verified=D;log.push(`AT ${u.name}: ÖH €26.20`)}
 if(u.country_code==='DE'&&DE[u.slug]){const[s,t,url]=DE[u.slug];const old=u.est_annual_mandatory_cost_eur;u.mandatory_semester_fee=t;u.est_annual_mandatory_cost_eur=Math.round(s*2);u.tuition_info_url ??= url;add({label:`${u.name} — semester contribution`,url});u.last_verified=D;log.push(`DE ${u.name}: est ${old}→${u.est_annual_mandatory_cost_eur}`)}
 if(u.country_code==='DE'&&DE_UNVERIFIED[u.slug]){const old=u.est_annual_mandatory_cost_eur;u.mandatory_semester_fee=DE_UNVERIFIED[u.slug];u.est_annual_mandatory_cost_eur=null;if(DE_UNV_SRC[u.slug])add({label:`${u.name} — semester contribution`,url:DE_UNV_SRC[u.slug]});log.push(`DE ${u.name}: placeholder est ${old}→null (needs verification)`)}
}
wr('universities.json',unis);
const progs=fix(rd('programs.json'));wr('programs.json',progs);
const ctry=fix(rd('countries.json'));
for(const c of ctry){if(['IE','FR','AT'].includes(c.code))c.last_verified=D;}
wr('countries.json',ctry);
const src=rd('sources.json');const has=new Set(src.map(s=>s.url));
for(const s of [IE_SRC,FR_SRC,AT_SRC,{label:'Irish Times — Budget 2027 student contribution',url:'https://www.irishtimes.com/your-money/2026/10/06/students-set-for-lower-fees-as-budget-brings-increase-in-education-spending/'}])if(!has.has(s.url)){const t=src[0]?{...Object.fromEntries(Object.keys(src[0]).map(k=>[k,null]))}:{};src.push({...t,...s,title:s.label});}
wr('sources.json',src);
fs.writeFileSync(new URL('./changes.log',import.meta.url),log.join('\n')+'\n');console.log(log.length,'record fixes');
