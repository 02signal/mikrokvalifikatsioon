// Püstine variant sama joonise jaoks (400×640) — kitsale ekraanile.
// Lai joonis telefonis kahaneks nii, et sildid jääksid ~8 px suuruseks; meie
// lugeja on sageli 60+. Sama sõnum, teine paigutus.
import { diagrams } from "../../../data/diagrams";
import { renderStacked, svgResponse, type Diagram } from "../../../lib/diagram";

export function getStaticPaths() {
  return diagrams.map((d) => ({ params: { id: d.id }, props: { d } }));
}

export function GET({ props }: { props: { d: Diagram } }): Response {
  return svgResponse(renderStacked(props.d));
}
