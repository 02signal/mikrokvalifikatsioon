// Avalik kuva sõltub allika lubatavusest (omaniku otsus 14.10.2026, PO orch-23):
// kus kooli veebileht automaatset kogumist keelab (robots.txt), näitab avalik sait AINULT
// EHIS-i andmeid. Info ise (andmeladu, turu-uuring) jääb AMOS-i sisekasutusse.
//
// `source-basis.json` on AMOS-i `source-basis.json` (mkval-public-facts-contract) kommititud
// koopia. Fail-closed: programm, mida failis POLE, käsitletakse nagu "unverified" ehk
// ainult-EHIS (consumerRule). Täielikkust valvab scripts/ehis-only-restriction.test.mjs,
// seega uus programm ilma märgistuseta teeb build'i punaseks, mitte ei lekita vaikselt.
import basis from "./source-basis.json" with { type: "json" };

export const PAGE_DERIVED_BASIS = "provider_page_robots_allowed";

interface BasisRow {
  id: string;
  publicationBasis: string;
}

const rows = new Map<string, BasisRow>((basis.programmes as BasisRow[]).map((row) => [row.id, row]));

export const sourceBasisGeneratedAt: string = basis.generatedAt;

export function publicationBasisOf(id: string | null | undefined): string {
  return (id && rows.get(id)?.publicationBasis) || "unverified";
}

/** true => avalikus kirjes ei tohi olla kooli lehelt korjatud sisu, ainult EHIS-i väljad. */
export function isEhisOnly(id: string | null | undefined): boolean {
  return publicationBasisOf(id) !== PAGE_DERIVED_BASIS;
}

export function hasBasisRow(id: string): boolean {
  return rows.has(id);
}
