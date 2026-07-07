use tauri_plugin_sql::{Migration, MigrationKind};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

/// SQLite schema migrations for the check writer. Kept append-only: never edit a
/// migration that has shipped — add a new one instead.
fn migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create core tables",
            kind: MigrationKind::Up,
            sql: r#"
            CREATE TABLE IF NOT EXISTS banks (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                name        TEXT NOT NULL,
                short_name  TEXT NOT NULL,
                is_system   INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS accounts (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                bank_id         INTEGER REFERENCES banks(id) ON DELETE SET NULL,
                account_name    TEXT NOT NULL,
                account_number  TEXT NOT NULL DEFAULT '',
                branch          TEXT NOT NULL DEFAULT '',
                currency        TEXT NOT NULL DEFAULT 'PHP',
                default_template_id INTEGER,
                next_cheque_no  TEXT NOT NULL DEFAULT '',
                created_at      TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS payees (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                name        TEXT NOT NULL,
                notes       TEXT NOT NULL DEFAULT '',
                created_at  TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS templates (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                name            TEXT NOT NULL,
                bank_id         INTEGER REFERENCES banks(id) ON DELETE SET NULL,
                background_path TEXT NOT NULL DEFAULT '',
                width_mm        REAL NOT NULL DEFAULT 178,
                height_mm       REAL NOT NULL DEFAULT 84,
                offset_x_mm     REAL NOT NULL DEFAULT 0,
                offset_y_mm     REAL NOT NULL DEFAULT 0,
                fields_json     TEXT NOT NULL DEFAULT '[]',
                created_at      TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS cheques (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id      INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
                template_id     INTEGER REFERENCES templates(id) ON DELETE SET NULL,
                payee_id        INTEGER REFERENCES payees(id) ON DELETE SET NULL,
                payee_name      TEXT NOT NULL,
                cheque_number   TEXT NOT NULL DEFAULT '',
                cheque_date     TEXT NOT NULL,
                amount          REAL NOT NULL,
                amount_words    TEXT NOT NULL,
                memo            TEXT NOT NULL DEFAULT '',
                currency        TEXT NOT NULL DEFAULT 'PHP',
                crossed         INTEGER NOT NULL DEFAULT 0,
                bearer          INTEGER NOT NULL DEFAULT 0,
                status          TEXT NOT NULL DEFAULT 'issued',
                created_at      TEXT NOT NULL DEFAULT (datetime('now')),
                printed_at      TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_cheques_date   ON cheques(cheque_date);
            CREATE INDEX IF NOT EXISTS idx_cheques_payee  ON cheques(payee_id);
            CREATE INDEX IF NOT EXISTS idx_cheques_account ON cheques(account_id);
            "#,
        },
        Migration {
            version: 2,
            description: "seed common Philippine banks",
            kind: MigrationKind::Up,
            sql: r#"
            INSERT INTO banks (name, short_name, is_system) VALUES
                ('Banco de Oro Unibank', 'BDO', 1),
                ('Bank of the Philippine Islands', 'BPI', 1),
                ('Metropolitan Bank & Trust Company', 'Metrobank', 1),
                ('Land Bank of the Philippines', 'Landbank', 1),
                ('Philippine National Bank', 'PNB', 1),
                ('Security Bank Corporation', 'Security Bank', 1),
                ('Union Bank of the Philippines', 'UnionBank', 1),
                ('Rizal Commercial Banking Corporation', 'RCBC', 1),
                ('China Banking Corporation', 'China Bank', 1),
                ('Development Bank of the Philippines', 'DBP', 1),
                ('Philippine Savings Bank', 'PSBank', 1),
                ('EastWest Bank', 'EastWest', 1),
                ('Asia United Bank', 'AUB', 1),
                ('Robinsons Bank', 'RobinsonsBank', 1);
            "#,
        },
    ]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:checkwriter.db", migrations())
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
