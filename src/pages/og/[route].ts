import { OGImageRoute } from "astro-og-canvas";
import { ogPages, ACCENT } from "../../data/ogPages";

// Lehetüüpide register (title/description/kind per võti) elab nüüd
// src/data/ogPages.ts failis — SAMA register otsustab ka Seo.astro fallback'i,
// et "kaart on olemas" väide oleks alati tõsi (vt ogPages.ts kommentaar).

export const { getStaticPaths, GET } = await OGImageRoute({
  param: "route",
  pages: ogPages,
  getImageOptions: (_path: string, page: { title: string; description: string; kind?: string }) => {
    const accent = ACCENT[page.kind ?? "content"] ?? ACCENT.content;
    return {
      title: page.title,
      description: page.description,
      logo: { path: "./public/og-logo-white.png", size: [264] },
      bgImage: {
        path: "./public/og-bg.png",
        fit: "cover" as const,
        position: "center" as const
      },
      border: { color: accent, width: 18, side: "block-end" as const },
      padding: 84,
      font: {
        title: { color: [255, 255, 255] as [number, number, number], weight: "Bold" as const, size: 60, lineHeight: 1.2 },
        description: { color: [206, 214, 206] as [number, number, number], size: 30, lineHeight: 1.42 }
      }
    };
  }
});
