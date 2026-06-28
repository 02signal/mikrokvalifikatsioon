# Mikrokvalifikatsioon.ee - brändijuhend

Lühike, praktiline juhend märgi, värvide, kirja ja logo kasutamiseks. Eesmärk: et
sait näeks kõikjal ühesugune välja ja loeks selgelt ka 60+ kasutajale. Aluseks on
strateegia ja visuaalne suund (`mkval-strategy-and-visual-direction.md`), style tile
(`style-tile-pragmatic-momentum.html`) ja päris logo (`public/mk-logo.png`).

Juhtmõte üheski reas: **pragmaatiline liikumine**. Enesekindel, edasiviiv, tasuvuse-põhine
tööriist - mitte akadeemiline, mitte ajakirjalik.

> **Logo on edasi arenenud.** Peamine logo on nüüd **v3 "pragmaatiline liikumine"** märk
> (puhtad tõusvad ribad), mitte vana logo koopia. Vana logo on alles hoitud (vt §1.1) -
> see jääb viitamiseks ja varuvariandiks, aga uus on see, mida kasutame.

---

## 1. Märk (v3 - peamine)

Märk on **kolm tõusvat kaldribakest** ja **must täpp** nende kõrval, baasjoonel. Toon on
tasane ja meeldiv kasv - jässakas, mitte ülespoole venitatud.

- **Geomeetria (täpselt nagu style-tile `.mark`):** ribad on **laius 11**, **vahe 5** (x kohtadel
  0, 16, 32), grupil `skewX(-13°)`, nurgaraadius ~3. Kõrgused on **55% / 78% / 100% 40-st** ehk
  **22 / 31 / 40** (madalast kõrgeni, vasakult paremale). Kõige kõrgem (must) riba on seega 11 lai
  ja 40 kõrge (~3,6:1 - jässakas ja tasane), mitte sale. Must täpp ~11 px läbimõõduga on
  baasjoonel, ribadest veidi paremal (vahe ~5). Märgi viewBox on **lamav** (`-11 -2 63 44`,
  laius ületab kõrguse). Ehitatud puhaste `<rect>`-idega - krõbe ja minimaalne, mitte joonistuse jälg.
- **Värvid vasakult paremale:** **heleroheline `#54c247` -> roheline `#3f9c30` -> must `#17181a`**,
  täpp must. See on liikumise gradient - heledast alguse-energiast kindla, autoriteetse lõpuni.
- **Tähendus:** liikumine edasi. Ribad tõusevad - sa lähed sammhaaval ülespoole. See on
  visuaalne lubadus loosungile **"investeeri endasse"**: tõsta end uuele tasemele.
- Märk on brändi DNA. Sama tõusva kaldjoone motiivi kasutame ka mujal liideses
  (vt §6 Liikumise motiiv).

Failid: `public/logo/mark.svg` (värviline), `public/logo/mark-white.svg` (tumedal taustal),
`public/logo/mark-animated.svg` (animeeritud). Logolukk: `public/logo/lockup.svg` ja
`lockup-white.svg`.

### 1.1 Vana logo (alles hoitud)

Vana logo - sealhulgas animeeritud variant - on **säilitatud** failidena `public/logo/old_*.svg`
(`old_mark.svg`, `old_lockup.svg`, `old_mark-animated.svg`, `old_mark-white.svg`,
`old_mark-ink.svg`, `old_lockup-white.svg`). Need töötavad endiselt iseseisvalt. Komponendis
`Logo.astro` saab vana logo tagasi prop'iga `old` (vt §9). Kasuta vana logo ainult viitamiseks
või varuvariandina - **vaikevalik on uus v3 logo**.

### Puhas ruum ja vähimad mõõdud

- **Puhas ruum:** jäta märgi ümber vaba ala vähemalt ühe riba laiuse jagu. Logoluku
  (märk + sõnamärk) puhul samuti - ükski tekst ega element ei tohi tulla sellele lähemale.
- **Vähim mõõt - ainult märk:** 22 px kõrgust ekraanil, 8 mm trükis. Väiksemana kaob täpp.
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
  **Sõnamärk "mikrokvalifikatsioon" on saidil elav Sora-800 väiketekst** (mitte pilt) - terav ja
  valitav. Eraldi `*.svg` failides on sõnamärk **Sora-800 kontuurina** (font välja joonistatud),
  samuti terav igas suuruses - mitte PNG-trace. Sora laetakse saidil (`Seo.astro`).
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

**Uus v3 logo - täielik komplekt (kõik `public/logo/` all):**

| Fail (hele / tume) | Mis | Millal kasutada |
|---|---|---|
| `mark.svg` / `mark-white.svg` | ainult v3 märk (element) | väike pind, favicon, app-ikoon, kaardi nurk - kus sõnamärk ei mahu |
| `lockup.svg` / `lockup-white.svg` | märk + sõnamärk + loosung | **vaikevalik** - päis, jalus, dokumendid, jagatavad pildid |
| `wordmark.svg` / `wordmark-white.svg` | ainult sõnamärk + loosung (Sora kontuur) | tekstikontekst või jalus, kus märk on juba mujal olemas |
| `motif-strokes.svg` / `motif-strokes-white.svg` | tõusvad ribad eraldi (motiiv) | maandumislehe hero/sektsiooni aktsent |
| `motif-strokes-faint.svg` / `motif-strokes-faint-white.svg` | sama, madala läbipaistvusega | õrn hero-taust |
| `motif-divider.svg` / `motif-divider-white.svg` | ribad + peen joon | sektsiooni eraldaja/aktsent |
| `mark-animated.svg` / `mark-animated-white.svg` | märk: ribad tõusevad, siis täpp | erihetked (vt §7) |
| `wordmark-animated.svg` / `wordmark-animated-white.svg` | sõnamärk ilmub õrnalt üles | tekstipealkiri, kus märk on juba olemas |
| `lockup-animated.svg` / `lockup-animated-white.svg` | ribad tõusevad, siis sõnamärk | täis-logo erihetk (esmane laadimine) |
| `motif-strokes-animated.svg` / `motif-strokes-animated-white.svg` | motiivi ribad tõusevad korra | maandumislehe hero |
| `old_*.svg` | vana logo (alles hoitud) | ainult viide/varu; komponendis prop `old` |

**Sõnamärk on Sora-800 kontuurina** (mitte pildist trace) - terav igas suuruses, fondisõltuvuseta.
Loosung "INVESTEERI ENDASSE" on Sora-700 kontuurina. Animeeritud variandid mängivad **korra**
ja austavad `prefers-reduced-motion` (siis kohe lõppseis).

### Hele vs tume taust

Igal elemendil on hele- ja tumetausta variant. Vali tausta järgi:

- **Hele taust** -> tavaline variant: `mark.svg`, `lockup.svg`, `wordmark.svg`, `motif-strokes.svg` ...
- **Tume taust** -> `-white` variant: `mark-white.svg`, `lockup-white.svg`, `motif-strokes-white.svg` ...
  Must muutub valgeks, brändi rohelised jäävad samaks.
- **Õrn hero-aktsent:** hele taust -> `motif-strokes-faint.svg`, tume taust -> `motif-strokes-faint-white.svg`.

Tumedal taustal vali alati `-white`. Muidu kaob kõige kõrgem must riba ära (näiteks
`motif-strokes-faint.svg` tumedal taustal - kolmas riba ei paista).

Saidil tuleb logo komponendist `Logo.astro` (vt §9) - logolukk renderdab v3 märgi + **elava**
Sora-teksti (terav ja valitav), nii et see vastab v3 päisele täpselt. Eraldi `*.svg` failid on
välis-kasutuseks (dokumendid, jagatav meedia), kus sõnamärk on Sora kontuurina.

**Vana logo (alles hoitud, varuvariant):** `old_mark.svg`, `old_mark-white.svg`,
`old_mark-ink.svg`, `old_mark-animated.svg`, `old_lockup.svg`, `old_lockup-white.svg`.
Komponendis prop `old`. Kasuta ainult viitamiseks/varuks - puutumata.

Põhimõte: kui ruumi on, kasuta **logolukku**. Kui ruumi napib või pind on väike, kasuta
**ainult märki**. Tekstikontekstis, kus märk juba olemas, kasuta **sõnamärki**. Maandumislehe
heros/sektsioonis kasuta **motiiv-elemente** (mitte logo asemel - need on dekoratiivsed).
Tumedal taustal vali alati `-white` / `theme="light"`.

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

Märgi kolm tõusvat riba (kald `skewX(-13°)`, kõrgused 55/78/100%) korduvad
**struktuurielemendina**, mitte kaunistusena:

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

- **Päis (`src/components/Nav.astro`):** **uus v3 logolukk** komponendina, `<Logo variant="lockup"
  animated />` - v3 märk + elav Sora-800 sõnamärk + loosung. Esmasel laadimisel tõusevad ribad
  korra (austab `prefers-reduced-motion`). Mõõt sama mis varem (~30 px kõrgus), alt/aria
  säilitatud (`aria-label="Mikrokvalifikatsioon.ee"`).

**Soovitatud järgmine mõjus koht (mitte veel rakendatud, et mitte üle teha):** konto
salvestamise kinnitus ("Sinu valikud on hoitud") - seal sobib `Logo`-le `animated` üks kord,
kui salvestus õnnestub. See on §7 järgi strateegiliselt tugevaim hetk.

---

## 9. Komponent `Logo.astro`

`src/components/Logo.astro` on ainus koht, kust logo tuleb. Vaikimisi renderdab **uue v3 logo**.
Propid:

- `variant`: `"mark"` (ainult v3 märk) või `"lockup"` (märk + elav Sora-sõnamärk + loosung).
  Vaikimisi `lockup`.
- `theme`: `"dark"` (heledal taustal, vaikimisi) või `"light"` (tumedal taustal).
- `animated`: `true` -> ribad tõusevad korra laadimisel (austab `prefers-reduced-motion`).
- `old`: `true` -> renderdab säilitatud **vana** logo (path-sõnamärk, `old_*.svg` vaste).
- `class`: lisaklass mõõtmiseks/paigutuseks.

Märk on ehitatud geomeetriliste `<rect>`-idega; logoluku sõnamärk on elav Sora-800 tekst (Sora
laetakse saidil). Ligipääsetav: `role="img"` ja `aria-label="Mikrokvalifikatsioon.ee"`.

Näited:

```astro
<Logo variant="lockup" animated />            <!-- päis: v3 lukk, ribad tõusevad korra -->
<Logo variant="mark" theme="light" />          <!-- ainult v3 märk tumedal taustal, staatiline -->
<Logo variant="lockup" theme="light" />        <!-- v3 logolukk tumedal hero-ribal -->
<Logo variant="lockup" old />                  <!-- vana logo (viide/varuvariant) -->
```
