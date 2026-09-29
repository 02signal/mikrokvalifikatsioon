# IndexNow ja Bing

## IndexNow võti

- Võtmefail: `public/39307095f0042f1ea8220a04222dff1a.txt` (sisu = võti ise, ilma reavahetuseta).
- Avalik aadress: `https://mikrokvalifikatsioon.ee/39307095f0042f1ea8220a04222dff1a.txt`
- Võti on avalik jaotusfail (IndexNow protokoll nõuab seda) — see EI ole saladus.

## Kes pingib

Saidi pool ei pingi midagi. AMOS pingib IndexNow'd (`https://api.indexnow.org/indexnow`) **ainult
muutunud URL-idega** (nt kataloogi nädalane võrdlus tuvastas programmi muutuse või mahavõtu), mitte kogu
sitemapiga. Päringu `host` = `mikrokvalifikatsioon.ee`, `key` = ülaltoodud võti, `keyLocation` = ülaltoodud aadress.

## Sitemap ja robots

- `robots.txt` sisaldab `Sitemap: https://mikrokvalifikatsioon.ee/sitemap-index.xml`.
- `lastmod` on ainult lehtedel, millel on tõeline muutuskuupäev (kataloogi loendilehed, feedi `dataUpdatedAt`);
  programmi- ja võrdluslehtedel puudub, sest programmikirjel pole oma muutuskuupäeva. Vt `src/data/sitemapLastmod.ts`.

## Omaniku käsitsi tegevused Bing Webmaster Toolsis

1. Logi sisse https://www.bing.com/webmasters ja lisa sait `https://mikrokvalifikatsioon.ee/` (või impordi Google Search Console'ist).
2. Kinnita omand (Bing annab kinnitusvõtme: DNS CNAME Cloudflare'is või meta-silt — võtit ei ole repos, ära arva).
3. Saada sitemap: `https://mikrokvalifikatsioon.ee/sitemap-index.xml`.
4. Kontrolli jaotises IndexNow, et võti on tuvastatud ja pingid jõuavad kohale.

## /vordlus/ valgeloend

`src/data/vordlus-indexable.json` — ainult need paarilehed on indekseeritavad ja sitemapis; kõik teised on
`noindex,follow`. Värskendamise juhis on failis endas.
