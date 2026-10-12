import fs from 'node:fs';
const f=new URL('../../data/universities.json',import.meta.url);const u=JSON.parse(fs.readFileSync(f,'utf8'));
const W='winter semester 2026/27';
const DE={ // slug: [amount per semester, note, url]
'clausthal-university-of-technology':[242,'current amount','https://www.tu-clausthal.de/studierende/studierendensekretariat/semesterbeitrag'],
'hamburg-university-of-technology-tuhh':[400,W,'https://www.tuhh.de/tuhh/studium/im-studium/rund-um-den-studierendenstatus/finanzierung/kosten/semesterbeitrag'],
'hamm-lippstadt-university-of-applied-sciences':[362.80,W,'https://www.hshl.de/studieren/erstsemester/bafoeg-semesterbeitrag-ticket'],
'hochschule-bremen-city-university-of-applied-sciences':[442.40,W,'https://www.hs-bremen.de/studieren/im-studium/formale-angelegenheiten/'],
'johannes-gutenberg-university-mainz':[366.90,W+', Mainz campus','https://www.studium.uni-mainz.de/mein-studium/studienorganisation/rueckmeldung/'],
'kiel-university':[403.00,W,'https://www.studium.uni-kiel.de/de/studium-organisieren/studienangelegenheiten/rueckmeldung'],
'leibniz-university-hannover':[453.16,W,'https://www.uni-hannover.de/studium/im-studium/studienorganisation/rueckmeldung'],
'leipzig-university':[332.30,W,'https://www.uni-leipzig.de/studium/im-studium/studienorganisation/rueckmeldung-und-semesterbeitrag'],
'leuphana-university-luneburg':[484.24,'current amount: €150 Studierendenwerk + €75 administration + €259.24 student body incl. semester ticket','https://www.leuphana.de/college/studium/kosten.html'],
'martin-luther-university-halle-wittenberg':[333.30,W,'https://immaamt.verwaltung.uni-halle.de/studium/rueckmeldung/'],
'osnabruck-university':[459.30,W,'https://www.uni-osnabrueck.de/studieren/organisation-des-studiums/rueckmeldung'],
'paderborn-university':[351.15,W,'https://www.uni-paderborn.de/zv/3-3/studienorganisation/rueckmeldung-und-gebuehren'],
'rptu-kaiserslautern-landau':[162.50,W,'https://rptu.de/studium/im-studium/studienorganisation/rueckmeldung'],
'saarland-university':[412.30,W+', incl. semester ticket','https://www.uni-saarland.de/studium/organisation/beitraege/semesterbeitrag.html'],
'th-koln-university-of-applied-sciences':[352.70,W,'https://www.th-koeln.de/studium/beitraege-und-gebuehren_5343.php'],
'tu-bergakademie-freiberg':[107.00,'current amount','https://tu-freiberg.de/studium/im-studium/studienorganisation/rueckmeldung-zum-studium'],
'tu-braunschweig':[472.50,W,'https://www.tu-braunschweig.de/i-amt/newsaktuelles/details/semesterbeitrag-wintersemester-2026-27'],
'tu-chemnitz':[341.40,W,'https://www.tu-chemnitz.de/studierendenservice/studserv/sembeitrag.php'],
'ulm-university':[192.00,W,'https://www.uni-ulm.de/studium/studienorganisation/studiengebuehren/'],
'university-of-augsburg':[181.95,W,'http://www.uni-augsburg.de/de/studium/organisation-beratung/organisation-und-formales/semesterbeitrage/'],
'university-of-bayreuth':[172.00,W,'https://www.studierendenkanzlei.uni-bayreuth.de/de/studierende/semesterbeitrag/'],
'university-of-hohenheim':[174.50,W,'https://www.uni-hohenheim.de/rueckmeldung'],
'university-of-lubeck':[400.60,W,'https://www2.uni-luebeck.de/studium/studiumsorganisation/studierenden-service-center/rueckmeldung/'],
'university-of-marburg':[424.80,W,'https://www.uni-marburg.de/de/studium/im-studium/formalitaeten/semesterbeitrag'],
'university-of-passau':[126.90,W,'https://www.uni-passau.de/studium/waehrend-des-studiums/rueckmeldung-co'],
'university-of-regensburg':[208.00,'current amount','https://www.uni-regensburg.de/studieren/im-studium/studienorganisation/rueckmeldung'],
'university-of-trier':[371.80,'current amount, incl. semester ticket','https://www.uni-trier.de/studium/im-studium/studienorganisation/rueckmeldung'],
'university-of-wurzburg':[182.10,W,'https://www.uni-wuerzburg.de/studium/studienangelegenheiten/beitraegeundgebuehren/'],
'heinrich-heine-university-dusseldorf':[371.15,W,'https://www.hhu.de/en/re-registration'],
'justus-liebig-university-gie-en':[421.43,W,'https://www.uni-giessen.de/de/org/admin/dez/b/dl/b5/studisek/semesterbeitrag'],
'rhine-waal-university-of-applied-sciences':[365.10,W,'https://www.hochschule-rhein-waal.de/studieren/rund-ums-studium/kosten-und-finanzierung/semesterbeitrag'],
'bielefeld-university':[351.65,W+', incl. semester ticket','https://www.uni-bielefeld.de/studium/studierende/studienorganisation/rueckmeldung/'],
'friedrich-schiller-university-jena':[333.05,W+' (€353.05 for new students incl. card)','https://www.uni-jena.de/575/semesterbeitrag'],
'goethe-university-frankfurt':[408.28,W+', incl. semester ticket','https://www.uni-frankfurt.de/de/studium/studienorganisation/studierendenservice/studium-weiterfuehren-beenden'],
'ruhr-university-bochum':[380.00,W+', incl. semester ticket','https://studium.ruhr-uni-bochum.de/de/rueckmeldung-und-sozialbeitrag'],
'tu-darmstadt':[402.68,W+', incl. semester ticket','https://www.tu-darmstadt.de/studieren/studieren_von_a_bis_z/artikel_details_de_en_286144.de.jsp'],
'university-of-kassel':[409.27,W+', incl. semester ticket','https://www.uni-kassel.de/uni/studium/im-studium/semesterbeitrag.html'],
'european-university-viadrina':[396.80,W+' (€402.80 for new students)','https://www.europa-uni.de/de/studium/im-studium/semesterbeitrag/index.html'],
'university-of-siegen':[393.80,'current amount','https://www.uni-siegen.de/semesterbeitrag'],
};
const PAGE={'anhalt-university-of-applied-sciences':'https://www.hs-anhalt.de/studieren/im-studium/formalitaeten/rueckmeldung.html','brandenburg-university-of-technology-cottbus-senftenberg':'https://www.b-tu.de/studium/im-studium/studienorganisation/formalia/rueckmeldung','frankfurt-university-of-applied-sciences':'https://www.frankfurt-university.de/de/studium/studienorganisation/semesterbeitrage','humboldt-university-of-berlin':'https://www.hu-berlin.de/studium/im-studium/studienorganisation/rueckmeldung','tu-dortmund':'https://www.tu-dortmund.de/studierende/im-studium/studienorganisation/rueckmeldung-und-semesterbeitrag','tu-ilmenau':'https://www.tu-ilmenau.de/studium/im-studium/studienverlauf/administrative-guide/beitraege-und-gebuehren','university-of-potsdam':'https://www.uni-potsdam.de/de/studium/konkret/studienorganisation/rueckmeldung','bauhaus-universitat-weimar':'https://www.uni-weimar.de/de/universitaet/studium/studienservices/studierendenbuero/semesterbeitrag','htw-berlin-university-of-applied-sciences':'https://www.htw-berlin.de/studium/studienorganisation/semesterbeitraege'};
let n=0,m=0;
for(const x of u){if(x.country_code!=='DE')continue;const add=(url)=>{if(!x.sources.some(s=>s.url===url))x.sources.push({label:`${x.name} — semester contribution`,url})};
 if(DE[x.slug]){const[a,note,url]=DE[x.slug];x.mandatory_semester_fee=`€${a.toFixed(2)} per semester (${note})`;x.est_annual_mandatory_cost_eur=Math.round(a*2);x.tuition_info_url ??= url;add(url);x.last_verified='2026-10-12';n++}
 else if(/typically|varies/.test(x.mandatory_semester_fee||'')){x.mandatory_semester_fee='Semester contribution applies (usually incl. Deutschland-Semesterticket €226.80); exact 2026/27 total not yet verified — see official fee page';if(PAGE[x.slug]){x.tuition_info_url ??= PAGE[x.slug];add(PAGE[x.slug])}m++}}
fs.writeFileSync(f,JSON.stringify(u,null,2)+'\n');console.log('verified',n,'still open',m);
