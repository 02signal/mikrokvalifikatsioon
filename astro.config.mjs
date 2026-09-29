import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { catalogRetired, catalogUpdatedAt } from "./src/data/catalog/index.ts";
import { isIndexableVordlus, vordlusPairFromPath } from "./src/data/vordlusIndex.ts";
import { sitemapLastmod } from "./src/data/sitemapLastmod.ts";

const SITE = "https://mikrokvalifikatsioon.ee";

// Mahavõetud programmi leht (/kataloog/<id>/, item C) on `robots="noindex,follow"`
// (src/pages/kataloog/[slug].astro) — sama reegel, mis /vordlus//konto all: sitemap
// tohib sisaldada AINULT indekseeritavaid lehti.
const retiredKataloogPaths = new Set(catalogRetired.map((entry) => `/kataloog/${entry.slug}/`));

export default defineConfig({
  site: SITE,
  output: "static",
  integrations: [
    sitemap({
      // Sitemap tohib sisaldada AINULT indekseeritavaid lehti — noindex-leht
      // sitemapis annab Search Console'is vea "Submitted URL marked noindex".
      // Väljas: /vordlus/ (noindex utiliit, sõltub ?p= parameetritest),
      // /konto/ + /konto/kinnita/ (isiklik ala, samuti noindex), ning iga
      // mahavõetud programmi /kataloog/<id>/ leht (item C, samuti noindex).
      // /vordlus/<a>-vs-<b>/ paarilehed on noindex,follow, VÄLJA ARVATUD
      // src/data/vordlus-indexable.json valgeloend (Search Console'is töötavad paarid).
      filter: (page) => {
        if (["/vordlus/", "/konto/", "/konto/kinnita/"].some((p) => page.endsWith(p))) return false;
        const { pathname } = new URL(page);
        const pair = vordlusPairFromPath(pathname);
        if (pair !== null && !isIndexableVordlus(pair)) return false;
        return !retiredKataloogPaths.has(pathname);
      },
      changefreq: "weekly",
      // lastmod pole globaalne: ainult tõelise muutuskuupäevaga lehtedel, vt
      // src/data/sitemapLastmod.ts (muidu jäetakse välja, mitte ei stampita build-kuupäeva).
      serialize(item) {
        item.lastmod = sitemapLastmod(new URL(item.url).pathname, catalogUpdatedAt);
        if (item.url === `${SITE}/`) item.priority = 1.0;
        else if (item.url === `${SITE}/kataloog/`) item.priority = 0.9;
        else if (item.url.startsWith(`${SITE}/kataloog/`)) item.priority = 0.7;
        else item.priority = 0.6;
        return item;
      }
    })
  ]
});
