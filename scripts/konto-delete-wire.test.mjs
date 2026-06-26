// Wire-contract test for deleteAccount() (konto face → AMOS account-delete, flag-gated).
//
// Pins the CONTRACT the /konto/ page wires against when the flag is ON:
//   POST {base}/api/konto/v1/account/delete
//   Authorization: Bearer <session>   — and NOTHING else (no body, no PII).
//   On success (2xx) ALL local account state is wiped: session, name map
//   (mkval:konto_names) and the pkgref map (mkval:pkgrefs).
//
// Why this matters: the only thing that may leave the browser here is the
// bearer. A learner's email, package names and outcome text must NEVER ride
// along. This test makes that drop-class impossible to regress.
//
// DOM-/Vite-free seam: konto-api.ts reads its base from import.meta.env (absent
// in Node) OR the `globalThis.__MKVAL_KONTO_BASE__` test fallback. We inject a
// fake `fetch` + `localStorage` so Node can type-strip the .ts and exercise the
// real function — same first-step-of-`npm run build` gate as the sibling tests.
// The AMOS side (actual server deletion + {deleted} count) is covered by AMOS e2e.
import test from "node:test";
import assert from "node:assert/strict";

const BASE = "https://amos.example";
const SESSION = "sess-abc-123";
const SESSION_KEY = "mkval:konto_session";
const NAMES_KEY = "mkval:konto_names";
const PKGREF_KEY = "mkval:pkgrefs";

// Fresh fake localStorage seeded with a logged-in account + local-only maps.
function seedStore() {
  const m = new Map([
    [SESSION_KEY, SESSION],
    [NAMES_KEY, JSON.stringify({ pkg_aaa: "Raamatupidaja" })],
    [PKGREF_KEY, JSON.stringify({ "p-a": "pkg_aaa" })],
  ]);
  globalThis.localStorage = {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
  return m;
}

// Import konto-api.ts fresh with the base seam set, capturing the fetch call.
async function loadWithFetch(fetchImpl) {
  globalThis.__MKVAL_KONTO_BASE__ = BASE;
  globalThis.fetch = fetchImpl;
  // cache-bust so each case re-evaluates the module-level KONTO_API_BASE const.
  const mod = await import(`../src/lib/konto-api.ts?case=${Math.random()}`);
  return mod;
}

// ── Happy path: bearer-only POST, {deleted} parsed, local state wiped ─────────
test("deleteAccount POSTs bearer-only to /account/delete and wipes ALL local state", async () => {
  const store = seedStore();
  let seen = null;
  const m = await loadWithFetch(async (u, opts) => {
    seen = { u, opts };
    return { ok: true, status: 200, json: async () => ({ deleted: 4 }) };
  });

  const r = await m.deleteAccount();

  // Endpoint + method.
  assert.equal(seen.u, `${BASE}/api/konto/v1/account/delete`);
  assert.equal(seen.opts.method, "POST");

  // ONLY the bearer header — nothing else.
  assert.equal(seen.opts.headers.Authorization, `Bearer ${SESSION}`);
  assert.deepEqual(Object.keys(seen.opts.headers), ["Authorization"], "no extra headers");

  // NO body at all (so no PII can ride along).
  assert.equal("body" in seen.opts, false, "request carries no body");

  // Belt-and-braces: the serialized request mentions no local PII.
  const wire = JSON.stringify(seen);
  assert.equal(wire.includes("Raamatupidaja"), false, "package name never sent");
  assert.equal(wire.includes("mkval:"), false, "no local keys leak onto the wire");

  // Parsed result.
  assert.deepEqual(r, { deleted: 4 });

  // ALL local account state is gone.
  assert.equal(store.has(SESSION_KEY), false, "session cleared");
  assert.equal(store.has(NAMES_KEY), false, "name map cleared");
  assert.equal(store.has(PKGREF_KEY), false, "pkgref map cleared");
});

// ── Missing {deleted} in a 2xx body → defaults to 0, still wipes ─────────────
test("deleteAccount defaults deleted=0 when the 2xx body omits the count", async () => {
  const store = seedStore();
  const m = await loadWithFetch(async () => ({ ok: true, status: 200, json: async () => ({}) }));
  const r = await m.deleteAccount();
  assert.deepEqual(r, { deleted: 0 });
  assert.equal(store.has(SESSION_KEY), false, "session still cleared on a bodyless success");
});

// ── 401: session/account already gone server-side → wipe local, return null ──
test("deleteAccount on 401 wipes local state and returns null", async () => {
  const store = seedStore();
  const m = await loadWithFetch(async () => ({ ok: false, status: 401, json: async () => ({}) }));
  const r = await m.deleteAccount();
  assert.equal(r, null);
  assert.equal(store.has(SESSION_KEY), false, "401 means the account is gone → clear locally too");
  assert.equal(store.has(NAMES_KEY), false);
  assert.equal(store.has(PKGREF_KEY), false);
});

// ── Network failure: do NOT throw, return null, local state UNTOUCHED ─────────
test("deleteAccount swallows a network failure (null) and keeps local state for retry", async () => {
  const store = seedStore();
  const m = await loadWithFetch(async () => { throw new Error("offline"); });
  const r = await m.deleteAccount();
  assert.equal(r, null);
  assert.equal(store.get(SESSION_KEY), SESSION, "session preserved so the learner can retry");
  assert.ok(store.has(NAMES_KEY) && store.has(PKGREF_KEY), "local maps preserved on network error");
});

// ── Other 5xx error: return null, local state UNTOUCHED ──────────────────────
test("deleteAccount on a 5xx returns null without wiping local state", async () => {
  const store = seedStore();
  const m = await loadWithFetch(async () => ({ ok: false, status: 503, json: async () => ({}) }));
  const r = await m.deleteAccount();
  assert.equal(r, null);
  assert.equal(store.get(SESSION_KEY), SESSION, "transient server error must not destroy local state");
});

// ── No session → returns null, never hits the network ────────────────────────
test("deleteAccount with no session returns null and makes no request", async () => {
  // Empty store: no session present.
  const m2 = new Map();
  globalThis.localStorage = {
    getItem: (k) => (m2.has(k) ? m2.get(k) : null),
    setItem: (k, v) => m2.set(k, String(v)),
    removeItem: (k) => m2.delete(k),
  };
  let called = false;
  const m = await loadWithFetch(async () => { called = true; return { ok: true, status: 200, json: async () => ({}) }; });
  const r = await m.deleteAccount();
  assert.equal(r, null);
  assert.equal(called, false, "no session → no network call");
});

// ── Flag OFF (no base) → null, no network, demo path stays in charge ─────────
test("deleteAccount is a no-op (null) when the flag is OFF", async () => {
  seedStore();
  delete globalThis.__MKVAL_KONTO_BASE__; // simulate flag maas: no base
  globalThis.fetch = async () => { throw new Error("must not be called when flag is OFF"); };
  const mod = await import(`../src/lib/konto-api.ts?case=off-${Math.random()}`);
  assert.equal(mod.kontoEnabled(), false, "no base → flag OFF");
  assert.equal(await mod.deleteAccount(), null, "flag OFF → real path is dormant (demo path handles delete)");
});
