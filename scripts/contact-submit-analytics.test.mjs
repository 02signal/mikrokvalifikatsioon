import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createContext, runInContext } from "node:vm";
import ts from "typescript";

function astroScripts(path) {
  const source = readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");
  return [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
}

// Run the checked-in listener callback without unrelated page startup.
function formScript(path, formName, helpers) {
  const declarations = new Map();
  let listener;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && helpers.includes(node.name.getText())) {
      declarations.set(node.name.getText(), node.getText());
    }
    if (ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.expression.getText() === formName &&
        node.expression.name.text === "addEventListener" &&
        ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text === "submit") {
      assert.equal(listener, undefined, `multiple submit listeners for ${path}`);
      listener = node.arguments[1].getText();
    }
    ts.forEachChild(node, visit);
  }
  for (const script of astroScripts(path)) {
    visit(ts.createSourceFile(path, script, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS));
  }
  assert.ok(listener, `submit listener missing from ${path}`);
  const setup = helpers.map((name) => {
    assert.ok(declarations.has(name), `helper ${name} missing from ${path}`);
    return `const ${declarations.get(name)};`;
  });
  return ts.transpileModule([...setup, `globalThis.submit = ${listener};`].join("\n"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
}

const tracker = astroScripts("components/Analytics.astro")
  .find((script) => script.includes("window.digiteekaartTrack ="));
assert.ok(tracker, "shared tracker script missing");

const email = "fixture@example.test";
function browser(responses) {
  const requests = [];
  const umami = [];
  const gtag = [];
  const dataLayer = [];
  const location = { href: "https://example.test/", pathname: "/", search: "" };
  const note = {};
  const form = { reportValidity: () => true, reset() {} };
  const attrs = { email, topic: "mikrokvalifikatsioon", field: "oskused" };
  const context = createContext({
    brand: "mikrokvalifikatsioon",
    window: {
      location,
      dataLayer,
      dispatchEvent() {},
      umami: { track: (name, params) => umami.push({ name, params }) },
      gtag: (...args) => gtag.push(args),
    },
    sessionStorage: new Map(),
    document: { referrer: "", addEventListener() {} },
    URLSearchParams,
    CustomEvent: class {},
    FormData: class {
      get(key) { return attrs[key]; }
      entries() { return Object.entries(attrs); }
    },
    async fetch(url, options) {
      const status = responses[requests.length];
      requests.push({ url, kind: JSON.parse(options.body).kind });
      assert.ok(status, "unexpected fetch");
      if (status === "offline") throw new Error("offline fixture");
      return { status, ok: status === 200 };
    },
    form,
    f: form,
    msg: note,
    note,
    noteEl: note,
    slug: "fixture-programme",
    provider: "fixture-provider",
    field: attrs.field,
    box: { querySelector: () => note },
  });
  context.sessionStorage.getItem = context.sessionStorage.get.bind(context.sessionStorage);
  context.sessionStorage.setItem = context.sessionStorage.set.bind(context.sessionStorage);
  runInContext(tracker, context);
  return { context, requests, location, umami, gtag, dataLayer };
}

const forms = [
  { path: "pages/index.astro", name: "form", eventForm: "suunatest_vorm", delivery: "amos", helpers: ["track"], fallbackOn429: false },
  { path: "pages/kataloog/[slug].astro", name: "form", eventForm: "interest_waitlist", delivery: "amos", helpers: ["track"], fallbackOn429: true },
  { path: "pages/valdkond/[slug].astro", name: "form", eventForm: "field_subscribe", delivery: "amos", helpers: ["track"], fallbackOn429: true },
  { path: "pages/teema/[slug].astro", name: "f", eventForm: "topic_subscribe", delivery: "webhook", helpers: [], fallbackOn429: true },
];

function successfulSubmissions(browser, sink) {
  return sink === "gtag"
    ? browser.gtag.filter(([command, name]) => command === "event" && name === "lead_form_submit").map(([, , params]) => params)
    : browser.umami.filter(({ name }) => name === "lead_form_submit").map(({ params }) => params);
}

for (const { path, name, eventForm, delivery, helpers, fallbackOn429 } of forms) {
  const script = formScript(path, name, helpers);
  for (const status of [200, 503, 429, "offline"]) {
    test(`${eventForm}: ${status} only reports confirmed capture as lead_form_submit`, async () => {
      const observed = browser([status]);
      runInContext(script, observed.context);
      await observed.context.submit({ preventDefault() {} });
      assert.deepEqual(observed.requests, [{ url: "/api/subscribe", kind: "topic_subscribe" }]);
      assert.equal(observed.location.href.startsWith("mailto:"), status !== 200 && (status !== 429 || fallbackOn429));
      for (const sink of ["umami", "gtag"]) {
        const submits = successfulSubmissions(observed, sink);
        assert.equal(submits.length, status === 200 ? 1 : 0, sink);
        if (status === 200) {
          assert.equal(submits[0].form_name, eventForm);
          assert.equal(submits[0].delivery, delivery);
          assert.ok(!JSON.stringify(submits[0]).includes(email));
        }
      }
      assert.equal(observed.dataLayer.length, 0, "avoid a duplicate direct dataLayer event");
    });
  }
}

const accountScript = formScript("pages/konto/index.astro", "authForm", ["track", "postSubscribe"]);
for (const { responses, hasPackage, confirmed, legacyDelivery } of [
  { responses: [200], hasPackage: false, confirmed: true, legacyDelivery: "webhook" },
  { responses: [503], hasPackage: false, confirmed: false, legacyDelivery: "webhook" },
  { responses: [200, 200], hasPackage: true, confirmed: true, legacyDelivery: "webhook" },
  { responses: [503, 200], hasPackage: true, confirmed: false, legacyDelivery: "webhook" },
  { responses: [200, 503], hasPackage: true, confirmed: false, legacyDelivery: "mailto" },
]) {
  test(`account demo: ${responses.join("/")} checks each request and keeps the legacy account event`, async () => {
    const observed = browser(responses);
    Object.assign(observed.context, {
      authError: {},
      emailInput: { value: email },
      consentInput: { checked: true },
      readAccount: () => null,
      authMode: "signup",
      kontoEnabled: () => false,
      $: () => ({}),
      readPkg: () => hasPackage ? [{ text: "fixture outcome" }] : [],
      readInterestSlugs: () => [],
      showScreen() {},
    });
    runInContext(accountScript, observed.context);
    await observed.context.submit({ preventDefault() {} });
    const kinds = hasPackage ? ["account_create", "outcome_package"] : ["account_create"];
    assert.deepEqual(observed.requests, kinds.map((kind) => ({ url: "/api/subscribe", kind })));
    const submits = successfulSubmissions(observed, "umami");
    assert.equal(submits.length, confirmed ? 1 : 0);
    if (confirmed) {
      assert.equal(submits[0].form_name, "account");
      assert.equal(submits[0].delivery, "webhook");
    }
    const legacy = observed.umami.filter(({ name }) => name === "account_created");
    assert.equal(legacy.length, 1);
    assert.equal(legacy[0].params.delivery, legacyDelivery);
  });
}
