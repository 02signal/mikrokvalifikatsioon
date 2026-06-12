# Mikrokvalifikatsioon.ee

Eesti mikrokvalifikatsioonide ja mikrokraadide register ja teejuht. Operated by Ettevõtluskeskus OÜ / 02Signal.

- **Kataloog:** 169 programmi 9 koolist, masinloetav kujul `/catalog.json`
- **Suunatest:** 4 küsimust → kohe 3 sobivat programmi + rahastuse vihje
- **Sisu:** mis on mikrokvalifikatsioon, mikrokraadide ülevaade, kes maksab

## Tehniline

Astro static site, deploy Verceli kaudu (push `main`-i → production). Enne commitit: `npm run build`.

Reeglid: `CLAUDE.md` (ja `AGENTS.md`). Andmereeglid: kataloogis ainult koolide avalikelt lehtedelt kontrollitud faktid, iga kirje kannab `sourceCheckedAt` kuupäeva; tundmatu väärtus on `null`.
