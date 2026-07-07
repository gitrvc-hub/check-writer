// SQLite connection singleton. Migrations run on the Rust side at startup
// (see src-tauri/src/lib.rs), so here we just load the pre-migrated database.

import Database from "@tauri-apps/plugin-sql";

const DB_URL = "sqlite:checkwriter.db";

let dbPromise: Promise<Database> | null = null;

export function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = Database.load(DB_URL);
  }
  return dbPromise;
}
