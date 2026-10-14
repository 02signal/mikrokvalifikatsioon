// EAP usutavuse valvur — kaitseb saidi MAHUVÄITEID mooduli-EAP vea eest.
//
// MIKS: HTM-i tähelepanek 08.10.2026: EMTA mikrokraadiprogramm "Muusikapsühholoogia"
// oli kirjas 3 EAP-ga, õige on 15. AMOS-i parser võttis arvu programmi sees oleva
// MOODULI kirjelduselt (filmimuusika moodul), mitte kogu programmi mahust. Saidi
// EHIS-i parandus ei rakendunud (nimi "Mikrokraadiprogramm: … 2026/2027" vs EHIS
// "Muusikapsühholoogia"; lisaks kaks sama nimega EHIS-i kirjet 14 ja 15 EAP-ga),
// seega vale väärtus avaldus vaikselt.
//
// REEGEL (TäKS): mikrokraad on 5–30 EAP. Väljaspool seda vahemikku olev või
// EHIS-iga vastuolus olev väärtus EI AVALDATA vaikselt: kirje saab märke
// "vajab kontrolli", EAP-d ei näidata (unknown = null, vt CLAUDE.md Catalog Data
// Rules) ja see jõuab aruandesse (scripts/eap-regression.mjs).
//
// Mikrokvalifikatsioon (mitte mikrokraad) võib olla lühem — vahemik kehtib
// ainult mikrokraadile ja kirjetele, mille credentialType on teadmata.
import type { EhisCurriculum } from "./ehisFacts/index.ts";

export const MICRODEGREE_MIN_EAP = 5;
export const MICRODEGREE_MAX_EAP = 30;

export type EapReviewReason = "alla-vahemiku" | "yle-vahemiku" | "ehis-konflikt";

export interface EapReview {
  /** Kirje vajab inimese kontrolli; EAP-d ei avaldata. */
  needsReview: true;
  reasons: EapReviewReason[];
  /** Väärtus, mida allikas (AMOS feed) väitis. */
  feedEap: number | null;
  /** EHIS-i vastuolulised kirjed (kood, registreeritud, EAP) — avalik avaandmete info. */
  ehisConflict: Array<{ kood: string; registeredAt: string | null; eap: number | null }>;
}

export function eapReviewFor(input: {
  credentialType?: string | null;
  /** EAP pärast EHIS-i ülekirjutust (või feedi oma, kui vastet pole). */
  ects: number | null;
  /** Feedi algne EAP. */
  feedEap: number | null;
  conflict?: EhisCurriculum[];
}): EapReview | null {
  const reasons: EapReviewReason[] = [];
  const appliesRange = input.credentialType == null || input.credentialType === "mikrokraad";
  if (appliesRange && input.ects != null) {
    if (input.ects < MICRODEGREE_MIN_EAP) reasons.push("alla-vahemiku");
    if (input.ects > MICRODEGREE_MAX_EAP) reasons.push("yle-vahemiku");
  }
  if (input.conflict?.length) reasons.push("ehis-konflikt");
  if (!reasons.length) return null;
  return {
    needsReview: true,
    reasons,
    feedEap: input.feedEap,
    ehisConflict: (input.conflict ?? []).map((c) => ({
      kood: c.ehis_kood,
      registeredAt: c.registered_at,
      eap: c.eap
    }))
  };
}
