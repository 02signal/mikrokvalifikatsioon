// Püstine variant sama joonise jaoks (400×640) — kitsale ekraanile.
// Lai joonis telefonis kahaneks nii, et sildid jääksid ~8 px suuruseks; meie
// lugeja on sageli 60+. Sama sõnum, teine paigutus.
import { diagrams } from "../../../data/diagrams";
import { dataDiagrams } from "../../../data/diagrams-data";
import { renderStacked, svgResponse, type Diagram } from "../../../lib/diagram";

const allDiagrams: Diagram[] = [...diagrams, ...dataDiagrams()];

export function getStaticPaths() {
  return allDiagrams.map((d) => ({ params: { id: d.id }, props: { d } }));
}

export function GET({ props }: { props: { d: Diagram } }): Response {
  return svgResponse(renderStacked(props.d));
}
