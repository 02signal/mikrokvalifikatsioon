import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { catalog, type CatalogEntryWithSlug } from "./catalog/index.ts";
import {
  catalogCheckedAt,
  catalogContentHash,
  catalogFeedGeneratedAt,
  catalogSource
} from "./catalog/index.ts";

/** The only CC profile accepted by this public catalogue release. */
export const CC_CONTEXT = "https://credentialcommons.org/profiles/context/haridus.jsonld";
const RECEIPT_SCHEMA = "amos.mkval.catalog_cc_receipt/v1";
const EXPORT_SCHEMA = "amos.mkval.catalog_cc_export/v1";
const PROFILE = "micro-credential";
const PROFILE_COMMIT = "00980d1ff6a756efbf579cd63a4aa2cabeecf624";
const PROFILE_CONTEXT_SHA256 = "sha256:3f9d473145c7165df82f2c72eeb942fa92a3b635e33992d3859a1d726c022e9f";
const PROFILE_SHAPE_SHA256 = "sha256:cf6f0cccaf2c4ac6f611fb00198d841c83103b89342d9214c763291d77d5627b";
const JSON_LD_CONTENT_TYPE = "application/ld+json";
const OMISSION_REASON_KEYS = [
  "missing_name",
  "invalid_name_datatype",
  "missing_ects",
  "missing_language",
  "missing_provider"
] as const;

type JsonObject = Record<string, unknown>;
export type CredentialCommonsNode = JsonObject & { "@id": string; "@type": "MicroCredential" };
export type CredentialCommonsRelease = {
  graphText: string;
  receipt: JsonObject;
  nodesById: Map<string, CredentialCommonsNode>;
  origin: "warehouse" | "lkg";
};

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sha256(text: string): string {
  return `sha256:${createHash("sha256").update(text, "utf8").digest("hex")}`;
}

export function matchesContentType(value: string | null, expected: string): boolean {
  return value?.toLowerCase().split(";", 1)[0].trim() === expected;
}

function hasContentType(response: Response, expected: string): boolean {
  return matchesContentType(response.headers.get("content-type"), expected);
}

function runRefFor(generatedAt: string): string | null {
  const match = generatedAt.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?Z$/);
  return match ? `mkval_${match[1]}${match[2]}${match[3]}T${match[4]}${match[5]}${match[6]}Z` : null;
}

function omissionAccountingError(receipt: JsonObject): string | null {
  const omitted = receipt.omitted_row_count;
  const reasons = receipt.omitted_reason_counts;
  if (!Number.isInteger(omitted) || Number(omitted) < 0 || !isObject(reasons)) {
    return "CC-kviitungi omission-arvestus on vigane";
  }
  const actualKeys = Object.keys(reasons).sort();
  const expectedKeys = [...OMISSION_REASON_KEYS].sort();
  if (actualKeys.length !== expectedKeys.length || actualKeys.some((key, index) => key !== expectedKeys[index])) {
    return "CC-kviitungi omission-põhjuste võtmed ei vasta AMOS lepingule";
  }
  let occurrences = 0;
  for (const key of OMISSION_REASON_KEYS) {
    const count = reasons[key];
    if (!Number.isInteger(count) || Number(count) < 0 || Number(count) > Number(omitted)) {
      return `CC-kviitungi omission-põhjuse ${key} arv on vigane`;
    }
    occurrences += Number(count);
  }
  if ((Number(omitted) === 0 && occurrences !== 0) || (Number(omitted) > 0 && occurrences < Number(omitted))) {
    return "CC-kviitungi omission-põhjuste koguarv ei kata välja jäetud ridu";
  }
  return null;
}

/**
 * Pure release gate. It verifies the exact graph bytes against the receipt,
 * fixed CC profile pins, and (for a live warehouse candidate) the exact feed
 * identity that the human catalogue already accepted for this build.
 */
export function validateCredentialCommonsRelease(input: {
  graphText: string;
  receiptData: unknown;
  feedIdentity?: {
    contentHash: string | null;
    generatedAt: string | null;
    checkedAt: string;
    count: number;
    programmeIds: string[];
  };
}): { ok: true; release: Omit<CredentialCommonsRelease, "origin"> } | { ok: false; reason: string } {
  let graphData: unknown;
  try {
    graphData = JSON.parse(input.graphText);
  } catch {
    return { ok: false, reason: "CC-graaf ei ole JSON" };
  }
  if (!isObject(graphData) || !isObject(input.receiptData)) return { ok: false, reason: "CC-graafi või kviitungi kuju on vigane" };
  const graph = graphData;
  const receipt = input.receiptData;
  const nodes = graph["@graph"];
  if (graph["@context"] !== CC_CONTEXT || graph.schemaVersion !== EXPORT_SCHEMA || !Array.isArray(nodes)) {
    return { ok: false, reason: "CC-graafi kontekst, skeem või @graph ei vasta lepingule" };
  }
  if (
    receipt.schema_version !== RECEIPT_SCHEMA || receipt.profile !== PROFILE ||
    receipt.profile_commit !== PROFILE_COMMIT || receipt.profile_context_sha256 !== PROFILE_CONTEXT_SHA256 ||
    receipt.profile_shape_sha256 !== PROFILE_SHAPE_SHA256 || receipt.profile_violation_gate !== "amos.mkval.cc_profile_violation_gate/v1"
  ) return { ok: false, reason: "CC-kviitungi profiilipin ei vasta lepingule" };
  // The current v1 warehouse receipt has no content_type field. If a later
  // receipt adds one, accepting another media type would weaken this contract.
  if (receipt.content_type !== undefined && receipt.content_type !== JSON_LD_CONTENT_TYPE) {
    return { ok: false, reason: "CC-kviitungi content_type ei ole application/ld+json" };
  }
  if (receipt.graph_sha256 !== sha256(input.graphText)) return { ok: false, reason: "CC-graafi baitide räsi ei vasta kviitungile" };
  if (
    !Number.isInteger(receipt.view_count) || Number(receipt.view_count) < 0 ||
    !Number.isInteger(receipt.emitted_count) || Number(receipt.emitted_count) < 0
  ) return { ok: false, reason: "CC-kviitungi rea-arvud on vigased" };
  const omissionError = omissionAccountingError(receipt);
  if (omissionError) return { ok: false, reason: omissionError };
  if (
    graph.runRef !== receipt.run_ref || graph.generatedAt !== receipt.generated_at || graph.checkedAt !== receipt.checked_at ||
    graph.sourceFeedHash !== receipt.feed_hash || nodes.length !== receipt.emitted_count ||
    receipt.view_count !== Number(receipt.emitted_count) + Number(receipt.omitted_row_count)
  ) return { ok: false, reason: "CC-graafi, kviitungi või arvude identiteedid ei ühti" };
  if (typeof graph.generatedAt !== "string" || graph.runRef !== runRefFor(graph.generatedAt)) {
    return { ok: false, reason: "CC runRef ei tulene genereerimisajast" };
  }
  const nodesById = new Map<string, CredentialCommonsNode>();
  for (const node of nodes) {
    if (!isObject(node) || typeof node["@id"] !== "string" || node["@type"] !== "MicroCredential") {
      return { ok: false, reason: "CC @graph sisaldab vigast mikrokvalifikatsiooni" };
    }
    nodesById.set(node["@id"], node as CredentialCommonsNode);
  }
  if (nodesById.size !== nodes.length) return { ok: false, reason: "CC @graph sisaldab dubleeritud @id väärtusi" };
  if (input.feedIdentity) {
    const feed = input.feedIdentity;
    const programmeIds = new Set(feed.programmeIds);
    if (
      !feed.contentHash || graph.sourceFeedHash !== feed.contentHash || graph.generatedAt !== feed.generatedAt ||
      graph.checkedAt !== feed.checkedAt || receipt.view_count !== feed.count ||
      feed.programmeIds.length !== feed.count || programmeIds.size !== feed.count
    ) return { ok: false, reason: "CC-väljalase ei vasta selle buildi aktiivsele feedile" };
    const catalogUrls = new Set(
      [...programmeIds].map((id) => `https://mikrokvalifikatsioon.ee/kataloog/${id}/`)
    );
    for (const id of nodesById.keys()) {
      if (!catalogUrls.has(id)) return { ok: false, reason: `CC @graph sisaldab aktiivse kataloogi välist @id väärtust: ${id}` };
    }
    if (catalogUrls.size - nodesById.size !== receipt.omitted_row_count) {
      return { ok: false, reason: "CC profiili omission-arv ei vasta aktiivsele kataloogile" };
    }
  }
  return { ok: true, release: { graphText: input.graphText, receipt, nodesById } };
}

// Vite relocates server modules into `dist/chunks`, so resolve these committed
// build inputs from the project root rather than from the compiled module URL.
const LKG_DIR = join(process.cwd(), "src/data/catalog/credential-commons-lkg");
const lkgGraphText = readFileSync(join(LKG_DIR, "catalog.cc.jsonld"), "utf8");
const lkgReceipt = JSON.parse(readFileSync(join(LKG_DIR, "cc-projection-receipt.json"), "utf8")) as unknown;

function requireLkg(): CredentialCommonsRelease {
  if (catalogSource !== "committed") throw new Error("LKG-d ei tohi kasutada usaldatud feedi põlvkonna asendusena");
  const validated = validateCredentialCommonsRelease({
    graphText: lkgGraphText,
    receiptData: lkgReceipt,
    feedIdentity: {
      contentHash: catalogContentHash,
      generatedAt: catalogFeedGeneratedAt,
      checkedAt: catalogCheckedAt,
      count: catalog.length,
      programmeIds: catalog.map((entry) => entry.id as string)
    }
  });
  if (!validated.ok) throw new Error(`LKG CC-väljalase on vigane: ${validated.reason}`);
  return { ...validated.release, origin: "lkg" };
}

const env = (import.meta as ImportMeta).env as Record<string, string | undefined> | undefined;
const CC_URL = env?.PUBLIC_CATALOG_CC_URL;
const CC_RECEIPT_URL = env?.PUBLIC_CATALOG_CC_RECEIPT_URL;
const CC_TRUSTED = env?.PUBLIC_CATALOG_CC_TRUSTED === "1";

async function loadReleaseWithCatalogCount(): Promise<CredentialCommonsRelease> {
  if (catalogSource !== "feed") return requireLkg();
  if (!CC_TRUSTED || !CC_URL || !CC_RECEIPT_URL) {
    throw new Error("Usaldatud katalogifeediga build nõuab PUBLIC_CATALOG_CC_URL, PUBLIC_CATALOG_CC_RECEIPT_URL ja PUBLIC_CATALOG_CC_TRUSTED=1");
  }
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 10_000);
  try {
    const [graphResponse, receiptResponse] = await Promise.all([
      fetch(CC_URL, { signal: abort.signal }),
      fetch(CC_RECEIPT_URL, { signal: abort.signal })
    ]);
    if (!graphResponse.ok || !receiptResponse.ok) throw new Error(`HTTP ${graphResponse.status}/${receiptResponse.status}`);
    if (!hasContentType(graphResponse, JSON_LD_CONTENT_TYPE) || !hasContentType(receiptResponse, "application/json")) {
      throw new Error("CC-graafi või kviitungi HTTP Content-Type ei vasta lepingule");
    }
    const validated = validateCredentialCommonsRelease({
      graphText: await graphResponse.text(),
      receiptData: await receiptResponse.json(),
      feedIdentity: {
        contentHash: catalogContentHash,
        generatedAt: catalogFeedGeneratedAt,
        checkedAt: catalogCheckedAt,
        count: catalog.length,
        programmeIds: catalog.map((entry) => entry.id as string)
      }
    });
    if (!validated.ok) throw new Error(validated.reason);
    console.log(`[cc] warehouse-kanooniline CC-väljalase: ${validated.release.nodesById.size} kirjet`);
    return { ...validated.release, origin: "warehouse" };
  } catch (error) {
    // A trusted feed and a mismatching CC graph are two different generations.
    // Failing this build preserves the last coherent deployment rather than
    // publishing a human catalogue and machine graph that disagree.
    throw new Error(`Warehouse CC-väljalase tagasi lükatud (fail-closed): ${(error as Error).message}`);
  } finally {
    clearTimeout(timeout);
  }
}

/** One validated canonical graph for all site CC surfaces in this static build. */
export const credentialCommonsRelease = await loadReleaseWithCatalogCount();

export function credentialCommonsNodeFor(entry: CatalogEntryWithSlug): CredentialCommonsNode | null {
  return credentialCommonsRelease.nodesById.get(`https://mikrokvalifikatsioon.ee/kataloog/${entry.id}/`) ?? null;
}
