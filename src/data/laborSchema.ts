// Labour-market demand types — mirror the AMOS public feed `amos.mkval.labor/v1`.
//
// The feed is BANDED + aggregate by design (privacy + the Töötukassa open-data CC BY-NC
// licence): never a raw vacancy count or raw euro. The occupation granularity is the ISCO
// major group (10 broad groups) — `isco_major_group` "0".."9" — labelled via the snapshot.

export type LaborTrend = "up" | "flat" | "down" | "unknown";

export type OpeningsBand =
  | "none" | "band_1_5" | "band_6_20" | "band_21_50" | "band_gt_50";

export interface LaborDemandSignal {
  occupation_ref?: string;
  /** ISCO major group "0".."9" (the public, labellable occupation grouping). */
  isco_major_group?: string;
  /** AMOS region slug (e.g. "harju") or "unknown" (county not specified). */
  region: string;
  openings_now_band: OpeningsBand;
  trend: LaborTrend;
  salary_p25_band: string;
  salary_p75_band: string;
  entry_share_band: string;
  observed_window: string;
  /** ISO date (first of the observed month). */
  as_of: string;
}

export interface LaborFeed {
  feed_version: string;
  generated_at: string;
  freshness_window: string;
  demand_signals: LaborDemandSignal[];
  salary_observations: unknown[];
}

export interface LaborSnapshot {
  builder_version?: string;
  generated_at: string;
  checked_at: string;
  /** Combined source attribution (Töötukassa, CC BY-NC 3.0). MUST be shown wherever data is shown. */
  attribution_text: string;
  attribution_sources?: unknown[];
  isco_major_group_labels: Record<string, string>;
  feed: LaborFeed;
}
