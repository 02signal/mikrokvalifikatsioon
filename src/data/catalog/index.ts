import type { CatalogEntry, RetiredCatalogEntry } from "../catalogSchema.ts";
import { CATALOG_FIELDS, PROVIDER_TYPES } from "../catalogSchema.ts";
import lkgFeed from "./credential-commons-lkg/catalog-feed.json" with { type: "json" };
import legacyTaltech from "./taltech.json" with { type: "json" };
import legacyTartuYlikool from "./tartu-ylikool.json" with { type: "json" };
import legacyMuudKoolid from "./muud-koolid.json" with { type: "json" };
import { assignSlugs, slugify } from "../slug.ts";
import { parseIntakeDates } from "../dates.ts";
import { ehisOverrideFor, type EhisAuthoritative } from "../ehisFacts/index.ts";
import { sha256hex } from "../../lib/outcome-ref.ts";

/**
 * KOMMITITUD SNAPSHOT = AUTORITEETNE TÕEALLIKAS.
 *
 * Vaikimisi ehitame saidi kommititud, receipt'iga seotud LKG feedist. See on
 * samast AMOS-i väljalaskest kui LKG CC-graaf; vana `*.json` failikogu jääb
 * ajalooliseks lähteallikaks, mitte runtime fallbackiks. AMOS-i avaldatud feedi
 * (`PUBLIC_CATALOG_FEED_URL`) kasutame AINULT
 * siis, kui see on EKSPLITSIITSELT usaldatud (`PUBLIC_CATALOG_FEED_TRUSTED=1`)
 * JA läbib valideerimise ega kaota ühtegi kirjet (mitte-regressioon). Nii ei saa
 * vananenud feed enam vaikselt saiti halvendada. Vt docs/data-pipeline.md.
 */
/** Avalikule saidile lähevad ainult `status: "active"` (või staatuseta) kirjed. */
function activeOnly<T extends { status?: string | null }>(entries: T[]): T[] {
  return entries.filter((p) => !p.status || p.status === "active");
}

/**
 * Historical provider/name labels are retained only as a bounded EHIS matching
 * identity crosswalk. The keys use the exact legacy slug algorithm, which AMOS
 * adopted as canonical programme ids. Map values deliberately discard every
 * other historical field: this is never a catalog source or fallback.
 */
type EhisIdentityAlias = Pick<CatalogEntry, "provider" | "name">;
const legacyIdentityEntries = activeOnly([
  ...(legacyTaltech as unknown as CatalogEntry[]),
  ...(legacyTartuYlikool as unknown as CatalogEntry[]),
  ...(legacyMuudKoolid as unknown as CatalogEntry[])
]).sort((a, b) => a.provider.localeCompare(b.provider, "et") || a.name.localeCompare(b.name, "et"));
const legacyIdentityIds = assignSlugs(legacyIdentityEntries, (entry) => `${entry.provider} ${entry.name}`);
const LEGACY_EHIS_IDENTITY_BY_PROGRAMME_ID = new Map<string, EhisIdentityAlias>(
  legacyIdentityEntries.map((entry) => [
    legacyIdentityIds.get(entry) as string,
    { provider: entry.provider, name: entry.name }
  ])
);

/**
 * Return an EHIS matching input for a canonical AMOS row.
 *
 * Only provider/name may come from the historical identity alias. All other
 * properties remain the current AMOS values so `ehisOverrideFor` can fall back
 * only to current facts when an official EHIS value is absent. A new canonical
 * id outside the bounded crosswalk uses its current identity unchanged.
 */
export function entryForEhisMatch(entry: CatalogEntry): CatalogEntry {
  const alias = entry.id ? LEGACY_EHIS_IDENTITY_BY_PROGRAMME_ID.get(entry.id) : undefined;
  return alias ? { ...entry, provider: alias.provider, name: alias.name } : entry;
}

// `import.meta.env` puudub mõnes kontekstis (nt `node --test` floor-gate'is);
// loeme turvaliselt (?.), et moodulit saaks importida ka väljaspool Astro buildi.
const env = (import.meta as ImportMeta).env as Record<string, string | undefined> | undefined;
const FEED_URL = env?.PUBLIC_CATALOG_FEED_URL;
const FEED_TRUSTED = env?.PUBLIC_CATALOG_FEED_TRUSTED === "1";

function isoDate(value: unknown): string | null {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Byte-identical with AMOS mkval-catalog-feed-contract.mjs stableJson(). */
export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (isPlainObject(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

/** AMOS hashes exactly this payload; generatedAt/dataUpdatedAt are deliberately excluded. */
export function recomputeCatalogContentHash(feed: Record<string, unknown>): string {
  const payload = { schemaVersion: feed.schemaVersion, checkedAt: feed.checkedAt, count: feed.count, programs: feed.programs };
  return `sha256:${sha256hex(stableJson(payload))}`;
}

/** `null` means a v1/v2 public feed envelope has a valid declared contentHash. */
export function declaredContentHashError(value: unknown): string | null {
  if (!isPlainObject(value) || !Array.isArray(value.programs)) return "usaldatud feed peab olema JSON-objekt programs[] väljaga";
  if (typeof value.contentHash !== "string" || !/^sha256:[0-9a-f]{64}$/.test(value.contentHash)) return "usaldatud feedi contentHash on vigane";
  return value.contentHash === recomputeCatalogContentHash(value)
    ? null
    : "usaldatud feedi contentHash ei vasta stable-JSON sisule";
}

/** HTTP JSON media type with an optional charset parameter. */
export function matchesJsonContentType(value: string | null): boolean {
  return value?.toLowerCase().split(";", 1)[0].trim() === "application/json";
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

// Byte-identical with AMOS PROGRAMME_REF_RE.
const CANONICAL_PROGRAM_ID = /^[a-z0-9][a-z0-9_-]{1,120}$/;

/** A feed id is AMOS's programme_ref, not a display-name-derived suggestion. */
function canonicalIdError(entries: Array<{ id?: string | null }>, requireEveryId = false): string | null {
  const seen = new Set<string>();
  for (const entry of entries) {
    if (entry.id == null) {
      if (requireEveryId) return "puuduv programmi id";
      continue;
    }
    if (typeof entry.id !== "string" || !CANONICAL_PROGRAM_ID.test(entry.id)) return `vigane programmi id: ${String(entry.id)}`;
    if (seen.has(entry.id)) return `dubleeritud programmi id: ${entry.id}`;
    seen.add(entry.id);
  }
  return null;
}

/**
 * Public-safe fields a `feed.retired[]` row may carry — byte-identical with
 * AMOS's buildMkvalCatalogFeedV2 output. An unlisted key (e.g. a stray
 * `summary`/`goalText`/`price`) fails the WHOLE feed rather than being
 * silently dropped: this is the concrete enforcement of "public-safe fields
 * only, no new personal data" the design demands, not just trust in AMOS.
 */
const RETIRED_ENTRY_KEYS = new Set(["id", "name", "provider", "providerType", "field", "url", "withdrawnOn"]);

/**
 * Validate a `retired[]` array (from either the committed LKG feed or a
 * trusted remote feed). `activeIds` is the SAME feed's active programme ids —
 * a retired id must never collide with a currently-active one (an id can be
 * a tombstone or a live page, never both). Returns an error string (reject
 * the whole feed, same defense-in-depth posture as `canonicalIdError`) or
 * `null` when every row is well-formed.
 */
export function retiredEntriesError(value: unknown, activeIds: Set<string>): string | null {
  if (!Array.isArray(value)) return "retired ei ole massiiv";
  const seen = new Set<string>();
  for (const row of value) {
    if (!isPlainObject(row)) return "retired kirje pole objekt";
    const extra = Object.keys(row).filter((key) => !RETIRED_ENTRY_KEYS.has(key));
    if (extra.length) return `retired kirjel on lubamatu väli: ${extra[0]}`;
    if (typeof row.id !== "string" || !CANONICAL_PROGRAM_ID.test(row.id)) {
      return `retired kirje id on vigane: ${String(row.id)}`;
    }
    if (seen.has(row.id)) return `dubleeritud retired id: ${row.id}`;
    if (activeIds.has(row.id)) return `retired id kattub aktiivse programmiga: ${row.id}`;
    seen.add(row.id);
    if (typeof row.name !== "string" || !row.name.trim()) return `retired kirjel ${row.id} puudub name`;
    if (typeof row.provider !== "string" || !row.provider.trim()) return `retired kirjel ${row.id} puudub provider`;
    if (typeof row.providerType !== "string" || !(PROVIDER_TYPES as readonly string[]).includes(row.providerType)) {
      return `retired kirjel ${row.id} on vigane providerType`;
    }
    if (typeof row.field !== "string" || !(CATALOG_FIELDS as readonly string[]).includes(row.field)) {
      return `retired kirjel ${row.id} on vigane field`;
    }
    if (typeof row.url !== "string" || !/^https?:\/\//.test(row.url)) return `retired kirjel ${row.id} on vigane url`;
    if (!isoDate(row.withdrawnOn)) return `retired kirjel ${row.id} on vigane withdrawnOn`;
  }
  return null;
}

type LkgFeed = {
  schemaVersion: string;
  generatedAt: string;
  checkedAt: string;
  dataUpdatedAt?: string;
  contentHash: string;
  count: number;
  programs: Array<CatalogEntry & { status?: string }>;
  /** Programmes AMOS has MEASURED as withdrawn (isMkvalMeasuredWithdrawal). Optional
   * for backward compatibility with older committed snapshots; absent means `[]`. */
  retired?: RetiredCatalogEntry[];
};

function requirePairedLkgFeed(value: unknown): LkgFeed {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("LKG kataloogifeed pole objekt");
  const feed = value as Partial<LkgFeed>;
  if (!KNOWN_FEED_SCHEMA_VERSIONS.includes(feed.schemaVersion ?? "") || !Array.isArray(feed.programs) || !feed.programs.length) {
    throw new Error("LKG kataloogifeedi skeem või programs[] on vigane");
  }
  if (feed.count !== feed.programs.length || typeof feed.contentHash !== "string" || !isoDate(feed.checkedAt) || typeof feed.generatedAt !== "string") {
    throw new Error("LKG kataloogifeedi count, räsi või kuupäev on vigane");
  }
  const forbidden = findForbiddenFeedKey(feed);
  if (forbidden) throw new Error(`LKG kataloogifeed sisaldab keelatud välja: ${forbidden}`);
  const hashError = declaredContentHashError(feed);
  if (hashError) throw new Error(`LKG kataloogifeedil ${hashError}`);
  const idError = canonicalIdError(feed.programs, true);
  if (idError) throw new Error(`LKG kataloogifeedil on ${idError}`);
  if (feed.retired !== undefined) {
    const activeIds = new Set(feed.programs.map((p) => p.id).filter((id): id is string => typeof id === "string"));
    const retiredError = retiredEntriesError(feed.retired, activeIds);
    if (retiredError) throw new Error(`LKG kataloogifeedi retired[] on vigane: ${retiredError}`);
  }
  return feed as LkgFeed;
}

const pairedLkgFeed = requirePairedLkgFeed(lkgFeed);
const LOCAL_CHECKED_AT = pairedLkgFeed.checkedAt;
const committedEntries: CatalogEntry[] = pairedLkgFeed.programs;
const committedActive: CatalogEntry[] = activeOnly(committedEntries);

/** Mitu kirjet on kommititud LKG snapshotis (aktiivsed) — feedi mitte-regressiooni alus. */
export const committedActiveCount = committedActive.length;

/** Programmid, mille AMOS on MÕÕTNUD mahavõetuks — kommititud snapshoti pool. */
export const committedRetired: RetiredCatalogEntry[] = pairedLkgFeed.retired ?? [];
/** Mitu retired-kirjet kommititud snapshotis — koos `committedActiveCount`-iga
 * moodustab mitte-regressiooni PÕRANDA (aktiivsed + mahavõetud ei tohi kunagi kahaneda). */
export const committedRetiredCount = committedRetired.length;

/**
 * Iga programmi id, mida see sait juba TEAB kommititud snapshotist — kas
 * praegu aktiivsena või juba varem mahavõetuna. See on identiteedi-põhi
 * `retired[]`-i usaldamiseks usaldatud feedis: mitte-regressiooni PÕRAND (vt
 * `chooseCatalogSource`) kontrollib ainult ARVU (aktiivsed + mahavõetud >=
 * kommititud), mis üksi ei tõesta, et retired[] kirjed on PÄRIS programmid —
 * feed saaks võltsida N aktiivse kirje kadumise, täites `retired[]` sama
 * palju VÄLJAMÕELDUD id-dega, ja põrand oleks siiski täidetud. Iga retired
 * id peab kuuluma sellesse hulka, s.t olema programm, mida sait on VAREM
 * kommititult tundnud — muidu on tegu tundmatu (võimalik võltsitud) väitega.
 */
const committedActiveIds = new Set(
  committedActive.map((entry) => entry.id).filter((id): id is string => typeof id === "string")
);
const committedRetiredIds = new Set(committedRetired.map((entry) => entry.id));
export const committedKnownIds = new Set<string>([...committedActiveIds, ...committedRetiredIds]);

export type CatalogSourceName = "committed" | "feed";
type FeedResult = {
  entries: CatalogEntry[];
  retired: RetiredCatalogEntry[];
  checkedAt: string;
  updatedAt: string;
  contentHash: string | null;
  generatedAt: string | null;
  source: CatalogSourceName;
};

/** Kommititud snapshot — autoriteetne vaikeallikas. */
function committedResult(): FeedResult {
  return {
    entries: committedActive,
    retired: committedRetired,
    checkedAt: LOCAL_CHECKED_AT,
    updatedAt: isoDate(pairedLkgFeed.dataUpdatedAt) ?? LOCAL_CHECKED_AT,
    contentHash: pairedLkgFeed.contentHash,
    generatedAt: pairedLkgFeed.generatedAt,
    source: "committed"
  };
}

/** Allika-valiku otsus: kas KASUTA feedi (koos põhjusega) või kommititud snapshotti. */
export type CatalogSourceDecision =
  | { use: "feed"; entries: CatalogEntry[]; retired: RetiredCatalogEntry[]; checkedAt: string; updatedAt: string; contentHash: string | null }
  | { use: "committed"; reason: string };

/**
 * PUHAS otsustusloogika (ilma fetchita) — testitav deterministlikult.
 * Kommititud snapshot on AUTORITEETNE. Usaldatud feedi tohib kasutada AINULT, kui:
 *   1) `feedUrl` on seatud, JA
 *   2) `trusted === true` (PUBLIC_CATALOG_FEED_TRUSTED=1, eksplitsiitne opt-in), JA
 *   3) feed on oodatud kujul (massiiv VÕI { programs: [...] } mitte-tühi), JA
 *   4) feedi aktiivsete + mahavõetud kirjete arv >= kommititud snapshoti oma
 *      (MITTE-REGRESSIOON — vt allpool "4)"). AMOS-i MÕÕDETUD mahavõtt (feed.retired[])
 *      arvestatakse kirjena, mis "kaob" programs[]-ist ilma kirjete kogu kadumiseta —
 *      seletatud kahanemine ja katkine voog on nüüd eristatavad.
 * Iga muu juhul → kommititud snapshot, koos selge põhjusega.
 * `data` on juba parsitud JSON (massiiv VÕI objekt feedist), `null` kui fetch ebaõnnestus.
 * `committedCount` = committedActiveCount + committedRetiredCount (mõlema poole summa —
 * kutsuja vastutus, vt loadCatalogSource).
 * `committedKnownIds` = committedKnownIds (kommititud snapshoti aktiivsete +
 * mahavõetud id-de liit) — iga retired[] id PEAB siin sees olema (vt allpool),
 * muidu ei tõesta arvuline põrand üksi, et mahavõtt puudutab PÄRIS, varem
 * tuntud programmi, mitte võltsitud rida.
 */
export function chooseCatalogSource(opts: {
  feedUrl: string | undefined;
  trusted: boolean;
  data: unknown;
  committedCount: number;
  committedKnownIds: Set<string>;
}): CatalogSourceDecision {
  const { feedUrl, trusted, data, committedCount, committedKnownIds } = opts;
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
  const idError = canonicalIdError(raw, true);
  if (idError) return { use: "committed", reason: `usaldatud feedil on ${idError}` };
  const entries = activeOnly(raw);
  // `retired[]` — AMOS-i MÕÕDETUD mahavõtud. Puudumine tähendab lihtsalt "pole
  // veel ühtegi", MITTE vigast kuju (vanem feed, tagasiühilduvus). Vale kuju
  // (olemas, aga mitte massiiv) või vigane rida keeldub kogu feedist — sama
  // sügavuti-kaitse põhimõte, mis kehtib `raw`/`id` valideerimisel ülal.
  let retired: RetiredCatalogEntry[] = [];
  if (obj && Object.hasOwn(obj, "retired")) {
    const activeIds = new Set(raw.map((p) => p.id).filter((id): id is string => typeof id === "string"));
    const retiredError = retiredEntriesError(obj.retired, activeIds);
    if (retiredError) return { use: "committed", reason: `usaldatud feedi retired[] on vigane: ${retiredError}` };
    retired = obj.retired as RetiredCatalogEntry[];
    // IDENTITEEDI-PÕHI: iga retired id peab olema programm, mida see sait
    // JUBA VAREM kommititult tundis (praegu aktiivsena või juba varem
    // mahavõetuna) — mitte suvaline uus string. Ilma selleta saaks feed
    // kaotada N PÄRIS aktiivset kirjet ja täita `retired[]` sama palju
    // väljamõeldud ridadega: arvuline põrand allpool oleks täidetud, kuid
    // väide ("see programm on mahavõetud") oleks kontrollimatu.
    const unknownRow = retired.find((row) => !committedKnownIds.has(row.id));
    if (unknownRow) {
      return {
        use: "committed",
        reason: `usaldatud feedi retired[] väidab tundmatu programmi mahavõttu (id: ${unknownRow.id}) — pole varem kommititud kataloogis tuntud`
      };
    }
  }
  // MITTE-REGRESSIOON: usaldatud feed ei tohi kunagi kaotada kirjeid — aktiivsed +
  // mahavõetud kokku peavad katma kommititud põranda. Nii annab AMOS-i SELETATUD
  // kahanemine (programm liigub programs[]-ist retired[]-i) läbi täpselt, samas
  // kui katkine voog (kirjed lihtsalt kaovad, ilma retired[] kirjeta) jääb kinni.
  const floor = entries.length + retired.length;
  if (floor < committedCount) {
    return {
      use: "committed",
      reason: `usaldatud feed kaotaks kirjeid (${entries.length} aktiivset + ${retired.length} mahavõetut = ${floor} < kommititud ${committedCount}) → keeldun`
    };
  }
  const checkedAt = obj ? (isoDate(obj.checkedAt) ?? LOCAL_CHECKED_AT) : LOCAL_CHECKED_AT;
  // `checkedAt` = viimati koolide lehtedega VÕRRELDUD (liigub igal kontrollil,
  // ka kui miski ei muutunud). `updatedAt` = andmed viimati MUUTUSID: eelista
  // AMOS-i `dataUpdatedAt` väli; kui puudub (vanem feed), taandu generatedAt-le.
  const updatedAt = obj ? (isoDate(obj.dataUpdatedAt) ?? isoDate(obj.generatedAt) ?? isoDate(obj.updatedAt) ?? checkedAt) : checkedAt;
  const contentHash = obj && typeof obj.contentHash === "string" ? (obj.contentHash as string) : null;
  return { use: "feed", entries, retired, checkedAt, updatedAt, contentHash };
}

/**
 * Vali andmeallikas build-ajal. Teeb fetchi AINULT siis, kui feed on seatud JA
 * usaldatud, ja annab otsuse `chooseCatalogSource`-le (kogu otsustusloogika seal,
 * testitav). Iga keeldumise korral logime SELGELT, miks langesime tagasi
 * kommititud snapshotile (autoriteetne).
 */
async function loadCatalogSource(): Promise<FeedResult> {
  if (!FEED_URL || !FEED_TRUSTED) {
    const decision = chooseCatalogSource({ feedUrl: FEED_URL, trusted: FEED_TRUSTED, data: null, committedCount: committedActiveCount + committedRetiredCount, committedKnownIds });
    if (decision.use === "committed") console.warn(`[catalog] ${decision.reason}`);
    return committedResult();
  }
  let data: unknown = null;
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 10_000);
  try {
    const res = await fetch(FEED_URL, { signal: abort.signal });
    if (res.ok) {
      if (!matchesJsonContentType(res.headers.get("content-type"))) {
        console.warn("[catalog] usaldatud feedil on vale HTTP Content-Type");
      } else {
        const parsed = await res.json();
        const hashError = declaredContentHashError(parsed);
        if (hashError) console.warn(`[catalog] ${hashError}`);
        else data = parsed;
      }
    } else {
      console.warn(`[catalog] usaldatud feed ei vasta (HTTP ${res.status})`);
    }
  } catch (e) {
    console.warn(`[catalog] usaldatud feedi laadimine ebaõnnestus: ${(e as Error).message}`);
  } finally {
    clearTimeout(timeout);
  }
  const decision = chooseCatalogSource({ feedUrl: FEED_URL, trusted: FEED_TRUSTED, data, committedCount: committedActiveCount + committedRetiredCount, committedKnownIds });
  if (decision.use === "feed") {
    console.log(`[catalog] usaldatud AMOS feed (mitte-regresseeruv): ${decision.entries.length} programmi, ${decision.retired.length} mahavõetut (${FEED_URL})`);
    const generatedAt = typeof (data as Record<string, unknown>).generatedAt === "string"
      ? (data as Record<string, string>).generatedAt
      : null;
    return { entries: decision.entries, retired: decision.retired, checkedAt: decision.checkedAt, updatedAt: decision.updatedAt, contentHash: decision.contentHash, generatedAt, source: "feed" };
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
/** Usaldatud feedi täpne genereerimishetk; CC-release seotuse kontrolliks. */
export const catalogFeedGeneratedAt = feed.generatedAt;

/** Kataloogi kirje koos püsiva slugiga (/kataloog/<slug>/) ja EHIS-i ametliku
 * päritoluga. `ehis` on iga kirje küljes: sobitatud kirjel `authoritative: true`
 * ja name/EAP/keel on EHIS-ist (FAKTID) üle kirjutatud, EHIS ametlikud
 * õpiväljundid on `ehis.ehisOutcomes` all. Kooli ENDA kirjeldus (summary,
 * goalText, kooli enda `outcomes`) JÄÄB puutumata — detaillehel kuvatakse MÕLEMAD.
 * Sobimata kirjel `authoritative: false` ja per-school faktid jäävad puutumata. */
export type CatalogEntryWithSlug = CatalogEntry & {
  slug: string;
  ehis: EhisAuthoritative;
};

const sorted: CatalogEntry[] = feed.entries
  .slice()
  .sort((a, b) => a.provider.localeCompare(b.provider, "et") || a.name.localeCompare(b.name, "et"));

export const catalog: CatalogEntryWithSlug[] = sorted.map((entry) => {
  const parsed = parseIntakeDates(entry.intakeText);
  // Ametlik allikas: EHIS (avaandmed). Sobitatud kirjel kirjutame EHIS-ist üle
  // ainult FAKTID (name/EAP/keel). Kirjeldav kiht (summary/goalText/outcomes)
  // EI muutu — kooli enda õpiväljundid jäävad alles ja EHIS ametlikud
  // õpiväljundid sõidavad kaasa `ehis.ehisOutcomes` all (detaillehel MÕLEMAD).
  // Kureeritud `field` (navigatsiooni taksonoomia) JÄÄB puutumata; EHIS-i
  // õppekavarühm lisatakse `ehis.fieldCode/fieldName` kaudu.
  // Prefer the current AMOS identity. Some provider listings rename a programme
  // between intakes (year suffixes, translated titles, generic listing labels);
  // only when that current identity has no official EHIS match do we retry with
  // the bounded historical provider/name alias. This preserves newly valid
  // current-name matches while recovering renamed listings. The returned
  // official patch/metadata is applied to the current AMOS row; no legacy URL,
  // prose, intake, price, outcomes or other facts can enter the result.
  const currentOverride = ehisOverrideFor(entry);
  const legacyMatchEntry = entryForEhisMatch(entry);
  const { patch, ehis } =
    currentOverride.ehis.authoritative || legacyMatchEntry === entry
      ? currentOverride
      : ehisOverrideFor(legacyMatchEntry, entry);
  return {
    ...entry,
    ...patch,
    // Both runtime sources are canonical AMOS feeds and have already passed
    // the required, unique programme-id gate above.
    slug: entry.id as string,
    registrationDeadline: entry.registrationDeadline ?? parsed.registrationDeadline,
    startDate: entry.startDate ?? parsed.startDate,
    ehis
  };
});

/** Slug -> kirje, programmilehe (getStaticPaths) ja masinliideste jaoks. */
export const bySlug = new Map(catalog.map((entry) => [entry.slug, entry]));

/** Kirje, mille AMOS on MÕÕTNUD mahavõetuks — koos oma slugiga (/kataloog/<id>/). Never
 * merged into `catalog`/`bySlug`: jääb väljapoole aktiivsest kataloogist, loendustest,
 * võrdlustest ja sitemapist — vt src/pages/kataloog/[slug].astro ja gen-slug-redirects.mjs. */
export type RetiredCatalogEntryWithSlug = RetiredCatalogEntry & { slug: string };
export const catalogRetired: RetiredCatalogEntryWithSlug[] = feed.retired
  .slice()
  .sort((a, b) => a.id.localeCompare(b.id))
  .map((entry) => ({ ...entry, slug: entry.id }));
export const retiredBySlug = new Map(catalogRetired.map((entry) => [entry.slug, entry]));

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
