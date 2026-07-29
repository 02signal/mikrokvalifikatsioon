#!/usr/bin/env node
// Kiire eelvaade jooniste kujundamiseks: renderdab kõik joonised (lai + püstine)
// ja rasterdab need PNG-ks kausta tmp/diagrams/, et kujundust saaks päris pildina
// üle vaadata ilma tervet saiti ehitamata.
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
  entryPoints: ["src/lib/diagram.ts"],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: "tmp/.diagram-lib.mjs",
  logLevel: "silent",
});

const { diagrams } = await import(`${pathToFileURL(path.resolve(BUNDLE)).href}?t=${process.hrtime.bigint()}`);
const { renderWide, renderStacked } = await import(
  `${pathToFileURL(path.resolve("tmp/.diagram-lib.mjs")).href}?t=${process.hrtime.bigint()}`
);

const only = process.argv.slice(2);
const list = only.length ? diagrams.filter((d) => only.includes(d.id)) : diagrams;

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
rmSync("tmp/.diagram-lib.mjs", { force: true });
process.stdout.write(`\n${list.length} joonis(t) → ${OUT}/\n`);
