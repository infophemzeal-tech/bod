const ONES = [
  "",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];

const TENS = [
  "",
  "",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
];

function chunkToWords(n: number): string {
  if (n === 0) return "";
  if (n < 20) return ONES[n];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const r = n % 10;
    return TENS[t] + (r ? " " + ONES[r] : "");
  }
  const h = Math.floor(n / 100);
  const r = n % 100;
  return ONES[h] + " hundred" + (r ? " and " + chunkToWords(r) : "");
}

/**
 * Converts a whole-naira amount into words, e.g. 470500 ->
 * "Four Hundred And Seventy Thousand Five Hundred Naira".
 * Ignores kobo/decimals — round or truncate before calling if needed.
 */
export function nairaToWords(amount: number): string {
  const whole = Math.round(amount);
  if (whole === 0) return "Zero Naira";

  const billions = Math.floor(whole / 1_000_000_000);
  const millions = Math.floor((whole % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((whole % 1_000_000) / 1_000);
  const remainder = whole % 1_000;

  const parts: string[] = [];
  if (billions) parts.push(`${chunkToWords(billions)} billion`);
  if (millions) parts.push(`${chunkToWords(millions)} million`);
  if (thousands) parts.push(`${chunkToWords(thousands)} thousand`);
  if (remainder) parts.push(chunkToWords(remainder));

  const words = parts.join(" ").trim() + " naira";
  return words
    .split(" ")
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}