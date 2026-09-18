/**
 * Title Case with minor words support
 * "14 adeola odeku street" -> "14 Adeola Odeku Street"
 * "bank of the north" -> "Bank of the North"
 * "B-TOP GARDEN PLC" -> "B-Top Garden PLC"
 */
const MINOR_WORDS = new Set(["of", "and", "the", "for", "a", "an", "in", "on", "at", "de", "van", "der", "von"]);
const ACRONYMS = new Set(["PLC", "LTD", "LLC", "II", "III", "IV"]);

export function toTitleCase(value: string | null | undefined): string {
  if (!value) return "";

  return value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) => {
      if (!word) return word;

      // Keep acronyms uppercase
      const upper = word.toUpperCase();
      if (ACRONYMS.has(upper)) return upper;

      // Keep minor words lowercase unless first word
      if (index > 0 && MINOR_WORDS.has(word)) return word;

      // Handle hyphenated: b-top -> B-Top
      return word
        .split("-")
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join("-");
    })
    .join(" ");
}