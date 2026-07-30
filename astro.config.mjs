import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

const SITE = "https://mikrokvalifikatsioon.ee";

export default defineConfig({
  site: SITE,
  output: "static",
  integrations: [
    sitemap({
      // Sitemap tohib sisaldada AINULT indekseeritavaid lehti — noindex-leht
      // sitemapis annab Search Console'is vea "Submitted URL marked noindex".
      // Väljas: /vordlus/ (noindex utiliit, sõltub ?p= parameetritest) ning
      // /konto/ + /konto/kinnita/ (isiklik ala, samuti noindex).
      // AGA /vordlus/<a>-vs-<b>/ võrduslehed on indekseeritavad → need jäävad sitemapi.
      filter: (page) => !["/vordlus/", "/konto/", "/konto/kinnita/"].some((p) => page.endsWith(p)),
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
