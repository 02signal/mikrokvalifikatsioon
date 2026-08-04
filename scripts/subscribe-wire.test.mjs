// Wire-contract test for api/subscribe.js (the mkval↔AMOS capture hop).
//
// The AMOS lead_capture ingress ALLOW-LISTS payload keys and rejects unknown ones (422).
// This repo has silently lost demand signals at this hop before (funding_route, combo,
// slugs — review item C4 / AMOS PBI-ACC-HARDEN-04). This test pins the contract so the
// drop class cannot return: every capture kind must forward ONLY allow-listed keys, and
// each /konto/ semantic key must fold into the slot AMOS actually accepts.
//
// Zero deps (node:test). Runs as the first step of `npm run build` — the pre-commit gate.
import test from "node:test";
import assert from "node:assert/strict";
import handler from "../api/subscribe.js";

// The single source of truth for this test = the AMOS ingress allow-list. If AMOS changes
// its allowedPayloadFields, update this set IN LOCKSTEP (the cross-repo half is AMOS
// PBI-ACC-HARDEN-04: publish one shared capture-wire contract both repos consume).
const AMOS_ALLOWED_PAYLOAD_FIELDS = new Set([
  "kind", "email", "interest_topic", "topic", "field",
  "outcomes", "consent_purpose", "source_site", "captured_at",
]);

// Capture one forwarded envelope by mocking fetch + the Vercel res object.
async function forward(body) {
  let envelope = null;
  const prevFetch = globalThis.fetch;
  globalThis.fetch = async (_url, opts) => { envelope = JSON.parse(opts.body); return { ok: true, status: 200 }; };
  process.env.AMOS_TOPIC_CAPTURE_URL = "https://amos.example/api/outreach/v1/mkval-topic-capture";
  const out = { code: 0, body: null };
  const res = {
    setHeader() {}, status(c) { out.code = c; return this; }, json(b) { out.body = b; return this; },
  };
  try { await handler({ method: "POST", body }, res); } finally { globalThis.fetch = prevFetch; }
  return { envelope, out };
}

const onlyAllowedKeys = (env) => Object.keys(env).filter((k) => !AMOS_ALLOWED_PAYLOAD_FIELDS.has(k));

test("every capture/account kind forwards ONLY AMOS-allow-listed keys", async () => {
  const cases = [
    { kind: "topic_subscribe", email: "x@y.ee", topic: "mikrokvalifikatsioon" },
    { kind: "outcome_package", email: "x@y.ee", outcomes: ["oskab x"] },
    { kind: "account_create", email: "x@y.ee", outcomes: ["oskab y"] },             // alias → account_created
    { kind: "deadline_reminder", email: "x@y.ee", slugs: ["a-tase-5", "b-tase-4"] }, // alias → reminder_subscribed
    { kind: "notify_list", email: "x@y.ee", field: "andmeanalüüs", combo: null },    // alias → combo_waitlist (valdkond)
    { kind: "notify_list", email: "x@y.ee", field: null, combo: ["SQL", "viz"] },    // combo_waitlist (kombinatsioon)
    { kind: "funding_profile", email: "x@y.ee", funding_route: "toetus" },           // alias → funding_profile_set
  ];
  for (const body of cases) {
    const { envelope } = await forward(body);
    assert.ok(envelope, `${body.kind}: nothing forwarded`);
    assert.deepEqual(onlyAllowedKeys(envelope), [], `${body.kind} forwarded non-allow-listed key(s)`);
  }
});

test("funding band folds into the accepted `field` slot (not a rejected funding_route key)", async () => {
  const { envelope } = await forward({ kind: "funding_profile", email: "x@y.ee", funding_route: "toetus" });
  assert.equal(envelope.kind, "funding_profile_set");
  assert.equal(envelope.field, "rahastus_toetus");
  assert.ok(!("funding_route" in envelope));
});

test("combo + slugs demand context fold into the accepted `outcomes` array", async () => {
  const combo = await forward({ kind: "notify_list", email: "x@y.ee", combo: ["SQL alused", "viz"] });
  assert.deepEqual(combo.envelope.outcomes, ["SQL alused", "viz"]);
  assert.ok(!("combo" in combo.envelope));

  const rem = await forward({ kind: "deadline_reminder", email: "x@y.ee", slugs: ["a-tase-5", "b-tase-4"] });
  assert.deepEqual(rem.envelope.outcomes, ["a-tase-5", "b-tase-4"]);
  assert.ok(!("slugs" in rem.envelope));
});

test("account deletion routes to erasure, NEVER to capture/subscribe (GDPR Art. 17)", async () => {
  const ERASURE_URL = "https://amos.example/api/outreach/v1/erasure";
  const CAPTURE_URL = "https://amos.example/api/outreach/v1/mkval-topic-capture";
  const calls = [];
  const prevFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => { calls.push({ url, body: JSON.parse(opts.body) }); return { ok: true, status: 200 }; };
  const savedCap = process.env.AMOS_TOPIC_CAPTURE_URL;
  const savedEra = process.env.AMOS_ERASURE_URL;
  process.env.AMOS_TOPIC_CAPTURE_URL = CAPTURE_URL;
  process.env.AMOS_ERASURE_URL = ERASURE_URL;
  const out = { code: 0, body: null };
  const res = { setHeader() {}, status(c) { out.code = c; return this; }, json(b) { out.body = b; return this; } };
  try {
    await handler({ method: "POST", body: { kind: "account_delete", email: "x@y.ee" } }, res);
  } finally {
    globalThis.fetch = prevFetch;
    process.env.AMOS_TOPIC_CAPTURE_URL = savedCap;
    if (savedEra === undefined) delete process.env.AMOS_ERASURE_URL; else process.env.AMOS_ERASURE_URL = savedEra;
  }
  assert.equal(calls.length, 1, "exactly one downstream call");
  assert.equal(calls[0].url, ERASURE_URL, "must hit the erasure endpoint, not capture");
  assert.notEqual(calls[0].url, CAPTURE_URL);
  // erasure envelope shape, not a subscription
  assert.equal(calls[0].body.scope, "all_outreach_data");
  assert.equal(calls[0].body.status, "received");
  assert.ok(!("interest_topic" in calls[0].body), "erasure must not carry a subscription topic");
  assert.equal(out.body?.status, "erasure_requested");
});
