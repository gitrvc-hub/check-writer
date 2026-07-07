import { useState } from "react";
import { useAsync } from "../hooks";
import {
  deleteCheque,
  getTemplate,
  listAccounts,
  listCheques,
  updateChequeStatus,
  type ChequeFilter,
} from "../db/repos";
import type { Cheque } from "../db/types";
import { formatCurrency, formatDate } from "../lib/format";
import { resolveFields, type ChequeData } from "../lib/render";
import { renderChequePdf } from "../lib/pdf";
import { openPdfForPrint } from "../lib/output";

export default function Register() {
  const { data: accounts } = useAsync(listAccounts, []);
  const [filter, setFilter] = useState<ChequeFilter>({});
  const { data: cheques, reload } = useAsync(
    () => listCheques(filter),
    [filter.search, filter.accountId, filter.status, filter.from, filter.to],
  );

  async function voidCheque(c: Cheque) {
    if (confirm(`Void cheque #${c.cheque_number} to ${c.payee_name}?`)) {
      await updateChequeStatus(c.id, "void");
      reload();
    }
  }

  async function reprint(c: Cheque) {
    if (!c.template_id) {
      alert("This cheque has no template attached, so it can't be reprinted.");
      return;
    }
    const tpl = await getTemplate(c.template_id);
    if (!tpl) {
      alert("The template used for this cheque no longer exists.");
      return;
    }
    const account = accounts?.find((a) => a.id === c.account_id);
    const data: ChequeData = {
      payeeName: c.payee_name,
      amount: c.amount,
      amountWords: c.amount_words,
      dateISO: c.cheque_date,
      memo: c.memo,
      accountName: account?.account_name ?? "",
      currency: c.currency,
      crossed: !!c.crossed,
      bearer: !!c.bearer,
    };
    const values = {
      ...resolveFields(tpl.fields!, data),
      __crossed: c.crossed ? "1" : "0",
    };
    const bytes = await renderChequePdf(tpl, values);
    await openPdfForPrint(bytes, `cheque_${c.cheque_number}.pdf`);
    await updateChequeStatus(c.id, "printed", true);
    reload();
  }

  async function remove(c: Cheque) {
    if (confirm(`Permanently delete this register entry? This cannot be undone.`)) {
      await deleteCheque(c.id);
      reload();
    }
  }

  const rows = cheques ?? [];
  const total = rows
    .filter((c) => c.status !== "void")
    .reduce((sum, c) => sum + c.amount, 0);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Cheque Register</h1>
          <p>Every cheque you've written, searchable and reprintable.</p>
        </div>
      </div>

      <div className="card">
        <div className="toolbar">
          <input
            placeholder="Search payee, cheque no., memo…"
            value={filter.search ?? ""}
            onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
            style={{ maxWidth: 260 }}
          />
          <select
            value={filter.accountId ?? ""}
            onChange={(e) =>
              setFilter((f) => ({
                ...f,
                accountId: e.target.value ? Number(e.target.value) : undefined,
              }))
            }
          >
            <option value="">All accounts</option>
            {(accounts ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.account_name}
              </option>
            ))}
          </select>
          <select
            value={filter.status ?? ""}
            onChange={(e) =>
              setFilter((f) => ({ ...f, status: (e.target.value || undefined) as any }))
            }
          >
            <option value="">All statuses</option>
            <option value="issued">Issued</option>
            <option value="printed">Printed</option>
            <option value="void">Void</option>
            <option value="cleared">Cleared</option>
          </select>
          <input
            type="date"
            value={filter.from ?? ""}
            onChange={(e) => setFilter((f) => ({ ...f, from: e.target.value || undefined }))}
            style={{ maxWidth: 150 }}
          />
          <span className="muted">to</span>
          <input
            type="date"
            value={filter.to ?? ""}
            onChange={(e) => setFilter((f) => ({ ...f, to: e.target.value || undefined }))}
            style={{ maxWidth: 150 }}
          />
          <div className="spacer" />
          <button className="btn" onClick={() => setFilter({})}>
            Clear
          </button>
        </div>

        {rows.length === 0 ? (
          <div className="empty">
            <div className="big">☰</div>
            No cheques match. Write one from “Write a Cheque”.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Cheque No.</th>
                <th>Payee</th>
                <th>Account</th>
                <th className="text-right">Amount</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td className="muted">{formatDate(c.cheque_date)}</td>
                  <td className="mono">{c.cheque_number || "—"}</td>
                  <td style={{ fontWeight: 600 }}>{c.payee_name}</td>
                  <td className="muted">{c.account_name ?? "—"}</td>
                  <td className="text-right mono">{formatCurrency(c.amount, c.currency)}</td>
                  <td>
                    <span className={`badge ${c.status}`}>{c.status}</span>
                  </td>
                  <td className="text-right" style={{ whiteSpace: "nowrap" }}>
                    <button className="btn btn-sm" onClick={() => reprint(c)}>
                      Reprint
                    </button>{" "}
                    {c.status !== "void" && (
                      <button className="btn btn-sm" onClick={() => voidCheque(c)}>
                        Void
                      </button>
                    )}{" "}
                    <button className="btn btn-sm danger" onClick={() => remove(c)}>
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="muted">
                  {rows.length} cheque{rows.length === 1 ? "" : "s"} (excl. void)
                </td>
                <td className="text-right mono" style={{ fontWeight: 700 }}>
                  {formatCurrency(total)}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </>
  );
}
