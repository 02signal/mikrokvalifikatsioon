import {
  ehisAttribution,
  ehisCurricula,
  ehisFetchedAt,
  ehisFieldStats,
  ehisLicence,
  ehisProgrammeCount,
  ehisProviderCount,
  ehisProviderStats,
  ehisProviderTypeStats,
  ehisPublisher
} from "../data/ehisFacts/index.ts";

export async function GET() {
  const payload = {
    site: "Mikrokvalifikatsioon.ee",
    description:
      "EHIS ametlik mikrokvalifikatsiooni õppekavade faktikiht: kõik avalikus EHIS snapshotis olevad registreeritud õppekavad, pakkujad, mahud, valdkonnad ja õpiväljundid. See täiendab õppijale võrreldavat kasutajakataloogi catalog.json.",
    source: "EHIS",
    publisher: ehisPublisher,
    attribution: ehisAttribution,
    licence: ehisLicence,
    fetchedAt: ehisFetchedAt,
    count: ehisProgrammeCount,
    providerCount: ehisProviderCount,
    providerTypes: ehisProviderTypeStats,
    providers: ehisProviderStats,
    fields: ehisFieldStats,
    importantCaveat:
      "See on ametlikest EHIS avaandmetest koostatud faktikiht, mitte õppijale võrreldav turundus- ja kasutuskataloog. Hinna, vastuvõtuaja ja kooli kirjeldava müügiteksti jaoks kasuta catalog.json kirjeid või kooli ametlikku lehte.",
    curricula: ehisCurricula.map((entry) => ({
      ehisKood: entry.ehis_kood,
      providerRegistryCode: entry.registrikood,
      provider: entry.provider,
      providerType: entry.provider_type,
      nameEt: entry.name_et,
      nameEn: entry.name_en,
      curriculumType: entry.curriculum_type,
      eap: entry.eap,
      fieldCode: entry.field_code,
      fieldName: entry.field_name,
      studyDirection: entry.study_direction,
      languages: entry.languages,
      outcomes: entry.outcomes,
      status: entry.status,
      registeredAt: entry.registered_at,
      updatedAt: entry.updated_at,
      officialPdfUrl: entry.official_pdf_url
    }))
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}
