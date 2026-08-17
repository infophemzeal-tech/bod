/**
 * Converts a string to Title Case, keeping common lowercase
 * connector words (of, and, the...) lowercase unless they're
 * the first word — e.g. "14 adeola odeku street" -> "14 Adeola Odeku Street"
 */
const MINOR_WORDS = new Set(["of", "and", "the", "for", "de", "van", "der"]);

export function toTitleCase(value: string | null | undefined): string {
  if (!value) return "";

  return value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) => {
      if (!word) return word;
      // keep short all-caps-looking tokens like "II", "PLC" as-is if user typed them that way is lost after lowercase,
      // so we just title-case normally; acronyms can be fixed manually if needed.
      if (index > 0 && MINOR_WORDS.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}