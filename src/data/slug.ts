// Stabiilne, eestikeelt arvestav slug kataloogi kirjetele.
// Slug peab püsima muutumatuna (URL = püsiv aadress), seega tuletame selle
// provider + name põhjal ja lahendame harvad kokkulangevused järjenumbriga.

const TRANSLIT: Record<string, string> = {
  õ: "o", ä: "a", ö: "o", ü: "u", š: "s", ž: "z",
  Õ: "o", Ä: "a", Ö: "o", Ü: "u", Š: "s", Ž: "z"
};

export function slugify(input: string): string {
  return input
    .split("")
    .map((ch) => TRANSLIT[ch] ?? ch)
    .join("")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Annab igale kirjele unikaalse slugi; kokkulangevuse korral lisab -2, -3 jne.
// Sisendjärjekord on stabiilne (kataloog on sorditud), seega ka slugid püsivad.
export function assignSlugs<T>(items: readonly T[], key: (item: T) => string): Map<T, string> {
  const used = new Map<string, number>();
  const result = new Map<T, string>();
  for (const item of items) {
    const base = slugify(key(item)) || "programm";
    const seen = used.get(base) ?? 0;
    used.set(base, seen + 1);
    result.set(item, seen === 0 ? base : `${base}-${seen + 1}`);
  }
  return result;
}
