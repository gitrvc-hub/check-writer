// Domain types mirroring the SQLite schema (see src-tauri/src/lib.rs migrations).

export interface Bank {
  id: number;
  name: string;
  short_name: string;
  is_system: number; // 0 | 1
}

export interface Account {
  id: number;
  bank_id: number | null;
  account_name: string;
  account_number: string;
  branch: string;
  currency: string;
  default_template_id: number | null;
  created_at: string;
  // joined
  bank_short_name?: string;
  bank_name?: string;
}

export interface Payee {
  id: number;
  name: string;
  notes: string;
  created_at: string;
}

/** A single printable field placed on a cheque template. */
export type FieldKey =
  | "date"
  | "payee"
  | "amount_figures"
  | "amount_words"
  | "amount_words_2" // optional 2nd line for long amounts
  | "memo"
  | "account_name"
  | "signature_label";

export interface TemplateField {
  key: FieldKey;
  label: string;
  enabled: boolean;
  x_mm: number; // left, in millimetres from cheque top-left
  y_mm: number; // top, in millimetres from cheque top-left
  width_mm: number;
  font_size_pt: number;
  bold: boolean;
  align: "left" | "center" | "right";
  letter_spacing: number; // extra tracking in pt (useful for boxed date digits)
  uppercase: boolean;
}

export interface Template {
  id: number;
  name: string;
  bank_id: number | null;
  background_path: string;
  width_mm: number;
  height_mm: number;
  offset_x_mm: number; // global print alignment nudge
  offset_y_mm: number;
  fields_json: string; // serialized TemplateField[]
  created_at: string;
  // parsed convenience
  fields?: TemplateField[];
  bank_short_name?: string;
}

export type ChequeStatus = "issued" | "printed" | "void" | "cleared";

export interface Cheque {
  id: number;
  account_id: number | null;
  template_id: number | null;
  payee_id: number | null;
  payee_name: string;
  cheque_number: string;
  cheque_date: string; // ISO yyyy-mm-dd
  amount: number;
  amount_words: string;
  memo: string;
  currency: string;
  crossed: number;
  bearer: number;
  status: ChequeStatus;
  created_at: string;
  printed_at: string | null;
  // joined
  account_name?: string;
  bank_short_name?: string;
}
