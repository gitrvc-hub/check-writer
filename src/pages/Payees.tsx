import { useState } from "react";
import { useAsync } from "../hooks";
import { deletePayee, listPayees, upsertPayee } from "../db/repos";
import type { Payee } from "../db/types";
import { formatDate } from "../lib/format";
import Modal from "../components/Modal";

export default function Payees() {
  const { data: payees, reload } = useAsync(listPayees, []);
  const [editing, setEditing] = useState<Partial<Payee> | null>(null);
  const [search, setSearch] = useState("");

  const filtered = (payees ?? []).filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  async function save() {
    if (!editing?.name?.trim()) return;
    await upsertPayee(editing);
    setEditing(null);
    reload();
  }

  async function remove(p: Payee) {
    if (confirm(`Delete payee "${p.name}"? Existing cheques keep the recorded name.`)) {
      await deletePayee(p.id);
      reload();
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Payees</h1>
          <p>People and companies you write cheques to.</p>
        </div>
        <button className="btn primary" onClick={() => setEditing({ name: "", notes: "" })}>
          + New Payee
        </button>
      </div>

      <div className="card">
        <div className="toolbar">
          <input
            placeholder="Search payees…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 280 }}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="empty">
            <div className="big">☺</div>
            No payees yet. Add one to speed up cheque writing.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Notes</th>
                <th>Added</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td className="muted">{p.notes || "—"}</td>
                  <td className="muted">{formatDate(p.created_at)}</td>
                  <td className="text-right">
                    <button className="btn btn-sm" onClick={() => setEditing(p)}>
                      Edit
                    </button>{" "}
                    <button className="btn btn-sm danger" onClick={() => remove(p)}>
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
          title={editing.id ? "Edit Payee" : "New Payee"}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button className="btn" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button className="btn primary" onClick={save} disabled={!editing.name?.trim()}>
                Save
              </button>
            </>
          }
        >
          <div className="field">
            <label>Name</label>
            <input
              autoFocus
              value={editing.name ?? ""}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              placeholder="e.g. Meralco, Juan dela Cruz"
            />
          </div>
          <div className="field">
            <label>Notes</label>
            <textarea
              rows={3}
              value={editing.notes ?? ""}
              onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
              placeholder="Optional — account no., reference, etc."
            />
          </div>
        </Modal>
      )}
    </>
  );
}
