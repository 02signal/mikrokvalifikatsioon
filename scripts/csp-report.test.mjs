import test from "node:test";
import assert from "node:assert/strict";
import { summarise } from "../api/csp-report.js";

test("csp-report: legacy formaat jätab alles direktiivi, hosti ja tee (päringustringita)", () => {
  const out = summarise({ "csp-report": { "effective-directive": "script-src-elem", "blocked-uri": "https://evil.example/x.js?token=1", "document-uri": "https://mikrokvalifikatsioon.ee/konto/?email=a@b.ee" } });
  assert.deepEqual(out, { directive: "script-src-elem", blocked: "evil.example", page: "/konto/" });
  assert.ok(!JSON.stringify(out).includes("email") && !JSON.stringify(out).includes("token"));
});

test("csp-report: Reporting API formaat ja vigane sisend", () => {
  assert.deepEqual(
    summarise([{ body: { effectiveDirective: "img-src", blockedURL: "inline", documentURL: "https://mikrokvalifikatsioon.ee/" } }]),
    { directive: "img-src", blocked: "inline", page: "/" }
  );
  assert.equal(summarise(null), null);
  assert.equal(summarise("x"), null);
});
