/**
 * Replaces {{field_name}} placeholders in a template string with values
 * from a data object. Unknown placeholders are left as-is so you can spot
 * typos instead of silently dropping text.
 */
export function interpolateTemplate(
  template: string,
  data: Record<string, string | number | null | undefined>
): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, key: string) => {
    const value = data[key];
    return value === null || value === undefined ? match : String(value);
  });
}

export const LETTER_PLACEHOLDERS = [
  { key: "plot_description", label: "Plot Description (e.g. \"2 Plots of Land\")" },
  { key: "estate_name", label: "Estate Name" },
  { key: "estate_location", label: "Estate Location" },
  { key: "cost_of_land", label: "Cost of Land (formatted, e.g. \u20a63,500,000.00)" },
  { key: "cost_in_words", label: "Cost of Land in Words" },
] as const;