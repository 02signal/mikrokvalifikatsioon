/**
 * Selgitav joonis — kujundussüsteem.
 *
 * Üks joonis kirjeldatakse ANDMETENA (`Diagram`) ja renderdatakse kahes kujus:
 *   • `renderWide`   960×504 (täpselt 1200×630 kuvasuhe) — töölaud + jagatav OG-kaart
 *   • `renderStacked` 400×640 — kitsas ekraan, kus lai joonis muutuks loetamatuks
 *
 * Miks kaks kuju: laia joonise 21 px silt renderdub 360 px telefonis ~8 px-ks.
 * Meie lugeja on sageli 60+. Seepärast on mobiilil eraldi, püstine kompositsioon —
 * sama sõnum, sama andmed, teine paigutus (art direction, mitte lihtsalt skaleerimine).
 *
 * Knaflic: üks sõnum korraga, kaunistus miinimumini, üks aktsentvärv, järeldus
 * ("nii et…") alati kirjas. Värvid tulevad brändijuhendist §2 — roheline on
 * edasiminek, must on autoriteet, taust jahe ja neutraalne.
 *
 * Tekst jääb SVG-s päris `<text>`-iks (mitte kontuuriks), nii et otsimootorid ja
 * keelemudelid loevad seletuse välja. `<title>` + `<desc>` on iga joonise juures.
 */

/* ── Tokenid (brändijuhend §2–§3) ─────────────────────────────────────────── */

export const C = {
  ink: "#17181a", // autoriteet · pealkiri
  ink2: "#33373a", // tugev tekst
  muted: "#5a615b", // neutraalne tekst
  faint: "#8a8f88", // kolmanda astme tekst
  green: "#3f9c30", // edasiminek · põhitäide
  greenBright: "#54c247", // liikumise esiletõst
  greenDeep: "#2e7d22", // roheline tekst heledal (AA)
  ice: "#e9f4e5", // õrn rohekas pind
  iceLine: "#cfe4c8", // õrn rohekas piirjoon
  paper: "#f5f7f4", // jahe neutraalne pind
  white: "#ffffff",
  line: "#e5e8e3", // õrn piirjoon
  amber: "#9a7b22", // AINULT seisund "veel otsime"
  amberBg: "#fbf3df",
} as const;

/** Süsteemikiri: renderdub ühtemoodi brauseris JA rasterdamisel (sharp/librsvg).
 *  Sora/Atkinson elavad ainult lehel — eraldi SVG-fail neid ei näeks. */
export const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";

export const R = { lg: 18, md: 14, sm: 10 } as const;

/* ── Lõuend ───────────────────────────────────────────────────────────────── */

export type Mode = "wide" | "stacked";

const WIDE = { w: 960, h: 504, pad: 48 } as const;
const STACK = { w: 400, h: 640, pad: 26 } as const;

/** Kirjaskaala kummalegi lõuendile — arvutatud NÄHTAVA suuruse järgi, mitte
 *  lõuendi omas. Lai joonis kuvatakse ~700 px laiuses, püstine ~340 px-s. */
const TYPE = {
  wide: { kicker: 18, headline: 44, deck: 22, label: 24, sub: 17, body: 21, takeaway: 20, foot: 16 },
  stacked: { kicker: 12, headline: 25, deck: 15, label: 17, sub: 12.5, body: 15, takeaway: 14, foot: 11 },
} as const;

/* ── Tekstimõõtmine (ligikaudne, paigutuse jaoks piisav) ──────────────────── */

const NARROW = "iljtIf.,:;'`!|()[]-";
const WIDEC = "mMWQ@%—–";

function advance(ch: string, bold: boolean): number {
  let f: number;
  if (NARROW.includes(ch)) f = 0.32;
  else if (WIDEC.includes(ch)) f = 0.9;
  else if (ch === " ") f = 0.28;
  else if (ch >= "A" && ch <= "Z") f = 0.68;
  else if (ch >= "0" && ch <= "9") f = 0.57;
  else f = 0.55;
  // Kalibreeritud renderdatud pildi järgi: rasvane süsteemikiri on ~8% laiem,
  // kui naiivne hinnang annab. Parem veidi üle hinnata kui lasta tekstil üle serva.
  return bold ? f * 1.08 : f * 1.02;
}

/** Rea laius px-des antud kirjasuuruse juures. */
export function textWidth(s: string, size: number, bold = false): number {
  let w = 0;
  for (const ch of s) w += advance(ch, bold);
  return w * size;
}

/** Murra tekst ridadeks, mis mahuvad `max` laiusesse. */
export function wrap(s: string, max: number, size: number, bold = false): string[] {
  const words = s.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const next = cur ? `${cur} ${word}` : word;
    if (cur && textWidth(next, size, bold) > max) {
      lines.push(cur);
      cur = word;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Kirjasuurus, mis mahutab teksti ühele reale — ei lange alla `min`. */
export function fitSize(s: string, max: number, size: number, min: number, bold = false): number {
  const w = textWidth(s, size, bold);
  if (w <= max) return size;
  return Math.max(min, Math.floor((size * max) / w));
}

/* ── SVG-primitiivid ──────────────────────────────────────────────────────── */

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const n = (v: number): string => (Math.round(v * 100) / 100).toString();

type TextOpts = {
  size: number;
  fill?: string;
  weight?: number;
  anchor?: "start" | "middle" | "end";
  tracking?: number;
};

export function text(x: number, y: number, s: string, o: TextOpts): string {
  const a = o.anchor && o.anchor !== "start" ? ` text-anchor="${o.anchor}"` : "";
  const w = o.weight && o.weight !== 400 ? ` font-weight="${o.weight}"` : "";
  const t = o.tracking ? ` letter-spacing="${o.tracking}"` : "";
  return `<text x="${n(x)}" y="${n(y)}" font-size="${n(o.size)}"${w} fill="${o.fill ?? C.ink}"${a}${t}>${esc(s)}</text>`;
}

/** Mitmerealine tekst; tagastab SVG ja tarbitud kõrguse. */
export function block(
  x: number,
  y: number,
  lines: string[],
  o: TextOpts & { leading?: number },
): { svg: string; height: number } {
  const lead = o.leading ?? o.size * 1.32;
  const svg = lines.map((l, i) => text(x, y + i * lead, l, o)).join("");
  return { svg, height: lines.length * lead };
}

export function box(
  x: number,
  y: number,
  w: number,
  h: number,
  o: { fill: string; stroke?: string; r?: number },
): string {
  const st = o.stroke ? ` stroke="${o.stroke}"` : "";
  return `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${o.r ?? R.md}" fill="${o.fill}"${st}/>`;
}

/** Nool paremale (lai kuju) või alla (püstine kuju). */
export function arrow(x: number, y: number, len: number, dir: "right" | "down", color = "#b9c2b6"): string {
  const head = 9;
  if (dir === "right") {
    return (
      `<line x1="${n(x)}" y1="${n(y)}" x2="${n(x + len - head)}" y2="${n(y)}" stroke="${color}" stroke-width="3" stroke-linecap="round"/>` +
      `<path d="M${n(x + len)} ${n(y)}L${n(x + len - head)} ${n(y - head * 0.62)}L${n(x + len - head)} ${n(y + head * 0.62)}Z" fill="${color}"/>`
    );
  }
  return (
    `<line x1="${n(x)}" y1="${n(y)}" x2="${n(x)}" y2="${n(y + len - head)}" stroke="${color}" stroke-width="3" stroke-linecap="round"/>` +
    `<path d="M${n(x)} ${n(y + len)}L${n(x - head * 0.62)} ${n(y + len - head)}L${n(x + head * 0.62)} ${n(y + len - head)}Z" fill="${color}"/>`
  );
}

/** Brändimärk (brändijuhend §1): kolm tõusvat riba + täpp. Puhtad ristkülikud —
 *  ei sõltu fondist, renderdub rasterdamisel täpselt. */
export function brandMark(x: number, y: number, h: number): string {
  const s = h / 44;
  return (
    `<g transform="translate(${n(x)},${n(y)}) scale(${n(s)}) translate(11,2)" aria-hidden="true">` +
    `<g transform="skewX(-13)">` +
    `<rect x="0" y="18" width="11" height="22" rx="3" fill="${C.greenBright}"/>` +
    `<rect x="16" y="8.8" width="11" height="31.2" rx="3" fill="${C.green}"/>` +
    `<rect x="32" y="0" width="11" height="40" rx="3" fill="${C.ink}"/>` +
    `</g><circle cx="44.27" cy="34.5" r="5.5" fill="${C.ink}"/></g>`
  );
}

export const markWidth = (h: number): number => (63 * h) / 44;

/* ── Joonise kirjeldus ────────────────────────────────────────────────────── */

export type Item = { label: string; sub?: string };

export type Body =
  /** A = B — samaväärsus (nt 1 EAP = 26 tundi). */
  | { kind: "equation"; left: Item; right: Item; op?: string }
  /** A →(silt) B — üleminek või kandumine. */
  | { kind: "flow"; from: Item; to: Item; via?: string }
  /** Nummerdatud sammud (2–4). */
  | { kind: "steps"; steps: Item[] }
  /** Kõrvuti valikud (2–3); `emphasis` tõstab ühe esile. */
  | { kind: "cards"; cards: (Item & { emphasis?: boolean })[] }
  /** Kaks veergu punktidega — meie vs muu. */
  | { kind: "compare"; left: { label: string; points: string[]; note?: string }; right: { label: string; points: string[]; note?: string } }
  /** Sisaldumine — väiksem mõiste suurema sees. */
  | { kind: "nested"; outer: Item; inner: Item }
  /** Arvvahemik ribal — miinimum, tüüpiline vahemik, mediaan, maksimum. */
  | { kind: "range"; min: number; max: number; band: [number, number]; marker?: { value: number; label: string }; minLabel: string; maxLabel: string; bandLabel?: string }
  /** Pingerida — märgistatud ribad, väärtus 0–1 skaalal. */
  | { kind: "bars"; bars: { label: string; value: number; display: string; emphasis?: boolean }[] };

export type Diagram = {
  /** Failinimi: /diagrams/<id>.svg */
  id: string;
  /** Väike suurtäheline silt üleval — teema, mitte sõnum. */
  kicker: string;
  /** ÜKS sõnum. Knaflic: pealkiri on järeldus, mitte teema. */
  headline: string;
  /** Üks rida täpsustust. */
  deck?: string;
  body: Body;
  /** "Nii et…" — mida lugeja sellest teha saab. */
  takeaway: string;
  /** Ligipääsetavus + masinloetav seletus (<desc>). Terviklik lause(d). */
  alt: string;
  /** Pildiallkiri lehel. */
  caption: string;
};

/* ── Kere renderdajad ─────────────────────────────────────────────────────── */

type Zone = { x: number; y: number; w: number; h: number };
type Scale = { kicker: number; headline: number; deck: number; label: number; sub: number; body: number; takeaway: number; foot: number };

/** Silt + alamsilt kasti keskel. */
function itemLabel(cx: number, cy: number, it: Item, t: Scale, maxW: number, onDark: boolean): string {
  const labelFill = onDark ? C.white : C.ink;
  const subFill = onDark ? "#dff0da" : C.muted;
  const size = fitSize(it.label, maxW, t.label, t.sub, true);
  if (!it.sub) return text(cx, cy + size * 0.34, it.label, { size, weight: 800, fill: labelFill, anchor: "middle" });
  const subLines = wrap(it.sub, maxW, t.sub);
  const total = size + 6 + subLines.length * t.sub * 1.25;
  const top = cy - total / 2 + size * 0.82;
  return (
    text(cx, top, it.label, { size, weight: 800, fill: labelFill, anchor: "middle" }) +
    block(cx, top + 6 + t.sub, subLines, { size: t.sub, fill: subFill, anchor: "middle", leading: t.sub * 1.25 }).svg
  );
}

function renderEquation(b: Extract<Body, { kind: "equation" }>, z: Zone, t: Scale, mode: Mode): string {
  const op = b.op ?? "=";
  if (mode === "wide") {
    const opW = 64;
    const w = (z.w - opW) / 2;
    const h = Math.min(z.h, 150);
    const y = z.y + (z.h - h) / 2;
    return (
      box(z.x, y, w, h, { fill: C.green, r: R.lg }) +
      itemLabel(z.x + w / 2, y + h / 2, b.left, t, w - 36, true) +
      text(z.x + w + opW / 2, y + h / 2 + t.headline * 0.3, op, { size: t.headline * 0.8, weight: 700, fill: C.faint, anchor: "middle" }) +
      box(z.x + w + opW, y, w, h, { fill: C.ice, stroke: C.iceLine, r: R.lg }) +
      itemLabel(z.x + w + opW + w / 2, y + h / 2, b.right, t, w - 36, false)
    );
  }
  const h = 104;
  const gap = 46;
  const y = z.y + Math.max(0, (z.h - (h * 2 + gap)) / 2);
  return (
    box(z.x, y, z.w, h, { fill: C.green, r: R.lg }) +
    itemLabel(z.x + z.w / 2, y + h / 2, b.left, t, z.w - 28, true) +
    text(z.x + z.w / 2, y + h + gap / 2 + 10, op, { size: 30, weight: 700, fill: C.faint, anchor: "middle" }) +
    box(z.x, y + h + gap, z.w, h, { fill: C.ice, stroke: C.iceLine, r: R.lg }) +
    itemLabel(z.x + z.w / 2, y + h + gap + h / 2, b.right, t, z.w - 28, false)
  );
}

function renderFlow(b: Extract<Body, { kind: "flow" }>, z: Zone, t: Scale, mode: Mode): string {
  if (mode === "wide") {
    const midW = 168;
    const w = (z.w - midW) / 2;
    const h = Math.min(z.h, 148);
    const y = z.y + (z.h - h) / 2;
    const cx = z.x + w + midW / 2;
    return (
      box(z.x, y, w, h, { fill: C.green, r: R.lg }) +
      itemLabel(z.x + w / 2, y + h / 2, b.from, t, w - 36, true) +
      arrow(cx - 52, y + h / 2, 104, "right") +
      (b.via ? text(cx, y + h / 2 + 30, b.via, { size: t.sub, weight: 700, fill: C.greenDeep, anchor: "middle" }) : "") +
      box(z.x + w + midW, y, w, h, { fill: C.ice, stroke: C.iceLine, r: R.lg }) +
      itemLabel(z.x + w + midW + w / 2, y + h / 2, b.to, t, w - 36, false)
    );
  }
  const h = 100;
  const gap = 62;
  const y = z.y + Math.max(0, (z.h - (h * 2 + gap)) / 2);
  return (
    box(z.x, y, z.w, h, { fill: C.green, r: R.lg }) +
    itemLabel(z.x + z.w / 2, y + h / 2, b.from, t, z.w - 28, true) +
    arrow(z.x + z.w / 2, y + h + 12, gap - 24, "down") +
    (b.via ? text(z.x + z.w / 2 + 14, y + h + gap / 2 + 4, b.via, { size: t.sub, weight: 700, fill: C.greenDeep, anchor: "start" }) : "") +
    box(z.x, y + h + gap, z.w, h, { fill: C.ice, stroke: C.iceLine, r: R.lg }) +
    itemLabel(z.x + z.w / 2, y + h + gap + h / 2, b.to, t, z.w - 28, false)
  );
}

function renderSteps(b: Extract<Body, { kind: "steps" }>, z: Zone, t: Scale, mode: Mode): string {
  const steps = b.steps;
  if (mode === "wide") {
    const r = 32;
    const count = steps.length;
    const colW = Math.min(z.w / count - 16, 280);
    // Kahanda sildikirja, kuni ring + silt + alamsilt mahuvad kere alasse.
    // Muidu jookseb pikem alamsilt jalusejoonest läbi.
    const gapBelow = 38;
    let bodySize = t.body;
    let subSize = t.sub;
    const layout = (bs: number, ss: number) =>
      steps.map((s) => ({ label: wrap(s.label, colW, bs, true), sub: s.sub ? wrap(s.sub, colW, ss) : [] }));
    const blockH = (l: ReturnType<typeof layout>, bs: number, ss: number): number =>
      Math.max(...l.map((x) => x.label.length * bs * 1.32 + (x.sub.length ? 8 + x.sub.length * ss * 1.25 : 0)));
    let laid = layout(bodySize, subSize);
    while (bodySize > t.sub * 0.85 && 32 * 2 + gapBelow + blockH(laid, bodySize, subSize) > z.h) {
      bodySize -= 0.5;
      subSize = Math.max(t.sub * 0.8, subSize - 0.4);
      laid = layout(bodySize, subSize);
    }
    // Jaota ringid servast servani, aga hoia nii palju sisse, et KESKELE joondatud
    // sildid ei jookseks veerisest välja.
    const half = Math.max(
      r,
      ...laid.map((l) => Math.max(...[...l.label, ...l.sub].map((s) => textWidth(s, bodySize, true) / 2), r)),
    );
    const step = count > 1 ? (z.w - half * 2) / (count - 1) : 0;
    const cxOf = (i: number): number => (count > 1 ? z.x + half + step * i : z.x + z.w / 2);
    const textH = blockH(laid, bodySize, subSize);
    // Kogu plokk keskele — nii ei jookse alumine silt jalusejoonest läbi.
    const cy = z.y + Math.max(r, (z.h - (r * 2 + gapBelow + textH)) / 2 + r);
    // Alamsildid ühele joonele: kui üks silt murdub kahele reale, ei tohi selle
    // veeru alamsilt teistest allapoole vajuda.
    const maxLabelLines = Math.max(...laid.map((l) => l.label.length));
    return steps
      .map((_s, i) => {
        const cx = cxOf(i);
        const l = laid[i];
        const arr = i < count - 1 ? arrow(cx + r + 16, cy, step - r * 2 - 32, "right") : "";
        const labelTop = cy + r + gapBelow;
        return (
          `<circle cx="${n(cx)}" cy="${n(cy)}" r="${r}" fill="${C.green}"/>` +
          text(cx, cy + r * 0.36, String(i + 1), { size: r * 1.06, weight: 800, fill: C.white, anchor: "middle" }) +
          arr +
          block(cx, labelTop, l.label, { size: bodySize, weight: 700, fill: C.ink, anchor: "middle" }).svg +
          block(cx, labelTop + maxLabelLines * bodySize * 1.32 + 8, l.sub, { size: subSize, fill: C.muted, anchor: "middle" }).svg
        );
      })
      .join("");
  }
  const rowH = Math.min(96, z.h / steps.length);
  const r = 21;
  const top0 = z.y + (z.h - rowH * steps.length) / 2;
  return steps
    .map((s, i) => {
      const top = top0 + rowH * i;
      const cy = top + rowH / 2 - 6;
      const tx = z.x + r * 2 + 22;
      const labelLines = wrap(s.label, z.w - (r * 2 + 22), t.body, true);
      const line = i < steps.length - 1 ? `<line x1="${n(z.x + r)}" y1="${n(cy + r + 6)}" x2="${n(z.x + r)}" y2="${n(top + rowH + r - 6)}" stroke="${C.line}" stroke-width="2"/>` : "";
      return (
        `<circle cx="${n(z.x + r)}" cy="${n(cy)}" r="${r}" fill="${C.green}"/>` +
        text(z.x + r, cy + r * 0.36, String(i + 1), { size: r * 1.06, weight: 800, fill: C.white, anchor: "middle" }) +
        line +
        block(tx, cy - (labelLines.length - 1) * t.body * 0.66 + t.body * 0.34, labelLines, { size: t.body, weight: 700, fill: C.ink }).svg +
        (s.sub ? text(tx, cy + (labelLines.length - 1) * t.body * 0.66 + t.body * 0.34 + t.sub * 1.4, s.sub, { size: t.sub, fill: C.muted }) : "")
      );
    })
    .join("");
}

function renderCards(b: Extract<Body, { kind: "cards" }>, z: Zone, t: Scale, mode: Mode): string {
  const cards = b.cards;
  if (mode === "wide") {
    const gap = 22;
    const w = (z.w - gap * (cards.length - 1)) / cards.length;
    const h = Math.min(z.h, 142);
    const y = z.y + (z.h - h) / 2;
    return cards
      .map((c, i) => {
        const x = z.x + (w + gap) * i;
        const on = c.emphasis === true;
        return (
          box(x, y, w, h, { fill: on ? C.green : C.ice, stroke: on ? undefined : C.iceLine, r: R.lg }) +
          itemLabel(x + w / 2, y + h / 2, c, t, w - 28, on)
        );
      })
      .join("");
  }
  const gap = 14;
  const h = Math.min(96, (z.h - gap * (cards.length - 1)) / cards.length);
  return cards
    .map((c, i) => {
      const y = z.y + (h + gap) * i;
      const on = c.emphasis === true;
      return (
        box(z.x, y, z.w, h, { fill: on ? C.green : C.ice, stroke: on ? undefined : C.iceLine, r: R.lg }) +
        itemLabel(z.x + z.w / 2, y + h / 2, c, t, z.w - 28, on)
      );
    })
    .join("");
}

type Panel = { label: string; points: string[]; note?: string };

/** Mõõda paneeli sisu enne joonistamist — nii ei jookse punktid kunagi kastist välja. */
function comparePlan(p: Panel, w: number, t: Scale, size: number): { lines: string[][]; height: number; padX: number } {
  const padX = 22;
  const lines = p.points.map((pt) => wrap(pt, w - padX * 2 - 26, size));
  const headH = 34 + size * 1.55;
  const pointsH = lines.reduce((sum, l) => sum + Math.max(size * 1.5, l.length * size * 1.3 + 6), 0);
  const noteH = p.note ? t.sub * 2.1 : 10;
  return { lines, height: headH + pointsH + noteH + 12, padX };
}

function comparePanel(x: number, y: number, w: number, h: number, p: Panel, t: Scale, on: boolean, size: number, plan: ReturnType<typeof comparePlan>): string {
  const { padX, lines } = plan;
  const tick = on ? C.greenDeep : C.faint;
  const bodyFill = on ? C.ink2 : C.muted;
  let out =
    box(x, y, w, h, { fill: on ? C.ice : C.paper, stroke: on ? C.iceLine : C.line, r: R.lg }) +
    text(x + padX, y + 34, p.label, { size: fitSize(p.label, w - padX * 2, t.sub * 1.12, 10, true), weight: 800, fill: on ? C.greenDeep : C.faint, tracking: 0.4 });
  let cy = y + 34 + size * 1.55;
  p.points.forEach((_, i) => {
    const l = lines[i];
    out +=
      text(x + padX, cy, on ? "✓" : "·", { size, weight: 700, fill: tick }) +
      block(x + padX + 26, cy, l, { size, fill: bodyFill }).svg;
    cy += Math.max(size * 1.5, l.length * size * 1.3 + 6);
  });
  // Märkus jääb ALATI kasti sisse, ka siis kui punkte on rohkem kui ruumi.
  if (p.note) out += text(x + padX, Math.min(cy + t.sub * 0.9, y + h - 14), p.note, { size: t.sub, fill: on ? C.greenDeep : C.faint });
  return out;
}

function renderCompare(b: Extract<Body, { kind: "compare" }>, z: Zone, t: Scale, mode: Mode): string {
  const wide = mode === "wide";
  const gap = wide ? 24 : 14;
  const w = wide ? (z.w - gap) / 2 : z.w;
  const avail = wide ? z.h : (z.h - gap) / 2;

  // Kahanda punktide kirja, kuni mõlema paneeli sisu mahub ära.
  let size = t.body;
  let left = comparePlan(b.left, w, t, size);
  let right = comparePlan(b.right, w, t, size);
  while (size > t.sub * 0.85 && Math.max(left.height, right.height) > avail) {
    size -= 0.5;
    left = comparePlan(b.left, w, t, size);
    right = comparePlan(b.right, w, t, size);
  }
  const h = Math.min(avail, Math.max(left.height, right.height, wide ? 150 : 110));
  const y = z.y + (wide ? (z.h - h) / 2 : 0);

  if (wide) {
    return (
      comparePanel(z.x, y, w, h, b.left, t, true, size, left) +
      comparePanel(z.x + w + gap, y, w, h, b.right, t, false, size, right)
    );
  }
  return (
    comparePanel(z.x, z.y, w, h, b.left, t, true, size, left) +
    comparePanel(z.x, z.y + h + gap, w, h, b.right, t, false, size, right)
  );
}

function renderNested(b: Extract<Body, { kind: "nested" }>, z: Zone, t: Scale, mode: Mode): string {
  const wide = mode === "wide";
  const pad = wide ? 28 : 18;
  const labelSize = wide ? t.sub * 1.08 : t.sub;
  const subLines = b.outer.sub ? wrap(b.outer.sub, z.w - pad * 2, t.sub) : [];
  // Päis + pesastatud kast + võrdne polster igas suunas.
  const headH = labelSize * 1.2 + (subLines.length ? 10 + subLines.length * t.sub * 1.3 : 0);
  // Sisemine kast peab mahtuma sellesse, mis päisest üle jääb. Varem oli siin
  // kindel alammõõt, mis pikema pealkirja või deck'i korral surus kasti raamist
  // välja ja jalusejoonest läbi.
  const innerAvail = z.h - pad * 2 - headH - 18;
  const innerH = Math.max(56, Math.min(wide ? 118 : 110, innerAvail));
  const h = Math.min(z.h, pad * 2 + headH + 18 + innerH);
  const y = z.y + (z.h - h) / 2;
  const innerY = y + pad + headH + 18;
  const innerW = wide ? (z.w - pad * 2) * 0.58 : z.w - pad * 2;
  return (
    box(z.x, y, z.w, h, { fill: C.paper, stroke: C.line, r: R.lg }) +
    text(z.x + pad, y + pad + labelSize, b.outer.label, { size: labelSize, weight: 800, fill: C.ink2, tracking: 1.2 }) +
    block(z.x + pad, y + pad + labelSize * 1.2 + 10 + t.sub, subLines, { size: t.sub, fill: C.muted, leading: t.sub * 1.3 }).svg +
    box(z.x + pad, innerY, innerW, innerH, { fill: C.green, r: R.md }) +
    itemLabel(z.x + pad + innerW / 2, innerY + innerH / 2, b.inner, t, innerW - 28, true)
  );
}

function renderRange(b: Extract<Body, { kind: "range" }>, z: Zone, t: Scale, mode: Mode): string {
  const span = Math.max(1, b.max - b.min);
  const pos = (v: number): number => z.x + ((Math.min(b.max, Math.max(b.min, v)) - b.min) / span) * z.w;
  const y = z.y + (mode === "wide" ? 74 : 96);
  const sw = mode === "wide" ? 18 : 13;
  const a = pos(b.band[0]);
  const c = pos(b.band[1]);
  let out =
    `<line x1="${n(z.x)}" y1="${n(y)}" x2="${n(z.x + z.w)}" y2="${n(y)}" stroke="${C.line}" stroke-width="${sw}" stroke-linecap="round"/>` +
    `<line x1="${n(a)}" y1="${n(y)}" x2="${n(c)}" y2="${n(y)}" stroke="${C.green}" stroke-width="${sw}" stroke-linecap="round"/>` +
    text(z.x, y + sw + t.sub * 1.5, b.minLabel, { size: t.sub, fill: C.faint }) +
    text(z.x + z.w, y + sw + t.sub * 1.5, b.maxLabel, { size: t.sub, fill: C.faint, anchor: "end" });
  if (b.bandLabel) {
    const mid = Math.min(z.x + z.w - textWidth(b.bandLabel, t.sub, true) / 2, Math.max(z.x + textWidth(b.bandLabel, t.sub, true) / 2, (a + c) / 2));
    out += text(mid, y - sw - 10, b.bandLabel, { size: t.sub, weight: 700, fill: C.greenDeep, anchor: "middle" });
  }
  if (b.marker) {
    const mx = pos(b.marker.value);
    const lx = Math.min(z.x + z.w - textWidth(b.marker.label, t.body, true) / 2, Math.max(z.x + textWidth(b.marker.label, t.body, true) / 2, mx));
    out +=
      `<circle cx="${n(mx)}" cy="${n(y)}" r="${n(sw * 0.66)}" fill="${C.white}" stroke="${C.ink}" stroke-width="4"/>` +
      text(lx, y + sw + t.body * 3, b.marker.label, { size: t.body, weight: 800, fill: C.ink, anchor: "middle" });
  }
  return out;
}

function renderBars(b: Extract<Body, { kind: "bars" }>, z: Zone, t: Scale, mode: Mode): string {
  const bars = b.bars;
  const gap = mode === "wide" ? 14 : 10;
  const h = Math.min(mode === "wide" ? 48 : 34, (z.h - gap * (bars.length - 1)) / bars.length);
  const labelW = mode === "wide" ? Math.min(300, z.w * 0.34) : z.w * 0.42;
  const trackX = z.x + labelW + 16;
  const trackW = z.w - labelW - 16;
  const max = Math.max(...bars.map((x) => x.value), 0.0001);
  return bars
    .map((bar, i) => {
      const y = z.y + (h + gap) * i;
      const w = Math.max(6, (bar.value / max) * (trackW - 74));
      const on = bar.emphasis !== false;
      const size = fitSize(bar.label, labelW, t.body, t.sub * 0.9, false);
      return (
        text(z.x + labelW, y + h / 2 + size * 0.34, bar.label, { size, fill: C.ink2, anchor: "end" }) +
        box(trackX, y, w, h, { fill: on ? C.green : C.ice, r: R.sm }) +
        text(trackX + w + 12, y + h / 2 + t.body * 0.34, bar.display, { size: t.body, weight: 800, fill: C.ink })
      );
    })
    .join("");
}

function renderBody(b: Body, z: Zone, t: Scale, mode: Mode): string {
  switch (b.kind) {
    case "equation":
      return renderEquation(b, z, t, mode);
    case "flow":
      return renderFlow(b, z, t, mode);
    case "steps":
      return renderSteps(b, z, t, mode);
    case "cards":
      return renderCards(b, z, t, mode);
    case "compare":
      return renderCompare(b, z, t, mode);
    case "nested":
      return renderNested(b, z, t, mode);
    case "range":
      return renderRange(b, z, t, mode);
    case "bars":
      return renderBars(b, z, t, mode);
  }
}

/* ── Raam ─────────────────────────────────────────────────────────────────── */

const SITE = "mikrokvalifikatsioon.ee";

function render(d: Diagram, mode: Mode): string {
  const CV = mode === "wide" ? WIDE : STACK;
  const t = TYPE[mode];
  const x = CV.pad;
  const w = CV.w - CV.pad * 2;

  /* Päis: kicker → pealkiri (järeldus) → täpsustus. */
  let y = CV.pad + t.kicker;
  let head = text(x, y, d.kicker.toUpperCase(), { size: t.kicker, weight: 700, fill: C.faint, tracking: t.kicker * 0.16 });

  const hlSize = mode === "wide" ? fitSize(d.headline, w, t.headline, 30, true) : t.headline;
  const hlLines = wrap(d.headline, w, hlSize, true);
  y += mode === "wide" ? 40 : 26;
  const hl = block(x, y, hlLines, { size: hlSize, weight: 800, fill: C.ink, leading: hlSize * 1.14 });
  head += hl.svg;
  y += hl.height;

  if (d.deck) {
    const deckLines = wrap(d.deck, w, t.deck);
    y += mode === "wide" ? 4 : 2;
    const dk = block(x, y + t.deck * 0.2, deckLines, { size: t.deck, fill: C.muted, leading: t.deck * 1.3 });
    head += dk.svg;
    y += dk.height;
  }

  /* Jalus: peenike joon, järeldus, brändimärk + domeen. Kõrgus tuleb sisust, nii
     et järeldus ja logo ei satu kunagi teineteise peale. */
  const wide = mode === "wide";
  const markH = wide ? 26 : 20;
  const domainW = textWidth(SITE, t.foot, true);
  const brandW = markWidth(markH) + 12 + domainW;
  const tkLines = wrap(d.takeaway, wide ? w - brandW - 48 : w, t.takeaway, false);
  const tkH = tkLines.length * t.takeaway * 1.3;
  const footerH = wide ? Math.max(tkH, markH) + 28 : tkH + 16 + markH + 6;
  const footTop = CV.h - CV.pad - footerH;
  const markY = wide ? footTop + (footerH - markH) / 2 + 6 : CV.h - CV.pad - markH;
  const foot =
    `<line x1="${n(x)}" y1="${n(footTop)}" x2="${n(CV.w - CV.pad)}" y2="${n(footTop)}" stroke="${C.line}" stroke-width="2"/>` +
    block(x, footTop + (wide ? 28 : 22) + t.takeaway * 0.72, tkLines, { size: t.takeaway, fill: C.ink2, leading: t.takeaway * 1.3 }).svg +
    brandMark(CV.w - CV.pad - brandW, markY, markH) +
    text(CV.w - CV.pad, markY + markH * 0.62 + t.foot * 0.34, SITE, { size: t.foot, weight: 700, fill: C.muted, anchor: "end" });

  /* Kere: kogu ruum päise ja jaluse vahel. */
  const bodyTop = y + (mode === "wide" ? 24 : 18);
  const zone: Zone = { x, y: bodyTop, w, h: Math.max(60, footTop - 18 - bodyTop) };

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CV.w} ${CV.h}" width="${CV.w}" height="${CV.h}" role="img" aria-labelledby="dt dd">` +
    `<title id="dt">${esc(d.headline)}</title><desc id="dd">${esc(d.alt)}</desc>` +
    `<rect width="${CV.w}" height="${CV.h}" fill="${C.white}"/>` +
    `<g font-family="${FONT}">${head}${renderBody(d.body, zone, t, mode)}${foot}</g></svg>\n`
  );
}

export const renderWide = (d: Diagram): string => render(d, "wide");
export const renderStacked = (d: Diagram): string => render(d, "stacked");

/** Astro-lõpp-punkti abiline. */
export function svgResponse(svg: string): Response {
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml; charset=utf-8" } });
}
