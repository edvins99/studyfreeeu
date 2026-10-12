// Round 3: fill tuition_info_url + application_deadlines/platform gaps. Usage: node apply-links-deadlines.mjs [--apply]
import fs from 'fs';
const P='data/universities.json'; const U=JSON.parse(fs.readFileSync(P,'utf8'));
const links=fs.readFileSync('research/2026-10-12-update/links.txt','utf8').trim().split('\n');
const manual={'business-academy-aarhus-eaaa':'https://baaa.dk/student-experience/practical-matters/tuition-fees/',
 'det-kongelige-akademi-royal-danish-academy':'https://royaldanishacademy.com/en/tuitionfee',
 'hof-university-of-applied-sciences':'https://www.hof-university.com/studying-at-hof-university/preparing-your-stay/how-to-finance-your-studies.html',
 'rotterdam-university-of-applied-sciences':'https://www.rotterdamuas.com/study-information/finance/tuition-fee/',
 'the-hague-university-of-applied-sciences':'https://www.thuas.com/study-choice/applications-finances-and-moving-here/tuition-fees',
 'taltech':'https://taltech.ee/en/tuition-fee-rates',
 'university-of-bremen':'https://www.uni-bremen.de/studium/starten-studieren/formalitaeten/rueckmeldung-und-semesterbeitrag',
 'university-of-duisburg-essen':'https://www.uni-due.de/studierendensekretariat/sozial_studierendenschaftsbeitrag.shtml',
 'university-of-konstanz':'https://www.uni-konstanz.de/studieren/rund-ums-studium/finanzen/gebuehren-und-beitraege/gesamtueberblick',
 'university-of-munster':'https://www.uni-muenster.de/studieninteressierte/en/einschreibung/semesterbeitrag.shtml',
 'babes-bolyai-university':'https://www.ubbcluj.ro/en/taxe/taxe_de_scolarizare',
 'university-of-nova-gorica':'https://www.ung.si/en/admissions'};
const N={
 SE:{d:'15 January 2027 (autumn 2027 intake, national round); spring intake ≈ mid-August — check programme page',p:'universityadmissions.se (national joint application)',s:['University Admissions in Sweden — key dates autumn 2027','https://www.universityadmissions.se/en/key-dates-and-deadlines/autumn-semester-dates']},
 FI:{d:'English-taught programmes: joint application 7–21 January 2027 (autumn 2027 intake); some programmes use separate rounds',p:'Studyinfo (opintopolku.fi)',s:['Studyinfo — joint application to higher education','https://opintopolku.fi/konfo/en/sivu/how-to-apply-in-joint-application-to-higher-education']},
 DK:{d:'Bachelor: 15 March 12:00 CET via optagelse.dk (quota 2 / international applicants); Master: deadline set by the institution',p:'optagelse.dk (Bachelor) / institution portal (Master)',s:['Study in Denmark — how to apply','https://studyindenmark.dk/study-options/how-to-apply']},
 NL:{d:'Via Studielink: 15 January for numerus fixus programmes; 1 May for most other Bachelor programmes (EU/EEA) — institutions may set earlier dates',p:'Studielink',s:['Study in NL — how to apply','https://www.studyinnl.org/plan-your-stay/how-to-apply']},
 NO:{d:'Undergraduate (EU/EEA): 15 April via NUCAS (Samordna opptak); Master: deadline set by the institution',p:'Samordna opptak / NUCAS (undergraduate) / institution portal (Master)',s:['Samordna opptak — English information','https://www.samordnaopptak.no/english']},
 IE:{d:'Undergraduate via CAO: 1 February 17:00 (normal closing date); postgraduate deadlines set by the institution',p:'CAO (undergraduate) / direct (postgraduate)',s:['CAO — important dates','https://www.cao.ie/index.php?bb=importantdates&page=timetableevents']},
 AT:{d:'General admission deadline: 5 September (winter semester) / 5 February (summer semester); programmes with entrance procedures have earlier dates',p:'Direct university online application portal',s:['Study in Austria — application and admission','https://studyinaustria.at/en/plan-your-studies/application-and-admission']}};
const log=[];let nT=0,nD=0;
const root=h=>h.replace(/^www\./,'');
for(const u of U){let ch=false;
 if(!u.tuition_info_url){let url=manual[u.slug];
  if(!url&&u.official_website){const r=root(new URL(u.official_website).hostname);url=links.find(l=>{const h=new URL(l).hostname;return h===r||h.endsWith('.'+r)});}
  if(url){u.tuition_info_url=url;if(!u.sources.some(s=>s.url===url))u.sources.push({label:`${u.name} — tuition / fees (official)`,url});nT++;ch=true;log.push(`tuition_url ${u.slug} ${url}`);}}
 const n=N[u.country_code];
 if(n&&!u.application_deadlines&&!(u.country_code==='AT'&&/^fh-/.test(u.slug))){u.application_deadlines=n.d;if(!u.application_platform)u.application_platform=n.p;
  if(!u.sources.some(s=>s.url===n.s[1]))u.sources.push({label:n.s[0],url:n.s[1]});nD++;ch=true;log.push(`deadline ${u.slug}`);}
 if(ch)u.last_verified='2026-10-12';}
console.log('tuition urls',nT,'deadlines',nD);
if(process.argv.includes('--apply')){fs.writeFileSync(P,JSON.stringify(U,null,2)+'\n');fs.appendFileSync('research/2026-10-12-update/changes.log','\n# Round 3\n'+log.join('\n')+'\n');console.log('written');}
