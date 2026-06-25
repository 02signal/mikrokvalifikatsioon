// Kureeritud eestikeelne mõiste-/sünonüümikaart oskuste otsingu jaoks (/oskused/).
//
// MIKS: /oskused/ otsing on täna lihttekstiline (substring) — kui inimene kirjutab
// oskuse OMA sõnadega ("graafikud Excelis"), siis ei leita midagi, kuigi kataloogis
// on õpiväljund "andmete visualiseerimine". See kaart laiendab otsingusõna nendeks
// sõnadeks, mis päriselt esinevad kataloogi õpiväljundites.
//
// KUIDAS KASUTATAKSE: kui kasutaja päring sisaldab mõnda klastri `terms` sõna (või
// vastupidi), siis lisame otsingusse selle klastri kõik terminid ja kuvame vihje
// "Näitan ka lähedasi: <label>". Sobitamine on väiketäheline substring.
//
// REEGLID:
//  - `terms` on VÄIKETÄHELISED, iga vähemalt 3 tähemärki, klastri sees dubleerimata.
//  - Iga klaster segab kolme liiki sõnu:
//      (a) kõnekeelsed sõnastused, mida tavaline ettevõtja päriselt kirjutaks;
//      (b) PÄRIS sõnad kataloogi õpiväljunditest (need annavad katte);
//      (c) mõned ingliskeelsed terminid, mida inimesed kasutavad.
//  - Iga klaster seob vähemalt ühe kõnekeelse sõna vähemalt ühe päris õpiväljundi
//    sõnaga. Ilma reaalse õpiväljundi sõnata klastrit ei ole (vt grounding-testi
//    failis scripts/skill-match.test.mjs — see kukub, kui mõni klaster jääb katteta).
//  - Lai üldsõna (nt "juhtimine") avab meelega palju vasteid — see on taotluslik:
//    lai päring annab laia tulemuse; täpsem sõna või valdkonna-filter kitsendab.
//
// Puhas andmefail: ei impordi midagi, ei sisalda loogikat.

export type SkillCluster = { id: string; label: string; terms: string[] };

export const skillSynonyms: SkillCluster[] = [
  {
    id: "andmete-visualiseerimine",
    label: "andmete visualiseerimine",
    terms: [
      "graafik",
      "graafikud",
      "graafik excelis",
      "diagramm",
      "diagrammid",
      "tabelid excelis",
      "tabelarvutus",
      "excel",
      "exceli",
      "joonis",
      "visualiseeri",
      "visualiseerimine",
      "visualiseering",
      "andmeid esitleda",
      "dashboard",
      "töölaud",
      "looker studio",
      "power bi",
      "ga4"
    ]
  },
  {
    id: "andmeanaluus",
    label: "andmeanalüüs",
    terms: [
      "andmeanalüüs",
      "andmete analüüs",
      "andmeid analüüsida",
      "numbritest aru saada",
      "tabelarvutus",
      "spreadsheet",
      "andmepõhi",
      "andmepõhiseid",
      "andmeteaduse",
      "statistika",
      "töötleb andmeid",
      "kogutud andmeid",
      "data analy",
      "analytics"
    ]
  },
  {
    id: "andmebaasid-sql",
    label: "andmebaasid ja päringud (SQL)",
    terms: [
      "andmebaas",
      "andmebaasid",
      "andmebaasidele",
      "päring",
      "päringud",
      "sql",
      "andmeid otsida",
      "andmestruktuur"
    ]
  },
  {
    id: "raamatupidamine",
    label: "raamatupidamine",
    terms: [
      "raamatupidamine",
      "raamatupida",
      "raamatupidamiskande",
      "arvepidamine",
      "kontodel arvestust",
      "kuluarvestuse",
      "arvestus",
      "seadusandlus",
      "accounting"
    ]
  },
  {
    id: "finantsjuhtimine",
    label: "finantsid ja aruandlus",
    terms: [
      "finants",
      "finantsaruandlus",
      "finantsaruande",
      "finantsanalüüs",
      "finantsotsus",
      "rahaasjad",
      "rahandus",
      "aruandlus",
      "ifrs",
      "investeeringute",
      "finance"
    ]
  },
  {
    id: "eelarve-kuluarvestus",
    label: "eelarve ja kulud",
    terms: [
      "eelarve",
      "eelarvet teha",
      "kulud",
      "kuluarvestuse",
      "hinnakujunduse",
      "maksumus",
      "ehitusmaksumuse",
      "hinnastamine"
    ]
  },
  {
    id: "maksud",
    label: "maksud",
    terms: [
      "maks",
      "maksud",
      "maksustamise",
      "maksumäär",
      "maksuarvestus"
    ]
  },
  {
    id: "projektijuhtimine",
    label: "projektijuhtimine",
    terms: [
      "projektijuhtimine",
      "projektijuht",
      "projekti juhtida",
      "projektide",
      "projektinõuete",
      "agiil",
      "scrum",
      "elluviimise plaani",
      "project manag"
    ]
  },
  {
    id: "juhtimine-eestvedamine",
    label: "juhtimine ja eestvedamine",
    terms: [
      "juhtimine",
      "juhtim",
      "juhib",
      "juhtimisotsus",
      "eestvedamine",
      "eestveda",
      "liidri",
      "inimeste juhtimine",
      "strateegilise juhtimise",
      "leadership"
    ]
  },
  {
    id: "meeskonnatoo",
    label: "meeskonnatöö",
    terms: [
      "meeskond",
      "meeskonna",
      "meeskonnas",
      "meeskonnatöö",
      "koostöö",
      "koostööd",
      "tiimitöö",
      "teamwork"
    ]
  },
  {
    id: "muutuste-juhtimine",
    label: "muutuste juhtimine",
    terms: [
      "muutuste",
      "muutuste kujundamisel",
      "muudatuste juhtimine",
      "organisatsiooni areng",
      "arengu",
      "change management"
    ]
  },
  {
    id: "turundus",
    label: "turundus",
    terms: [
      "turundus",
      "turund",
      "reklaam",
      "kampaania",
      "turundusstrateegia",
      "turunduskommunikatsiooni",
      "tarbijakäitumise",
      "ostukäitumist",
      "marketing"
    ]
  },
  {
    id: "branding",
    label: "bränd ja maine",
    terms: [
      "bränd",
      "brändi",
      "brändijuhtimise",
      "kaubamärk",
      "maine",
      "positsioneerib",
      "brand"
    ]
  },
  {
    id: "sotsiaalmeedia-seo",
    label: "sotsiaalmeedia ja veebireklaam",
    terms: [
      "sotsiaalmeedia",
      "sotsiaalmeediasisu",
      "facebook",
      "instagram",
      "postitused",
      "seo-d",
      "google adsi",
      "digikeskkonnas",
      "digiturundus"
    ]
  },
  {
    id: "muuk-kliendisuhted",
    label: "müük ja kliendisuhted",
    terms: [
      "müük",
      "müüki",
      "müügi",
      "klienditöös",
      "kliendikeskse",
      "tarbijakäitumist",
      "läbirääkimis",
      "turu-uuringute",
      "sales"
    ]
  },
  {
    id: "klienditeenindus",
    label: "klienditeenindus",
    terms: [
      "klienditeenindus",
      "klienditugi",
      "kliendi",
      "klientidega suhtlemine",
      "teeninduse kvaliteet",
      "customer service"
    ]
  },
  {
    id: "personalijuhtimine",
    label: "personalijuhtimine (HR)",
    terms: [
      "personalijuhtimise",
      "personali valiku",
      "töötajate juhtimine",
      "inimressursi juhtimise",
      "värbamise",
      "värbamis",
      "värb",
      "töösuhetes",
      "karjäärijuhtimise",
      "human resource"
    ]
  },
  {
    id: "kuberturve",
    label: "küberturve ja infoturve",
    terms: [
      "küberturve",
      "küberturvet",
      "küberohte",
      "küberintsidentide",
      "infoturbe",
      "turvameetmeid",
      "andmekaitse",
      "privaatsuse",
      "cyber",
      "infoturve"
    ]
  },
  {
    id: "tehisintellekt",
    label: "tehisintellekt (AI)",
    terms: [
      "tehisintellekt",
      "tehisintellekti",
      "tehisaru",
      "masinõpe",
      "masinõppe",
      "generatiiv",
      "ai-d kasutada",
      "viipasid",
      "viipa",
      "chatgpt",
      "machine learning",
      "artificial intel"
    ]
  },
  {
    id: "programmeerimine",
    label: "programmeerimine ja kood",
    terms: [
      "programmeeri",
      "programmeerimise",
      "kood",
      "koodi",
      "koodi kirjutada",
      "kirjutab koode",
      "python",
      "pythoni",
      "java",
      "objektorienteeritud",
      "coding"
    ]
  },
  {
    id: "tarkvaraarendus",
    label: "tarkvaraarendus",
    terms: [
      "tarkvara",
      "tarkvaraarendus",
      "tarkvaraaren",
      "veebiarendus",
      "rakenduse",
      "testib",
      "refaktoreerib",
      "arendustöös",
      "software"
    ]
  },
  {
    id: "automatiseerimine",
    label: "automatiseerimine",
    terms: [
      "automatiseeri",
      "automaatika",
      "automaatikasüsteeme",
      "korduva töö",
      "protsesside automatiseerimine",
      "automation"
    ]
  },
  {
    id: "digioskused",
    label: "igapäevased digioskused",
    terms: [
      "digioskus",
      "digipäde",
      "arvutioskus",
      "digivahend",
      "digilahendus",
      "digilahendusi",
      "digitaalsed oskused",
      "digital skills"
    ]
  },
  {
    id: "ux-disain",
    label: "kasutajakogemus (UX) ja disain",
    terms: [
      "kasutajakogemus",
      "kasutajakogemuse",
      "kasutajakeskseid",
      "kasutajamugavus",
      "disainmõtlemise",
      "disainmõtlemisel",
      "disainimeetodeid",
      "teenusedisain",
      "teenusedisaini",
      "ux-disain",
      "kasutajaliides",
      "design"
    ]
  },
  {
    id: "loovus-disain",
    label: "disain ja loovus",
    terms: [
      "disain",
      "disaini",
      "loov",
      "loovalt",
      "visuaalse",
      "kujundus",
      "tarbekunsti"
    ]
  },
  {
    id: "kestlikkus-roheporre",
    label: "kestlikkus ja rohepööre",
    terms: [
      "kestlik",
      "kestlikkus",
      "jätkusuutlik",
      "rohepööre",
      "rohelepe",
      "roheleppe",
      "energiapöörde",
      "keskkonnasõbralik",
      "sustainab"
    ]
  },
  {
    id: "esg-aruandlus",
    label: "ESG ja kestlikkusaruandlus",
    terms: [
      "esg",
      "esg-aruandluse",
      "esg-arvestuse",
      "csrd",
      "kestlikkusaruandlus",
      "vastutustundliku ettevõtluse"
    ]
  },
  {
    id: "ringmajandus-jaatmed",
    label: "ringmajandus ja jäätmed",
    terms: [
      "ringmajandus",
      "ringmajanduse",
      "jäätmete",
      "jäätmed",
      "taaskasutus",
      "korduvkasutuse",
      "ressursitõhususe",
      "keskkonnakaitse"
    ]
  },
  {
    id: "logistika-tarneahel",
    label: "logistika ja tarneahel",
    terms: [
      "logistika",
      "logistikaettevõtte",
      "ärilogistika",
      "tarneahel",
      "varustus",
      "supply chain"
    ]
  },
  {
    id: "hanked-riigihanked",
    label: "hanked ja riigihanked",
    terms: [
      "hange",
      "hanke",
      "hangete",
      "riigihangete",
      "riigihange",
      "hankeleping",
      "procurement"
    ]
  },
  {
    id: "kvaliteedijuhtimine",
    label: "kvaliteedijuhtimine",
    terms: [
      "kvaliteed",
      "kvaliteedijuhtimise",
      "kvaliteedijuhtimissüsteemi",
      "kvaliteedi parandamiseks",
      "lean",
      "auditeeri",
      "quality"
    ]
  },
  {
    id: "riskijuhtimine",
    label: "riskijuhtimine",
    terms: [
      "risk",
      "riske",
      "riskianalüüsi",
      "riskijuhtimise",
      "riskihalduse",
      "ohutegurite",
      "risk management"
    ]
  },
  {
    id: "ettevotlus",
    label: "ettevõtlus ja äriidee",
    terms: [
      "ettevõtl",
      "ettevõtlus",
      "äriidee",
      "äriideega",
      "ärimudel",
      "ärimudeli",
      "äriplaani",
      "ettevõtte loomine",
      "startup",
      "entrepreneur"
    ]
  },
  {
    id: "innovatsioon",
    label: "innovatsioon ja uuendus",
    terms: [
      "innovatsioon",
      "innovatsiooni",
      "innovatsioonivõtteid",
      "uuendus",
      "uuenduslikku",
      "innovation"
    ]
  },
  {
    id: "oigus-juriidika",
    label: "õigus ja lepingud",
    terms: [
      "õigus",
      "õiguslikke",
      "haldusõiguse",
      "lepingu",
      "leping",
      "seadusand",
      "seadusandlust",
      "õigusakte",
      "õigusraamistik",
      "legal"
    ]
  },
  {
    id: "avalik-haldus",
    label: "avalik haldus ja poliitika",
    terms: [
      "avaliku",
      "avalik haldus",
      "haldusorganisatsiooni",
      "poliitika",
      "poliitilise",
      "sotsiaalpoliitika",
      "riigihaldus",
      "public administration"
    ]
  },
  {
    id: "kommunikatsioon-esinemine",
    label: "suhtlemine ja esinemine",
    terms: [
      "kommunikatsiooni",
      "suhtlemisoskus",
      "suhtlemisoskusi",
      "esinemine",
      "esineda",
      "veenmise",
      "argumenteerimise",
      "sõnumite",
      "communication"
    ]
  },
  {
    id: "noustamine-coaching",
    label: "nõustamine ja coaching",
    terms: [
      "nõustamis",
      "nõustamise",
      "karjäärinõustamises",
      "mentorluse",
      "coaching",
      "coachingu",
      "juhendamise",
      "supervisioon"
    ]
  },
  {
    id: "opetamine-pedagoogika",
    label: "õpetamine ja pedagoogika",
    terms: [
      "õpeta",
      "õpetamise",
      "õpetada",
      "pedagoog",
      "pedagoogika",
      "didaktik",
      "õppeprotsessi",
      "õppekava",
      "andragoog",
      "kasvataja"
    ]
  },
  {
    id: "taiskasvanute-koolitamine",
    label: "täiskasvanute koolitamine",
    terms: [
      "koolita",
      "koolitus",
      "koolituse",
      "koolitustegevuses",
      "täiskasvanute õpetamise",
      "andragoogika",
      "õppematerjale",
      "õppematerjalide",
      "koolitajaks"
    ]
  },
  {
    id: "tervishoid-hooldus",
    label: "tervishoid ja hooldus",
    terms: [
      "tervis",
      "tervise",
      "tervishoiu",
      "õendus",
      "hooldust",
      "hooldus",
      "patsiendi",
      "heaolu",
      "ennetus"
    ]
  },
  {
    id: "vaimne-tervis",
    label: "vaimne tervis ja heaolu",
    terms: [
      "vaimse tervise",
      "vaimne tervis",
      "psühhosotsiaalse",
      "emotsioonide",
      "motivatsiooni",
      "toimetulekustrateegiaid",
      "läbipõlemise"
    ]
  },
  {
    id: "sotsiaaltoo",
    label: "sotsiaaltöö ja hoolekanne",
    terms: [
      "sotsiaaltöö",
      "sotsiaaltöötaja",
      "hoolekanne",
      "heaolumudeleid",
      "kogukonna heaolu",
      "social work"
    ]
  },
  {
    id: "energeetika",
    label: "energeetika ja energiatõhusus",
    terms: [
      "energ",
      "energia",
      "energiamajanduse",
      "energiatõhususele",
      "energiatehnoloogiate",
      "energiavaldkonnas",
      "tehnosüsteemide",
      "energy"
    ]
  },
  {
    id: "ehitus-bim",
    label: "ehitus ja ehitusmudelid (BIM)",
    terms: [
      "ehitus",
      "ehitusprotsessi",
      "ehitusprojektides",
      "ehitusmudeleid",
      "mudelipõhiseid",
      "ifc-skeemi",
      "tehnovõrkude",
      "bim"
    ]
  },
  {
    id: "keeleope",
    label: "keeled ja keeleõpe",
    terms: [
      "keele",
      "keeleõpe",
      "soome keele",
      "inglise keel",
      "erialakeel",
      "tõlketöös",
      "keele struktuuri"
    ]
  }
];
