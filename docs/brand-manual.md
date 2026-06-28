# Mikrokvalifikatsioon.ee - brändijuhend

Lühike, praktiline juhend märgi, värvide, kirja ja logo kasutamiseks. Eesmärk: et
sait näeks kõikjal ühesugune välja ja loeks selgelt ka 60+ kasutajale. Aluseks on
strateegia ja visuaalne suund (`mkval-strategy-and-visual-direction.md`), style tile
(`style-tile-pragmatic-momentum.html`) ja päris logo (`public/mk-logo.png`).

Juhtmõte üheski reas: **pragmaatiline liikumine**. Enesekindel, edasiviiv, tasuvuse-põhine
tööriist - mitte akadeemiline, mitte ajakirjalik.

---

## 1. Märk

Märk on **kolm tõusvat kaldkriipsu** (vasakult paremale, üles) ja **kaks täppi** -
roheline täpp üleval vasakul, must täpp all paremal.

- **Tähendus:** liikumine edasi. Kolm kriipsu tõusevad - sa lähed sammhaaval ülespoole.
  See on visuaalne lubadus loosungile **"investeeri endasse"**: tõsta end uuele tasemele.
- Kriipsude värvid vasakult paremale: **heleroheline -> roheline -> must**. See on
  liikumise gradient - heledast alguse-energiast kindla, autoriteetse lõpuni.
- Märk on brändi DNA. Sama tõusva kaldjoone motiivi kasutame ka mujal liideses
  (vt §6 Liikumise motiiv).

Failid: `public/logo/mark.svg` (värviline), `public/logo/mark-white.svg` (tumedal taustal),
`public/logo/mark-ink.svg` (ühevärviline must).

### Puhas ruum ja vähimad mõõdud

- **Puhas ruum:** jäta märgi ümber vaba ala vähemalt ühe kriipsu laiuse jagu. Logoluku
  (märk + sõnamärk) puhul samuti - ükski tekst ega element ei tohi tulla sellele lähemale.
- **Vähim mõõt - ainult märk:** 24 px kõrgust ekraanil, 8 mm trükis. Väiksemana kaovad täpid.
- **Vähim mõõt - logolukk (märk + sõnamärk + loosung):** 150 px laiust ekraanil, 30 mm trükis.
  Väiksemana muutub loosung "INVESTEERI ENDASSE" loetamatuks - siis kasuta logolukku ilma
  loosungita või ainult märki.

---

## 2. Värv = roll

Värv kannab tähendust, mitte kaunistust. **See ei ole valdkonna-värvisüsteem.** Kõik ~9
valdkonda elavad ühe visuaalse keele all - valdkonnad eristuvad **sisu**, mitte värvi ega
märgi kaudu. (Omanik ei soovi värvi/märki valdkonna eristajaks - õige, see oleks kroom,
mitte väärtus.)

| Värv | Kood | Roll |
|---|---|---|
| Roheline | `#3f9c30` | edasiminek, salvesta, vaste, "mine" - tegevus ja kasv |
| Heleroheline | `#54c247` | liikumise esiletõst, märgi tipp, õrn aktsent |
| Roheline süvik | `#2e7d22` | roheline tekst ja lingid heledal taustal (loetav, AA) |
| Must (ink) | `#17181a` | autoriteet, register, sõnamärk, registreeri |
| Jahe taust | `#f5f7f4` | lehe taust - jahe-neutraalne, **mitte kreem** |
| Pind | `#ffffff` | krõbedad valged kaardid |
| Joon | `#e5e8e3` | õrnad piirjooned |
| Amber | `#9a7b22` | **ainult** seisund "veel otsime" - mitte üldine aktsent |

Lühidalt: **roheline on edasiminek**, **must on autoriteetne register**, taust on jahe ja
neutraalne, **amber ainult siis, kui me alles otsime vastet**. Amber ei ole valdkonna ega
brändi värv - see on üks konkreetne seisund.

---

## 3. Kiri

- **Pealkirjad: Sora** (geomeetriline grotesk). Kajab raske väiketähelist sõnamärki, mõjub
  edasiviivalt ja enesekindlalt. Kasuta paksusid 600-800 pealkirjades, 700 kicker-tekstis.
- **Tekst: Atkinson Hyperlegible**. See font on loodud just loetavuse jaoks - tähed on
  selgelt eristatavad (näiteks I, l, 1 ja O, 0 ei lähe segi).

**Miks just need (60+ loogika):** meie kasutajad on lai vanusevahemik, sageli 15-20 aasta
töökogemusega inimesed, paljud 60+. Loetavus ei ole maitse-eelistus, vaid tingimus. Atkinson
Hyperlegible vähendab lugemisvigu ja -väsimust; Sora annab pealkirjadele jõu ja suuna, ilma
et see muutuks lapselikuks või "kooli-tagasi" tooniks. Akadeemilist seriifi ei kasuta -
see luges liiga "ülikooli" ja ajas brändi segi Ettevõtluskeskuse perekonnailmega.

Reegel: suur ja kontrastne tekst, üks selge tegevus korraga, raha ja aeg alati näha.

---

## 4. Logo variandid - millal millist

| Fail | Mis | Millal |
|---|---|---|
| `mark.svg` | värviline märk | väike pind, favicon, app-ikoon, kaardi nurk, kus sõnamärk ei mahu |
| `mark-white.svg` | märk tumedal taustal | tume hero, jalus, tume riba (rohelised jäävad, must muutub valgeks) |
| `mark-ink.svg` | ühevärviline must märk | trükis ühevärvilisena, templ, vesimärk, kus värvi ei saa kasutada |
| `lockup.svg` | märk + sõnamärk + loosung | **vaikevalik** - päis, jalus, dokumendid, jagatavad pildid |
| `lockup-white.svg` | logolukk tumedal taustal | sama tumedal taustal |

Põhimõte: kui ruumi on, kasuta **logolukku** (`lockup.svg`). Kui ruumi napib või pind on
väike, kasuta **ainult märki**. Tumedal taustal vali alati `-white` variant.

---

## 5. Tee ja ära tee

**Tee:**
- Hoia märgi proportsioonid ja kriipsude värvijärjekord (heleroheline -> roheline -> must).
- Anna logole puhas ruum (§1).
- Tumedal taustal kasuta `-white` varianti.
- Hoia logolukk horisontaalne, baasjoonel.

**Ära tee:**
- Ära venita ega moonuta logo (hoia kuvasuhe).
- Ära muuda värve (ära tee märki üleni siniseks, kuldseks vms).
- Ära pööra ega kalluta logolukku ega muuda kriipsude nurka.
- Ära pane värvilist märki kirjule fotole ilma kontrastse pinnata.
- Ära tee valdkondadele eraldi värvi- või märgisüsteeme - üks keel, sisu eristab.
- Ära lisa varju, helki ega kontuuri.
- Ära kasuta amber-värvi mujal kui seisundis "veel otsime".

---

## 6. Liikumise motiiv

Märgi kolm tõusvat kriipsu (kald ~13-45° üles) korduvad **struktuurielemendina**, mitte
kaunistusena:

- **sobivuse ja katvuse ribad**, mis "tõusevad" (täituvad vasakult paremale laadimisel);
- **edasi-nool** nupul ("Salvesta valikud →") liigub klõpsamisel veidi paremale;
- **aktsentkriipsud** hero-ribal ja kaardi nurgas (õrnalt, läbipaistvana).

See annab igale persoonale sama sõnumi: sa liigud edasi, tase tõuseb. Ribad ja nooled on
liikumise motiivi kõige kasulikum koht - need on funktsionaalsed (näitavad edenemist) ja
kannavad brändi DNA-d korraga.

---

## 7. Animeeritud logo - kus mõjub ja kus mitte

Animeeritud logo (`public/logo/mark-animated.svg` ja `Logo.astro` propiga `animated`)
joonistab kolm kriipsu järjest "üles" ja seejärel ilmuvad täpid. Kestus ~0,8 s, **korra**.
See teeb brändi juhtmõtte - liikumine edasi - hetkeks nähtavaks.

**Animatsioon austab `prefers-reduced-motion`** - kui kasutaja on liikumist vähendanud,
näidatakse kohe lõppseisu, ilma liikumiseta. See on ligipääsetavuse reegel, mitte valik.

**Kus animatsioon mõjub ja on maitsekas:**
- **Esmasel lehe laadimisel päises** - logolukk tõuseb korra, kui sait avaneb. Üks kord,
  mitte iga lehe vahetusel. (See on rakendatud, vt §8.)
- **Salvestamise hetkel** - kui inimene vajutab "Salvesta valikud" ja konto loob, võib
  väike märgi tõus kinnitada "tehtud, sa liikusid edasi". See on strateegiliselt tähtsaim
  hetk (anonüümsest huvist saab tuvastatud nõudlus) - väike kinnitav liikumine sobib siia.
- **Tühi või laadimis-seisund** - kui sisu alles laeb või kogum on tühi, võib märk korra
  tõusta, et koht ei mõjuks katkisena. Õrnalt, mitte korduva loopina.

**Kus animatsiooni MITTE kasutada:**
- **Mitte igal lehel ega iga lehe laadimisel** - kordus muutub tüütuks ja aeglustab tunnetust.
- **Mitte lõputu loopina** - tõus on ühekordne žest, mitte taustaliikumine.
- **Mitte sisu lähedal, mis nõuab keskendumist** (vormiväljad, võrdlustabel) - liikumine
  tõmbab tähelepanu ära.
- **Mitte siis, kui kasutaja on `prefers-reduced-motion` valinud** - siis alati staatiline.

Lühidalt: animatsioon on tervitus ja kinnitus, mitte dekoratsioon. Üks tõus õigel hetkel
mõjub; kümme tõusu on müra.

---

## 8. Kuhu on rakendatud

- **Päis (`src/components/Nav.astro`):** logolukk inline-SVG-na, `<Logo variant="lockup"
  animated />`. Esmasel laadimisel tõuseb märk korra (austab `prefers-reduced-motion`).
  Mõõt sama mis varem (~30 px kõrgus), alt/aria säilitatud (`aria-label="Mikrokvalifikatsioon.ee"`).

**Soovitatud järgmine mõjus koht (mitte veel rakendatud, et mitte üle teha):** konto
salvestamise kinnitus ("Sinu valikud on hoitud") - seal sobib `Logo`-le `animated` üks kord,
kui salvestus õnnestub. See on §7 järgi strateegiliselt tugevaim hetk.

---

## 9. Komponent `Logo.astro`

`src/components/Logo.astro` on ainus koht, kust logo tuleb. Propid:

- `variant`: `"mark"` (ainult märk) või `"lockup"` (märk + sõnamärk + loosung). Vaikimisi `lockup`.
- `theme`: `"dark"` (heledal taustal, vaikimisi) või `"light"` (tumedal taustal).
- `animated`: `true` -> kriipsud tõusevad korra laadimisel (austab `prefers-reduced-motion`).
- `class`: lisaklass mõõtmiseks/paigutuseks.

SVG on ehitatud pathidena - **fondisõltuvuseta**, renderdub kõikjal ühtmoodi. Ligipääsetav:
`role="img"` ja `aria-label="Mikrokvalifikatsioon.ee"`.

Näited:

```astro
<Logo variant="lockup" animated />            <!-- päis: tõuseb korra -->
<Logo variant="mark" theme="light" />          <!-- ainult märk tumedal taustal, staatiline -->
<Logo variant="lockup" theme="light" />        <!-- logolukk tumedal hero-ribal -->
```
