// Rahastuse ja sihtrühma tuletamine kataloogi kirjest.
//
// Omaniku otsus 2026-06-25: meie ENDA turunduskeeles ei kasuta sõna "tasuta".
// AGA kooli FAKTILINE rahastuspakkumine (nt "sihtrühmale tasuta") kuvatakse
// lubatud kontekstis: STRUKTUREERITUD, ATRIBUEERITUD objektina, kus on kirjas
// nii sihtrühm kui ka rahastuse selgitus — sest see on kooli enda faktiline
// pakkumine ja kasutaja peab teadma, kas TEMA kvalifitseerub rahastusele.
//
// Deterministlik parsimine: loeme ainult `entry.priceText` (ja sihtrühma jaoks
// vihjet `entry.intakeText`/`entry.summary`). Kui midagi ei parsi, tagastame
// minimaalse objekti (ainult `schoolWording`/`basePrice`).

import type { CatalogEntry } from "../catalogSchema";

export type FundingInfo = {
  /** € hind üldsihtrühmale, nt "1 200 €"; null kui hinda pole / on rahastatud */
  basePrice: string | null;
  /** true, kui tekst ütleb, et sihtrühmale on rahastatud / tasuta */
  targetGroupFunded: boolean;
  /** rahastuse allikas, nt "Euroopa Liidu kaasrahastus", "Õpetajate akadeemia" */
  fundingSource: string | null;
  /** kes kvalifitseerub — tuletatud priceText/intakeText põhjal */
  eligibleGroup: string | null;
  /** kooli ENDA originaalne priceText — kuvatakse sõna-sõnalt + atribueeritult.
   *  Siin esineb "tasuta" legitiimselt, kooli faktilise terminina. */
  schoolWording: string | null;
};

/** Esimene € hind tekstist, nt "1 200 €" või "1 175–1 305 €". Säilitab originaalse
 *  vormingu (tühikud, vahemikud). Tagastab null, kui numbrilist hinda pole. */
function extractBasePrice(text: string): string | null {
  // Otsi numbri(d) + valuutamärk; lubame vahemiku (–/-), tühikud tuhandetes,
  // ja valikulise "+ km" / "(sh km)" sabaosa, kui see hinna kõrval seisab.
  const m = text.match(/\d[\d\s]*(?:[–-]\s*\d[\d\s]*)?\s*€(?:\s*\+\s*km)?/);
  if (!m) return null;
  // Normaliseeri sisemised mitmiktühikud üheks; ära puutu vahemiku struktuuri.
  return m[0].replace(/\s+/g, " ").trim();
}

/** Rahastuse allikas priceText-i (ja vajadusel intakeText-i) põhjal. */
function detectFundingSource(price: string, intake: string): string | null {
  const hay = `${price} ${intake}`;
  if (/EL-?i?\s*kaasrahastus|euroopa\s+liidu/i.test(hay)) return "Euroopa Liidu kaasrahastus";
  if (/õpetajate\s+akadeemia/i.test(hay)) return "Õpetajate akadeemia";
  return null;
}

/** Sihtrühm — kes kvalifitseerub. Tuletame deterministlikult priceText-ist ja
 *  intakeText-ist; eelistame intakeText-i "sihtrühm …" fraasi, mis on täpsem.
 *  Sihtrühma-fraas lõigatakse intakeText-i sees järgmise ";"-ni (mitte summary'sse). */
function detectEligibleGroup(price: string, intake: string, summary: string): string | null {
  // 1) intakeText "sihtrühm <…>" — kõige täpsem; piiratud järgmise ";"-ga.
  const intakeMatch = intake.match(/sihtrühm\s+([^;]+)/i);
  if (intakeMatch) {
    const g = intakeMatch[1].trim().replace(/[.,\s]+$/, "");
    if (g) return g;
  }
  // 2) priceText "õpetajate akadeemia sihtrühm(ale)" — kooli faktiline sihtrühm.
  if (/õpetajate\s+akadeemia/i.test(price)) return "õpetajate akadeemia sihtrühm";
  // 3) intakeText/summary "õpetaja(te)" mainimine — üldine õpetaja-sihtrühm.
  if (/\bõpetaja/i.test(`${intake} ${summary}`)) return "koolis töötavad õpetajad";
  return null;
}

/**
 * Tuleta kirjest struktureeritud rahastuse/sihtrühma info.
 * Deterministlik: loeb `entry.priceText` (+ sihtrühma vihjeks `intakeText`/`summary`).
 */
export function fundingInfoFor(entry: CatalogEntry): FundingInfo {
  const priceText = entry.priceText?.trim() || null;
  const intake = entry.intakeText?.trim() || "";
  const summary = entry.summary?.trim() || "";

  if (!priceText) {
    return {
      basePrice: null,
      targetGroupFunded: false,
      fundingSource: null,
      eligibleGroup: null,
      schoolWording: null
    };
  }

  const basePrice = extractBasePrice(priceText);

  // "Rahastatud sihtrühmale": tekst sisaldab "tasuta" VÕI selget kaasrahastust.
  // Bare "Tasuta"/"tasuta" (ilma € hinnata) = täisrahastatud sihtrühmale.
  const mentionsFree = /tasuta/i.test(priceText);
  const mentionsCofunding = /kaasrahastus|EL-?i?\b|euroopa\s+liidu/i.test(priceText);
  const targetGroupFunded = mentionsFree || mentionsCofunding;

  const fundingSource = targetGroupFunded
    ? detectFundingSource(priceText, intake)
    : null;

  const eligibleGroup = targetGroupFunded
    ? detectEligibleGroup(priceText, intake, summary)
    : null;

  return {
    basePrice,
    targetGroupFunded,
    fundingSource,
    eligibleGroup,
    schoolWording: priceText
  };
}

/** Kas kirjel on midagi rahastuse-tabelisse kuvada (väldib tühja sektsiooni). */
export function hasFundingInfo(info: FundingInfo): boolean {
  return info.targetGroupFunded || !!info.fundingSource || !!info.eligibleGroup;
}
