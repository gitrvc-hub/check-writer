import { useNavigate } from "react-router-dom";
import { useAsync } from "../hooks";
import { deleteTemplate, listBanks, listTemplates, upsertTemplate } from "../db/repos";
import type { Template } from "../db/types";
import { DEFAULT_CHEQUE_HEIGHT_MM, DEFAULT_CHEQUE_WIDTH_MM } from "../lib/checkFields";
import { LAYOUT_PRESETS, applyPreset } from "../lib/presets";
import { formatDate } from "../lib/format";

export default function Templates() {
  const { data: templates, reload } = useAsync(listTemplates, []);
  const { data: banks } = useAsync(listBanks, []);
  const navigate = useNavigate();

  async function createNew() {
    // Start new templates from the standard PH layout so the fields land in
    // roughly the right places before the user attaches a scan.
    const id = await upsertTemplate({
      name: "New Template",
      width_mm: DEFAULT_CHEQUE_WIDTH_MM,
      height_mm: DEFAULT_CHEQUE_HEIGHT_MM,
      fields: applyPreset(LAYOUT_PRESETS[0], DEFAULT_CHEQUE_WIDTH_MM, DEFAULT_CHEQUE_HEIGHT_MM),
    });
    navigate(`/templates/${id}`);
  }

  async function remove(t: Template) {
    if (confirm(`Delete template "${t.name}"?`)) {
      await deleteTemplate(t.id);
      reload();
    }
  }

  const bankName = (id: number | null) =>
    banks?.find((b) => b.id === id)?.short_name ?? "Any bank";

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Cheque Templates</h1>
          <p>Define where each field prints for a given bank's cheque layout.</p>
        </div>
        <button className="btn primary" onClick={createNew}>
          + New Template
        </button>
      </div>

      <div className="card">
        {(templates ?? []).length === 0 ? (
          <div className="empty">
            <div className="big">▭</div>
            No templates yet. Create one and drag the fields onto a scan of your cheque.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Bank</th>
                <th>Size</th>
                <th>Fields</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(templates ?? []).map((t) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 600 }}>{t.name}</td>
                  <td>{bankName(t.bank_id)}</td>
                  <td className="muted mono">
                    {t.width_mm}×{t.height_mm}mm
                  </td>
                  <td className="muted">
                    {(t.fields ?? []).filter((f) => f.enabled).length} enabled
                  </td>
                  <td className="muted">{formatDate(t.created_at)}</td>
                  <td className="text-right">
                    <button className="btn btn-sm" onClick={() => navigate(`/templates/${t.id}`)}>
                      Open Editor
                    </button>{" "}
                    <button className="btn btn-sm danger" onClick={() => remove(t)}>
                      Delete
                    </button>
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
