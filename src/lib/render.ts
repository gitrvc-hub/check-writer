// Turns cheque data + a template into the concrete text that prints in each field.
// Shared by the on-screen preview and the pdf-lib renderer so they always agree.

import type { FieldKey, TemplateField } from "../db/types";
import { formatAmountFigures, formatDatePattern } from "./format";

export interface ChequeData {
  payeeName: string;
  amount: number;
  amountWords: string; // precomputed via amountToWords()
  dateISO: string;
  memo: string;
  accountName: string;
  currency: string;
  crossed: boolean;
  bearer: boolean;
}

/** Sample data used to populate the template editor preview. */
export const SAMPLE_DATA: ChequeData = {
  payeeName: "JUAN DELA CRUZ",
  amount: 12345.67,
  amountWords: "TWELVE THOUSAND THREE HUNDRED FORTY FIVE PESOS AND 67/100 ONLY",
  dateISO: new Date().toISOString().slice(0, 10),
  memo: "Payment for services",
  accountName: "ABC TRADING CORP.",
  currency: "PHP",
  crossed: false,
  bearer: false,
};

/**
 * Estimate how many characters fit on one line for a field, so a long
 * amount-in-words can be split between the primary and secondary word lines.
 * Average glyph advance for common fonts is ~0.5em; letter spacing adds to it.
 */
function charsPerLine(field: TemplateField): number {
  const emMm = field.font_size_pt * 0.3528; // pt -> mm
  const avgCharMm = emMm * 0.52 + field.letter_spacing * 0.3528;
  return Math.max(8, Math.floor(field.width_mm / avgCharMm));
}

/** Break text onto (at most) two lines at a word boundary near `capacity`. */
export function splitTwoLines(text: string, capacity: number): [string, string] {
  if (text.length <= capacity) return [text, ""];
  const words = text.split(" ");
  let first = "";
  for (const w of words) {
    if ((first + " " + w).trim().length > capacity && first) break;
    first = (first + " " + w).trim();
  }
  const second = text.slice(first.length).trim();
  return [first, second];
}

function applyCase(value: string, field: TemplateField): string {
  return field.uppercase ? value.toUpperCase() : value;
}

/**
 * Resolve the printable string for every field of a template given cheque data.
 * Returns a map keyed by FieldKey. Disabled fields are omitted.
 */
export function resolveFields(
  fields: TemplateField[],
  data: ChequeData,
): Record<string, string> {
  const out: Record<string, string> = {};
  const byKey = (k: FieldKey) => fields.find((f) => f.key === k);

  // Pre-split the amount words if a second line exists and is enabled.
  const wordsField = byKey("amount_words");
  const words2Field = byKey("amount_words_2");
  let wordsLine1 = data.amountWords;
  let wordsLine2 = "";
  if (wordsField && words2Field?.enabled) {
    [wordsLine1, wordsLine2] = splitTwoLines(data.amountWords, charsPerLine(wordsField));
  }

  for (const f of fields) {
    if (!f.enabled) continue;
    let value = "";
    switch (f.key) {
      case "date":
        value = formatDatePattern(data.dateISO, f.format || "MM/dd/yyyy");
        break;
      case "payee":
        value = data.payeeName;
        break;
      case "amount_figures":
        value = formatAmountFigures(data.amount);
        break;
      case "amount_words":
        value = wordsLine1;
        break;
      case "amount_words_2":
        value = wordsLine2;
        break;
      case "memo":
        value = data.memo;
        break;
      case "account_name":
        value = data.accountName;
        break;
      case "signature_label":
        value = data.accountName || "Authorized Signature";
        break;
    }
    out[f.key] = applyCase(value, f);
  }
  return out;
}
