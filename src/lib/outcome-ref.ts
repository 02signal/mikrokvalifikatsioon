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
// PUHAS + BROWSER-SAFE: vendoritud puhas-JS SHA-256 (allpool), MITTE node:crypto —
// seda moodulit imporditakse ka konto-face'i kliendi <script>'i (Vite ei oska
// node:crypto't brauserisse pakkida). Väljund on bait-identne node sha256-ga,
// kinnitatud risti-repo anti-drift testiga AMOSe deriveOutcomeRef vastu.
// NB: explicit `.ts` extension — this module is value-imported by `node --test`
// (scripts/outcome-ref.test.mjs), and Node's runtime type-strip does NOT do
// extensionless resolution for a value import. Astro/TS (bundler resolution,
// allowImportingTsExtensions) accepts the explicit extension too.
import { skillSynonyms } from "../data/skillSynonyms.ts";

// AMOSe skillTag-i kuju: väiketäht + 1..60 [a-z0-9_]. Peegeldab SKILL_TAG_RE'd AMOSes.
export const SKILL_TAG_RE = /^[a-z][a-z0-9_]{1,60}$/;

// Puhas-JS SHA-256 (UTF-8 → hex), bait-identne node crypto sha256-ga. Sünkroonne,
// sõltuvusteta, töötab nii node'is (build) kui brauseris (konto-face). Anti-drift
// test kinnitab identsust AMOSe deriveOutcomeRef'iga — kui see katki, test punaseks.
function sha256hex(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  const l = bytes.length;
  const k = (56 - ((l + 1) % 64) + 64) % 64;
  const total = l + 1 + k + 8;
  const m = new Uint8Array(total);
  m.set(bytes);
  m[l] = 0x80;
  const dv = new DataView(m.buffer);
  const bitLen = l * 8;
  dv.setUint32(total - 8, Math.floor(bitLen / 0x100000000), false);
  dv.setUint32(total - 4, bitLen >>> 0, false);
  const w = new Uint32Array(64);
  const rotr = (x: number, n: number): number => (x >>> n) | (x << (32 - n));
  for (let i = 0; i < total; i += 64) {
    for (let t = 0; t < 16; t++) w[t] = dv.getUint32(i + t * 4, false);
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[t] + w[t]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }
  const hex = (x: number): string => (x >>> 0).toString(16).padStart(8, "0");
  return hex(h0) + hex(h1) + hex(h2) + hex(h3) + hex(h4) + hex(h5) + hex(h6) + hex(h7);
}

/** AMOSe sha24 — SHA-256 hex'i esimesed 24 märki. VENDORED, ära muuda. */
function sha24(s: string): string {
  return sha256hex(s).slice(0, 24);
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
