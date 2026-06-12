import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://mikrokvalifikatsioon.ee",
  output: "static",
  integrations: [sitemap()]
});
