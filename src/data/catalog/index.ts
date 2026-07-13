import type { CatalogEntry } from "../catalogSchema";
import taltech from "./taltech.json" with { type: "json" };
import tartuYlikool from "./tartu-ylikool.json" with { type: "json" };
import muudKoolid from "./muud-koolid.json" with { type: "json" };
import { assignSlugs, slugify } from "../slug.ts";
import { parseIntakeDates } from "../dates.ts";
import { ehisOverrideFor, type EhisAuthoritative } from "../ehisFacts/index.ts";

/**
 * KOMMITITUD SNAPSHOT = AUTORITEETNE TÕEALLIKAS.
 *
 * Kataloogi sisu maandub repo PR-idega (nt EHIS-i ülekirjutused), seega repos
 * kommititud `*.json` on alati VÄRSKEIM ja õige. Vaikimisi ehitame saidi just
 * sellest. AMOS-i avaldatud feedi (`PUBLIC_CATALOG_FEED_URL`) kasutame AINULT
 * siis, kui see on EKSPLITSIITSELT usaldatud (`PUBLIC_CATALOG_FEED_TRUSTED=1`)
 * JA läbib valideerimise ega kaota ühtegi kirjet (mitte-regressioon). Nii ei saa
 * vananenud feed enam vaikselt saiti halvendada. Vt docs/data-pipeline.md.
 */
const LOCAL_CHECKED_AT = "2026-06-12";
const committedEntries: CatalogEntry[] = [
  ...(taltech as unknown as CatalogEntry[]),
  ...(tartuYlikool as unknown as CatalogEntry[]),
  ...(muudKoolid as unknown as CatalogEntry[])
];

/** Avalikule saidile lähevad ainult `status: "active"` (või staatuseta) kirjed. */
function activeOnly<T extends { status?: string }>(entries: T[]): T[] {
  return entries.filter((p) => !p.status || p.status === "active");
}

const committedActive: CatalogEntry[] = activeOnly(committedEntries as Array<CatalogEntry & { status?: string }>);

/** Mitu kirjet on kommititud snapshotis (aktiivsed) — feedi mitte-regressiooni alus. */
export const committedActiveCount = committedActive.length;

// `import.meta.env` puudub mõnes kontekstis (nt `node --test` floor-gate'is);
// loeme turvaliselt (?.), et moodulit saaks importida ka väljaspool Astro buildi.
const env = (import.meta as ImportMeta).env as Record<string, string | undefined> | undefined;
const FEED_URL = env?.PUBLIC_CATALOG_FEED_URL;
const FEED_TRUSTED = env?.PUBLIC_CATALOG_FEED_TRUSTED === "1";

function isoDate(value: unknown): string | null {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null;
}

/** Tuntud AMOS mkval-kataloogi feedi schemaVersion väärtused. */
const KNOWN_FEED_SCHEMA_VERSIONS = ["amos.mkval.catalog/v1", "amos.mkval.catalog/v2"];

/** Väljad, mida avalik feed EI TOHI kunagi kanda (kaitse sügavuti — AMOS-i
 * enda kontrakt keelab need juba enne avaldamist, aga saidi build ei tohi
 * sõltuda ainult sellest). Vt AMOS `mkval-catalog-feed-contract.mjs`
 * `FORBIDDEN_PROGRAM_KEYS`. */
const FORBIDDEN_FEED_KEYS = [
  "email", "phone", "isikukood", "personalCode", "token", "secret", "password",
  "raw_html", "html", "raw_body", "private_notes", "owner_notes"
];

/** Otsi rekursiivselt keelatud võtit. Tagastab tee (nt "programs[3].email") või `null`. */
function findForbiddenFeedKey(value: unknown, path = "feed"): string | null {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      const found = findForbiddenFeedKey(value[i], `${path}[${i}]`);
      if (found) return found;
    }
    return null;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (FORBIDDEN_FEED_KEYS.includes(key)) return `${path}.${key}`;
      const found = findForbiddenFeedKey(child, `${path}.${key}`);
      if (found) return found;
    }
  }
  return null;
}

export type CatalogSourceName = "committed" | "feed";
type FeedResult = { entries: CatalogEntry[]; checkedAt: string; updatedAt: string; contentHash: string | null; source: CatalogSourceName };

/** Kommititud snapshot — autoriteetne vaikeallikas. */
function committedResult(): FeedResult {
  return { entries: committedActive, checkedAt: LOCAL_CHECKED_AT, updatedAt: LOCAL_CHECKED_AT, contentHash: null, source: "committed" };
}

/** Allika-valiku otsus: kas KASUTA feedi (koos põhjusega) või kommititud snapshotti. */
export type CatalogSourceDecision =
  | { use: "feed"; entries: CatalogEntry[]; checkedAt: string; updatedAt: string; contentHash: string | null }
  | { use: "committed"; reason: string };

/**
 * PUHAS otsustusloogika (ilma fetchita) — testitav deterministlikult.
 * Kommititud snapshot on AUTORITEETNE. Usaldatud feedi tohib kasutada AINULT, kui:
 *   1) `feedUrl` on seatud, JA
 *   2) `trusted === true` (PUBLIC_CATALOG_FEED_TRUSTED=1, eksplitsiitne opt-in), JA
 *   3) feed on oodatud kujul (massiiv VÕI { programs: [...] } mitte-tühi), JA
 *   4) feedi aktiivsete kirjete arv >= kommititud snapshoti oma (MITTE-REGRESSIOON).
 * Iga muu juhul → kommititud snapshot, koos selge põhjusega.
 * `data` on juba parsitud JSON (massiiv VÕI objekt feedist), `null` kui fetch ebaõnnestus.
 */
export function chooseCatalogSource(opts: {
  feedUrl: string | undefined;
  trusted: boolean;
  data: unknown;
  committedCount: number;
}): CatalogSourceDecision {
  const { feedUrl, trusted, data, committedCount } = opts;
  if (!feedUrl) {
    return { use: "committed", reason: "feed URL pole seatud" };
  }
  if (!trusted) {
    return {
      use: "committed",
      reason: `feed URL on seatud, kuid PUBLIC_CATALOG_FEED_TRUSTED!=1 → kasutan kommititud snapshotti (autoriteetne, ${committedCount} programmi)`
    };
  }
  if (data == null) {
    return { use: "committed", reason: "usaldatud feedi laadimine/parsimine ebaõnnestus" };
  }
  const raw = (Array.isArray(data) ? data : (data as { programs?: unknown }).programs) as
    | Array<CatalogEntry & { status?: string }>
    | undefined;
  if (!Array.isArray(raw) || !raw.length) {
    return { use: "committed", reason: "usaldatud feed on vigase kujuga (puuduvad programs[])" };
  }
  const obj = Array.isArray(data) ? null : (data as Record<string, unknown>);
  // KAITSE SÜGAVUTI: kui feed deklareerib schemaVersion/count, peavad need
  // paika pidama. Puuduvad väljad ei blokeeri (tagasiühilduvus vanade
  // fixture'ite/kontrollidega) — aga VALE väärtus blokeerib alati.
  if (obj && typeof obj.schemaVersion === "string" && !KNOWN_FEED_SCHEMA_VERSIONS.includes(obj.schemaVersion)) {
    return { use: "committed", reason: `usaldatud feedi schemaVersion on tundmatu (${obj.schemaVersion})` };
  }
  if (obj && typeof obj.count === "number" && obj.count !== raw.length) {
    return { use: "committed", reason: `usaldatud feedi count (${obj.count}) ei kattu programs[] pikkusega (${raw.length})` };
  }
  const forbidden = findForbiddenFeedKey(data);
  if (forbidden) {
    return { use: "committed", reason: `usaldatud feed sisaldab keelatud välja: ${forbidden}` };
  }
  const entries = activeOnly(raw);
  // MITTE-REGRESSIOON: usaldatud feed ei tohi kunagi kaotada kirjeid.
  if (entries.length < committedCount) {
    return {
      use: "committed",
      reason: `usaldatud feed kaotaks kirjeid (${entries.length} < kommititud ${committedCount}) → keeldun`
    };
  }
  const checkedAt = obj ? (isoDate(obj.checkedAt) ?? LOCAL_CHECKED_AT) : LOCAL_CHECKED_AT;
  // `checkedAt` = viimati koolide lehtedega VÕRRELDUD (liigub igal kontrollil,
  // ka kui miski ei muutunud). `updatedAt` = andmed viimati MUUTUSID: eelista
  // AMOS-i `dataUpdatedAt` väli; kui puudub (vanem feed), taandu generatedAt-le.
  const updatedAt = obj ? (isoDate(obj.dataUpdatedAt) ?? isoDate(obj.generatedAt) ?? isoDate(obj.updatedAt) ?? checkedAt) : checkedAt;
  const contentHash = obj && typeof obj.contentHash === "string" ? (obj.contentHash as string) : null;
  return { use: "feed", entries, checkedAt, updatedAt, contentHash };
}

/**
 * Vali andmeallikas build-ajal. Teeb fetchi AINULT siis, kui feed on seatud JA
 * usaldatud, ja annab otsuse `chooseCatalogSource`-le (kogu otsustusloogika seal,
 * testitav). Iga keeldumise korral logime SELGELT, miks langesime tagasi
 * kommititud snapshotile (autoriteetne).
 */
async function loadCatalogSource(): Promise<FeedResult> {
  if (!FEED_URL || !FEED_TRUSTED) {
    const decision = chooseCatalogSource({ feedUrl: FEED_URL, trusted: FEED_TRUSTED, data: null, committedCount: committedActiveCount });
    if (decision.use === "committed") console.warn(`[catalog] ${decision.reason}`);
    return committedResult();
  }
  let data: unknown = null;
  try {
    const res = await fetch(FEED_URL);
    if (res.ok) {
      data = await res.json();
    } else {
      console.warn(`[catalog] usaldatud feed ei vasta (HTTP ${res.status})`);
    }
  } catch (e) {
    console.warn(`[catalog] usaldatud feedi laadimine ebaõnnestus: ${(e as Error).message}`);
  }
  const decision = chooseCatalogSource({ feedUrl: FEED_URL, trusted: FEED_TRUSTED, data, committedCount: committedActiveCount });
  if (decision.use === "feed") {
    console.log(`[catalog] usaldatud AMOS feed (mitte-regresseeruv): ${decision.entries.length} programmi (${FEED_URL})`);
    return { entries: decision.entries, checkedAt: decision.checkedAt, updatedAt: decision.updatedAt, contentHash: decision.contentHash, source: "feed" };
  }
  console.warn(`[catalog] ${decision.reason} → kasutan kommititud snapshotti (autoriteetne)`);
  return committedResult();
}

const feed = await loadCatalogSource();

/** Kumb allikas reaalselt kasutusele läks ("committed" | "feed") — diagnostikaks. */
export const catalogSource = feed.source;
export const catalogCheckedAt = feed.checkedAt;
export const catalogUpdatedAt = feed.updatedAt;
export const catalogContentHash = feed.contentHash;

/** Kataloogi kirje koos püsiva slugiga (/kataloog/<slug>/) ja EHIS-i ametliku
 * päritoluga. `ehis` on iga kirje küljes: sobitatud kirjel `authoritative: true`
 * ja name/EAP/keel on EHIS-ist (FAKTID) üle kirjutatud, EHIS ametlikud
 * õpiväljundid on `ehis.ehisOutcomes` all. Kooli ENDA kirjeldus (summary,
 * goalText, kooli enda `outcomes`) JÄÄB puutumata — detaillehel kuvatakse MÕLEMAD.
 * Sobimata kirjel `authoritative: false` ja per-school faktid jäävad puutumata. */
export type CatalogEntryWithSlug = CatalogEntry & { slug: string; ehis: EhisAuthoritative };

const sorted: CatalogEntry[] = feed.entries
  .slice()
  .sort((a, b) => a.provider.localeCompare(b.provider, "et") || a.name.localeCompare(b.name, "et"));

// Slugid arvutatakse ORIGINAALSE provider + name põhjal ENNE EHIS-i ülekirjutust,
// et URL-id püsiksid muutumatuna ka siis, kui kuvatav nimi EHIS-ist muutub.
const slugs = assignSlugs(sorted, (entry) => `${entry.provider} ${entry.name}`);

export const catalog: CatalogEntryWithSlug[] = sorted.map((entry) => {
  const parsed = parseIntakeDates(entry.intakeText);
  // Ametlik allikas: EHIS (avaandmed). Sobitatud kirjel kirjutame EHIS-ist üle
  // ainult FAKTID (name/EAP/keel). Kirjeldav kiht (summary/goalText/outcomes)
  // EI muutu — kooli enda õpiväljundid jäävad alles ja EHIS ametlikud
  // õpiväljundid sõidavad kaasa `ehis.ehisOutcomes` all (detaillehel MÕLEMAD).
  // Kureeritud `field` (navigatsiooni taksonoomia) JÄÄB puutumata; EHIS-i
  // õppekavarühm lisatakse `ehis.fieldCode/fieldName` kaudu.
  const { patch, ehis } = ehisOverrideFor(entry);
  return {
    ...entry,
    ...patch,
    slug: slugs.get(entry) as string,
    registrationDeadline: entry.registrationDeadline ?? parsed.registrationDeadline,
    startDate: entry.startDate ?? parsed.startDate,
    ehis
  };
});

/** Slug -> kirje, programmilehe (getStaticPaths) ja masinliideste jaoks. */
export const bySlug = new Map(catalog.map((entry) => [entry.slug, entry]));

export const providers = [...new Set(catalog.map((entry) => entry.provider))];
export const fields = [...new Set(catalog.map((entry) => entry.field))].sort((a, b) => a.localeCompare(b, "et"));

/** Valdkonnad koos slugiga (/valdkond/<slug>/). "muu" on koondkategooria — sellele eraldi lehte ei tee. */
export const fieldsWithSlug = fields
  .filter((field) => field !== "muu")
  .map((field) => ({ field, slug: slugify(field) }));
export const fieldBySlug = new Map(fieldsWithSlug.map((f) => [f.slug, f.field]));

/** Pakkujad koos slugiga (/koolitaja/<slug>/). */
export const providersWithSlug = providers.map((provider) => ({ provider, slug: slugify(provider) }));
export const providerBySlug = new Map(providersWithSlug.map((p) => [p.slug, p.provider]));
