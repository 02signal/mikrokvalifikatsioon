/**
 * Selgitavate jooniste register.
 *
 * Iga joonis on siin ANDMETENA. Kujundus tuleb `src/lib/diagram.ts`-ist, nii et
 * kõik joonised näevad ühtemoodi välja ja parandus ühes kohas parandab kõiki.
 *
 * Serveeritakse:
 *   /diagrams/<id>.svg          lai (960×504) — töölaud + jagatav OG-kaart
 *   /diagrams/stacked/<id>.svg  püstine (400×640) — kitsas ekraan
 *
 * Reeglid (Knaflic + brändijuhend):
 *   • `headline` on JÄRELDUS, mitte teema. "Kuud, mitte aastad", mitte "Kestus".
 *   • `takeaway` ütleb, mida lugeja sellega peale hakkab.
 *   • `alt` on terviklik seletus — sealt loeb selle välja ka otsimootor ja keelemudel.
 *   • Üks sõnum korraga. Kui tahad kahte, tee kaks joonist.
 */

import type { Diagram } from "../lib/diagram";

export const diagrams: Diagram[] = [
  {
    id: "eap-26-tundi",
    kicker: "Õppemaht",
    headline: "1 EAP ≈ 26 tundi sinu tööd",
    deck: "loengud ja iseseisev töö kokku",
    body: {
      kind: "equation",
      left: { label: "1 EAP", sub: "üks ainepunkt" },
      right: { label: "26 tundi", sub: "õppija tööd" },
    },
    takeaway: "Mikrokraad on tavaliselt 6–30 EAP ehk umbes 156–780 tundi. Nii saad ette arvutada, kui palju aega see nädalas võtab.",
    alt: "EAP ehk Euroopa ainepunkt (ECTS) mõõdab õppija töö kogumahtu. Üks EAP võrdub umbes 26 tunni õppija tööga — loengud ja iseseisev töö kokku. Mikrokraad on Eestis tavaliselt 6–30 EAP, mis teeb umbes 156–780 tundi.",
    caption: "1 EAP ≈ 26 tundi õppija tööd. Mikrokraad 6–30 EAP ≈ 156–780 tundi.",
  },
  {
    id: "kas-annab-korghariduse",
    kicker: "Kas kraad?",
    headline: "Ei ole kraad — aga samm kraadi poole",
    deck: "lõpeb tunnistusega, mitte bakalaureuse või magistriga",
    body: {
      kind: "flow",
      from: { label: "MIKROKRAAD", sub: "tunnistus · kõrghariduse tasemel" },
      to: { label: "KRAADIÕPE", sub: "bakalaureus või magister" },
      via: "EAP-d kanduvad edasi",
    },
    takeaway: "Kraadi ise ei anna, aga kogutud ainepunkte saab hiljem sageli kraadiõppes arvestada. Küsi kooli käest enne, kui alustad.",
    alt: "Mikrokraad ei ole kõrgharidust andev kraad ega diplom — see lõpeb tunnistusega, mitte bakalaureuse- või magistrikraadiga. Kuid mikrokraad on kõrghariduse tasemel ja annab EAP-sid (ainepunkte), mida saab sageli hiljem kraadiõppes arvestada.",
    caption: "Mikrokraad annab tunnistuse, mitte kraadi — aga EAP-d kanduvad sageli kraadiõppesse.",
  },
  {
    id: "kui-kaua-kestab",
    kicker: "Kestus",
    headline: "Kuud, mitte aastad",
    deck: "tavaliselt 1–2 semestrit töö kõrvalt",
    body: {
      kind: "cards",
      cards: [
        { label: "1 semester", sub: "lühem programm", emphasis: true },
        { label: "+ 2. semester", sub: "mahukam programm" },
      ],
    },
    takeaway: "Maht 6–30 EAP tähendab 156–780 tundi. Enamik õpib töö kõrvalt — arvesta 4–10 tundi nädalas.",
    alt: "Mikrokraad kestab tavaliselt üks kuni kaks semestrit töö kõrvalt — kuud, mitte aastad. Lühemad programmid lõpevad ühe semestriga, mahukamad kahega. Maht 6–30 EAP tähendab umbes 156–780 tundi õppija tööd.",
    caption: "Mikrokraad kestab tavaliselt 1–2 semestrit töö kõrvalt.",
  },
  {
    id: "kuidas-kandideerida",
    kicker: "Kandideerimine",
    headline: "Kolm sammu kohani",
    deck: "vali · kontrolli · registreeru",
    body: {
      kind: "steps",
      steps: [
        { label: "Vali programm", sub: "kataloogist või testist" },
        { label: "Kontrolli eeldusi", sub: "ja tähtaega" },
        { label: "Registreeru", sub: "kooli enda lehel" },
      ],
    },
    takeaway: "Lõplik ja siduv registreerimine käib alati kooli enda lehel — meie juures saad valiku tehtud.",
    alt: "Mikrokraadile kandideerimiseks: 1) vali sobiv programm kataloogist või suunatestist; 2) kontrolli vastuvõtu eeldusi ja registreerimise tähtaega; 3) registreeru kooli enda lehel. Lõplik ja siduv registreerimine käib alati ülikooli või kooli enda lehel.",
    caption: "Kandideerimine kolmes sammus: vali, kontrolli, registreeru kooli lehel.",
  },
  {
    id: "mikrokraad-vs-mikrokvalifikatsioon",
    kicker: "Mõisted",
    headline: "Mikrokraad on üks liik mikrokvalifikatsioonist",
    body: {
      kind: "nested",
      outer: { label: "MIKROKVALIFIKATSIOON", sub: "katusmõiste — iga lühike tunnustatud õpe ühe oskuse kohta" },
      inner: { label: "MIKROKRAAD", sub: "ülikooli oma · annab EAP-d" },
    },
    takeaway: "Iga mikrokraad on mikrokvalifikatsioon — aga mitte vastupidi. Kui otsid ainepunkte, otsi just mikrokraadi.",
    alt: "Mikrokvalifikatsioon on katusmõiste igale lühikesele tunnustatud õppele ühe oskuse kohta. Mikrokraad on selle ülikooli pakutav liik, mis annab EAP-sid (ainepunkte). Iga mikrokraad on mikrokvalifikatsioon, aga mitte iga mikrokvalifikatsioon ei ole mikrokraad.",
    caption: "Mikrokraad mahub mikrokvalifikatsiooni sisse — katusmõiste ja üks selle liik.",
  },
  {
    id: "rahastus-kolm-rada",
    kicker: "Rahastus",
    headline: "Sageli ei maksa õppija kogu summat ise",
    deck: "õppetasule on kolm peamist rada",
    body: {
      kind: "cards",
      cards: [
        { label: "SINA ISE", sub: "otse koolile" },
        { label: "TÖÖANDJA", sub: "koolituseelarvest", emphasis: true },
        { label: "TÖÖTUKASSA", sub: "täiendusõppe toetus" },
      ],
    },
    takeaway: "Küsi kõigepealt tööandjalt — koolituseelarve on kõige kiirem rada. Osa programme on sihtrühmale eraldi rahastatud.",
    alt: "Mikrokvalifikatsiooni õppetasule on kolm peamist rada: õppija ise, tööandja koolituseelarve või Töötukassa toetus. Sageli ei maksa õppija kogu summat ise. Osa programme on kindlale sihtrühmale eraldi rahastatud, näiteks Euroopa Liidu kaasrahastusel.",
    caption: "Kolm rada õppetasule: sina ise, tööandja koolituseelarve või Töötukassa.",
  },
  {
    id: "vs-taiendkoolitus",
    kicker: "Võrdlus",
    headline: "Registreeritud õpe jätab CV-sse jälje",
    deck: "mikrokvalifikatsioon vs tavaline täiendkoolitus",
    body: {
      kind: "compare",
      left: {
        label: "MIKROKVALIFIKATSIOON",
        points: ["EHIS-es registreeritud õppekava", "annab EAP ainepunktid", "tunnistus + õpiväljundid"],
        note: "tõendatud ja ülekantav",
      },
      right: {
        label: "TÄIENDKOOLITUS",
        points: ["vabam vorm", "sageli ei anna EAP-d", "lühem, vähem formaalne"],
        note: "hea kiireks sissejuhatuseks",
      },
    },
    takeaway: "Kui tahad, et õpitu oleks hiljem tõendatav ja ülekantav, vali registreeritud õppekava.",
    alt: "Mikrokvalifikatsioon on EHIS-es registreeritud õppekava kinnitatud mahu (EAP), õpiväljundite ja tunnistusega. Tavaline täiendkoolitus on vabamas vormis, sageli lühem ega pruugi anda ainepunkte. Mikrokvalifikatsioon on seega tõendatum ja ülekantavam.",
    caption: "Registreeritud õppekava annab EAP-d ja tunnistuse; täiendkoolitus on vabam vorm.",
  },
];

export const diagramById = new Map(diagrams.map((d) => [d.id, d]));

/** Pildiallkiri + alt-tekst lehel — hoiab `questions/index.ts` figure-kirjed lühikesena. */
export function figureFor(id: string): { src: string; stacked: string; raster: string; alt: string; caption: string; width: number; height: number } | undefined {
  const d = diagramById.get(id);
  if (!d) return undefined;
  return {
    src: `/diagrams/${id}.svg`,
    stacked: `/diagrams/stacked/${id}.svg`,
    raster: `/diagrams/${id}.png`,
    alt: d.alt,
    caption: d.caption,
    width: 960,
    height: 504,
  };
}
