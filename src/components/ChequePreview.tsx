import { CSSProperties, PointerEvent as ReactPointerEvent, useRef } from "react";
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

const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);
const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Renders a cheque to scale. In read-only mode it's a faithful preview; in
 * editable mode each field becomes draggable/resizable (via native pointer
 * events — no third-party drag lib, so it stays React 19 compatible).
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

  const bgUrl = template.background_path ? convertFileSrc(template.background_path) : null;

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
          const text = values[f.key] ?? "";
          if (!editable) {
            return (
              <div
                key={f.key}
                style={{
                  position: "absolute",
                  left: f.x_mm * scale,
                  top: f.y_mm * scale,
                  width: f.width_mm * scale,
                  ...fieldTextStyle(f),
                }}
              >
                {text}
              </div>
            );
          }
          return (
            <DraggableField
              key={f.key}
              field={f}
              scale={scale}
              selected={selectedKey === f.key}
              text={text}
              textStyle={fieldTextStyle(f)}
              containerWidthMm={template.width_mm}
              containerHeightMm={template.height_mm}
              onSelect={() => onSelect?.(f.key)}
              onChange={(patch) => onChangeField?.(f.key, patch)}
            />
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

type DragMode = "move" | "left" | "right";

interface DragState {
  mode: DragMode;
  startX: number;
  startY: number;
  x0: number;
  y0: number;
  w0: number;
}

interface DraggableFieldProps {
  field: TemplateField;
  scale: number;
  selected: boolean;
  text: string;
  textStyle: CSSProperties;
  containerWidthMm: number;
  containerHeightMm: number;
  onSelect: () => void;
  onChange: (patch: Partial<TemplateField>) => void;
}

/** A single field the user can drag to move or drag the edges to resize. */
function DraggableField({
  field,
  scale,
  selected,
  text,
  textStyle,
  containerWidthMm,
  containerHeightMm,
  onSelect,
  onChange,
}: DraggableFieldProps) {
  const drag = useRef<DragState | null>(null);

  function start(e: ReactPointerEvent, mode: DragMode) {
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      x0: field.x_mm,
      y0: field.y_mm,
      w0: field.width_mm,
    };
  }

  function move(e: ReactPointerEvent) {
    const s = drag.current;
    if (!s) return;
    const dx = (e.clientX - s.startX) / scale;
    const dy = (e.clientY - s.startY) / scale;
    if (s.mode === "move") {
      onChange({
        x_mm: round1(clamp(s.x0 + dx, 0, containerWidthMm - 2)),
        y_mm: round1(clamp(s.y0 + dy, 0, containerHeightMm - 2)),
      });
    } else if (s.mode === "right") {
      onChange({ width_mm: round1(Math.max(5, s.w0 + dx)) });
    } else {
      // left edge: move x and inversely adjust width
      const newX = clamp(s.x0 + dx, 0, s.x0 + s.w0 - 5);
      onChange({ x_mm: round1(newX), width_mm: round1(s.w0 + (s.x0 - newX)) });
    }
  }

  function end(e: ReactPointerEvent) {
    drag.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* pointer already released */
    }
  }

  const height = Math.max(field.font_size_pt * PT_TO_MM_FONT * scale * 1.4, 14);
  const handle = (side: "left" | "right"): CSSProperties => ({
    position: "absolute",
    top: 0,
    bottom: 0,
    [side]: -3,
    width: 7,
    cursor: "ew-resize",
    background: selected ? "rgba(29,78,216,0.35)" : "transparent",
  });

  return (
    <div
      onPointerDown={(e) => start(e, "move")}
      onPointerMove={move}
      onPointerUp={end}
      style={{
        position: "absolute",
        left: field.x_mm * scale,
        top: field.y_mm * scale,
        width: field.width_mm * scale,
        height,
        boxSizing: "border-box",
        border: selected ? "1.5px solid var(--primary)" : "1px dashed #94a3b8",
        background: selected ? "rgba(29,78,216,0.06)" : "rgba(148,163,184,0.05)",
        cursor: "move",
        display: "flex",
        alignItems: "center",
        touchAction: "none",
      }}
    >
      <div style={{ width: "100%", pointerEvents: "none", ...textStyle }}>
        {text || field.label}
      </div>
      <div onPointerDown={(e) => start(e, "left")} style={handle("left")} />
      <div onPointerDown={(e) => start(e, "right")} style={handle("right")} />
    </div>
  );
}
