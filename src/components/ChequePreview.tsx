import { CSSProperties } from "react";
import { Rnd } from "react-rnd";
import { convertFileSrc } from "@tauri-apps/api/core";
import type { Template, TemplateField } from "../db/types";
import { PREVIEW_PX_PER_MM, PT_TO_MM_FONT } from "../lib/units";

interface Props {
  template: Pick<Template, "width_mm" | "height_mm" | "background_path"> & {
    fields?: TemplateField[];
  };
  values: Record<string, string>;
  scale?: number; // px per mm
  editable?: boolean;
  selectedKey?: string | null;
  onSelect?: (key: string) => void;
  onChangeField?: (key: string, patch: Partial<TemplateField>) => void;
  showGuides?: boolean;
}

/**
 * Renders a cheque to scale. In read-only mode it's a faithful preview; in
 * editable mode each field becomes draggable/resizable for the template editor.
 */
export default function ChequePreview({
  template,
  values,
  scale = PREVIEW_PX_PER_MM,
  editable = false,
  selectedKey,
  onSelect,
  onChangeField,
  showGuides = false,
}: Props) {
  const widthPx = template.width_mm * scale;
  const heightPx = template.height_mm * scale;

  const bgUrl = template.background_path
    ? convertFileSrc(template.background_path)
    : null;

  const containerStyle: CSSProperties = {
    position: "relative",
    width: widthPx,
    height: heightPx,
    background: bgUrl ? `#fff url("${bgUrl}") center/100% 100% no-repeat` : "#fff",
    border: "1px solid var(--border-strong)",
    borderRadius: 6,
    boxShadow: "var(--shadow)",
    overflow: "hidden",
    flex: "0 0 auto",
  };

  function fieldTextStyle(f: TemplateField): CSSProperties {
    const fontPx = f.font_size_pt * PT_TO_MM_FONT * scale;
    return {
      fontSize: fontPx,
      fontWeight: f.bold ? 700 : 400,
      textAlign: f.align,
      letterSpacing: f.letter_spacing * PT_TO_MM_FONT * scale,
      lineHeight: 1.05,
      whiteSpace: "nowrap",
      overflow: "visible",
      fontFamily: '"Courier New", monospace',
      color: "#111",
      textTransform: f.uppercase ? "uppercase" : "none",
    };
  }

  return (
    <div style={containerStyle} className="cheque-preview">
      {/* Crossed-cheque diagonal lines drawn top-left when crossed */}
      {values.__crossed === "1" && (
        <div
          style={{
            position: "absolute",
            top: 4 * scale,
            left: 6 * scale,
            width: 18 * scale,
            height: 14 * scale,
            transform: "rotate(-20deg)",
            borderLeft: "2px solid #333",
            borderRight: "2px solid #333",
          }}
        />
      )}

      {(template.fields ?? [])
        .filter((f) => f.enabled)
        .map((f) => {
          const left = f.x_mm * scale;
          const top = f.y_mm * scale;
          const w = f.width_mm * scale;
          const text = values[f.key] ?? "";

          if (!editable) {
            return (
              <div
                key={f.key}
                style={{ position: "absolute", left, top, width: w, ...fieldTextStyle(f) }}
              >
                {text}
              </div>
            );
          }

          const selected = selectedKey === f.key;
          return (
            <Rnd
              key={f.key}
              size={{ width: w, height: Math.max(f.font_size_pt * PT_TO_MM_FONT * scale * 1.4, 14) }}
              position={{ x: left, y: top }}
              bounds="parent"
              enableResizing={{ left: true, right: true }}
              onDragStart={() => onSelect?.(f.key)}
              onDragStop={(_e, d) =>
                onChangeField?.(f.key, { x_mm: d.x / scale, y_mm: d.y / scale })
              }
              onResizeStop={(_e, _dir, ref, _delta, pos) =>
                onChangeField?.(f.key, {
                  width_mm: ref.offsetWidth / scale,
                  x_mm: pos.x / scale,
                  y_mm: pos.y / scale,
                })
              }
              style={{
                border: selected ? "1.5px solid var(--primary)" : "1px dashed #94a3b8",
                background: selected ? "rgba(29,78,216,0.06)" : "rgba(148,163,184,0.05)",
                cursor: "move",
                display: "flex",
                alignItems: "center",
              }}
              onMouseDown={() => onSelect?.(f.key)}
            >
              <div style={{ width: "100%", pointerEvents: "none", ...fieldTextStyle(f) }}>
                {text || f.label}
              </div>
            </Rnd>
          );
        })}

      {showGuides && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)",
            backgroundSize: `${10 * scale}px ${10 * scale}px`,
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}
