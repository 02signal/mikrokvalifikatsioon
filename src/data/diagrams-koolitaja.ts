/**
 * Selgitavad joonised — koolitajale / HAKA / arendajale suunatud sisu.
 *
 * Sama `Diagram`-kujundussüsteem mis `src/data/diagrams.ts`, aga eraldi
 * moodulis, et õppijale suunatud üldjoonised ja koolitajale suunatud
 * ametliku raamistiku joonised ei seguneks ühte üha kasvavasse faili.
 *
 * Kasutatakse:
 *   • `src/data/questions/index.ts` kaheksa koolitaja/HAKA vastuse `figure`-is
 *   • viie `/koolitajale/*` lehe `ogImage`-is ja lehe enda joonisena
 *
 * Faktide allikas on `src/data/questions/index.ts` samade slugide `body`/
 * `shortAnswer` väljad ja `/koolitajale/*` lehtede endi tekst — siin ei
 * korrata ühtki numbrit, mida need kohad juba ei ütle.
 */
import type { Diagram } from "../lib/diagram";

export const koolitajaDiagrams: Diagram[] = [
  // ── /vastused/kuidas-saada-mikrokvalifikatsiooni-pakkujaks/ ──────────────
  {
    id: "pakkujaks-saamise-sammud",
    kicker: "Pakkujaks saamine",
    headline: "Kolm sammu enne kui õppija sind näeb",
    deck: "HAKA → tegevusluba/registreerimine → EHIS",
    body: {
      kind: "steps",
      steps: [
        { label: "HAKA hindab õppekavarühma", sub: "kaheksa valdkonda" },
        { label: "Tegevusluba või registreerimine", sub: "uus vs tuttav valdkond" },
        { label: "Registreeri õppekava EHIS-es", sub: "nimi, maht, õpiväljundid" },
      ],
    },
    takeaway: "Olemasoleva õigusega jääb sageli vaid 3. samm.",
    alt: "Mikrokvalifikatsiooni pakkujaks saamine käib kolmes sammus: kõigepealt HAKA kvaliteedihindamine, mis hindab asutuse õppekavarühma võimekust kaheksas valdkonnas (vajalik, kui asutusel pole selles valdkonnas veel õppeõigust); seejärel tegevusluba või registreerimine, olenevalt sellest, kas tegemist on uue või juba tuttava valdkonnaga; ja lõpuks konkreetse õppekava registreerimine Eesti Hariduse Infosüsteemis (EHIS). Alles pärast kõiki kolme sammu on õppekava ametlikult mikrokvalifikatsioonina õppijale nähtav.",
    caption: "Kolm sammu pakkujaks saamiseni: HAKA hindamine, tegevusluba/registreerimine, EHIS-registreerimine.",
  },
  // ── /vastused/mida-haka-mikrokvalifikatsiooni-hindamisel-hindab/ ─────────
  {
    id: "haka-hindab-oppekavaruhma",
    kicker: "Mida HAKA hindab",
    headline: "Hea õppekava üksi ei piisa",
    body: {
      kind: "nested",
      outer: { label: "ÕPPEKAVARÜHM", sub: "8 valdkonda · 27 kriteeriumi · asutuse võimekus" },
      inner: { label: "1 ÕPPEKAVA", sub: "vajalik, aga üksi ei piisa" },
    },
    takeaway: "Valmista ette kõik kaheksa valdkonda.",
    alt: "HAKA ei hinda üht õppekava, vaid asutuse võimekust kogu õppekavarühmas kaheksas valdkonnas ja kokku 27 kriteeriumi järgi, kolmeastmelisel skaalal (vastab / vastab osaliselt / ei vasta). Üks hea õppekava on osa tervikust, aga üksinda ei taga see positiivset otsust — kõik kaheksa valdkonda peavad vastama nõuetele. Positiivne otsus kehtib viis aastat.",
    caption: "HAKA hindab asutuse kogu õppekavarühma võimekust, mitte üht õppekava eraldi.",
  },
  // ── /vastused/mis-on-haka-eneseanalyys/ ───────────────────────────────────
  {
    id: "eneseanalyys-vaide-toend",
    kicker: "Eneseanalüüs",
    headline: "Väide ilma tõendita ei loe",
    deck: "eneseanalüüs on hindamise alusdokument, mitte lisa",
    body: {
      kind: "flow",
      from: { label: "VÄIDE", sub: "„X on tagatud“" },
      via: "+ konkreetne tõend",
      to: { label: "USUTAV", sub: "hindaja saab kontrollida" },
    },
    takeaway: "Kirjuta iga väide nii: „X on tagatud, tõendiks on Y“ — mitte üldsõnaliselt.",
    alt: "Eneseanalüüs on HAKA kvaliteedihindamise alusdokument, mille asutus koostab ise enne hindamist ja mis on kohustuslik osa taotlusest. Hindaja loeb seda kui peamist teksti, mitte kaaskirja: iga väide vajab konkreetset tõendit — dokumenti, näidet või protsessi —, et olla usutav. Ilma tõenditeta jääb eneseanalüüs üldsõnaliseks ega veena hindajat.",
    caption: "Väide + konkreetne tõend teeb eneseanalüüsi usutavaks; üldsõnaline väide ei loe.",
  },
  // ── /vastused/kui-palju-maksab-haka-mikrokvalifikatsiooni-hindamine/ ─────
  {
    id: "haka-hinnad-kaks-tasu",
    kicker: "Riigilõivud",
    headline: "Hindamistasu on ühekordne, registreerimine kordub",
    deck: "kaks eri tasu, kaks eri sagedust",
    body: {
      kind: "cards",
      cards: [
        { label: "~1450 €", sub: "õppekavarühma hindamine · kord 5 aasta jooksul", emphasis: true },
        { label: "~100 €", sub: "iga õppekava registreerimine EHIS-es" },
      ],
    },
    takeaway: "Mitme õppekava lisamine samasse rühma ei too uut hindamistasu — ainult registreerimistasu.",
    alt: "HAKA kvaliteedihindamisega ja mikrokvalifikatsiooni registreerimisega kaasnevad kaks eri riigilõivu: õppekavarühma kvaliteedihindamine maksab suurusjärgus 1450 € ja tasutakse korra rühma sisenemisel (otsus kehtib viis aastat); iga õppekava registreerimine Eesti Hariduse Infosüsteemis (EHIS) maksab lisaks suurusjärgus 100 € õppekava kohta. Need on suurusjärgu numbrid — täpsed ja ajakohased summad tuleb kontrollida ametlikust allikast.",
    caption: "Suurusjärgu numbrid: hindamine ~1450 € (kord rühma kohta), registreerimine ~100 € (iga õppekava kohta).",
  },
  // ── /vastused/haka-mikrokvalifikatsiooni-hindamise-tuupvead/ ─────────────
  {
    id: "haka-tuupvead-kolm",
    kicker: "Tüüpvead",
    headline: "Enamik vigu on korrastamise, mitte sisu vead",
    deck: "kolm kõige sagedasemat lõksu",
    body: {
      kind: "cards",
      cards: [
        { label: "MAHT EI KLAPI", sub: "akadeemilised ja astronoomilised tunnid segamini" },
        { label: "DOKUMENDID EI KLAPI", sub: "õppekava, veebileht ja eneseanalüüs erinevad" },
        { label: "VÄIDE ILMA TÕENDITA", sub: "üldsõnaline eneseanalüüs" },
      ],
    },
    takeaway: "Lukusta mahunumbrid ühte kohta, kontrolli dokumentide kooskõla ja lisa igale väitele tõend enne esitamist.",
    alt: "Kõige sagedasemad vead HAKA hindamiseks valmistumisel on kolm: mahuarvestuse mittevastavus (akadeemilised ja astronoomilised tunnid segamini), dokumendid, mis ei klapi omavahel (õppekava, veebileht ja eneseanalüüs räägivad erinevat juttu), ja üldsõnaline eneseanalüüs ilma konkreetse tõendita. Enamik neist vigadest on ennetatavad — need on pigem korrastamise, mitte sisu puudujäägid.",
    caption: "Kolm sagedasemat lõksu: maht ei klapi, dokumendid ei klapi, väide ilma tõendita.",
  },
  // ── /vastused/kuidas-arvutada-oppekava-eap-mahtu/ ────────────────────────
  {
    id: "eap-mahu-arvutus",
    kicker: "EAP arvutus",
    headline: "208 akadeemilist tundi teeb 6 EAP",
    deck: "kaks teisendust: × 0,75, siis ÷ 26",
    body: {
      kind: "flow",
      from: { label: "208 akad. tundi", sub: "× 0,75" },
      via: "156 astr. tundi",
      to: { label: "6 EAP", sub: "÷ 26" },
    },
    takeaway: "Sinu programmi numbrid on erinevad — kasuta sama kahesammulist valemit ja lukusta tulemus ühte kohta.",
    alt: "Õppekava EAP-mahu arvutamiseks tuleb esmalt akadeemilised tunnid (45 min) teisendada astronoomilisteks, korrutades 0,75-ga; seejärel jagada astronoomiliste tundide summa 26-ga, et saada EAP-de arv. Näide: 208 akadeemilist tundi × 0,75 = 156 astronoomilist tundi; 156 ÷ 26 = 6 EAP. Sama lõplik number peab kajastuma täht-täheliselt õppekavas, veebilehel ja eneseanalüüsis.",
    caption: "Näide: 208 akadeemilist tundi × 0,75 = 156 astronoomilist tundi; 156 ÷ 26 = 6 EAP.",
  },
  // ── /vastused/kas-koolitaja-vajab-taiskasvanud-koolitaja-kutset/ ─────────
  {
    id: "koolitaja-kutse-pole-kohustuslik",
    kicker: "Koolitaja pädevus",
    headline: "Kutse pole kohustuslik, pädevus küll",
    deck: "seadus vs HAKA kvaliteedihindamine",
    body: {
      kind: "compare",
      left: {
        label: "HAKA HINDAMISEL",
        points: ["Koolitaja pädevus on eraldi valdkond", "Kutse on ÜKS tõend paljude seas", "Sobib ka haridus + kogemus + tulemuslikkus"],
        note: "info peab olema avalik ja ühtses stiilis",
      },
      right: {
        label: "SEADUSES",
        points: ["Täiskasvanud koolitaja kutse ei ole kohustuslik"],
        note: "täiskasvanute koolituse seadus",
      },
    },
    takeaway: "Tõenda iga koolitaja pädevus avalikult ja ühtses stiilis — kutse on üks võimalik, mitte ainus viis.",
    alt: "Täiskasvanute koolituse seadus ei nõua, et koolitajal oleks täiskasvanud koolitaja kutsetunnistus. HAKA kvaliteedihindamisel on koolitajate kompetentsus aga eraldi hindamisvaldkond: iga koolitaja eriala- ja täiskasvanute koolitaja pädevus peab olema tõendatud ja avalik. Täiskasvanud koolitaja kutse (Andras, EKR tase 5 või 6) on üks tunnustatud tõend selle kõrval, kuid sama pädevust saab tõendada ka erialase hariduse, dokumenteeritud koolituskogemuse ja tulemuslikkuse hindamise kaudu.",
    caption: "Kutse pole seadusest kohustuslik; HAKA hindab koolitaja pädevust ja kutse on üks võimalik tõend.",
  },
  // ── /vastused/credential-commons-vs-ehis/ ────────────────────────────────
  {
    id: "ehis-vs-credential-commons",
    kicker: "Kaks kihti",
    headline: "Kaks kihti, mis täiendavad teineteist",
    deck: "EHIS on ametlik register, Credential Commons on masinloetav kiht",
    body: {
      kind: "compare",
      left: {
        label: "EHIS",
        points: ["Eesti riiklik register", "Ametlik õppekavakood, kinnitatud maht", "Registreerimine on kohustuslik samm"],
        note: "Haridus- ja Teadusministeerium",
      },
      right: {
        label: "CREDENTIAL COMMONS",
        points: ["Avatud, masinloetav andmestandard", "Loetav ka teistele asutustele ja AI-teenustele", "Ei asenda EHIS-t"],
        note: "täiendav kiht, mitte register",
      },
    },
    takeaway: "EHIS-registreerimine on kohustuslik; Credential Commons teeb sama sisu masinatele ja teistele loetavaks.",
    alt: "EHIS (Eesti Hariduse Infosüsteem) on Eesti riiklik register, kuhu mikrokvalifikatsiooni õppekavad ja tunnistused ametlikult kantakse — see on kohustuslik samm. Credential Commons on avatud, masinloetav andmestandard, mis kirjeldab sama sisu nii, et seda saavad lugeda ka teised koolid, tööandjad ja AI-teenused. Credential Commons ei asenda EHIS-t, vaid täiendab seda: EHIS annab ametliku staatuse, Credential Commons teeb sama info laiemalt kättesaadavaks.",
    caption: "EHIS on kohustuslik riiklik register; Credential Commons on täiendav masinloetav kiht, mitte asendus.",
  },
  // ── /koolitajale/hinnastamine/ ────────────────────────────────────────────
  {
    id: "hinnastamine-tasuvuse-naide",
    kicker: "Tasuvuse näide",
    headline: "Kolmas õppija katab vooru — edasi tuleb kasum",
    deck: "illustratiivne näide — täida oma numbritega",
    body: {
      kind: "flow",
      from: { label: "3000 €", sub: "vooru püsikulu (näide)" },
      via: "÷ (1200 − 200)",
      to: { label: "3 õppijat", sub: "katab vooru; edasi kasum" },
    },
    takeaway: "See on illustratiivne näide — pane oma tegelikud numbrid valemisse enne otsust.",
    alt: "Tasuvuse loogika: õppijate arv tasuvuseni = ühekordne + püsikulu jagatud (hind ühele õppijale miinus muutuvkulu ühele). Illustratiivses näites on vooru püsikulu 3000 €, hind õppijale 1200 € ja muutuvkulu õppija kohta 200 €: 3000 ÷ (1200 − 200) = 3 õppijat katab vooru; iga järgmine õppija on kasum. See ei ole lubadus, vaid arvutusloogika, mille iga koolitaja täidab oma numbritega.",
    caption: "Näide: vooru püsikulu 3000 €, hind 1200 €, muutuvkulu 200 € — kolmas õppija katab vooru.",
  },
  // ── /koolitajale/turule-toomine/ ─────────────────────────────────────────
  {
    id: "turule-toomine-neli-sammu",
    kicker: "Turule toomine",
    headline: "Nähtavus tuleb alles pärast registreerimist",
    deck: "registreeri → hinnasta → tee nähtavaks → käivita",
    body: {
      kind: "steps",
      steps: [
        { label: "Registreeri EHIS-es", sub: "muidu pole ametlik" },
        { label: "Pane hind ja maht paika", sub: "täishind + toetus" },
        { label: "Tee nähtavaks", sub: "veeb + kataloog" },
        { label: "Käivita esimene voor", sub: "toidab järgmist" },
      ],
    },
    takeaway: "Iga samm eeldab eelmist.",
    alt: "Valmis mikrokvalifikatsiooni turule toomine käib neljas sammus: registreeri õppekava Eesti Hariduse Infosüsteemis (EHIS); pane paika täishind, rahastatud hind ja maht (EAP); tee programm nähtavaks oma veebilehel, meie kataloogis ja avatud andmestandardis (Credential Commons); ja käivita esimene voor koos tähtaja ja registreerimisega. Esimese vooru tagasiside toidab järgmist versiooni.",
    caption: "Neli sammu turuni: registreeri EHIS-es, hinnasta, tee nähtavaks, käivita esimene voor.",
  },
  // ── /koolitajale/eneseanalyys/ ───────────────────────────────────────────
  {
    id: "eneseanalyys-alusdokument",
    kicker: "Eneseanalüüs",
    headline: "See ei ole kaaskiri — see on hindamise alus",
    deck: "levinud eksiarvamus vs tegelik roll",
    body: {
      kind: "compare",
      left: {
        label: "ALUSDOKUMENT",
        points: ["Peamine tekst, mida hindaja loeb", "Kõik muu peab seda toetama", "Vastuolu loetakse riskiks"],
        note: "nii käsitleb hindaja seda",
      },
      right: {
        label: "KAASKIRI",
        points: ["Üks paber paljude seas", "Loetakse kiiruga läbi", "Vastuolu pole justkui probleem"],
        note: "levinud, aga vale eeldus",
      },
    },
    takeaway: "Kirjuta nii, et õppekava, veebileht ja eneseanalüüs räägiksid täht-täheliselt sama juttu.",
    alt: "Paljud koolitajad käsitlevad eneseanalüüsi kui üht paberit paljude seas — levinud, aga vale eeldus. Tegelikult on eneseanalüüs hindamise alusdokument: see on peamine tekst, mida HAKA hindaja loeb ja mille vastu ta kõiki teisi dokumente (õppekava, veebileht, tõendid) kontrollib. Kui eneseanalüüs läheb vastuollu veebilehe või õppekavaga, loeb hindaja seda riskiks, ükskõik kui hea sisu tegelikkuses on.",
    caption: "Eneseanalüüs on hindamise alusdokument, mitte kaaskiri — kõik muu peab seda toetama.",
  },
  // ── /koolitajale/kvaliteedihindamine/ ────────────────────────────────────
  {
    id: "kvaliteedihindamine-kuldne-reegel",
    kicker: "Kuldne reegel",
    headline: "Osaliselt täidetud loetakse täitmata",
    deck: "3-astmeline skaala: vastab / vastab osaliselt / ei vasta",
    body: {
      kind: "flow",
      from: { label: "VASTAB OSALISELT", sub: "näiliselt peaaegu korras" },
      via: "praktikas loetakse",
      to: { label: "EI VASTA", sub: "langetab kogu valdkonna" },
    },
    takeaway: "Sihi iga kriteeriumi puhul selget „vastab“ — mitte „peaaegu“.",
    alt: "HAKA hindab iga kriteeriumi kolmeastmelisel skaalal: vastab, vastab osaliselt või ei vasta. Kuldne reegel on, et kui midagi on vaid osaliselt täidetud, loeb hindaja seda praktikas täitmata. Mitu „vastab osaliselt“ hinnangut võivad langetada terve valdkonna ja koos sellega positiivse otsuse, kuna kõik kaheksa valdkonda peavad nõuetele vastama.",
    caption: "„Vastab osaliselt“ loetakse hindamisel praktikas täitmata — sihi selget „vastab“.",
  },
  // ── /koolitajale/kuidas-ehitada/ ─────────────────────────────────────────
  {
    id: "kuidas-ehitada-kaks-kaheksast",
    kicker: "Andmestandard",
    headline: "Kaks valdkonda kaheksast on andmeprobleem",
    body: {
      kind: "nested",
      outer: { label: "8 VALDKONDA", sub: "kogu HAKA hindamine" },
      inner: { label: "2 VALDKONDA", sub: "6.2 Õppekava + 6.5 Hindamine" },
    },
    takeaway: "Ülejäänud kuut valdkonda tõendab ikka asutus ise.",
    alt: "Kaheksast HAKA hindamisvaldkonnast käivad kaks otseselt õppekava andmete kohta: 6.2 Õppekava (kas õpiväljundid, maht ja sisu räägivad sama lugu) ja 6.5 Hindamine ja lõpudokumendid (kas igal õpiväljundil on selge hindamiskriteerium). Avatud andmestandard (Credential Commons) aitab just neid kahte valdkonda korrastatult ja kontrollitavalt kirja panna. Ülejäänud kuut valdkonda — õppekavaarendust, õppeprotsessi, koolitajate pädevust, kvaliteedijuhtimist ja ressursse — andmestandard ei asenda; neid tõendab ikka asutus ise.",
    caption: "6.2 ja 6.5 on andmevaldkonnad, kus andmestandard aitab; ülejäänud kuus on asutuse enda tõendada.",
  },
];

export const koolitajaDiagramById = new Map(koolitajaDiagrams.map((d) => [d.id, d]));
