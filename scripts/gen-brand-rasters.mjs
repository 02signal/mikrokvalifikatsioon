// One-shot: regenerate raster brand assets from the v3 SVG kit (public/logo/*.svg).
// Source of truth = the vectors; this only rasterises them. Run: node scripts/gen-brand-rasters.mjs
import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";

const MARK = "public/logo/mark.svg";              // light mark (green+green+ink bars, ink dot)
const LOCKUP_WHITE = "public/logo/lockup-white.svg"; // white lockup for dark OG cards

// Render an SVG to a PNG buffer at a given pixel width (height auto from aspect).
async function svgToPng(path, width) {
  const svg = await readFile(path);
  return sharp(svg, { density: 384 }).resize({ width }).png().toBuffer();
}

// Mark centred on a white square with padding -> favicon / app icon / JSON-LD logo.
async function markSquare(size, pad = 0.20) {
  const inner = Math.round(size * (1 - pad * 2));
  const mark = await svgToPng(MARK, inner); // mark aspect ~63:44, height < width
  return sharp({
    create: { width: size, height: size, channels: 4, background: "#ffffff" }
  })
    .composite([{ input: mark, gravity: "center" }])
    .png()
    .toBuffer();
}

// Minimal PNG-in-ICO encoder (Vista+; modern browsers fine). Packs given PNG buffers.
function buildIco(entries) {
  const head = Buffer.alloc(6);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(entries.length, 4);
  const dir = Buffer.alloc(16 * entries.length);
  let offset = 6 + dir.length;
  entries.forEach((e, i) => {
    const b = 16 * i;
    dir.writeUInt8(e.size >= 256 ? 0 : e.size, b);     // width
    dir.writeUInt8(e.size >= 256 ? 0 : e.size, b + 1); // height
    dir.writeUInt8(0, b + 2); dir.writeUInt8(0, b + 3);
    dir.writeUInt16LE(1, b + 4); dir.writeUInt16LE(32, b + 6);
    dir.writeUInt32LE(e.png.length, b + 8);
    dir.writeUInt32LE(offset, b + 12);
    offset += e.png.length;
  });
  return Buffer.concat([head, dir, ...entries.map((e) => e.png)]);
}

// 1) OG card logo (white v3 lockup, crisp at og-canvas size [264]).
await writeFile("public/og-logo-white.png", await svgToPng(LOCKUP_WHITE, 600));

// 2) App icon + apple-touch (mark on white square).
await writeFile("public/icon.png", await markSquare(512));

// 3) JSON-LD organization logo (square, mark on white).
await writeFile("public/logo-square.png", await markSquare(512));

// 4) favicon.ico (16 + 32, mark on white square).
const ico16 = await markSquare(16, 0.14);
const ico32 = await markSquare(32, 0.16);
await writeFile("public/favicon.ico", buildIco([
  { size: 16, png: ico16 }, { size: 32, png: ico32 }
]));

console.log("wrote: og-logo-white.png, icon.png, logo-square.png, favicon.ico");
