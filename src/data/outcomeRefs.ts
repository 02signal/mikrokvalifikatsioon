// OPK-S4 — KATALOOGI ÕPIVÄLJUNDI -> SERVERI-VIIDE SILD (build-ajal arvutatud).
//
// MIKS SEE FAIL OLEMAS ON:
//   Konto-vaade (ja AMOS-i feed) peavad ühe paketi õpiväljundi TEKSTI järgi
//   leidma sellele vastava püsiva serveri-viite (`out_<24 hex>`). Tekst on
//   inimkeelne ja jääb kliendi poolele (NIMI/sõnastus ei lahku brauserist);
//   `outcome_ref` on aga MITTE-ISIKUANDMELINE läbipaistmatu pide (opaque handle)
//   — see ei sisalda isikuandmeid ega õpiväljundi sõnastust, vaid on lihtsalt
//   stabiilne identiteet, mille üle server ja klient saavad kokku leppida.
//   Nii saadab konto-pakett serverile AINULT viited, mitte teksti, ja AMOS-i
//   pool näeb sama kaarti.
//
// AINUS TÕEALLIKAS:
//   Kaart ehitatakse ÜKS KORD mooduli laadimisel `catalog`-ist. Sama kaarti
//   jagavad konto-vaade ja AMOS-i feed — ükski pool ei arvuta viiteid uuesti.
//   `outcome-ref.ts` (kõrvalmoodul) annab iga teksti jaoks deterministliku
//   `skillTag` + `outcome_ref` (ilma Date/juhuslikkuseta), nii et build on
//   korratav ja viide ei "liigu" järgmisel ehitusel.
//
// DEDUP:
//   Õpiväljundeid dedubleerime TÄPSELT nii nagu /oskused/ leht: `raw.trim()`,
//   tühi vahele, võti = `text.toLowerCase()`, esimesena nähtud tekst võidab.
//   Kaardi VÕTI on seesama dedup-võti (väiketäheline trimmitud tekst), nii et
//   /oskused/ ja see sild kasutavad sama identiteeti.

import { catalog } from "./catalog/index.ts";
import { cleanOutcomeTexts } from "./outcomes.ts";
import { outcomeMeta } from "../lib/outcome-ref.ts";

/** Ühe õpiväljundi serveri-pide: taksonoomia-silt + mitte-PII viide. */
export type OutcomeRefRecord = { skillTag: string; outcome_ref: string };

/**
 * Dedup-võti — TÄPSELT sama, mida /oskused/ leht kasutab (`text.toLowerCase()`,
 * kus `text = raw.trim()`). Hoiame seda ühes kohas, et identiteet ei lahkneks.
 */
function dedupKey(text: string): string {
  return text.trim().toLowerCase();
}

/**
 * Ehita autoriteetne kaart ÜKS KORD: iga DISTINTSE kataloogi-õpiväljundi kohta
 * (dedup nagu /oskused/) tema `skillTag` + `outcome_ref`. Iteratsioonijärjekord
 * on deterministlik (kataloogi järjekord), nii et esimesena-nähtud tekst võidab
 * samamoodi nagu lehel.
 */
function buildOutcomeRefMap(): Record<string, OutcomeRefRecord> {
  const out: Record<string, OutcomeRefRecord> = {};
  for (const entry of catalog) {
    for (const raw of cleanOutcomeTexts(entry)) {
      const text = raw.trim();
      if (!text) continue;
      const key = dedupKey(text);
      if (key in out) continue; // esimesena nähtud tekst võidab (nagu /oskused/)
      const meta = outcomeMeta(text);
      out[key] = { skillTag: meta.skillTag, outcome_ref: meta.outcome_ref };
    }
  }
  return out;
}

/**
 * Autoriteetne sild: dedup-võti (väiketäheline trimmitud õpiväljundi tekst) ->
 * { skillTag, outcome_ref }. Ehitatud üks kord laadimisel; jagatud konto-vaate
 * ja AMOS-i feedi vahel.
 */
export const outcomeRefMap: Record<string, OutcomeRefRecord> = buildOutcomeRefMap();

/**
 * Otsi paketi-kirje õpiväljundi TEKSTI järgi tema serveri-viide.
 * @returns `out_<24 hex>` viide, või `null` kui tekst pole kataloogis.
 */
export function outcomeRefForText(text: string): string | null {
  if (typeof text !== "string") return null;
  const rec = outcomeRefMap[dedupKey(text)];
  return rec ? rec.outcome_ref : null;
}

/**
 * Otsi paketi-kirje õpiväljundi TEKSTI järgi terve kirje (silt + viide).
 * @returns `{ skillTag, outcome_ref }`, või `null` kui tekst pole kataloogis.
 */
export function outcomeRecordForText(text: string): OutcomeRefRecord | null {
  if (typeof text !== "string") return null;
  return outcomeRefMap[dedupKey(text)] ?? null;
}
