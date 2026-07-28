import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(new URL("../src/components/SubscribeForm.astro", import.meta.url), "utf8");

test("provider checklist uses one Listmonk-native double-opt-in audience", () => {
  assert.match(component, /PUBLIC_LISTMONK_LIST_KOOLITAJA/);
  assert.match(component, /d1615885-494d-42b7-b2e1-c51ec2530893/);
  assert.doesNotMatch(component, /PUBLIC_LISTMONK_LIST_NEWSLETTER/);
  assert.match(component, /trustedCaptureHost && UUID\.test\(listKoolitaja\)/);
  assert.match(component, /action=\{action\}/);
  assert.match(component, /name="l" value=\{listKoolitaja\} required data-consent-purpose="newsletter"/);
  assert.equal((component.match(/name="l"/g) || []).length, 1);
  assert.match(component, /Soovin saada e-postiga mikrokvalifikatsiooni koolitaja kontrollnimekirju/);
  assert.doesNotMatch(component, /Soovin ka uudiskirja/);
});

test("click is measured honestly as an attempt, not a confirmed subscription", () => {
  assert.match(component, /data-track-event="lead_form_submit_attempt"/);
  assert.doesNotMatch(component, /data-track-event="lead_form_submit"/);
});

test("audience and page channel remain analytics metadata, not hidden PII", () => {
  assert.match(component, /data-capture-site=\{captureSite\}/);
  assert.match(component, /data-capture-channel=\{channel\}/);
  assert.doesNotMatch(component, /type="hidden"[^>]+(?:email|name|phone)/i);
});
