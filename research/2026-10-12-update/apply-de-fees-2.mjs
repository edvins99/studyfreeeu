import fs from 'node:fs';
const f=new URL('../../data/universities.json',import.meta.url);const u=JSON.parse(fs.readFileSync(f,'utf8'));
const W='winter semester 2026/27';
const DE={ // slug: [amount per semester, note, url]
'bauhaus-universitat-weimar':[338.20,W+' (+€20 one-off thoska card for new students)','https://www.uni-weimar.de/de/universitaet/studium/studienservices/studierendenbuero/semesterbeitrag/'],
'brandenburg-university-of-technology-cottbus-senftenberg':[391.80,W+', incl. semester ticket','https://www.b-tu.de/studium/im-studium/studienorganisation/formalia/semestergebuehr'],
'frankfurt-university-of-applied-sciences':[406.78,W+', incl. semester ticket (€416.78 for new students)','https://www.frankfurt-university.de/de/studium/studienorganisation/semesterbeitrage'],
'htw-berlin-university-of-applied-sciences':[375.30,W+', incl. semester ticket','https://www.htw-berlin.de/studium/studienorganisation/semesterbeitraege'],
'technical-university-of-berlin':[376.36,W+': €149.56 + Deutschland-Semesterticket €226.80','https://www.tu.berlin/studierendensekretariat/themen-a-z/semesterbeitraege'],
'university-of-g-ttingen':[484.18,W+', incl. semester ticket','https://www.uni-goettingen.de/de/40054.html'],
'university-of-potsdam':[372.80,W+', incl. semester ticket','https://www.uni-potsdam.de/de/studium/konkret/studienorganisation/rueckmeldung'],
'university-of-bonn':[363.07,W+', incl. semester ticket','https://www.uni-bonn.de/de/studium/bewerbung-zulassung-und-einschreibung/kosten'],
'tu-dortmund':[339.70,W+', incl. semester ticket','https://www.tu-dortmund.de/storages/tu_website/Dezernat_4/Dez._4.2/Vordrucke/Im_Studium/WiSe26Merkblatt.pdf'],
'karlsruhe-institute-of-technology':[184.00,'current amount: €80 administration + €92 Studierendenwerk + €12 student body; semester ticket optional','https://www.sle.kit.edu/imstudium/gebuehren.php'],
'university-of-oldenburg':[457.90,W+', incl. semester ticket','https://uol.de/en/students/fees/semester-contribution'],
'deggendorf-institute-of-technology':[82.00,W+': Studierendenwerk contribution (EU citizens; €500 service fee applies only to some non-EU students)','https://www.th-deg.de/Studierende/Antraege-und-Organisatorisches/Rueckmeldung/Bekanntmachung_Rueckmeldung_DE.pdf'],
'technische-hochschule-ingolstadt':[82.00,W+': Studierendenwerk contribution (EU/EEA; non-EU €800–1,200 tuition)','https://www.thi.de/studium/studienfinanzierung/'],
'hof-university-of-applied-sciences':[148.22,W+': €87 Studierendenwerk + €61.22 semester ticket','https://www.hof-university.de/studium/services-fuer-studierende/studienbuero.html'],
'university-of-bamberg':[123.22,W+': €70 Studierendenwerk + €53.22 semester ticket','https://www.uni-bamberg.de/studium/im-studium/studienorganisation/rueckmeldung'],
'university-of-greifswald':[127.00,'current re-registration amount (student body + Studierendenwerk + fee)','https://www.uni-greifswald.de/studium/waehrend-des-studiums/rueckmeldung/'],
'humboldt-university-of-berlin':[381.80,W+': ≈ €50 administration + €12 student body + €85 Studierendenwerk + €226.80 ticket + €8 solidarity — confirm on page','https://www.hu-berlin.de/studium/im-studium/studienorganisation/rueckmeldung'],
};
let n=0;
for(const x of u){if(!DE[x.slug])continue;const[a,note,url]=DE[x.slug];
 x.mandatory_semester_fee=`€${a.toFixed(2)} per semester (${note})`;x.est_annual_mandatory_cost_eur=Math.round(a*2);x.tuition_info_url ??= url;
 if(!x.sources.some(s=>s.url===url))x.sources.push({label:`${x.name} — semester contribution`,url});x.last_verified='2026-10-12';n++}
fs.writeFileSync(f,JSON.stringify(u,null,2)+'\n');console.log('verified',n,'of',Object.keys(DE).length);
