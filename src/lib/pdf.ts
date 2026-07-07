// Renders a cheque to a print-ready PDF using pdf-lib. Coordinates are in
// millimetres from the cheque's top-left corner; pdf-lib uses a bottom-left
// origin, so we flip the Y axis when drawing.

import { PDFDocument, PDFFont, StandardFonts, rgb } from "pdf-lib";
import { readFile } from "@tauri-apps/plugin-fs";
import type { Template, TemplateField } from "../db/types";
import { PT_PER_MM, PT_TO_MM_FONT } from "./units";

export interface RenderOptions {
  /** Draw the background image behind the text (plain-paper test print). */
  includeBackground?: boolean;
}

const BLACK = rgb(0.05, 0.05, 0.05);

export async function renderChequePdf(
  template: Pick<
    Template,
    "width_mm" | "height_mm" | "offset_x_mm" | "offset_y_mm" | "background_path"
  > & { fields?: TemplateField[] },
  values: Record<string, string>,
  opts: RenderOptions = {},
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const pageW = template.width_mm * PT_PER_MM;
  const pageH = template.height_mm * PT_PER_MM;
  const page = doc.addPage([pageW, pageH]);

  const regular = await doc.embedFont(StandardFonts.Courier);
  const bold = await doc.embedFont(StandardFonts.CourierBold);

  if (opts.includeBackground && template.background_path) {
    await drawBackground(doc, page, template.background_path, pageW, pageH);
  }

  const offX = template.offset_x_mm * PT_PER_MM;
  const offY = template.offset_y_mm * PT_PER_MM;

  for (const f of template.fields ?? []) {
    if (!f.enabled) continue;
    const text = values[f.key];
    if (!text) continue;

    const font = f.bold ? bold : regular;
    const size = f.font_size_pt * PT_TO_MM_FONT * PT_PER_MM; // physical pt
    const boxLeft = f.x_mm * PT_PER_MM + offX;
    const boxWidth = f.width_mm * PT_PER_MM;
    // Baseline: place text top near y_mm, drop by ~0.8em to the baseline.
    const baseline = pageH - (f.y_mm * PT_PER_MM + offY) - size * 0.8;
    const spacing = f.letter_spacing * PT_TO_MM_FONT * PT_PER_MM;

    drawField(page, text, {
      font,
      size,
      color: BLACK,
      boxLeft,
      boxWidth,
      baseline,
      align: f.align,
      spacing,
    });
  }

  return doc.save();
}

interface DrawArgs {
  font: PDFFont;
  size: number;
  color: ReturnType<typeof rgb>;
  boxLeft: number;
  boxWidth: number;
  baseline: number;
  align: "left" | "center" | "right";
  spacing: number;
}

function textWidth(font: PDFFont, text: string, size: number, spacing: number): number {
  const base = font.widthOfTextAtSize(text, size);
  return base + spacing * Math.max(0, text.length - 1);
}

function drawField(page: ReturnType<PDFDocument["addPage"]>, text: string, a: DrawArgs) {
  const w = textWidth(a.font, text, a.size, a.spacing);
  let x = a.boxLeft;
  if (a.align === "center") x = a.boxLeft + (a.boxWidth - w) / 2;
  else if (a.align === "right") x = a.boxLeft + a.boxWidth - w;

  if (a.spacing <= 0.01) {
    page.drawText(text, { x, y: a.baseline, size: a.size, font: a.font, color: a.color });
    return;
  }

  // Manual letter spacing (used for boxed date digits, etc.).
  let cx = x;
  for (const ch of text) {
    page.drawText(ch, { x: cx, y: a.baseline, size: a.size, font: a.font, color: a.color });
    cx += a.font.widthOfTextAtSize(ch, a.size) + a.spacing;
  }
}

async function drawBackground(
  doc: PDFDocument,
  page: ReturnType<PDFDocument["addPage"]>,
  path: string,
  pageW: number,
  pageH: number,
) {
  try {
    const bytes = await readFile(path);
    const lower = path.toLowerCase();
    const img =
      lower.endsWith(".jpg") || lower.endsWith(".jpeg")
        ? await doc.embedJpg(bytes)
        : await doc.embedPng(bytes);
    page.drawImage(img, { x: 0, y: 0, width: pageW, height: pageH });
  } catch (e) {
    // Non-fatal: a missing/unsupported background just prints text-only.
    console.warn("Could not embed cheque background:", e);
  }
}
