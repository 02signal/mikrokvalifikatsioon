// Püstine variant valdkonna profiil-joonisest (400×640) — kitsale ekraanile.
// Sama Diagram-andmed kui lai variant, teine paigutus (vt src/lib/diagram.ts).
import { fieldsWithSlug } from "../../../../data/catalog";
import { fieldDiagram } from "../../../../data/diagrams-data";
import { renderStacked, svgResponse } from "../../../../lib/diagram";

export function getStaticPaths() {
  return fieldsWithSlug.map((f) => ({ params: { slug: f.slug }, props: { field: f.field } }));
}

export function GET({ props }: { props: { field: string } }): Response {
  return svgResponse(renderStacked(fieldDiagram(props.field)));
}
