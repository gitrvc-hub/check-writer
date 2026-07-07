import { useState } from "react";
import { useAsync } from "../hooks";
import {
  createBank,
  deleteAccount,
  listAccounts,
  listBanks,
  listTemplates,
  upsertAccount,
} from "../db/repos";
import type { Account } from "../db/types";
import Modal from "../components/Modal";

export default function Accounts() {
  const { data: accounts, reload } = useAsync(listAccounts, []);
  const { data: banks, reload: reloadBanks } = useAsync(listBanks, []);
  const { data: templates } = useAsync(listTemplates, []);
  const [editing, setEditing] = useState<Partial<Account> | null>(null);
  const [newBankName, setNewBankName] = useState("");

  async function save() {
    if (!editing?.account_name?.trim()) return;
    await upsertAccount(editing);
    setEditing(null);
    reload();
  }

  async function remove(a: Account) {
    if (confirm(`Delete account "${a.account_name}"?`)) {
      await deleteAccount(a.id);
      reload();
    }
  }

  async function addBank() {
    const name = newBankName.trim();
    if (!name) return;
    // Derive a short name from the entered value's initials or first word.
    const short = name.length <= 12 ? name : name.split(/\s+/)[0];
    const id = await createBank(name, short);
    setNewBankName("");
    await reloadBanks();
    setEditing((e) => (e ? { ...e, bank_id: id } : e));
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Bank Accounts</h1>
          <p>The accounts your cheques are drawn from.</p>
        </div>
        <button
          className="btn primary"
          onClick={() => setEditing({ account_name: "", currency: "PHP" })}
        >
          + New Account
        </button>
      </div>

      <div className="card">
        {(accounts ?? []).length === 0 ? (
          <div className="empty">
            <div className="big">▣</div>
            No bank accounts yet. Add the account you'll issue cheques from.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Account Name</th>
                <th>Bank</th>
                <th>Account No.</th>
                <th>Branch</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(accounts ?? []).map((a) => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 600 }}>{a.account_name}</td>
                  <td>{a.bank_short_name ?? "—"}</td>
                  <td className="mono muted">{a.account_number || "—"}</td>
                  <td className="muted">{a.branch || "—"}</td>
                  <td className="text-right">
                    <button className="btn btn-sm" onClick={() => setEditing(a)}>
                      Edit
                    </button>{" "}
                    <button className="btn btn-sm danger" onClick={() => remove(a)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <Modal
          title={editing.id ? "Edit Account" : "New Account"}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button className="btn" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button
                className="btn primary"
                onClick={save}
                disabled={!editing.account_name?.trim()}
              >
                Save
              </button>
            </>
          }
        >
          <div className="field">
            <label>Account Name</label>
            <input
              autoFocus
              value={editing.account_name ?? ""}
              onChange={(e) => setEditing({ ...editing, account_name: e.target.value })}
              placeholder="e.g. Juan dela Cruz / ABC Trading"
            />
          </div>

          <div className="field">
            <label>Bank</label>
            <select
              value={editing.bank_id ?? ""}
              onChange={(e) =>
                setEditing({ ...editing, bank_id: e.target.value ? Number(e.target.value) : null })
              }
            >
              <option value="">— Select bank —</option>
              {(banks ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.short_name} — {b.name}
                </option>
              ))}
            </select>
            <div className="row" style={{ marginTop: 8 }}>
              <input
                placeholder="Add another bank…"
                value={newBankName}
                onChange={(e) => setNewBankName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addBank())}
              />
              <button
                type="button"
                className="btn"
                style={{ flex: "0 0 auto" }}
                onClick={addBank}
                disabled={!newBankName.trim()}
              >
                Add Bank
              </button>
            </div>
          </div>

          <div className="row">
            <div className="field">
              <label>Account Number</label>
              <input
                value={editing.account_number ?? ""}
                onChange={(e) => setEditing({ ...editing, account_number: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Branch</label>
              <input
                value={editing.branch ?? ""}
                onChange={(e) => setEditing({ ...editing, branch: e.target.value })}
              />
            </div>
          </div>

          <div className="field">
            <label>Currency</label>
            <select
              value={editing.currency ?? "PHP"}
              onChange={(e) => setEditing({ ...editing, currency: e.target.value })}
            >
              <option value="PHP">PHP — Philippine Peso</option>
              <option value="USD">USD — US Dollar</option>
              <option value="EUR">EUR — Euro</option>
            </select>
          </div>

          <div className="field">
            <label>Default Cheque Template</label>
            <select
              value={editing.default_template_id ?? ""}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  default_template_id: e.target.value ? Number(e.target.value) : null,
                })
              }
            >
              <option value="">— None —</option>
              {(templates ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </Modal>
      )}
    </>
  );
}
