// Lai valdkonna profiil-joonis (üks SVG valdkonna kohta): programmide arv, EAP-maht
// ja hinnavahemik selle valdkonna kataloogikirjetest. Kirjeldus (Diagram) tuleb
// src/data/diagrams-data.ts-ist, kujundus src/lib/diagram.ts-ist — sama süsteem
// mis kõigil teistel joonistel.
import { fieldsWithSlug } from "../../../data/catalog";
import { fieldDiagram } from "../../../data/diagrams-data";
import { renderWide, svgResponse } from "../../../lib/diagram";

export function getStaticPaths() {
  return fieldsWithSlug.map((f) => ({ params: { slug: f.slug }, props: { field: f.field } }));
}

export function GET({ props }: { props: { field: string } }): Response {
  return svgResponse(renderWide(fieldDiagram(props.field)));
}
