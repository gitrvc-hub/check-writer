import { useMemo, useState } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { useAsync } from "../hooks";
import { listCheques, type ChequeFilter } from "../db/repos";
import type { Cheque } from "../db/types";
import { formatCurrency, formatDate } from "../lib/format";

/** Aggregate cheques by a key selector, summing non-void amounts. */
function groupSum(cheques: Cheque[], keyOf: (c: Cheque) => string) {
  const map = new Map<string, { count: number; total: number }>();
  for (const c of cheques) {
    if (c.status === "void") continue;
    const key = keyOf(c) || "—";
    const entry = map.get(key) ?? { count: 0, total: 0 };
    entry.count += 1;
    entry.total += c.amount;
    map.set(key, entry);
  }
  return [...map.entries()].sort((a, b) => b[1].total - a[1].total);
}

function toCsv(cheques: Cheque[]): string {
  const header = [
    "Date",
    "Cheque No",
    "Payee",
    "Account",
    "Amount",
    "Currency",
    "Status",
    "Memo",
    "Amount in Words",
  ];
  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = cheques.map((c) =>
    [
      c.cheque_date,
      c.cheque_number,
      c.payee_name,
      c.account_name ?? "",
      c.amount.toFixed(2),
      c.currency,
      c.status,
      c.memo,
      c.amount_words,
    ]
      .map((v) => escape(v ?? ""))
      .join(","),
  );
  return [header.join(","), ...lines].join("\r\n");
}

export default function Reports() {
  const [range, setRange] = useState<ChequeFilter>({});
  const { data: cheques } = useAsync(
    () => listCheques(range),
    [range.from, range.to],
  );

  const rows = cheques ?? [];
  const byAccount = useMemo(() => groupSum(rows, (c) => c.account_name ?? "—"), [rows]);
  const byPayee = useMemo(() => groupSum(rows, (c) => c.payee_name), [rows]);
  const byMonth = useMemo(
    () => groupSum(rows, (c) => (c.cheque_date || "").slice(0, 7)),
    [rows],
  );

  const total = rows.filter((c) => c.status !== "void").reduce((s, c) => s + c.amount, 0);
  const voided = rows.filter((c) => c.status === "void").length;

  async function exportCsv() {
    const path = await save({
      defaultPath: `cheque_register_${new Date().toISOString().slice(0, 10)}.csv`,
      filters: [{ name: "CSV", extensions: ["csv"] }],
    });
    if (!path) return;
    await writeTextFile(path, toCsv(rows));
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Reports</h1>
          <p>Spending summaries and register export.</p>
        </div>
        <button className="btn primary" onClick={exportCsv} disabled={rows.length === 0}>
          Export CSV
        </button>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="toolbar">
          <div className="field" style={{ margin: 0 }}>
            <label>From</label>
            <input
              type="date"
              value={range.from ?? ""}
              onChange={(e) => setRange((r) => ({ ...r, from: e.target.value || undefined }))}
            />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>To</label>
            <input
              type="date"
              value={range.to ?? ""}
              onChange={(e) => setRange((r) => ({ ...r, to: e.target.value || undefined }))}
            />
          </div>
          <div className="spacer" />
          <button className="btn" onClick={() => setRange({})}>
            All time
          </button>
        </div>
      </div>

      <div className="grid-cards" style={{ marginBottom: 18 }}>
        <div className="stat">
          <div className="label">Total Disbursed</div>
          <div className="value">{formatCurrency(total)}</div>
        </div>
        <div className="stat">
          <div className="label">Cheques Written</div>
          <div className="value">{rows.length}</div>
        </div>
        <div className="stat">
          <div className="label">Voided</div>
          <div className="value">{voided}</div>
        </div>
      </div>

      <div className="split">
        <div className="card">
          <h2>By Account</h2>
          <SummaryTable rows={byAccount} label="Account" />
        </div>
        <div className="card">
          <h2>By Month</h2>
          <SummaryTable rows={byMonth} label="Month" mono />
        </div>
      </div>

      <div className="card">
        <h2>Top Payees</h2>
        <SummaryTable rows={byPayee.slice(0, 15)} label="Payee" />
      </div>

      <div className="card">
        <h2>All Cheques in Range</h2>
        {rows.length === 0 ? (
          <div className="empty">No cheques in this range.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Payee</th>
                <th className="text-right">Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td className="muted">{formatDate(c.cheque_date)}</td>
                  <td>{c.payee_name}</td>
                  <td className="text-right mono">{formatCurrency(c.amount, c.currency)}</td>
                  <td>
                    <span className={`badge ${c.status}`}>{c.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function SummaryTable({
  rows,
  label,
  mono,
}: {
  rows: [string, { count: number; total: number }][];
  label: string;
  mono?: boolean;
}) {
  if (rows.length === 0) return <div className="muted">No data.</div>;
  return (
    <table>
      <thead>
        <tr>
          <th>{label}</th>
          <th className="text-right">Count</th>
          <th className="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([key, v]) => (
          <tr key={key}>
            <td className={mono ? "mono" : ""}>{key}</td>
            <td className="text-right">{v.count}</td>
            <td className="text-right mono">{formatCurrency(v.total)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
