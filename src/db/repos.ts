// Repository functions: thin, typed wrappers over SQL for each entity.
// All queries go through the single connection from getDb().

import { getDb } from "./index";
import type {
  Account,
  Bank,
  Cheque,
  ChequeStatus,
  Payee,
  Template,
  TemplateField,
} from "./types";
import { defaultFields, normalizeFields } from "../lib/checkFields";

// ----------------------------------------------------------------------------
// Banks
// ----------------------------------------------------------------------------

export async function listBanks(): Promise<Bank[]> {
  const db = await getDb();
  return db.select<Bank[]>("SELECT * FROM banks ORDER BY short_name COLLATE NOCASE");
}

export async function createBank(name: string, short_name: string): Promise<number> {
  const db = await getDb();
  const res = await db.execute(
    "INSERT INTO banks (name, short_name, is_system) VALUES (?, ?, 0)",
    [name, short_name],
  );
  return res.lastInsertId ?? 0;
}

export async function deleteBank(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM banks WHERE id = ? AND is_system = 0", [id]);
}

// ----------------------------------------------------------------------------
// Accounts (the bank accounts cheques are drawn from)
// ----------------------------------------------------------------------------

export async function listAccounts(): Promise<Account[]> {
  const db = await getDb();
  return db.select<Account[]>(`
    SELECT a.*, b.short_name AS bank_short_name, b.name AS bank_name
    FROM accounts a
    LEFT JOIN banks b ON b.id = a.bank_id
    ORDER BY a.account_name COLLATE NOCASE
  `);
}

export async function getAccount(id: number): Promise<Account | null> {
  const db = await getDb();
  const rows = await db.select<Account[]>(
    `SELECT a.*, b.short_name AS bank_short_name, b.name AS bank_name
     FROM accounts a LEFT JOIN banks b ON b.id = a.bank_id WHERE a.id = ?`,
    [id],
  );
  return rows[0] ?? null;
}

export async function upsertAccount(a: Partial<Account>): Promise<number> {
  const db = await getDb();
  if (a.id) {
    await db.execute(
      `UPDATE accounts SET bank_id=?, account_name=?, account_number=?, branch=?,
         currency=?, default_template_id=? WHERE id=?`,
      [
        a.bank_id ?? null,
        a.account_name ?? "",
        a.account_number ?? "",
        a.branch ?? "",
        a.currency ?? "PHP",
        a.default_template_id ?? null,
        a.id,
      ],
    );
    return a.id;
  }
  const res = await db.execute(
    `INSERT INTO accounts (bank_id, account_name, account_number, branch, currency,
        default_template_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      a.bank_id ?? null,
      a.account_name ?? "",
      a.account_number ?? "",
      a.branch ?? "",
      a.currency ?? "PHP",
      a.default_template_id ?? null,
    ],
  );
  return res.lastInsertId ?? 0;
}

export async function deleteAccount(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM accounts WHERE id = ?", [id]);
}

// ----------------------------------------------------------------------------
// Payees
// ----------------------------------------------------------------------------

export async function listPayees(): Promise<Payee[]> {
  const db = await getDb();
  return db.select<Payee[]>("SELECT * FROM payees ORDER BY name COLLATE NOCASE");
}

export async function upsertPayee(p: Partial<Payee>): Promise<number> {
  const db = await getDb();
  if (p.id) {
    await db.execute("UPDATE payees SET name=?, notes=? WHERE id=?", [
      p.name ?? "",
      p.notes ?? "",
      p.id,
    ]);
    return p.id;
  }
  const res = await db.execute("INSERT INTO payees (name, notes) VALUES (?, ?)", [
    p.name ?? "",
    p.notes ?? "",
  ]);
  return res.lastInsertId ?? 0;
}

/** Find an existing payee by name (case-insensitive) or create one. */
export async function findOrCreatePayee(name: string): Promise<number> {
  const db = await getDb();
  const trimmed = name.trim();
  if (!trimmed) return 0;
  const rows = await db.select<Payee[]>(
    "SELECT * FROM payees WHERE name = ? COLLATE NOCASE LIMIT 1",
    [trimmed],
  );
  if (rows[0]) return rows[0].id;
  return upsertPayee({ name: trimmed });
}

export async function deletePayee(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM payees WHERE id = ?", [id]);
}

// ----------------------------------------------------------------------------
// Templates
// ----------------------------------------------------------------------------

/** Parse fields_json and guarantee all catalog fields are present. */
function hydrateTemplate(t: Template): Template {
  let fields: TemplateField[];
  try {
    fields = normalizeFields(JSON.parse(t.fields_json || "[]"));
  } catch {
    fields = defaultFields();
  }
  return { ...t, fields };
}

export async function listTemplates(): Promise<Template[]> {
  const db = await getDb();
  const rows = await db.select<Template[]>(`
    SELECT t.*, b.short_name AS bank_short_name
    FROM templates t LEFT JOIN banks b ON b.id = t.bank_id
    ORDER BY t.name COLLATE NOCASE
  `);
  return rows.map(hydrateTemplate);
}

export async function getTemplate(id: number): Promise<Template | null> {
  const db = await getDb();
  const rows = await db.select<Template[]>("SELECT * FROM templates WHERE id = ?", [id]);
  return rows[0] ? hydrateTemplate(rows[0]) : null;
}

export async function upsertTemplate(t: Partial<Template>): Promise<number> {
  const db = await getDb();
  const fields_json = t.fields ? JSON.stringify(t.fields) : t.fields_json ?? "[]";
  if (t.id) {
    await db.execute(
      `UPDATE templates SET name=?, bank_id=?, background_path=?, width_mm=?, height_mm=?,
         offset_x_mm=?, offset_y_mm=?, fields_json=? WHERE id=?`,
      [
        t.name ?? "Untitled",
        t.bank_id ?? null,
        t.background_path ?? "",
        t.width_mm ?? 178,
        t.height_mm ?? 84,
        t.offset_x_mm ?? 0,
        t.offset_y_mm ?? 0,
        fields_json,
        t.id,
      ],
    );
    return t.id;
  }
  const res = await db.execute(
    `INSERT INTO templates (name, bank_id, background_path, width_mm, height_mm,
        offset_x_mm, offset_y_mm, fields_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      t.name ?? "Untitled",
      t.bank_id ?? null,
      t.background_path ?? "",
      t.width_mm ?? 178,
      t.height_mm ?? 84,
      t.offset_x_mm ?? 0,
      t.offset_y_mm ?? 0,
      fields_json,
    ],
  );
  return res.lastInsertId ?? 0;
}

export async function deleteTemplate(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM templates WHERE id = ?", [id]);
}

// ----------------------------------------------------------------------------
// Cheques (the register)
// ----------------------------------------------------------------------------

export interface ChequeFilter {
  search?: string;
  accountId?: number;
  status?: ChequeStatus;
  from?: string;
  to?: string;
}

export async function listCheques(filter: ChequeFilter = {}): Promise<Cheque[]> {
  const db = await getDb();
  const where: string[] = [];
  const params: unknown[] = [];

  if (filter.search) {
    where.push("(c.payee_name LIKE ? OR c.cheque_number LIKE ? OR c.memo LIKE ?)");
    const like = `%${filter.search}%`;
    params.push(like, like, like);
  }
  if (filter.accountId) {
    where.push("c.account_id = ?");
    params.push(filter.accountId);
  }
  if (filter.status) {
    where.push("c.status = ?");
    params.push(filter.status);
  }
  if (filter.from) {
    where.push("c.cheque_date >= ?");
    params.push(filter.from);
  }
  if (filter.to) {
    where.push("c.cheque_date <= ?");
    params.push(filter.to);
  }

  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  return db.select<Cheque[]>(
    `SELECT c.*, a.account_name, b.short_name AS bank_short_name
     FROM cheques c
     LEFT JOIN accounts a ON a.id = c.account_id
     LEFT JOIN banks b ON b.id = a.bank_id
     ${clause}
     ORDER BY c.cheque_date DESC, c.id DESC`,
    params,
  );
}

export async function createCheque(c: Partial<Cheque>): Promise<number> {
  const db = await getDb();
  const res = await db.execute(
    `INSERT INTO cheques (account_id, template_id, payee_id, payee_name, cheque_number,
        cheque_date, amount, amount_words, memo, currency, crossed, bearer, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      c.account_id ?? null,
      c.template_id ?? null,
      c.payee_id ?? null,
      c.payee_name ?? "",
      c.cheque_number ?? "",
      c.cheque_date ?? "",
      c.amount ?? 0,
      c.amount_words ?? "",
      c.memo ?? "",
      c.currency ?? "PHP",
      c.crossed ? 1 : 0,
      c.bearer ? 1 : 0,
      c.status ?? "issued",
    ],
  );
  return res.lastInsertId ?? 0;
}

export async function updateChequeStatus(
  id: number,
  status: ChequeStatus,
  markPrinted = false,
): Promise<void> {
  const db = await getDb();
  if (markPrinted) {
    await db.execute(
      "UPDATE cheques SET status = ?, printed_at = datetime('now') WHERE id = ?",
      [status, id],
    );
  } else {
    await db.execute("UPDATE cheques SET status = ? WHERE id = ?", [status, id]);
  }
}

export async function deleteCheque(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM cheques WHERE id = ?", [id]);
}

export interface RegisterSummary {
  count: number;
  total: number;
  voided: number;
}

export async function chequeSummary(filter: ChequeFilter = {}): Promise<RegisterSummary> {
  const cheques = await listCheques(filter);
  return cheques.reduce<RegisterSummary>(
    (acc, c) => {
      acc.count += 1;
      if (c.status === "void") acc.voided += 1;
      else acc.total += c.amount;
      return acc;
    },
    { count: 0, total: 0, voided: 0 },
  );
}
