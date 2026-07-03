import type { CatalogEntry, CatalogLanguage, CatalogOutcomeObject } from "./catalogSchema";

const LANGUAGE_SET = new Set(["et", "en", "ru"]);

const ESTONIAN_SIGNAL_RE = /[õäöüšž]|(?:\b(?:ja|ning|või|oskab|tunneb|mõistab|rakendab|analüüsib|hindab|loob|kasutab|teab|selgitab|lahendab|viib|koostab|eristab|valdab|omab|kavandab|korraldab|arendab|juhtib|esitab|tõlgendab|võrdleb|seostab|navigeerib|sünteesib|põhimõtteid|oskusi|andmeid|õiguse|õppe)\b)/i;
const ENGLISH_SIGNAL_RE = /(?:\b(?:and|or|the|with|uses|understands|applies|analyses|analyzes|evaluates|creates|explains|identifies|develops|manages|designs|implements|demonstrates|knowledge|skills|learning|outcomes|assessment|business|data|digital)\b)/i;
const RUSSIAN_SIGNAL_RE = /[\u0400-\u04ff]/;
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const URL_RE = /\bhttps?:\/\/|\bwww\./i;
const NAVIGATION_RE = /^(?:loe edasi|loe lisaks|vaata lisaks|registreeru|tagasi|avaleht|jaga|kontakt|küsi lisa|download|allalaadimine)\b/i;
const HEADING_ONLY_RE = /^(?:õpiväljundid|õpitulemused|learning outcomes|mikrokraadi edukalt läbinu|programmi läbinu|lõpetaja|eesmärk|hindamine|assessment):?$/i;
const ADMIN_TEXT_RE = /\b(?:e-post|telefon|kontakt|vastuvõtt toimub|registreerimine kuni|õppeinfosüsteem|lisainfo|täpsem info|pdf|cookie|küpsised)\b/i;
const OUTCOME_VERB_RE = /\b(?:oskab|tunneb|mõistab|rakendab|analüüsib|hindab|loob|kasutab|teab|selgitab|lahendab|koostab|eristab|valdab|omab|kavandab|korraldab|arendab|juhtib|esitab|tõlgendab|võrdleb|seostab|navigeerib|sünteesib|can|uses|understands|applies|analyses|analyzes|evaluates|creates|explains|identifies|develops|manages|designs|implements|demonstrates|knows)\b/i;

function normalizeText(value: unknown): string {
  return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
}

function cleanOutcomeText(value: unknown): string {
  return normalizeText(value)
    .replace(/^[\s?*•●▪◦-]+/, "")
    .replace(/^(\d{1,2}[.)])\s*/, "")
    .replace(/\s+([:;,.])/g, "$1")
    .replace(/[.;]\s*$/, "")
    .trim();
}

function splitOutcomeText(value: unknown): string[] {
  const input = String(value == null ? "" : value)
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|div|h[1-6]|tr|dt|dd)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\r/g, "\n")
    .replace(/\s+([*•●▪◦])\s*(?=[A-ZÕÄÖÜ])|^([*•●▪◦])\s*(?=[A-ZÕÄÖÜ])/g, "\n")
    .replace(/(?:^|\n)\s*\d{1,2}[.)]\s*(?=[A-ZÕÄÖÜ])/g, "\n")
    .replace(/(?<=\S)\s+\d{1,2}[.)]\s*(?=[A-ZÕÄÖÜ])/g, "\n");
  const seen = new Set<string>();
  return input
    .split(/(?:\s*;\s*|\s*\n\s*|(?<=\.)\s+(?=[A-ZÕÄÖÜ]))/)
    .map(cleanOutcomeText)
    .filter((part) => part.length >= 12)
    .filter((part) => {
      const key = part.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12);
}

function validLanguage(value: unknown): value is CatalogLanguage {
  return typeof value === "string" && LANGUAGE_SET.has(value);
}

export function languageLabel(language: string | null | undefined): string {
  if (language === "et") return "Eesti";
  if (language === "en") return "Inglise";
  if (language === "ru") return "Vene";
  return "Märkimata";
}

export function languageSort(a: string, b: string): number {
  const order: Record<string, number> = { et: 1, en: 2, ru: 3, unknown: 99 };
  return (order[a] ?? 90) - (order[b] ?? 90) || languageLabel(a).localeCompare(languageLabel(b), "et");
}

export function detectOutcomeTextLanguage(text: string, fallback: CatalogLanguage | null = "et"): CatalogLanguage {
  const input = normalizeText(text);
  if (RUSSIAN_SIGNAL_RE.test(input)) return "ru";
  const et = (input.match(new RegExp(ESTONIAN_SIGNAL_RE.source, "gi")) || []).length + (/[õäöüšž]/i.test(input) ? 2 : 0);
  const en = (input.match(new RegExp(ENGLISH_SIGNAL_RE.source, "gi")) || []).length;
  if (et > en) return "et";
  if (en > et) return "en";
  return fallback || "et";
}

export function classifyOutcomeText(text: string): { qualityState: "approved" | "needs_review" | "rejected_fragment"; fragmentReason: string } {
  const input = normalizeText(text);
  if (!input) return { qualityState: "rejected_fragment", fragmentReason: "empty" };
  if (EMAIL_RE.test(input)) return { qualityState: "rejected_fragment", fragmentReason: "contact_or_email" };
  if (URL_RE.test(input) || NAVIGATION_RE.test(input)) return { qualityState: "rejected_fragment", fragmentReason: "url_or_navigation" };
  if (HEADING_ONLY_RE.test(input)) return { qualityState: "rejected_fragment", fragmentReason: "heading_only" };
  if (ADMIN_TEXT_RE.test(input) && input.length < 160) return { qualityState: "rejected_fragment", fragmentReason: "administrative_text" };
  const words = input.split(/\s+/).filter(Boolean);
  if (words.length < 3 && !OUTCOME_VERB_RE.test(input)) return { qualityState: "rejected_fragment", fragmentReason: "too_short_non_outcome" };
  if (input.length > 650) return { qualityState: "needs_review", fragmentReason: "too_long_run_on" };
  return { qualityState: "approved", fragmentReason: "none" };
}

export function teachingLanguageFor(entry: CatalogEntry): CatalogLanguage | null {
  return validLanguage(entry.language) ? entry.language : null;
}

export function entryOutcomeObjects(entry: CatalogEntry): CatalogOutcomeObject[] {
  const teachingLanguage = teachingLanguageFor(entry);
  const raw: Array<CatalogOutcomeObject | string> = Array.isArray(entry.outcomeObjects) && entry.outcomeObjects.length
    ? entry.outcomeObjects
    : (Array.isArray(entry.outcomes) ? entry.outcomes.map((text) => ({ text })) : []);
  const seen = new Set<string>();
  const out: CatalogOutcomeObject[] = [];
  for (const outcome of raw) {
    const record: Partial<CatalogOutcomeObject> = typeof outcome === "string" ? { text: outcome } : outcome;
    const rawText = normalizeText(record.text);
    const parts = splitOutcomeText(rawText);
    const texts = parts.length ? parts : (rawText ? [cleanOutcomeText(rawText)] : []);
    texts.forEach((text, index) => {
      if (!text) return;
      const quality = classifyOutcomeText(text);
      const qualityState = texts.length === 1 ? (record.qualityState || quality.qualityState) : quality.qualityState;
      const fragmentReason = texts.length === 1 ? (record.fragmentReason || quality.fragmentReason) : quality.fragmentReason;
      if (qualityState === "rejected_fragment") return;
      const key = text.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      const textLanguage = validLanguage(record.textLanguage)
        ? record.textLanguage
        : detectOutcomeTextLanguage(text, teachingLanguage || "et");
      const outcomeTeachingLanguage = validLanguage(record.teachingLanguage)
        ? record.teachingLanguage
        : teachingLanguage;
      out.push({
        ...record,
        id: texts.length === 1 ? record.id : `${record.id ?? "outcome"}-${index + 1}`,
        text,
        language: textLanguage,
        textLanguage,
        teachingLanguage: outcomeTeachingLanguage,
        qualityState,
        fragmentReason,
      });
    });
  }
  return out;
}

export function cleanOutcomeTexts(entry: CatalogEntry): string[] {
  return entryOutcomeObjects(entry).map((outcome) => outcome.text);
}
