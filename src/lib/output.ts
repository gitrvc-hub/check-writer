// Save / open generated PDFs. Tauri has no direct print API, so the standard
// flow is: write the PDF to a temp file and open it in the OS default viewer,
// where the user prints at 100% scale onto the pre-printed cheque.

import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { openPath } from "@tauri-apps/plugin-opener";
import { tempDir, join } from "@tauri-apps/api/path";

/** Prompt for a location and write the PDF there. Returns the path or null. */
export async function savePdf(bytes: Uint8Array, suggestedName: string): Promise<string | null> {
  const path = await save({
    defaultPath: suggestedName,
    filters: [{ name: "PDF", extensions: ["pdf"] }],
  });
  if (!path) return null;
  await writeFile(path, bytes);
  return path;
}

/** Write the PDF to a temp file and open it in the default viewer for printing. */
export async function openPdfForPrint(bytes: Uint8Array, name: string): Promise<string> {
  const dir = await tempDir();
  const safe = name.replace(/[^a-z0-9._-]+/gi, "_");
  const path = await join(dir, `checkwriter_${Date.now()}_${safe}`);
  await writeFile(path, bytes);
  await openPath(path);
  return path;
}
