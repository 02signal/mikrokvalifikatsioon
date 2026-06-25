// Mitme sihtprofiili ("paketi") andmekiht /oskused/ lehele (CL-4, mkval-half).
//
// Varem sai sisselogimata külastaja hoida ainult ÜHE õpiväljundite kogu
// (vana `mkval:pakett` massiiv). Nüüd võib tal olla MITU nimega paketti
// (nt "Raamatupidaja", "Müügijuht") ja üks neist on korraga aktiivne.
// See fail on AINULT puhas, deterministlik andmeloogika — ei DOM-i, ei
// localStorage'i, ei juhuslikke id-sid ega kellaaegu. Kõik id-d ja ajatemplid
// SÜSTIB kutsuja (`seed`), nii et Node-test (scripts/packages.test.mjs) saab
// kogu loogika fikstuuriga üksinda läbi mängida. Iga funktsioon tagastab UUE
// oleku (ei muuda sisendit), sest kutsuja diffib ja salvestab tulemust.
//
// SALVESTUS (kutsuja teeb, mitte see moodul): tõe-allikas on
//   `mkval:paketid` = JSON(PackagesState)
// ja AKTIIVSE paketi `items` peegeldatakse tagasi vanasse võtmesse
//   `mkval:pakett` = JSON(PkgItem[])
// nii et olemasolevad lugejad (vana õpiväljundite kood) töötavad edasi.
//
// Pakettide nimed on kasutaja vaba tekst — käsitle neid kontseptuaalselt
// võimaliku isikuandmena (UI/audit hoiavad neid lokaalselt). See moodul on
// puhas andmekiht, seega siin AINULT puhastame pikkust/tühikuid.

/** Üks õpiväljund paketis. `key` on stabiilne unikaalne võti (dedupi alus). */
export type PkgItem = { key: string; text: string; progs?: string[] };

/** Üks nimega sihtprofiil — õpiväljundite kogu. */
export type Package = { id: string; name: string; items: PkgItem[]; createdAt: number };

/** Kogu salvestatav olek. `v: 2` eristab seda vanast üksik-massiivist. */
export type PackagesState = { v: 2; packages: Package[]; activeId: string | null };

/** Seeme, mille kutsuja süstib uue paketi loomisel (id + nimi + ajatempel). */
export type PackageSeed = { id: string; name: string; createdAt: number };

const STATE_VERSION = 2 as const;
const NAME_MAX = 60;
const DEFAULT_NAME = "Minu pakett";

// ── Nimepuhastus ────────────────────────────────────────────────────────────

/**
 * Puhasta kasutaja-nimi: trimmi, koonda tühikud üheks, lõika 60 märgini.
 * Kui pärast trimmimist tühi, kasuta varuvarianti.
 *
 * @param raw      Toores nimi (kasutaja vaba tekst).
 * @param fallback Varunimi, kui `raw` on tühi/ainult tühikud.
 */
function sanitizeName(raw: string, fallback: string = DEFAULT_NAME): string {
  const collapsed = String(raw ?? "").replace(/\s+/g, " ").trim();
  const safeFallback = String(fallback ?? DEFAULT_NAME).replace(/\s+/g, " ").trim() || DEFAULT_NAME;
  const name = collapsed || safeFallback;
  return name.slice(0, NAME_MAX);
}

// ── Dedup ─────────────────────────────────────────────────────────────────────

/** Eemalda dubleerivad võtmed, säilita esimese esinemise järjekord. */
function dedupeByKey(items: PkgItem[]): PkgItem[] {
  const seen = new Set<string>();
  const out: PkgItem[] = [];
  for (const item of items ?? []) {
    if (!item || typeof item.key !== "string") continue;
    if (seen.has(item.key)) continue;
    seen.add(item.key);
    out.push(item);
  }
  return out;
}

// ── Olek ──────────────────────────────────────────────────────────────────────

/** Tühi olek: pakette pole, aktiivset pole. */
export function emptyState(): PackagesState {
  return { v: STATE_VERSION, packages: [], activeId: null };
}

/** Kas väärtus on kehtiv v2 olek (struktuurikontroll, ei valideeri sisu). */
function isValidState(s: unknown): s is PackagesState {
  if (!s || typeof s !== "object") return false;
  const st = s as Partial<PackagesState>;
  return st.v === STATE_VERSION && Array.isArray(st.packages) &&
    (st.activeId === null || typeof st.activeId === "string");
}

/**
 * Migreeri vana üksik-massiiv mitme-paketi olekuks — KAOTUSETA.
 *
 * Reegel:
 *   1) kui `existing` on juba kehtiv v2 olek → tagasta see muutmata (juba migreeritud);
 *   2) muidu kui `legacy` (vana `mkval:pakett`) on mittetühi → üks pakett
 *      { id: seed.id, name: seed.name, items: <legacy, dedupitud võtme järgi>,
 *        createdAt: seed.createdAt }, activeId = seed.id;
 *   3) muidu → tühi olek.
 * Ei kaota ühtegi vana õpiväljundit.
 *
 * @param legacy   Vana üksik-massiiv või null.
 * @param existing Olemasolev v2 olek või null.
 * @param seed     Seeme esimese paketi jaoks (id + nimi + ajatempel).
 */
export function migrateLegacy(
  legacy: PkgItem[] | null,
  existing: PackagesState | null,
  seed: PackageSeed,
): PackagesState {
  if (isValidState(existing)) return existing;
  const items = dedupeByKey(Array.isArray(legacy) ? legacy : []);
  if (items.length === 0) return emptyState();
  return {
    v: STATE_VERSION,
    packages: [{ id: seed.id, name: sanitizeName(seed.name), items, createdAt: seed.createdAt }],
    activeId: seed.id,
  };
}

/** Aktiivne pakett või null (kui aktiivset pole või id ei viita ühelegi paketile). */
export function activePackage(s: PackagesState): Package | null {
  if (!s.activeId) return null;
  return s.packages.find((p) => p.id === s.activeId) ?? null;
}

/**
 * Taga, et aktiivne pakett on olemas. Kui aktiivset pole (või id ei viita
 * ühelegi paketile), loo `seed`-ist vaikepakett ja tee see aktiivseks.
 * Kui aktiivne juba olemas → muutmata (sama viide).
 */
export function ensureActive(s: PackagesState, seed: PackageSeed): PackagesState {
  if (activePackage(s)) return s;
  const pkg: Package = {
    id: seed.id,
    name: sanitizeName(seed.name),
    items: [],
    createdAt: seed.createdAt,
  };
  return { ...s, packages: [...s.packages, pkg], activeId: pkg.id };
}

/** Loo uus tühi pakett ja tee see aktiivseks. */
export function createPackage(s: PackagesState, seed: PackageSeed): PackagesState {
  const pkg: Package = {
    id: seed.id,
    name: sanitizeName(seed.name),
    items: [],
    createdAt: seed.createdAt,
  };
  return { ...s, packages: [...s.packages, pkg], activeId: pkg.id };
}

/** Nimeta pakett ümber (nimi puhastatakse). Tundmatu id → olek muutmata. */
export function renamePackage(s: PackagesState, id: string, name: string): PackagesState {
  let changed = false;
  const packages = s.packages.map((p) => {
    if (p.id !== id) return p;
    changed = true;
    return { ...p, name: sanitizeName(name, p.name) };
  });
  return changed ? { ...s, packages } : s;
}

/**
 * Kustuta pakett. Kui kustutati aktiivne, langeb `activeId` tagasi esimesele
 * alles jäänud paketile, või null-i, kui ühtegi ei jää.
 */
export function deletePackage(s: PackagesState, id: string): PackagesState {
  const packages = s.packages.filter((p) => p.id !== id);
  if (packages.length === s.packages.length) return s; // tundmatu id
  let activeId = s.activeId;
  if (activeId === id) {
    activeId = packages.length > 0 ? packages[0].id : null;
  }
  return { ...s, packages, activeId };
}

/** Sea aktiivne pakett. Tundmatu id → olek muutmata. */
export function setActive(s: PackagesState, id: string): PackagesState {
  if (s.activeId === id) return s;
  if (!s.packages.some((p) => p.id === id)) return s;
  return { ...s, activeId: id };
}

/**
 * Lisa õpiväljund AKTIIVSESSE paketti. Eeldab, et aktiivne pakett on olemas.
 * Dedupib võtme järgi — sama `key` ei lisata teist korda (olemasolev jääb alles).
 */
export function addItem(s: PackagesState, item: PkgItem): PackagesState {
  if (!s.activeId || !item || typeof item.key !== "string") return s;
  const packages = s.packages.map((p) => {
    if (p.id !== s.activeId) return p;
    if (p.items.some((i) => i.key === item.key)) return p; // juba sees → dedup
    return { ...p, items: [...p.items, item] };
  });
  return { ...s, packages };
}

/** Eemalda õpiväljund võtme järgi AKTIIVSEST paketist. */
export function removeItem(s: PackagesState, key: string): PackagesState {
  if (!s.activeId) return s;
  let changed = false;
  const packages = s.packages.map((p) => {
    if (p.id !== s.activeId) return p;
    const items = p.items.filter((i) => i.key !== key);
    if (items.length === p.items.length) return p;
    changed = true;
    return { ...p, items };
  });
  return changed ? { ...s, packages } : s;
}
