import { catalog, catalogCheckedAt, catalogUpdatedAt, catalogContentHash } from "../data/catalog";
import { detailUrl } from "../data/courseSchema";
import { entryOutcomeObjects } from "../data/outcomes";
import { STALE_AFTER_DAYS, isStaleSource } from "../data/dates";

// Kooli lehelt kontrollimata kirjed (sama reegel mis programmi lehe märkel).
const checkedDates = catalog.map((entry) => entry.sourceCheckedAt).filter((d): d is string => Boolean(d)).sort();
const staleCount = catalog.filter((entry) => isStaleSource(entry.sourceCheckedAt, catalogCheckedAt)).length;

export async function GET() {
  return new Response(
    JSON.stringify(
      {
        site: "Mikrokvalifikatsioon.ee",
        description:
          "Eesti mikrokvalifikatsioonide ja mikrokraadide avalik kataloog. Andmed pärinevad koolide avalikelt lehtedelt; tundmatu väärtus on null.",
        updatedAt: catalogUpdatedAt,
        checkedAt: catalogCheckedAt,
        sourceFeedHash: catalogContentHash,
        importantCaveat:
          "See kataloog on info koondamiseks. Hinnad, mahud ja vastuvõtud muutuvad — ametlik info on iga kooli enda lehel (iga kirje url-väli).",
        count: catalog.length,
        staleAfterDays: STALE_AFTER_DAYS,
        staleCount,
        oldestVerifiedAt: checkedDates[0] ?? null,
        // pageUrl = programmi siseleht; url = kooli ametlik leht.
        programs: catalog.map((entry) => {
          const outcomeObjects = entryOutcomeObjects(entry);
          return {
            ...entry,
            outcomes: outcomeObjects.map((outcome) => outcome.text),
            outcomeObjects,
            pageUrl: detailUrl(entry)
          };
        })
      },
      null,
      2
    ),
    { headers: { "Content-Type": "application/json; charset=utf-8" } }
  );
}
