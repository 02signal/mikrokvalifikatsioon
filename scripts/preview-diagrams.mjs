#!/usr/bin/env node
// Kiire eelvaade jooniste kujundamiseks: renderdab kõik joonised (lai + püstine)
// ja rasterdab need PNG-ks kausta tmp/diagrams/, et kujundust saaks päris pildina
// üle vaadata ilma tervet saiti ehitamata.
//
// Katab nii käsitsi kirjeldatud joonised (src/data/diagrams.ts) kui andmepõhised
// (src/data/diagrams-data.ts: hind, eap-jaotus, valdkonnad, oppevorm,
// ehis-tunnustatud + üks valdkond/<slug> näidis päris kataloogist) kui
// koolitajale/HAKA joonised (src/data/diagrams-koolitaja.ts).
//
//   node scripts/preview-diagrams.mjs           # kõik
//   node scripts/preview-diagrams.mjs eap-26-tundi
//
// tmp/ on .gitignore'is — need failid ei lähe repositooriumisse.

import { build } from "esbuild";
import sharp from "sharp";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const OUT = "tmp/diagrams";
const BUNDLE = "tmp/.diagram-bundle.mjs";
const DATA_BUNDLE = "tmp/.diagram-data-bundle.mjs";
const KOOLITAJA_BUNDLE = "tmp/.diagram-koolitaja-bundle.mjs";
mkdirSync(OUT, { recursive: true });

await build({
  entryPoints: ["src/data/diagrams.ts"],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: BUNDLE,
  logLevel: "silent",
});
await build({
  entryPoints: ["src/data/diagrams-data.ts"],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: DATA_BUNDLE,
  logLevel: "silent",
});
await build({
  entryPoints: ["src/data/diagrams-koolitaja.ts"],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: KOOLITAJA_BUNDLE,
  logLevel: "silent",
});
await build({
  entryPoints: ["src/lib/diagram.ts"],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: "tmp/.diagram-lib.mjs",
  logLevel: "silent",
});
await build({
  entryPoints: ["src/data/catalog/index.ts"],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: "tmp/.catalog-bundle.mjs",
  logLevel: "silent",
});

const { diagrams } = await import(`${pathToFileURL(path.resolve(BUNDLE)).href}?t=${process.hrtime.bigint()}`);
const { dataDiagrams, fieldDiagram } = await import(
  `${pathToFileURL(path.resolve(DATA_BUNDLE)).href}?t=${process.hrtime.bigint()}`
);
const { koolitajaDiagrams } = await import(
  `${pathToFileURL(path.resolve(KOOLITAJA_BUNDLE)).href}?t=${process.hrtime.bigint()}`
);
const { renderWide, renderStacked } = await import(
  `${pathToFileURL(path.resolve("tmp/.diagram-lib.mjs")).href}?t=${process.hrtime.bigint()}`
);
const { fieldsWithSlug } = await import(
  `${pathToFileURL(path.resolve("tmp/.catalog-bundle.mjs")).href}?t=${process.hrtime.bigint()}`
);

// Üks päris valdkond näidiseks (esimene tähestikulises fieldsWithSlug loendis) —
// piisab kujunduse kontrolliks ilma kõiki ~9 valdkonda renderdamata.
const sampleField = fieldsWithSlug[0];
const fieldSample = sampleField
  ? { ...fieldDiagram(sampleField.field), id: `valdkond-${sampleField.slug}` }
  : null;

const allDiagrams = [...diagrams, ...dataDiagrams(), ...koolitajaDiagrams, ...(fieldSample ? [fieldSample] : [])];

const only = process.argv.slice(2);
const list = only.length ? allDiagrams.filter((d) => only.includes(d.id)) : allDiagrams;

for (const d of list) {
  for (const [suffix, svg] of [
    ["", renderWide(d)],
    ["-stacked", renderStacked(d)],
  ]) {
    const base = path.join(OUT, `${d.id}${suffix}`);
    writeFileSync(`${base}.svg`, svg);
    await sharp(Buffer.from(svg), { density: 144 }).flatten({ background: "#ffffff" }).png().toFile(`${base}.png`);
  }
  // Jagatav kaart täpselt nii, nagu see sotsiaalvõrgus välja näeb.
  await sharp(Buffer.from(renderWide(d)), { density: 180 })
    .resize(1200, 630, { fit: "contain", background: "#ffffff" })
    .png()
    .toFile(path.join(OUT, `${d.id}.og.png`));
  process.stdout.write(`${d.id}\n`);
}

rmSync(BUNDLE, { force: true });
rmSync(DATA_BUNDLE, { force: true });
rmSync(KOOLITAJA_BUNDLE, { force: true });
rmSync("tmp/.diagram-lib.mjs", { force: true });
rmSync("tmp/.catalog-bundle.mjs", { force: true });
process.stdout.write(`\n${list.length} joonis(t) → ${OUT}/\n`);
