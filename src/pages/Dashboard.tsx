import { Link } from "react-router-dom";
import { useAsync } from "../hooks";
import { listAccounts, listCheques, listPayees, listTemplates } from "../db/repos";
import { formatCurrency, formatDate } from "../lib/format";

export default function Dashboard() {
  const { data: cheques } = useAsync(() => listCheques(), []);
  const { data: accounts } = useAsync(listAccounts, []);
  const { data: payees } = useAsync(listPayees, []);
  const { data: templates } = useAsync(listTemplates, []);

  const rows = cheques ?? [];
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthTotal = rows
    .filter((c) => c.status !== "void" && c.cheque_date.startsWith(thisMonth))
    .reduce((s, c) => s + c.amount, 0);
  const recent = rows.slice(0, 6);

  const needsSetup =
    (accounts?.length ?? 0) === 0 || (templates?.length ?? 0) === 0;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Overview of your cheque activity.</p>
        </div>
        <Link className="btn primary" to="/write">
          ✎ Write a Cheque
        </Link>
      </div>

      {needsSetup && (
        <div className="card" style={{ marginBottom: 18 }}>
          <h2>Get started</h2>
          <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 2 }}>
            <li>
              Add a <Link to="/accounts">bank account</Link> you'll draw cheques from.
            </li>
            <li>
              Create a <Link to="/templates">cheque template</Link> and drag the fields onto a
              scan of your cheque.
            </li>
            <li>
              Then <Link to="/write">write a cheque</Link> — the amount in words fills in
              automatically.
            </li>
          </ol>
        </div>
      )}

      <div className="grid-cards" style={{ marginBottom: 18 }}>
        <div className="stat">
          <div className="label">This Month</div>
          <div className="value">{formatCurrency(monthTotal)}</div>
        </div>
        <div className="stat">
          <div className="label">Total Cheques</div>
          <div className="value">{rows.length}</div>
        </div>
        <div className="stat">
          <div className="label">Accounts</div>
          <div className="value">{accounts?.length ?? 0}</div>
        </div>
        <div className="stat">
          <div className="label">Payees</div>
          <div className="value">{payees?.length ?? 0}</div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>Recent Cheques</h2>
          <Link to="/register" className="btn btn-sm">
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="empty">No cheques yet.</div>
        ) : (
          <table style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Cheque No.</th>
                <th>Payee</th>
                <th className="text-right">Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((c) => (
                <tr key={c.id}>
                  <td className="muted">{formatDate(c.cheque_date)}</td>
                  <td className="mono">{c.cheque_number || "—"}</td>
                  <td style={{ fontWeight: 600 }}>{c.payee_name}</td>
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
