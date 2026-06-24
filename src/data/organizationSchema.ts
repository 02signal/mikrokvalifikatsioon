// Üks jagatud Organization/EducationalOrganization JSON-LD sõlm kogu saidi jaoks.
// Kasutatakse @id-viitamiseks (publisher, provider) ja annab Article rich resultsile
// nõutava publisher.logo. Ainult tõesed, omandis olevad väljad — ära lisa väljamõeldud
// sameAs/registrikoodi.
export const SITE = "https://mikrokvalifikatsioon.ee";

export const ORGANIZATION_ID = `${SITE}/#organization`;

export const organization = {
  "@type": ["EducationalOrganization", "Organization"],
  "@id": ORGANIZATION_ID,
  name: "Mikrokvalifikatsioon.ee",
  legalName: "Ettevõtluskeskus OÜ",
  url: `${SITE}/`,
  inLanguage: "et",
  description:
    "Sõltumatu Eesti mikrokvalifikatsioonide ja mikrokraadide register — valdkond, maht, hind ja rahastus ühes kohas.",
  logo: {
    "@type": "ImageObject",
    url: `${SITE}/logo-square.png`,
    width: 512,
    height: 512
  }
} as const;

/** Lühike publisher-viide (@id), kui täisorganisatsioon on juba graafis. */
export const publisherRef = { "@id": ORGANIZATION_ID } as const;
