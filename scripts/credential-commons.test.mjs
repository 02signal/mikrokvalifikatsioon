import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  credentialCommonsNodeFor,
  credentialCommonsRelease,
  matchesContentType,
  validateCredentialCommonsRelease
} from "../src/data/credentialCommons.ts";
import { catalog } from "../src/data/catalog/index.ts";

const graphText = readFileSync(new URL("../src/data/catalog/credential-commons-lkg/catalog.cc.jsonld", import.meta.url), "utf8");
const receipt = JSON.parse(readFileSync(new URL("../src/data/catalog/credential-commons-lkg/cc-projection-receipt.json", import.meta.url), "utf8"));
const graph = JSON.parse(graphText);
const feedIdentity = {
  contentHash: graph.sourceFeedHash,
  generatedAt: graph.generatedAt,
  checkedAt: graph.checkedAt,
  count: catalog.length,
  programmeIds: catalog.map((entry) => entry.id)
};
const catalogUrls = new Set(feedIdentity.programmeIds.map((id) => `https://mikrokvalifikatsioon.ee/kataloog/${id}/`));
const graphIds = new Set(graph["@graph"].map((node) => node["@id"]));

test("CC LKG: exact warehouse graph and receipt pass the pinned profile gate", () => {
  const result = validateCredentialCommonsRelease({ graphText, receiptData: receipt, feedIdentity });
  assert.equal(result.ok, true, result.ok ? "" : result.reason);
  assert.equal(credentialCommonsRelease.nodesById.size, receipt.emitted_count);
  assert.equal(credentialCommonsRelease.graphText, graphText, "the site must mirror canonical graph bytes unchanged");
});

test("CC gate: one changed graph byte is rejected by the receipt hash", () => {
  const result = validateCredentialCommonsRelease({ graphText: graphText.replace("MicroCredential", "MicroCredentialX"), receiptData: receipt });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.reason, /räsi/);
});

test("CC gate: an altered profile pin or content type is rejected", () => {
  const badPin = { ...receipt, profile_commit: "0".repeat(40) };
  const badType = { ...receipt, content_type: "application/json" };
  assert.equal(validateCredentialCommonsRelease({ graphText, receiptData: badPin }).ok, false);
  assert.equal(validateCredentialCommonsRelease({ graphText, receiptData: badType }).ok, false);
});

test("CC transport: graph and receipt content types allow charset but nothing broader", () => {
  assert.equal(matchesContentType("application/ld+json; charset=utf-8", "application/ld+json"), true);
  assert.equal(matchesContentType("application/json; charset=utf-8", "application/json"), true);
  assert.equal(matchesContentType("application/json", "application/ld+json"), false);
  assert.equal(matchesContentType(null, "application/json"), false);
});

test("CC gate: duplicate credential identifiers are rejected after a valid receipt hash", () => {
  const duplicateGraph = { ...graph, "@graph": [...graph["@graph"], graph["@graph"][0]] };
  const duplicateText = JSON.stringify(duplicateGraph, null, 2);
  const duplicateReceipt = {
    ...receipt,
    emitted_count: duplicateGraph["@graph"].length,
    view_count: duplicateGraph["@graph"].length + receipt.omitted_row_count,
    graph_sha256: `sha256:${createHash("sha256").update(duplicateText).digest("hex")}`
  };
  const result = validateCredentialCommonsRelease({ graphText: duplicateText, receiptData: duplicateReceipt });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.reason, /dubleeritud/);
});

test("CC gate: live CC must identify the same active feed generation", () => {
  const result = validateCredentialCommonsRelease({
    graphText,
    receiptData: receipt,
    feedIdentity: {
      contentHash: graph.sourceFeedHash,
      generatedAt: graph.generatedAt,
      checkedAt: graph.checkedAt,
      count: receipt.view_count - 1,
      programmeIds: feedIdentity.programmeIds
    }
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.reason, /aktiivsele feedile/);
});

test("CC LKG: profile omissions remain omissions (no site-side synthesis)", () => {
  assert.equal(receipt.view_count - receipt.emitted_count, receipt.omitted_row_count);
  const omittedUrls = [...catalogUrls].filter((url) => !graphIds.has(url));
  assert.equal(omittedUrls.length, receipt.omitted_row_count);
  if (receipt.omitted_row_count > 0) {
    const omittedEntry = catalog.find((entry) => credentialCommonsNodeFor(entry) === null);
    assert.ok(omittedEntry, "a receipt with omissions must identify at least one omitted catalogue row");
    assert.equal(credentialCommonsNodeFor(omittedEntry), null);
  }
});

test("CC paired release: every graph @id maps to one dereferenceable canonical catalog page", () => {
  assert.equal(catalog.length, receipt.view_count, "committed human catalog must be the receipt's paired feed");
  assert.equal(graphIds.size, receipt.emitted_count);
  for (const id of graphIds) {
    const parsed = new URL(id);
    assert.equal(parsed.origin, "https://mikrokvalifikatsioon.ee");
    assert.match(parsed.pathname, /^\/kataloog\/[a-z0-9][a-z0-9_-]{1,120}\/$/);
    assert.ok(catalogUrls.has(id), `${id} needs a static catalogue page from its canonical programme id`);
  }
});

test("CC gate: same-count orphan @id is rejected against the active catalog", () => {
  const alteredGraph = {
    ...graph,
    "@graph": graph["@graph"].map((node, index) => index === 0
      ? { ...node, "@id": "https://mikrokvalifikatsioon.ee/kataloog/orphan-not-in-feed/" }
      : node)
  };
  const alteredText = JSON.stringify(alteredGraph, null, 2);
  const alteredReceipt = {
    ...receipt,
    graph_sha256: `sha256:${createHash("sha256").update(alteredText).digest("hex")}`
  };
  const result = validateCredentialCommonsRelease({
    graphText: alteredText,
    receiptData: alteredReceipt,
    feedIdentity
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.reason, /aktiivse kataloogi välist/);
});

test("CC omission accounting: one omitted row may carry multiple valid reasons", () => {
  const syntheticReceipt = {
    ...receipt,
    view_count: graph["@graph"].length + 2,
    emitted_count: graph["@graph"].length,
    omitted_row_count: 2,
    omitted_reason_counts: {
      missing_name: 2,
      invalid_name_datatype: 0,
      missing_ects: 1,
      missing_language: 0,
      missing_provider: 0
    }
  };
  const result = validateCredentialCommonsRelease({ graphText, receiptData: syntheticReceipt });
  assert.equal(result.ok, true, result.ok ? "" : result.reason);
});

test("CC omission accounting: missing and unknown reason keys are rejected", () => {
  const { missing_provider: _removed, ...missingKeyCounts } = receipt.omitted_reason_counts;
  const missingKey = {
    ...receipt,
    omitted_reason_counts: missingKeyCounts
  };
  const unknownKey = {
    ...receipt,
    omitted_reason_counts: { ...receipt.omitted_reason_counts, future_unknown_reason: 0 }
  };
  for (const candidate of [missingKey, unknownKey]) {
    const result = validateCredentialCommonsRelease({ graphText, receiptData: candidate });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.reason, /võtmed/);
  }
});

test("CC omission accounting: negative, fractional, over-row and uncovered counts are rejected", () => {
  const candidates = [
    { ...receipt.omitted_reason_counts, missing_ects: -1 },
    { ...receipt.omitted_reason_counts, missing_ects: 0.5 },
    { ...receipt.omitted_reason_counts, missing_ects: receipt.omitted_row_count + 1 },
    Object.fromEntries(Object.keys(receipt.omitted_reason_counts).map((key) => [key, 0]))
  ];
  for (const counts of candidates) {
    const result = validateCredentialCommonsRelease({
      graphText,
      receiptData: { ...receipt, omitted_reason_counts: counts }
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.reason, /omission/);
  }
});
