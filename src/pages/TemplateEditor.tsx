import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { open } from "@tauri-apps/plugin-dialog";
import { getTemplate, listBanks, upsertTemplate } from "../db/repos";
import type { Template, TemplateField } from "../db/types";
import { useAsync } from "../hooks";
import { DATE_FORMATS, normalizeFields } from "../lib/checkFields";
import { LAYOUT_PRESETS, applyPreset } from "../lib/presets";
import ChequePreview from "../components/ChequePreview";
import { SAMPLE_DATA, resolveFields } from "../lib/render";
import { renderChequePdf } from "../lib/pdf";
import { openPdfForPrint } from "../lib/output";

export default function TemplateEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: banks } = useAsync(listBanks, []);

  const [tpl, setTpl] = useState<Template | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    if (!id) return;
    getTemplate(Number(id)).then((t) => {
      if (t) setTpl({ ...t, fields: normalizeFields(t.fields ?? []) });
    });
  }, [id]);

  const values = useMemo(
    () => (tpl ? { ...resolveFields(tpl.fields!, SAMPLE_DATA) } : {}),
    [tpl],
  );

  if (!tpl) return <div className="empty">Loading template…</div>;

  function patch(p: Partial<Template>) {
    setTpl((t) => (t ? { ...t, ...p } : t));
    setSaved(false);
  }

  function patchField(key: string, p: Partial<TemplateField>) {
    setTpl((t) =>
      t
        ? { ...t, fields: t.fields!.map((f) => (f.key === key ? { ...f, ...p } : f)) }
        : t,
    );
    setSaved(false);
  }

  function applyLayoutPreset(presetId: string) {
    const preset = LAYOUT_PRESETS.find((p) => p.id === presetId);
    if (!preset || !tpl) return;
    if (
      !confirm(
        `Apply the "${preset.name}" layout? This repositions all fields to the standard ` +
          `positions for the current template size. Your background scan is kept.`,
      )
    )
      return;
    patch({ fields: applyPreset(preset, tpl.width_mm, tpl.height_mm) });
  }

  async function pickBackground() {
    const file = await open({
      multiple: false,
      filters: [{ name: "Image", extensions: ["png", "jpg", "jpeg"] }],
    });
    if (typeof file === "string") patch({ background_path: file });
  }

  async function save() {
    const newId = await upsertTemplate(tpl!);
    setSaved(true);
    if (!id || Number(id) !== newId) navigate(`/templates/${newId}`, { replace: true });
  }

  async function testPrint() {
    await save();
    const bytes = await renderChequePdf(tpl!, { ...values, __crossed: "0" });
    await openPdfForPrint(bytes, `${tpl!.name || "template"}_test.pdf`);
  }

  const field = tpl.fields!.find((f) => f.key === selected) ?? null;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Template Editor</h1>
          <p>Drag fields onto your cheque. Use a scan/photo as a background guide.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn" onClick={() => navigate("/templates")}>
            ← Back
          </button>
          <button className="btn" onClick={testPrint}>
            Test Print
          </button>
          <button className="btn primary" onClick={save} disabled={saved}>
            {saved ? "Saved" : "Save Template"}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="row">
          <div className="field">
            <label>Template Name</label>
            <input value={tpl.name} onChange={(e) => patch({ name: e.target.value })} />
          </div>
          <div className="field">
            <label>Bank</label>
            <select
              value={tpl.bank_id ?? ""}
              onChange={(e) =>
                patch({ bank_id: e.target.value ? Number(e.target.value) : null })
              }
            >
              <option value="">Any bank</option>
              {(banks ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.short_name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Width (mm)</label>
            <input
              type="number"
              value={tpl.width_mm}
              onChange={(e) => patch({ width_mm: Number(e.target.value) })}
            />
          </div>
          <div className="field">
            <label>Height (mm)</label>
            <input
              type="number"
              value={tpl.height_mm}
              onChange={(e) => patch({ height_mm: Number(e.target.value) })}
            />
          </div>
        </div>
        <div className="row">
          <div className="field" style={{ flex: 2 }}>
            <label>Background scan (optional guide — not printed on real cheques)</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input readOnly value={tpl.background_path || ""} placeholder="No image selected" />
              <button className="btn" style={{ flex: "0 0 auto" }} onClick={pickBackground}>
                Choose Image
              </button>
              {tpl.background_path && (
                <button
                  className="btn"
                  style={{ flex: "0 0 auto" }}
                  onClick={() => patch({ background_path: "" })}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <div className="field">
            <label>Print offset X (mm)</label>
            <input
              type="number"
              step="0.5"
              value={tpl.offset_x_mm}
              onChange={(e) => patch({ offset_x_mm: Number(e.target.value) })}
            />
          </div>
          <div className="field">
            <label>Print offset Y (mm)</label>
            <input
              type="number"
              step="0.5"
              value={tpl.offset_y_mm}
              onChange={(e) => patch({ offset_y_mm: Number(e.target.value) })}
            />
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 18, alignItems: "start" }}>
        <div className="card" style={{ overflowX: "auto" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <h2 style={{ margin: 0 }}>Layout — drag to position</h2>
            <div style={{ display: "flex", gap: 8 }}>
              {LAYOUT_PRESETS.map((p) => (
                <button
                  key={p.id}
                  className="btn btn-sm"
                  onClick={() => applyLayoutPreset(p.id)}
                  title="Reset all field positions to this standard layout"
                >
                  Apply “{p.name}”
                </button>
              ))}
            </div>
          </div>
          <ChequePreview
            template={tpl}
            values={values}
            editable
            showGuides
            selectedKey={selected}
            onSelect={setSelected}
            onChangeField={patchField}
          />
          <div className="hint" style={{ marginTop: 10 }}>
            Grid = 10mm. Click a field to edit its font & alignment on the right.
          </div>
        </div>

        <div className="card">
          <h2>Fields</h2>
          {tpl.fields!.map((f) => (
            <div
              key={f.key}
              className="checkbox"
              style={{
                justifyContent: "space-between",
                padding: "6px 8px",
                borderRadius: 6,
                background: selected === f.key ? "var(--primary-soft)" : "transparent",
                cursor: "pointer",
              }}
              onClick={() => setSelected(f.key)}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={f.enabled}
                  onChange={(e) => patchField(f.key, { enabled: e.target.checked })}
                  onClick={(e) => e.stopPropagation()}
                />
                {f.label}
              </span>
            </div>
          ))}

          {field && (
            <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
              <h2>{field.label}</h2>
              <div className="row">
                <div className="field">
                  <label>X (mm)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={round(field.x_mm)}
                    onChange={(e) => patchField(field.key, { x_mm: Number(e.target.value) })}
                  />
                </div>
                <div className="field">
                  <label>Y (mm)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={round(field.y_mm)}
                    onChange={(e) => patchField(field.key, { y_mm: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="row">
                <div className="field">
                  <label>Width (mm)</label>
                  <input
                    type="number"
                    step="1"
                    value={round(field.width_mm)}
                    onChange={(e) => patchField(field.key, { width_mm: Number(e.target.value) })}
                  />
                </div>
                <div className="field">
                  <label>Font (pt)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={field.font_size_pt}
                    onChange={(e) =>
                      patchField(field.key, { font_size_pt: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
              <div className="field">
                <label>Alignment</label>
                <select
                  value={field.align}
                  onChange={(e) =>
                    patchField(field.key, { align: e.target.value as TemplateField["align"] })
                  }
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
              <div className="field">
                <label>Letter spacing (pt) — for boxed digits</label>
                <input
                  type="number"
                  step="0.5"
                  value={field.letter_spacing}
                  onChange={(e) =>
                    patchField(field.key, { letter_spacing: Number(e.target.value) })
                  }
                />
              </div>
              {field.key === "date" && (
                <div className="field">
                  <label>Date format</label>
                  <select
                    value={field.format || "MM/dd/yyyy"}
                    onChange={(e) => patchField(field.key, { format: e.target.value })}
                  >
                    {DATE_FORMATS.map((d) => (
                      <option key={d.pattern} value={d.pattern}>
                        {d.label} ({d.example})
                      </option>
                    ))}
                  </select>
                  <div className="hint">
                    "Boxed digits" prints only the numbers so they land in the pre-printed
                    date boxes — tune letter spacing to line them up.
                  </div>
                </div>
              )}
              <div className="checkbox" style={{ marginBottom: 8 }}>
                <input
                  type="checkbox"
                  checked={field.bold}
                  onChange={(e) => patchField(field.key, { bold: e.target.checked })}
                />
                <label style={{ margin: 0 }}>Bold</label>
              </div>
              <div className="checkbox">
                <input
                  type="checkbox"
                  checked={field.uppercase}
                  onChange={(e) => patchField(field.key, { uppercase: e.target.checked })}
                />
                <label style={{ margin: 0 }}>Uppercase</label>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
