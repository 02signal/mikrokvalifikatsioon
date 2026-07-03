import { catalog, catalogCheckedAt, catalogUpdatedAt, catalogContentHash } from "../data/catalog";
import { detailUrl } from "../data/courseSchema";
import { entryOutcomeObjects } from "../data/outcomes";

export async function GET() {
  return new Response(
    JSON.stringify(
      {
        site: "Mikrokvalifikatsioon.ee",
        description:
          "Eesti mikrokvalifikatsioonide ja mikrokraadide avalik register. Andmed pärinevad koolide avalikelt lehtedelt; tundmatu väärtus on null.",
        updatedAt: catalogUpdatedAt,
        checkedAt: catalogCheckedAt,
        sourceFeedHash: catalogContentHash,
        importantCaveat:
          "See register on info koondamiseks. Hinnad, mahud ja vastuvõtud muutuvad — ametlik info on iga kooli enda lehel (iga kirje url-väli).",
        count: catalog.length,
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
