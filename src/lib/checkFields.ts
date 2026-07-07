// Definitions and sensible defaults for the printable fields on a cheque.
// A standard Philippine cheque is ~178mm x 84mm (7" x 3.3"). All coordinates are
// millimetres from the cheque's top-left corner.

import type { FieldKey, TemplateField } from "../db/types";

export {
  MM_PER_INCH,
  PT_PER_INCH,
  PT_PER_MM,
  MM_PER_PT,
  PREVIEW_PX_PER_MM,
} from "./units";

export const DEFAULT_CHEQUE_WIDTH_MM = 178;
export const DEFAULT_CHEQUE_HEIGHT_MM = 84;

interface FieldMeta {
  key: FieldKey;
  label: string;
  defaultEnabled: boolean;
}

/** The catalogue of fields the writer can place on any cheque. */
export const FIELD_CATALOG: FieldMeta[] = [
  { key: "date", label: "Date", defaultEnabled: true },
  { key: "payee", label: "Pay to the order of", defaultEnabled: true },
  { key: "amount_figures", label: "Amount (figures)", defaultEnabled: true },
  { key: "amount_words", label: "Amount in words", defaultEnabled: true },
  { key: "amount_words_2", label: "Amount in words (line 2)", defaultEnabled: false },
  { key: "memo", label: "Memo / Purpose", defaultEnabled: false },
  { key: "account_name", label: "Account name", defaultEnabled: false },
  { key: "signature_label", label: "Signature label", defaultEnabled: false },
];

/** Build a fresh field with layout defaults for a given key. */
export function makeDefaultField(key: FieldKey): TemplateField {
  const meta = FIELD_CATALOG.find((f) => f.key === key)!;
  const base: TemplateField = {
    key,
    label: meta.label,
    enabled: meta.defaultEnabled,
    x_mm: 20,
    y_mm: 20,
    width_mm: 80,
    font_size_pt: 11,
    bold: false,
    align: "left",
    letter_spacing: 0,
    uppercase: false,
  };

  // Position presets roughly matching a standard cheque layout.
  switch (key) {
    case "date":
      return { ...base, x_mm: 128, y_mm: 12, width_mm: 42, align: "left", letter_spacing: 1 };
    case "payee":
      return { ...base, x_mm: 24, y_mm: 26, width_mm: 120, font_size_pt: 12 };
    case "amount_figures":
      return { ...base, x_mm: 146, y_mm: 26, width_mm: 44, align: "right", bold: true };
    case "amount_words":
      return { ...base, x_mm: 12, y_mm: 38, width_mm: 150, uppercase: true };
    case "amount_words_2":
      return { ...base, x_mm: 12, y_mm: 45, width_mm: 150, uppercase: true };
    case "memo":
      return { ...base, x_mm: 24, y_mm: 66, width_mm: 70, font_size_pt: 9 };
    case "account_name":
      return { ...base, x_mm: 110, y_mm: 62, width_mm: 60, align: "center", bold: true };
    case "signature_label":
      return { ...base, x_mm: 120, y_mm: 74, width_mm: 55, align: "center", font_size_pt: 8 };
    default:
      return base;
  }
}

/** A complete default field set for a brand-new template. */
export function defaultFields(): TemplateField[] {
  return FIELD_CATALOG.map((f) => makeDefaultField(f.key));
}

/**
 * Given a partially-populated fields array (e.g. loaded from an older template),
 * ensure every catalog field exists so the editor can show them all.
 */
export function normalizeFields(fields: TemplateField[]): TemplateField[] {
  return FIELD_CATALOG.map((meta) => {
    const existing = fields.find((f) => f.key === meta.key);
    return existing ?? makeDefaultField(meta.key);
  });
}

