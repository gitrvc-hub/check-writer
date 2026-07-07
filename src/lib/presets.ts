// Built-in cheque layout presets. Coordinates are stored as fractions of the
// cheque's width/height (calibrated from real Philippine bank cheque scans) so a
// preset can be applied to a template of any size. The user then attaches their
// own scan as a background guide and fine-tunes with Test Print.

import type { FieldKey, TemplateField } from "../db/types";

interface FractionalField {
  key: FieldKey;
  label: string;
  enabled: boolean;
  fx: number; // left, fraction of width
  fy: number; // top, fraction of height
  fw: number; // width, fraction of width
  font_size_pt: number;
  bold: boolean;
  align: "left" | "center" | "right";
  letter_spacing: number;
  uppercase: boolean;
  format?: string;
}

/**
 * Standard Philippine (PCHC) cheque layout: date in the top-right boxes,
 * "Pay to the order of" on the left, amount in figures after the ₱, and the
 * amount-in-words line below. Calibrated against BDO/BPI/UnionBank/Bank of
 * Commerce personal cheque scans.
 */
const PH_STANDARD: FractionalField[] = [
  { key: "date",            label: "Date",                     enabled: true,  fx: 0.715, fy: 0.155, fw: 0.27, font_size_pt: 12, bold: false, align: "left",  letter_spacing: 7.5, uppercase: false, format: "MMddyyyy" },
  { key: "payee",           label: "Pay to the order of",      enabled: true,  fx: 0.135, fy: 0.28,  fw: 0.45, font_size_pt: 12, bold: true,  align: "left",  letter_spacing: 0,   uppercase: false },
  { key: "amount_figures",  label: "Amount (figures)",         enabled: true,  fx: 0.71,  fy: 0.28,  fw: 0.21, font_size_pt: 12, bold: true,  align: "right", letter_spacing: 0,   uppercase: false },
  { key: "amount_words",    label: "Amount in words",          enabled: true,  fx: 0.12,  fy: 0.385, fw: 0.78, font_size_pt: 11, bold: true,  align: "left",  letter_spacing: 0,   uppercase: false },
  { key: "amount_words_2",  label: "Amount in words (line 2)", enabled: false, fx: 0.12,  fy: 0.45,  fw: 0.78, font_size_pt: 11, bold: true,  align: "left",  letter_spacing: 0,   uppercase: false },
  { key: "memo",            label: "Memo / Purpose",           enabled: false, fx: 0.05,  fy: 0.72,  fw: 0.30, font_size_pt: 9,  bold: false, align: "left",  letter_spacing: 0,   uppercase: false },
  { key: "account_name",    label: "Account name",             enabled: false, fx: 0.62,  fy: 0.66,  fw: 0.30, font_size_pt: 11, bold: true,  align: "center",letter_spacing: 0,   uppercase: false },
  { key: "signature_label", label: "Signature label",          enabled: false, fx: 0.66,  fy: 0.80,  fw: 0.28, font_size_pt: 8,  bold: false, align: "center",letter_spacing: 0,   uppercase: false },
];

export interface LayoutPreset {
  id: string;
  name: string;
  fields: FractionalField[];
}

export const LAYOUT_PRESETS: LayoutPreset[] = [
  { id: "ph-standard", name: "Standard PH cheque", fields: PH_STANDARD },
];

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Instantiate a preset's fractional fields as absolute-mm TemplateFields. */
export function applyPreset(
  preset: LayoutPreset,
  widthMm: number,
  heightMm: number,
): TemplateField[] {
  return preset.fields.map((f) => {
    const field: TemplateField = {
      key: f.key,
      label: f.label,
      enabled: f.enabled,
      x_mm: round1(f.fx * widthMm),
      y_mm: round1(f.fy * heightMm),
      width_mm: round1(f.fw * widthMm),
      font_size_pt: f.font_size_pt,
      bold: f.bold,
      align: f.align,
      letter_spacing: f.letter_spacing,
      uppercase: f.uppercase,
    };
    if (f.format) field.format = f.format;
    return field;
  });
}
