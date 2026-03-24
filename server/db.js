const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_name TEXT NOT NULL,
    name TEXT NOT NULL,
    student_id TEXT UNIQUE NOT NULL,
    group_id INTEGER NOT NULL CHECK(group_id BETWEEN 1 AND 4),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    current_round INTEGER DEFAULT 1,
    status TEXT DEFAULT 'active',
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id)
  );

  CREATE TABLE IF NOT EXISTS writings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    round INTEGER NOT NULL,
    ai_paragraph TEXT,
    student_text TEXT,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    submitted_at DATETIME,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
  );

  CREATE TABLE IF NOT EXISTS keystrokes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    writing_id INTEGER NOT NULL,
    key_data TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (writing_id) REFERENCES writings(id)
  );

  CREATE TABLE IF NOT EXISTS hover_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    writing_id INTEGER NOT NULL,
    word TEXT NOT NULL,
    hover_duration_ms INTEGER DEFAULT 0,
    hover_count INTEGER DEFAULT 0,
    round INTEGER NOT NULL,
    FOREIGN KEY (writing_id) REFERENCES writings(id)
  );
`);

module.exports = db;
