// Õpiväljundi → AMOS outcome-ref tuletamine (OPK-S4).
//
// MIKS: kataloogis on iga programmi õpiväljundid puhta TEKSTINA. Et konto-vaade
// saaks pakette AMOSega sünkroonida, vajab iga õpiväljund kanoonilist, mitte-PII
// viidet `out_<24hex>` + ühe `skillTag`-i. See fail tuletab need DETERMINISTLIKULT.
//
// VENDORED: normalizeOutcomeText + deriveOutcomeRef on SÕNA-SÕNALT (byte-identical)
// koopia AMOSe registrist `amos.outcome.registry/v1`
// (02S-AMOS/infra/contracts/outcome/outcome-registry-contract.mjs). NEED PEAVAD
// jääma identseks — kui AMOS muutub, lähevad viited valeks ja sünk katki. Identsus
// on kinnitatud risti-repo testiga scripts/outcome-ref.test.mjs (anti-drift gate).
// ÄRA muuda nende kahe funktsiooni loogikat ilma AMOSe lähtekoodi peegeldamata.
//
// Viited (`out_…`) on OPAAKSED ja mitte-PII: õpiväljund on oskuse kirjeldus, mitte
// isikuandmed. Hash ei sisalda saladusi — see on sisu-deterministlik tunnus.
//
// STABIILSUS: viide hash'ib `skillTag`-i, mis tuleb skillSynonyms taksonoomiast.
// Seega on skillSynonyms nüüd STABIILSUS-KRIITILINE sisend — kui klastri term'e või
// järjekorda muuta nii, et õpiväljundi pikim-vaste muutub, MUUTUB ka selle viide
// (see on re-kanoniseerimine = migratsioon juba sünkroonitud pakettidele). Käsitle
// skillSynonyms'i kui versioonitud taksonoomiat; ära muuda kergekäeliselt.
//
// LEPING AMOSega: mkval saadab AMOSe registrile iga õpiväljundi kohta {text,
// language:"et", skillTag} (vt src/data/outcomeRefs.ts); AMOS promote'b selle
// (promoteFromMkvalOutcomeObject) SAMA deriveOutcomeRef'iga → sama viide. skillTag
// PEAB tulema siit, mitte AMOSe poolt uuesti tuletatud — muidu lähevad viited lahku.
//
// PUHAS / build-time (node): kasutab node:crypto't, ei DOM-i, ei võrku.

import { createHash } from "node:crypto";
// NB: explicit `.ts` extension — this module is value-imported by `node --test`
// (scripts/outcome-ref.test.mjs), and Node's runtime type-strip does NOT do
// extensionless resolution for a value import. Astro/TS (bundler resolution,
// allowImportingTsExtensions) accepts the explicit extension too.
import { skillSynonyms } from "../data/skillSynonyms.ts";

// AMOSe skillTag-i kuju: väiketäht + 1..60 [a-z0-9_]. Peegeldab SKILL_TAG_RE'd AMOSes.
export const SKILL_TAG_RE = /^[a-z][a-z0-9_]{1,60}$/;

/** AMOSe sha24 — SHA-256 hex'i esimesed 24 märki. VENDORED, ära muuda. */
function sha24(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex").slice(0, 24);
}

/**
 * VENDORED amos.outcome.registry/v1 — BYTE-IDENTICAL koopia.
 * Normaliseerib õpiväljundi teksti dedup-võtmeks (mitte kuvamiseks): NFKC,
 * väiketähed, tihenda tühikud, eemalda ümbritsev kirjavahemärk.
 */
export function normalizeOutcomeText(text: string): string {
  return String(text)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/^[\s\p{P}]+|[\s\p{P}]+$/gu, "")
    .trim();
}

/**
 * VENDORED amos.outcome.registry/v1 — BYTE-IDENTICAL koopia.
 * Deterministlik, saladusteta viide (õpiväljundid on mitte-PII): out_<24hex>.
 */
export function deriveOutcomeRef(o: { language: string; skillTag: string; canonicalText: string }): string {
  const { language, skillTag, canonicalText } = o;
  return "out_" + sha24(`${language}\n${skillTag}\n${normalizeOutcomeText(canonicalText)}`);
}

// Fallback, kui ükski klaster ei sobitu. Alati SKILL_TAG_RE-kõlbulik.
const FALLBACK_SKILL_TAG = "muu_oskus";

// Substring-vaste alampikkus — sama kui /oskused/ otsingul (skill-match.ts MIN_LEN).
const MIN_TERM_LEN = 3;

/**
 * Tuletab ühe deterministliku `skillTag`-i õpiväljundi tekstist skillSynonyms
 * taksonoomia põhjal.
 *
 * Reegel: muuda õpiväljund väiketäheliseks; leia klaster, mille mõni `terms` sõna
 * (pikkus >= 3) on selle alamsõne. Vali KÕIGE PIKEMA sobiva terminiga klaster
 * (kõige spetsiifilisem); viigi korral võidab skillSynonyms järjekorras esimene.
 * skillTag = selle klastri `id`, sidekriipsud asendatud alakriipsudega
 * (nt "andmete-visualiseerimine" → "andmete_visualiseerimine"), kärbitud/valideeritud
 * SKILL_TAG_RE vastu. Kui ükski klaster ei sobitu, tagasta "muu_oskus".
 * ALATI tagastab SKILL_TAG_RE-kõlbuliku väärtuse.
 */
export function outcomeSkillTag(text: string): string {
  const haystack = String(text ?? "").toLowerCase();

  let bestId: string | null = null;
  let bestLen = 0; // pikima senise vaste termini pikkus

  // Klastrite läbikäik järjekorras → tie-break "esimene võidab" on automaatne,
  // sest võrdse pikkuse korral me ei kirjuta varasemat üle (kasutame >, mitte >=).
  for (const cluster of skillSynonyms) {
    let clusterBest = 0;
    for (const term of cluster.terms) {
      if (term.length >= MIN_TERM_LEN && term.length > clusterBest && haystack.includes(term)) {
        clusterBest = term.length;
      }
    }
    if (clusterBest > bestLen) {
      bestLen = clusterBest;
      bestId = cluster.id;
    }
  }

  if (bestId === null) return FALLBACK_SKILL_TAG;

  const tag = toSkillTag(bestId);
  return SKILL_TAG_RE.test(tag) ? tag : FALLBACK_SKILL_TAG;
}

/**
 * Teisendab klastri `id` SKILL_TAG_RE-kõlbulikuks tag'iks: sidekriipsud →
 * alakriipsud, ainult [a-z0-9_], algab tähega, kuni 61 märki (1 + 60).
 */
function toSkillTag(id: string): string {
  let tag = String(id)
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/[^a-z0-9_]/g, ""); // viska kõik mitte-kõlbulik (nt täpitähed id-s)

  // Peab algama tähega [a-z]. Lõika ette mittetähed maha.
  tag = tag.replace(/^[^a-z]+/, "");
  if (tag.length === 0) return FALLBACK_SKILL_TAG;

  // SKILL_TAG_RE lubab 1 algustähe + kuni 60 saba → kokku max 61 märki.
  if (tag.length > 61) tag = tag.slice(0, 61);
  return tag;
}

/** Mugavus: tuleta õpiväljundi tekstist otse selle outcome-ref (keel "et"). */
export function outcomeRefFor(text: string): string {
  return deriveOutcomeRef({ language: "et", skillTag: outcomeSkillTag(text), canonicalText: text });
}

/**
 * Täielik silla-kirje ühe õpiväljundi kohta. `text` jääb kliendipoolele
 * (kuvamiseks); `outcome_ref` + `skillTag` on serveri-pool (AMOSe sild).
 */
export function outcomeMeta(text: string): { text: string; language: "et"; skillTag: string; outcome_ref: string } {
  const skillTag = outcomeSkillTag(text);
  return {
    text,
    language: "et",
    skillTag,
    outcome_ref: deriveOutcomeRef({ language: "et", skillTag, canonicalText: text }),
  };
}
