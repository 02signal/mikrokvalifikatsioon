#!/usr/bin/env node
// Rasterise every explainer SVG in public/diagrams/ to a 2× PNG for Google Images.
//
// Google's image search indexes raster (PNG/WebP) reliably but SVG poorly, so each
// diagram ships BOTH: the SVG stays the crisp on-page <source> and the PNG is the
// indexable <img> fallback + ImageObject contentUrl. Runs before `astro build` so the
// PNGs are in public/ when Astro copies them to dist. PNGs are build artifacts
// (gitignored); the SVG is the source of truth.

import sharp from "sharp";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const DIR = "public/diagrams";
const DENSITY = 144; // intrinsic px × (144/72) = 2× (e.g. 640×360 → 1280×720)

let count = 0;
for (const file of readdirSync(DIR).filter((f) => f.endsWith(".svg"))) {
  const svg = readFileSync(path.join(DIR, file));
  const out = path.join(DIR, file.replace(/\.svg$/, ".png"));
  await sharp(svg, { density: DENSITY })
    .flatten({ background: "#ffffff" })
    .png({ compressionLevel: 9 })
    .toFile(out);
  count += 1;
  process.stdout.write(`rasterised ${file} → ${path.basename(out)}\n`);
}
process.stdout.write(`Done: ${count} diagram(s).\n`);
