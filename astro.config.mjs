import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

const SITE = "https://mikrokvalifikatsioon.ee";

export default defineConfig({
  site: SITE,
  output: "static",
  integrations: [
    sitemap({
      // /vordlus/ (indeks) on noindex utiliit (sõltub ?p= parameetritest) — sitemapist väljas.
      // AGA /vordlus/<a>-vs-<b>/ võrduslehed on indekseeritavad → need jäävad sitemapi.
      filter: (page) => !page.endsWith("/vordlus/"),
      changefreq: "weekly",
      // NB: hoia kuupäev kataloogi kontrollkuupäevaga kooskõlas (src/data/catalog/index.ts).
      lastmod: new Date("2026-06-12"),
      serialize(item) {
        if (item.url === `${SITE}/`) item.priority = 1.0;
        else if (item.url === `${SITE}/kataloog/`) item.priority = 0.9;
        else if (item.url.startsWith(`${SITE}/kataloog/`)) item.priority = 0.7;
        else item.priority = 0.6;
        return item;
      }
    })
  ]
});
