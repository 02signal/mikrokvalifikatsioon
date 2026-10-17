// Suunatesti sobitamise testid (HTM tähelepanek 08.10.2026: "haridus" pakkus ebaseotud programme).
// Käitumist testime SÜNTEETILISTE programmidega (ei sõltu tänasest andmest) + vananemiskindlate
// invariantidega päris kataloogi vastu.
import test from "node:test";
import assert from "node:assert/strict";

import { FIELD_ISCED, FIELD_OTHER, fieldLabel, matchProgrammes, parsePriceEur, topicScore } from "../src/lib/suunatest-match.ts";
import fieldReview from "../src/data/suunatestFieldReview.json" with { type: "json" };
import { catalog } from "../src/data/catalog/index.ts";

const prog = (slug, field, code, extra = {}) => ({
  slug, name: slug, provider: "P", url: `https://s.example/${slug}`, field, ects: 6,
  priceText: "900 €", format: "veebis", language: "et", intakeText: "september", summary: "x",
  // Kood puudub => käsitsi üle vaadatud valdkond (topicField) jäljendab src/data/suunatestFieldReview.json
  topicField: code ? undefined : field,
  ehis: code ? { fieldCode: code, fieldName: "x", authoritative: true } : null, ...extra
});
const ans = (field, format = "", budget = "") => ({ field, format, budget });
const slugs = (r) => r.matches.map((m) => m.p.slug);

const edu = prog("edu", "haridus", "0114");
const garden = prog("garden", "haridus", "0811");            // kureeritud "haridus", EHIS: põllumajandus
const eduNoEhis = prog("edu-no-ehis", "haridus", null);
const lawInIt = prog("law-in-it", "IT ja andmed", "0421");   // kureeritud "IT", EHIS: õigus
const it = prog("it", "IT ja andmed", "0613");
const social = prog("social", "IT ja andmed", "0923");       // sotsiaaltöö, kureeritud "IT"
const build = prog("build", "ehitus", "0732");
const energy = prog("energy", "haridus", "0713");            // kureeritud "haridus", EHIS: elektrienergia
const all = [edu, garden, eduNoEhis, lawInIt, it, social, build, energy];

test("haridus: EHIS-i rühm on värav, kureeritud 'haridus' alla sattunud aiandus/energia ei tule", () => {
  const r = matchProgrammes(all, ans("haridus"));
  assert.deepEqual(slugs(r).sort(), ["edu", "edu-no-ehis"]);
  assert.ok(!slugs(r).includes("garden") && !slugs(r).includes("energy"));
});

test("EHIS-i rühmaga programm on kõrgemal kui ainult kureeritud vaste, isegi kui viimasel on parem logistika", () => {
  const weakEhis = prog("weak-ehis", "haridus", "0111", { priceText: null, language: "en", intakeText: null });
  const strongCurated = prog("strong-curated", "haridus", null);
  assert.deepEqual(slugs(matchProgrammes([strongCurated, weakEhis], ans("haridus"))), ["weak-ehis", "strong-curated"]);
});

test("õigus: ainult EHIS-i õigus (ka kureeritud IT-sildiga), mitte täide", () => {
  assert.deepEqual(slugs(matchProgrammes(all, ans("õigus"))), ["law-in-it"]);
});

test("IT ja andmed ei sisalda sotsiaaltööd ega õigust", () => {
  assert.deepEqual(slugs(matchProgrammes(all, ans("IT ja andmed"))), ["it"]);
});

test("ehitus ja energeetika kasutavad kitsaid EHIS-i koode", () => {
  assert.deepEqual(slugs(matchProgrammes(all, ans("ehitus"))), ["build"]);
  assert.deepEqual(slugs(matchProgrammes(all, ans("energeetika"))), ["energy"]);
});

test("tühi tulemus on ausalt 'none' ja ei täida suvaliste programmidega", () => {
  const r = matchProgrammes([it, edu], ans("õigus"));
  assert.equal(r.kind, "none");
  assert.deepEqual(r.matches, []);
  assert.equal(r.topicalCount, 0);
});

test("teema sobib, aga eelarve/vorm välistab kõik: 'none-filtered' koos teemaga sobivate arvuga", () => {
  const dear = prog("dear", "haridus", "0111", { priceText: "5 000 €" });
  const r = matchProgrammes([dear], ans("haridus", "", "1000"));
  assert.equal(r.kind, "none-filtered");
  assert.equal(r.topicalCount, 1);
  const onsite = prog("onsite", "haridus", "0111", { format: "kohapeal" });
  assert.equal(matchProgrammes([onsite], ans("haridus", "veebis")).kind, "none-filtered");
});

test("vorm: 'ainult veebis' välistab kohapealse, hübriid ja teadmata jäävad; 'ka kohapeal' ei filtreeri", () => {
  const set = [prog("online", "haridus", "0111", { format: "veebis" }), prog("hybrid", "haridus", "0111", { format: "hübriid" }),
    prog("unknown", "haridus", "0111", { format: null }), prog("onsite", "haridus", "0111", { format: "kohapeal" })];
  assert.deepEqual(slugs(matchProgrammes(set, ans("haridus", "veebis"))).sort(), ["hybrid", "online", "unknown"]);
  assert.equal(matchProgrammes(set, ans("haridus", "kohapeal"), 10).matches.length, 4);
});

test("eelarve: 'kuni X' välistab teadaoleva kalli hinna, tundmatu hind jääb; tühi, 'üle 2 000' ja 'toetus' ei filtreeri; tühi ei ole 'tasuta'", () => {
  const set = [prog("cheap", "haridus", "0111", { priceText: "800 €" }), prog("dear", "haridus", "0111", { priceText: "2 250 €" }),
    prog("noprice", "haridus", "0111", { priceText: null }), prog("free", "haridus", "0111", { priceText: "Tasuta" })];
  assert.deepEqual(slugs(matchProgrammes(set, ans("haridus", "", "1000"), 10)).sort(), ["cheap", "free", "noprice"]);
  assert.deepEqual(slugs(matchProgrammes(set, ans("haridus", "", "2000"), 10)).sort(), ["cheap", "free", "noprice"]);
  for (const budget of ["", "99999", "0"]) assert.equal(matchProgrammes(set, ans("haridus", "", budget), 10).matches.length, 4, `budget ${budget}`);
  // Varasem viga: tühi eelarve loeti "0" ja tasuta programmid said boonuse. Nüüd on tühi eelarve sama mis "üle 2 000 €".
  assert.deepEqual(
    slugs(matchProgrammes(set, ans("haridus", "", ""), 10)),
    slugs(matchProgrammes(set, ans("haridus", "", "99999"), 10)),
    "tühi eelarve ei tohi tasuta programme tõsta"
  );
});

test("determinism: sama sisend annab sama järjekorra, sisendi segamine ei muuda tulemust", () => {
  const set = Array.from({ length: 12 }, (_, i) => prog(`p${String(i).padStart(2, "0")}`, "haridus", "0111"));
  const base = slugs(matchProgrammes(set, ans("haridus"), 12));
  assert.deepEqual(slugs(matchProgrammes([...set].reverse(), ans("haridus"), 12)), base);
  assert.deepEqual(slugs(matchProgrammes(set, ans("haridus"), 12)), base);
});

test("parsePriceEur: vahemik, tasuta, tühjad", () => {
  assert.equal(parsePriceEur("1 175–1 305 €"), 1175);
  assert.equal(parsePriceEur("Tasuta"), 0);
  assert.equal(parsePriceEur(null), null);
  assert.equal(parsePriceEur("hind täpsustamisel"), null);
  // Päris kataloogi kujud: sihtrühmale tasuta EI ole "tasuta kõigile" (ülevaataja leid).
  assert.equal(parsePriceEur("1 200 € (õpetajate akadeemia sihtrühmale tasuta)"), 1200);
  assert.equal(parsePriceEur("sihtrühmale tasuta (EL-i kaasrahastusel)"), null);
  assert.equal(parsePriceEur("  tasuta "), 0);
});

test("'sihtrühmale tasuta' ei läbi eelarvefiltrit tasuta programmina ega saa 0-hinda", () => {
  const targeted = prog("targeted", "haridus", "0111", { priceText: "sihtrühmale tasuta (EL-i kaasrahastusel)" });
  const paid = prog("paid", "haridus", "0111", { priceText: "1 200 € (sihtrühmale tasuta)" });
  const r = matchProgrammes([targeted, paid], ans("haridus", "", "1000"), 10);
  assert.deepEqual(slugs(r), ["targeted"], "hind teadmata jääb, 1 200 € ületab 1 000 €");
  assert.equal(r.matches[0].price, null);
});

test("kind 'any' (valdkonda pole valitud), limit ja tühi valdkond koos filtriga", () => {
  const set = [prog("a", "haridus", "0111"), prog("b", "IT ja andmed", "0613"), prog("c", "muu", null), prog("d", "õigus", "0421")];
  const any = matchProgrammes(set, ans(""), 2);
  assert.equal(any.kind, "any");
  assert.equal(any.matches.length, 2);
  assert.equal(any.topicalCount, 4);
  const dear = [prog("dear", "haridus", "0111", { priceText: "5 000 €" })];
  const none = matchProgrammes(dear, ans("", "", "1000"));
  assert.equal(none.kind, "none-filtered");
  assert.equal(none.topicalCount, 1, "tühja valdkonna korral loetakse teemasobivaks kogu kataloog");
  assert.equal(matchProgrammes([], ans("")).matches.length, 0);
});

test("'muu' on kõik, mida teised valdkonnad ei kata (EHIS-i alusel)", () => {
  const history = prog("history", "muu", "0223");
  assert.equal(topicScore(history, FIELD_OTHER), 5);
  assert.equal(topicScore(it, FIELD_OTHER), 0);
  assert.equal(topicScore(prog("x", "muu", null), FIELD_OTHER), 2);
  // Ülevaatamata, EHIS-i rühmata programm ei sobi ühegi kindla valdkonnaga (ainult "ükskõik" näitab seda).
  const unreviewed = prog("unreviewed", "IT ja andmed", null, { topicField: null });
  assert.equal(topicScore(unreviewed, "IT ja andmed"), 0);
  assert.equal(topicScore(unreviewed, FIELD_OTHER), 0);
  assert.equal(matchProgrammes([unreviewed], ans("")).matches.length, 1);
});

// ---- Vananemiskindlad invariandid päris kataloogi vastu ----
const real = catalog.map((e) => ({ ...e }));
const FIELDS = ["", ...Object.keys(FIELD_ISCED), FIELD_OTHER];

test("päris kataloog: igas valdkonnas on iga tulemus teemaga sobiv ja EHIS-i rühm ei lähe vastuollu", () => {
  for (const field of FIELDS) {
    for (const format of ["", "veebis", "kohapeal"]) {
      for (const budget of ["", "1000", "2000", "99999", "0"]) {
        const r = matchProgrammes(real, ans(field, format, budget), 3);
        assert.ok(r.matches.length <= 3);
        if (r.kind === "none" || r.kind === "none-filtered") assert.deepEqual(r.matches, [], `${field}: täide keelatud`);
        for (const m of r.matches) {
          assert.ok(topicScore(m.p, field) > 0, `${field}: ${m.p.slug} ei sobi teemaga`);
          const code = m.p.ehis?.fieldCode;
          if (field === "haridus" && code) assert.ok(code.startsWith("01"), `haridus: ${m.p.slug} EHIS ${code}`);
          if (field === "õigus" && code) assert.ok(code.startsWith("042"), `õigus: ${m.p.slug} EHIS ${code}`);
          if (format === "veebis") assert.notEqual(m.p.format, "kohapeal");
        }
      }
    }
  }
});

test("päris kataloog: EHIS-only programmid on tulemuses lubatud, aga ei saa hinna põhjal boonust ega hinda valjuda", () => {
  const onlyEhis = real.filter((p) => p.publicBasis === "ehis_only");
  assert.ok(onlyEhis.length > 0);
  for (const p of onlyEhis) {
    assert.equal(p.priceText, null);
    const r = matchProgrammes([p], ans(""), 3);
    assert.equal(r.matches[0].price, null);
  }
});

test("päris kataloog: tühi tulemus enam ei täida ja 'haridus' ei sisalda põllumajandust/energiat", () => {
  const r = matchProgrammes(real, ans("haridus"), 100);
  assert.ok(r.matches.length > 0, "haridus peab midagi leidma");
  for (const m of r.matches) assert.ok(!/^08|^0713|^0712/.test(m.p.ehis?.fieldCode ?? ""), m.p.slug);
});

// ---- Ülevaataja HIGH/MEDIUM leiud (#149 värav): kaardisilt, kinnitatud fallback, teadmata vorm, hinnad ----
test("kaardisilt tuleb SAMAST reeglist mis värav: EHIS-i rühma nimi, mitte kureeritud valdkond", () => {
  const law = prog("law", "IT ja andmed", "0421", { ehis: { fieldCode: "0421", fieldName: "Õigus", authoritative: true } });
  assert.equal(fieldLabel(law), "Õigus");
  const theatre = prog("theatre", "disain ja loovus", "0114", { ehis: { fieldCode: "0114", fieldName: "Aineõpetajate koolitus", authoritative: true } });
  assert.equal(fieldLabel(theatre), "Aineõpetajate koolitus");
  // Rühmata, üle vaadatud: ülevaadatud valdkond, mitte toores kureeritud väärtus.
  const reviewed = prog("geo", "IT ja andmed", null, { topicField: "haridus" });
  assert.equal(fieldLabel(reviewed), "haridus");
  assert.equal(fieldLabel(prog("raw", "IT ja andmed", null, { topicField: null })), "IT ja andmed");
});

test("päris kataloog: igal kaardil on silt, mis ei lähe vastuollu väravaga; rühmata programmid on kõik üle vaadatud", () => {
  const FIELD_NAMES = new Set(["", ...Object.keys(FIELD_ISCED), FIELD_OTHER]);
  const unreviewed = [];
  for (const p of real) {
    const code = p.ehis?.fieldCode;
    if (code) assert.equal(fieldLabel(p), p.ehis.fieldName, `${p.slug}: silt peab olema EHIS-i rühm`);
    else {
      if (!p.topicField) unreviewed.push(p.slug);
      else assert.ok(FIELD_NAMES.has(p.topicField), `${p.slug}: tundmatu üle vaadatud valdkond ${p.topicField}`);
    }
  }
  assert.deepEqual(unreviewed, [], "uus EHIS-i rühmata programm vajab rida src/data/suunatestFieldReview.json (värav ei lase seda valdkonda sokutada)");
  // Ülevaatuse fail ei tohi sisaldada surnud ridu.
  const slugsReal = new Set(real.map((p) => p.slug));
  for (const slug of Object.keys(fieldReview.fields)) assert.ok(slugsReal.has(slug), `surnud rida ${slug}`);
});

test("vorm teadmata: 'ainult veebis' ei kinnita seda, programm jääb, järjestub alla ja märgitakse", () => {
  const known = prog("known", "haridus", "0111", { format: "veebis", priceText: null, intakeText: null, language: "en" });
  const unknown = prog("unknown", "haridus", "0111", { format: null });
  const r = matchProgrammes([unknown, known], ans("haridus", "veebis"));
  assert.deepEqual(slugs(r), ["known", "unknown"], "teadmata vorm järjestub teadaoleva veebis alla, isegi kui tal on parem logistika");
  assert.equal(r.matches[1].formatUnknown, true);
  assert.equal(r.matches[0].formatUnknown, false);
  // Ilma vormi nõudeta see järjestust ei mõjuta.
  assert.deepEqual(slugs(matchProgrammes([unknown, known], ans("haridus", ""))), ["unknown", "known"]);
});

test("hinnaparsimine: tuhandete eraldajad, koma, 'tasuta' koos numbriga on teadmata", () => {
  assert.equal(parsePriceEur("1.200 €"), 1200);
  assert.equal(parsePriceEur("1 200,50 €"), 1200);
  assert.equal(parsePriceEur("1\u00a0200 €"), 1200);
  assert.equal(parsePriceEur("960 €"), 960);
  assert.equal(parsePriceEur("tasuta (materjalid 50 €)"), null);
  assert.equal(parsePriceEur("Tasuta"), 0);
});

test("lisaküsimused (keel, tase, maht) välistavad ainult teadaolevalt mittesobiva; teadmata jääb", () => {
  const a = prog("a", "IT ja andmed", "0613", { language: "en", providerType: "ülikool", ects: 6 });
  const b = prog("b", "IT ja andmed", "0613", { language: "et", providerType: "koolitusettevõte", ects: 30 });
  const c = prog("c", "IT ja andmed", "0613", { language: null, providerType: null, ects: null });
  const pool = [a, b, c];
  assert.deepEqual(slugs(matchProgrammes(pool, { ...ans("IT ja andmed"), language: "et" }, 9)).sort(), ["b", "c"]);
  assert.deepEqual(slugs(matchProgrammes(pool, { ...ans("IT ja andmed"), level: "mikrokraad" }, 9)).sort(), ["a", "c"]);
  assert.deepEqual(slugs(matchProgrammes(pool, { ...ans("IT ja andmed"), maxEap: "10" }, 9)).sort(), ["a", "c"]);
  assert.deepEqual(slugs(matchProgrammes(pool, { ...ans("IT ja andmed"), language: "et", level: "mikrokvalifikatsioon", maxEap: "30" }, 9)).sort(), ["b", "c"]);
});
