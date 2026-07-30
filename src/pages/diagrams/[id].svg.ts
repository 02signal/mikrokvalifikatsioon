// Lai selgitav joonis (960×504 — täpselt 1200×630 kuvasuhe, nii et jagatav
// OG-kaart täidab kaadri servast servani ilma valge äärise ja kärpeta).
// Kirjeldus tuleb src/data/diagrams.ts-ist, kujundus src/lib/diagram.ts-ist.
import { diagrams } from "../../data/diagrams";
import { dataDiagrams } from "../../data/diagrams-data";
import { koolitajaDiagrams } from "../../data/diagrams-koolitaja";
import { renderWide, svgResponse, type Diagram } from "../../lib/diagram";

const allDiagrams: Diagram[] = [...diagrams, ...dataDiagrams(), ...koolitajaDiagrams];

export function getStaticPaths() {
  return allDiagrams.map((d) => ({ params: { id: d.id }, props: { d } }));
}

export function GET({ props }: { props: { d: Diagram } }): Response {
  return svgResponse(renderWide(props.d));
}
