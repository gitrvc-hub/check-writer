# Check Writer

A cross-platform (Windows / macOS) desktop **check/cheque writer** for Philippine bank
cheques, in the spirit of Chrysanth Cheque Writer. Built with **Tauri 2 + React +
TypeScript**, with local **SQLite** storage and pixel-precise **PDF** printing.

## Features

- **Write cheques** with a live, to-scale preview.
- **Automatic amount-in-words** in Philippine peso style
  (e.g. `ONE THOUSAND TWO HUNDRED THIRTY FOUR PESOS AND 50/100 ONLY`).
- **Drag-to-position template editor** — load a scan/photo of your bank's cheque as a
  guide and drag each field (date, payee, amount in figures, amount in words, memo,
  signature) to the exact spot. Per-field font size, bold, alignment, letter spacing
  (for boxed date digits), and uppercase.
- **Precise printing** — generates a PDF sized to the cheque (mm-accurate) and opens it
  in your system PDF viewer to print at 100% onto the pre-printed cheque. A global
  X/Y **print offset** lets you nudge alignment per template.
- **Payees** and **bank accounts** (14 common PH banks pre-loaded: BDO, BPI, Metrobank,
  Landbank, PNB, Security Bank, UnionBank, RCBC, China Bank, and more).
- **Cheque register** — searchable history with void, reprint, and running cheque
  numbers that auto-increment.
- **Reports** — totals by account / month / payee, plus CSV export.
- **Crossed (A/C Payee only)** and **bearer** cheque options.

## Tech stack

| Layer      | Choice                                             |
| ---------- | -------------------------------------------------- |
| Shell      | Tauri 2 (Rust)                                      |
| UI         | React 19 + TypeScript + Vite                       |
| Storage    | SQLite via `tauri-plugin-sql` (migrations in Rust) |
| Printing   | `pdf-lib` → PDF → system viewer                    |
| Drag/resize| `react-rnd`                                        |

## Project layout

```
src/
  db/            SQLite connection, typed repositories, domain types
  lib/           amountToWords, formatting, units, field defaults, PDF render, output
  components/    ChequePreview (shared preview + editable canvas), Modal
  pages/         Dashboard, WriteCheque, Register, Reports, Payees, Accounts,
                 Templates, TemplateEditor
src-tauri/
  src/lib.rs     Plugin registration + SQLite migrations (append-only)
```

## Development

```bash
pnpm install
pnpm tauri dev      # run the desktop app
pnpm test           # unit tests (amount-in-words engine)
pnpm build          # typecheck + build the web bundle
pnpm tauri build    # produce distributable installers
```

## How printing works

Real cheques are pre-printed stock; you only overlay the variable text. The template
editor's background scan is a **guide only** and is not printed by default. When you
print, the app renders just the field text at the coordinates you set. Use **Test Print**
in the editor on plain paper, hold it against a real cheque, and adjust the field
positions or the global print offset until it lines up.
