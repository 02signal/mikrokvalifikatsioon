// Labour-market demand data layer (mirrors the catalog feed pattern): read the AMOS
// public feed at build time from PUBLIC_LABOR_FEED_URL, else fall back to the committed
// snapshot. Aggregates only (banded), sourced from Töötukassa open data (CC BY-NC 3.0) —
// the attribution MUST travel with any display.

import snapshot from "./snapshot.json";
import type { LaborDemandSignal, LaborSnapshot, LaborTrend, OpeningsBand } from "../laborSchema";

const FEED_URL = import.meta.env.PUBLIC_LABOR_FEED_URL as string | undefined;
const local = snapshot as unknown as LaborSnapshot;

async function loadSnapshot(): Promise<LaborSnapshot> {
  if (FEED_URL) {
    try {
      const res = await fetch(FEED_URL);
      if (res.ok) {
        const data = (await res.json()) as Partial<LaborSnapshot>;
        // accept either the snapshot envelope or a bare feed
        const feed = data?.feed ?? (data as any);
        if (feed && Array.isArray(feed.demand_signals) && feed.demand_signals.length) {
          return {
            generated_at: data?.generated_at ?? local.generated_at,
            checked_at: data?.checked_at ?? local.checked_at,
            attribution_text: data?.attribution_text ?? local.attribution_text,
            isco_major_group_labels: data?.isco_major_group_labels ?? local.isco_major_group_labels,
            feed,
          } as LaborSnapshot;
        }
      }
      console.warn(`[labor] feed ${FEED_URL} unusable (HTTP ${res.status}); using snapshot`);
    } catch (e) {
      console.warn(`[labor] feed fetch error: ${(e as Error).message}; using snapshot`);
    }
  }
  return local;
}

const data = await loadSnapshot();

export const laborSignals: LaborDemandSignal[] = data.feed.demand_signals ?? [];
export const laborLabels: Record<string, string> = data.isco_major_group_labels ?? {};
export const laborAttribution: string = data.attribution_text;
export const laborCheckedAt: string = data.checked_at;
export const laborGeneratedAt: string = data.generated_at;

// ── display helpers (Estonian, banded — never invent a number) ──────────────────

const OPENINGS_TEXT: Record<OpeningsBand, string> = {
  none: "0 kohta",
  band_1_5: "1–5 kohta",
  band_6_20: "6–20 kohta",
  band_21_50: "21–50 kohta",
  band_gt_50: "üle 50 koha",
};
export function openingsBandText(band: string): string {
  return OPENINGS_TEXT[band as OpeningsBand] ?? "teadmata";
}

const TREND: Record<LaborTrend, { label: string; arrow: string }> = {
  up: { label: "kasvav", arrow: "↑" },
  down: { label: "kahanev", arrow: "↓" },
  flat: { label: "stabiilne", arrow: "→" },
  unknown: { label: "teadmata", arrow: "·" },
};
export function trendInfo(t: string): { label: string; arrow: string } {
  return TREND[t as LaborTrend] ?? TREND.unknown;
}

const REGION_LABEL: Record<string, string> = {
  harju: "Harju maakond", hiiu: "Hiiu maakond", "ida-viru": "Ida-Viru maakond",
  jarva: "Järva maakond", jogeva: "Jõgeva maakond", laane: "Lääne maakond",
  "laane-viru": "Lääne-Viru maakond", parnu: "Pärnu maakond", polva: "Põlva maakond",
  rapla: "Rapla maakond", saare: "Saare maakond", tartu: "Tartu maakond",
  valga: "Valga maakond", viljandi: "Viljandi maakond", voru: "Võru maakond",
  unknown: "Maakond täpsustamata",
};
export function regionLabel(slug: string): string {
  return REGION_LABEL[slug] ?? slug;
}

export function iscoLabel(group: string | undefined): string {
  return (group && laborLabels[group]) || "Ametirühm";
}

/** "2026-05-01" → "mai 2026" (Estonian month). */
const ET_MONTHS = ["jaanuar", "veebruar", "märts", "aprill", "mai", "juuni", "juuli", "august", "september", "oktoober", "november", "detsember"];
export function asOfText(iso: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(iso || "");
  return m ? `${ET_MONTHS[Number(m[2]) - 1]} ${m[1]}` : iso;
}

/** Demand for one ISCO group in a region; falls back to the no-county ("unknown") figure. */
export function demandFor(iscoGroup: string, region = "unknown"): LaborDemandSignal | null {
  return (
    laborSignals.find((s) => s.isco_major_group === iscoGroup && s.region === region) ??
    laborSignals.find((s) => s.isco_major_group === iscoGroup && s.region === "unknown") ??
    null
  );
}

/** All ISCO groups for a region (for the overview), ordered by group code. */
export function groupsForRegion(region: string): LaborDemandSignal[] {
  return laborSignals
    .filter((s) => s.region === region && s.isco_major_group)
    .sort((a, b) => String(a.isco_major_group).localeCompare(String(b.isco_major_group)));
}

/** Regions that have data, excluding the no-county bucket. */
export function regionsWithData(): string[] {
  return [...new Set(laborSignals.map((s) => s.region).filter((r) => r !== "unknown"))].sort();
}
