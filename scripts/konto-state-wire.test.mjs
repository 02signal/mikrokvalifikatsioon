// Wire-contract test for fetchState() (konto face → AMOS /state, flag-gated).
//
// Pins the LIVE CONTRACT Codex shipped and the ADDITIVE change made here:
//   GET {base}/api/konto/v1/state   Authorization: Bearer <session>
//   returns { email_masked: string|null, subscriptions: [...], packages: [...] }
// fetchState() now passes email_masked + subscriptions THROUGH (it previously
// dropped them and returned only { packages }). The request/auth/session logic
// is UNCHANGED — only the parsed return shape grew. This test makes the
// pass-through (and its null/empty fallbacks) impossible to regress.
//
// DOM-/Vite-free seam: konto-api.ts reads its base from import.meta.env (absent
// in Node) OR the `globalThis.__MKVAL_KONTO_BASE__` test fallback. We inject a
// fake `fetch` + `localStorage` so Node type-strips the .ts and runs the real
// function — same first-step-of-`npm run build` gate as the sibling tests.
import test from "node:test";
import assert from "node:assert/strict";

const BASE = "https://amos.example";
const SESSION = "sess-state-1";
const SESSION_KEY = "mkval:konto_session";

function seedSession(token = SESSION) {
  const m = new Map(token ? [[SESSION_KEY, token]] : []);
  globalThis.localStorage = {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
  return m;
}

async function loadWithFetch(fetchImpl) {
  globalThis.__MKVAL_KONTO_BASE__ = BASE;
  globalThis.fetch = fetchImpl;
  const mod = await import(`../src/lib/konto-api.ts?case=${Math.random()}`);
  return mod;
}

// ── Happy path: GET bearer-only, email_masked + subscriptions passed through ──
test("fetchState passes email_masked + subscriptions through (and packages)", async () => {
  seedSession();
  let seen = null;
  const m = await loadWithFetch(async (u, opts) => {
    seen = { u, opts };
    return {
      ok: true,
      status: 200,
      json: async () => ({
        email_masked: "a***@ettevote.ee",
        subscriptions: [{ ref: "sub_1", kind: "field", label_ref: "Personalitöö", state: "active" }],
        packages: [{ package_ref: "pkg_x", outcome_refs: ["out_a"], weight: 0 }],
      }),
    };
  });

  const r = await m.fetchState();

  // Endpoint + bearer-only GET (auth/session logic unchanged).
  assert.equal(seen.u, `${BASE}/api/konto/v1/state`);
  assert.equal(seen.opts.method, "GET");
  assert.equal(seen.opts.headers.Authorization, `Bearer ${SESSION}`);

  // Additive pass-through.
  assert.equal(r.email_masked, "a***@ettevote.ee", "masked email surfaced");
  assert.equal(r.subscriptions.length, 1);
  assert.equal(r.subscriptions[0].ref, "sub_1");
  assert.equal(r.packages[0].package_ref, "pkg_x");
  assert.equal(r.packages[0].weight, 0, "per-package weight is carried through");
});

// ── email_masked absent/blank → null; subscriptions absent → [] ──────────────
test("fetchState falls back to null email_masked and empty subscriptions", async () => {
  seedSession();
  const m = await loadWithFetch(async () => ({
    ok: true, status: 200, json: async () => ({ packages: [] }),
  }));
  const r = await m.fetchState();
  assert.equal(r.email_masked, null, "missing email_masked → null (neutral identity)");
  assert.deepEqual(r.subscriptions, [], "missing subscriptions → empty list (clean empty state)");
  assert.deepEqual(r.packages, []);
});

test("fetchState trims/nulls a blank email_masked", async () => {
  seedSession();
  const m = await loadWithFetch(async () => ({
    ok: true, status: 200, json: async () => ({ email_masked: "   ", subscriptions: "nope", packages: [] }),
  }));
  const r = await m.fetchState();
  assert.equal(r.email_masked, null, "whitespace-only masked email → null");
  assert.deepEqual(r.subscriptions, [], "non-array subscriptions → []");
});

// ── 401 / network → null (page decides the visible state) ────────────────────
test("fetchState returns null on 401 without throwing", async () => {
  seedSession();
  const m = await loadWithFetch(async () => ({ ok: false, status: 401, json: async () => ({}) }));
  assert.equal(await m.fetchState(), null);
});

test("fetchState swallows a network failure (null)", async () => {
  seedSession();
  const m = await loadWithFetch(async () => { throw new Error("offline"); });
  assert.equal(await m.fetchState(), null);
});

// ── No session → null, no network ────────────────────────────────────────────
test("fetchState with no session returns null and makes no request", async () => {
  seedSession(null); // empty store
  let called = false;
  const m = await loadWithFetch(async () => { called = true; return { ok: true, status: 200, json: async () => ({ packages: [] }) }; });
  assert.equal(await m.fetchState(), null);
  assert.equal(called, false, "no session → no network call");
});

// ── Flag OFF → null, no network (demo path stays in charge) ──────────────────
test("fetchState is dormant (null) when the flag is OFF", async () => {
  seedSession();
  delete globalThis.__MKVAL_KONTO_BASE__;
  globalThis.fetch = async () => { throw new Error("must not be called when flag is OFF"); };
  const mod = await import(`../src/lib/konto-api.ts?case=off-${Math.random()}`);
  assert.equal(mod.kontoEnabled(), false);
  assert.equal(await mod.fetchState(), null);
});
