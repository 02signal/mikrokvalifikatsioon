// KONTO SÜNKROONIMISE PUHAS LOOGIK — teksti->viite kaardistus + nimepeegeldus.
//
// MIKS SEE FAIL OLEMAS ON:
//   Kahe poole vahel (kohalik mitme-paketi olek `PackagesState` ja AMOS-i konto
//   API) on vaja TÄPSET, korratavat teisendust:
//     1) milline JSON saadetakse serverisse (AINULT mitte-PII `out_…` viited);
//     2) kuidas serveri vastusest taas inimkeelsed nimed kliendi poolele saada.
//   Kogu see loogika on SIIN ja on PUHAS — ei DOM-i, ei võrku, ei localStorage'i.
//   Nii on ta Node-testitav fikstuuriga (scripts/konto-sync.test.mjs).
//
// SÕLTUVUSE SÜST:
//   Teksti->viite lahendaja (`refOf`) SÜSTITAKSE (leht annab `outcomeRefForText`).
//   Nii ei sõltu see moodul kataloogist ega Astro-keskkonnast ja test saab
//   anda lihtsa fikstuur-lahendaja.
//
// PRIVAATSUS:
//   Väljuvas koormas on AINULT `client_id` (kliendi paketi id) + `outcome_refs`
//   (mitte-PII `out_…`). Paketi NIMI ja õpiväljundi tekst EI lahku siit kunagi —
//   nimi peegeldatakse alles serveri vastusest TAGASI kliendi nimekaarti.

import type { PackagesState } from "./packages.ts";

/** Serveri lepingu piirid: kõige rohkem 50 paketti, igas 50 viidet. */
const MAX_PACKAGES = 50;
const MAX_REFS = 50;
/** Serveri package_ref kuju — korduval sünkroonil saadame tuntud viite tagasi. */
const PACKAGE_REF_RE = /^pkg_[0-9a-f]{24}$/;

/**
 * Üks sünkroonitav pakett (väljuv koorem). `coverage` on v1-s ära jäetud.
 * `package_ref` lisatakse AINULT siis, kui kohalik kaart juba teab selle paketi
 * serveri-viidet — siis server taaskasutab seda (idempotentne) uue mintimise asemel.
 * `weight` on paketi tähtsus-järjekord (väiksem = tähtsam, kasutaja seatud järjekord):
 * server salvestab selle, et reprioritiseerimine püsiks ka teises seadmes/uuel laadimisel.
 */
export type SyncPackage = { client_id: string; outcome_refs: string[]; coverage?: any; package_ref?: string; weight?: number };

/** Serveri sünkroonimisvastuse üksus: kliendi id <-> serveri viide. */
export type SyncedPackage = { client_id: string; package_ref: string };

/**
 * Lahenda ühe paketi õpiväljundite võtmed mitte-PII serveri-viideteks.
 * Dedubib viited (säilitab esimese esinemise järjekorra), jätab lahendamatud
 * (refOf -> null) vahele ja lõikab `MAX_REFS`-ni.
 */
function refsForPackage(
  items: { key: string }[],
  refOf: (text: string) => string | null,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items ?? []) {
    if (!item || typeof item.key !== "string") continue;
    const ref = refOf(item.key);
    if (!ref || seen.has(ref)) continue; // lahendamatu või dubleeriv → vahele
    seen.add(ref);
    out.push(ref);
    if (out.length >= MAX_REFS) break; // serveri ülempiir paketi kohta
  }
  return out;
}

/**
 * Ehita serverisse saadetav koorem kohalikust olekust.
 *
 * Iga paketi kohta:
 *   - `client_id` = `pkg.id` (kliendi-poolne stabiilne id);
 *   - `outcome_refs` = paketi õpiväljundite võtmed -> `out_…` (dedupitud,
 *     lahendamatud välja jäetud, kõige rohkem `MAX_REFS`).
 * Pakett, mille viited jäävad TÜHJAKS (ükski õpiväljund ei lahendu), JÄETAKSE
 * VAHELE — tühja paketti ei saa sünkroonida. Pakettide arv lõigatakse
 * `MAX_PACKAGES`-ni. `coverage` jäetakse v1-s ära.
 *
 * @param state Kohalik mitme-paketi olek (`mkval:paketid`).
 * @param refOf Teksti->viite lahendaja (leht annab `outcomeRefForText`).
 * @returns Väljuv koorem `syncPackages` jaoks (võib olla tühi).
 */
export function buildSyncPayload(
  state: PackagesState,
  refOf: (text: string) => string | null,
  knownPkgRef?: (clientId: string) => string | null | undefined,
): SyncPackage[] {
  const out: SyncPackage[] = [];
  // `weight` peegeldab paketi NÄHTAVAT järjekorda (väiksem = tähtsam). Loendame
  // ainult saadetavaid (lahenduvaid) pakette, et järjekord oleks tihe ja pidev —
  // server salvestab selle ja /state tagastab sama `weight`-i, nii et kasutaja
  // seatud reprioritiseerimine püsib ka uuel laadimisel / teises seadmes.
  let weight = 0;
  for (const pkg of state?.packages ?? []) {
    if (!pkg || typeof pkg.id !== "string") continue;
    const outcome_refs = refsForPackage(pkg.items, refOf);
    if (outcome_refs.length === 0) continue; // ei saa tühja paketti sünkroonida
    const item: SyncPackage = { client_id: pkg.id, outcome_refs, weight };
    // Korduv sünkroon idempotentseks: kui teame juba selle paketi serveri-viidet,
    // saadame selle kaasa, et server taaskasutaks (tema sync upsert'ib kliendi
    // antud kehtival package_ref'il) — mitte ei looks duplikaati.
    const known = knownPkgRef ? knownPkgRef(pkg.id) : null;
    if (typeof known === "string" && PACKAGE_REF_RE.test(known)) item.package_ref = known;
    out.push(item);
    weight += 1;
    if (out.length >= MAX_PACKAGES) break; // serveri ülempiir pakettidele
  }
  return out;
}

/**
 * Peegelda serveri sünkroonimisvastusest `package_ref -> kohalik paketi nimi`.
 * Ühenda `synced.client_id == pkg.id` järgi. See kaart läheb kliendi
 * nimekaarti (NAMES_KEY) — server ise nimesid ei salvesta.
 *
 * @param state  Kohalik olek (nimede allikas).
 * @param synced Serveri vastus (`{ client_id, package_ref }`).
 * @returns `package_ref -> nimi` ainult nende kohta, kelle pakett leiti.
 */
export function namesFromSync(
  state: PackagesState,
  synced: SyncedPackage[],
): Record<string, string> {
  const byId = new Map<string, string>();
  for (const pkg of state?.packages ?? []) {
    if (pkg && typeof pkg.id === "string") byId.set(pkg.id, pkg.name);
  }
  const out: Record<string, string> = {};
  for (const row of synced ?? []) {
    if (!row || typeof row.client_id !== "string" || typeof row.package_ref !== "string") continue;
    const name = byId.get(row.client_id);
    if (typeof name === "string") out[row.package_ref] = name;
  }
  return out;
}

/**
 * Loenda paketid, mille ükski õpiväljund EI lahendu serveri-viiteks (ja mis
 * seetõttu jäävad sünkroonimisest välja). Lehe õrna märkuse jaoks
 * ("N paketti ei saa veel sünkroonida").
 *
 * @param state Kohalik olek.
 * @param refOf Teksti->viite lahendaja.
 * @returns Lahendamatute (0 viitega) pakettide arv.
 */
export function packagesUnsyncable(
  state: PackagesState,
  refOf: (text: string) => string | null,
): number {
  let count = 0;
  for (const pkg of state?.packages ?? []) {
    if (!pkg || typeof pkg.id !== "string") continue;
    if (refsForPackage(pkg.items, refOf).length === 0) count += 1;
  }
  return count;
}
