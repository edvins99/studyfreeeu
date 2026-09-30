# DATA_SOURCES.md

Every major official source used to build and verify the database. Sources are
also stored programmatically in [`data/sources.json`](data/sources.json) and shown
on each university and country page.

**Priority of evidence (highest first):**

1. Official university websites (fee pages, admission pages)
2. Official national education portals (study-in-* portals, national agencies)
3. Ministries of education
4. Official EU education portals (European Commission)
5. Official admissions portals (uni-assist, CAO, Studyinfo, universityadmissions.se…)

Blogs, affiliate sites, SEO articles, Reddit threads and AI-generated summaries are
**not** accepted as primary evidence.

---

## Supranational / EU

| Source | URL | Used for |
|---|---|---|
| European Commission — Study in Europe, country profiles | https://education.ec.europa.eu/study-in-europe/country-profiles | Cross-country tuition and cost summaries; baseline for countries pending deeper verification |
| EURAXESS national networks | e.g. https://www.euraxess.hu/ | National grant and scholarship programmes |

## Country sources

### Germany
- **DAAD — Study in Germany** (`https://www.study-in-germany.de/`): public universities charge no tuition; €150–€400 semester contribution; Baden-Württemberg charges non-EU/EEA €1,500/semester.

### Austria
- **University of Vienna — Amount of the tuition fee / Students' Union fee** (`https://studieren.univie.ac.at/`): EU/EEA/CH rate, non-EU/EEA rate (€726.72/semester) and the conditional €363.36/semester rule after minimum duration + 2 semesters.

### Finland
- **Studyinfo (opintopolku.fi)**: EU/EEA/Swiss citizens are not subject to tuition fees.
- **Metropolia UAS**: confirms fees apply only to non-EU/EEA students in English-taught programmes.
- **Finnish Government (valtioneuvosto.fi)**: 2024 proposal context on non-EU fees/application fees.

### Sweden
- **universityadmissions.se — Who is required to pay fees?**: only EU/EEA/Swiss citizens and certain exempt categories do not pay fees.
- **Study in Sweden (studyinsweden.se)**: EU citizens exempt from application and tuition fees.

### Denmark
- **Study in Denmark (studyindenmark.dk) — Tuition Fees**: higher education free for EU/EEA/Swiss students.

### Norway *(other European country)*
- **NTNU — Tuition fees, Master's degrees in English** (`https://www.ntnu.edu/`): non-EU/EEA charged; EU/EEA exempt.
- **Study in Norway (studyinnorway.no)**: cost context.

### Iceland *(other European country)*
- **University of Iceland — University fees** (`https://english.hi.is/`): no tuition, annual registration fee only.
- **Study in Iceland (study.iceland.is)**: public universities have no tuition fees.

### Czechia
- **Study in Czechia (studyin.gov.cz)**: study free in Czech at public universities; 1,000+ English-taught programmes.
- **Charles University (`cuni.cz/UKEN-385.html`)**: English/German/French/Russian programmes carry tuition; Czech programmes are tuition-free.

### Poland
- **Study in Poland (study.gov.pl)**: English-taught tuition typically €2,000–€6,000/year.
- **EU Education portal — Poland**: fee ranges.

### Slovenia
- **University of Ljubljana (`uni-lj.si`)**: no tuition for full-time bachelor's and master's studies for eligible students.
- **Study in Slovenia (studyinslovenia.si)**: fee ranges for fee-paying programmes.

### Estonia
- **Study in Estonia (studyinestonia.ee)**: English-taught master's programmes, fees and admission.

### France
- **EU Education portal — France**: national rates €178/year Bachelor's, €254/year Master's (2025-2026).
- **service-public.gouv.fr**: differentiated (higher) rates for certain non-EU students.

### Netherlands
- **Study in NL (studyinnl.org)**: statutory fee €2,694 for 2026-2027 (EU/EEA).
- **University of Amsterdam (`uva.nl`)**: statutory vs institutional fee.

### Ireland
- **Higher Education Authority (hea.ie)** — Free Fees Initiative: eligible students pay a €2,500 student contribution (2025/26).
- **Citizens Information (citizensinformation.ie)**: EU fee-rate eligibility conditions.

### Hungary
- **Corvinus University of Budapest (`uni-corvinus.hu`)**: tuition-free education and scholarships.
- **EURAXESS Hungary**: national grant/scholarship programmes.

### Countries pending deeper source-level verification
Belgium, Bulgaria, Croatia, Cyprus, Italy, Latvia, Lithuania, Luxembourg, Malta,
Portugal, Romania, Slovakia, Spain, Switzerland, Liechtenstein currently carry a
country-level policy summary derived from the EU education portal family and are
marked **Needs Verification** in the dataset. Their specific fees/deadline fields
are intentionally left as *Not yet verified*.

---

## How conflicts are handled

If two official sources conflict (common when a national portal lags behind a
university's own page):

1. Both sources are retained.
2. The conflict is described in the record's `notes`.
3. The **safer** interpretation is shown to the user (e.g. the higher mandatory
   cost, or "Needs Verification").

## Verification cadence

- Every record carries `last_verified` (a date) and `verification_status`.
- Records older than **6 months** are flagged for re-verification; older than
  **12 months** are escalated. The Admin console highlights both bands.
- Tuition is versioned by **academic year**, so a new year can be added without
  rebuilding the system.
