import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_DIR = process.env.DB_DIR || '/data'
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true })
}

const db = new Database(path.join(DB_DIR, 'news.db'))

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    title_cn TEXT,
    time TEXT,
    content TEXT,
    link TEXT NOT NULL UNIQUE,
    source TEXT,
    category TEXT,
    region TEXT,
    country TEXT,
    datetime_display TEXT,
    ai_score INTEGER,
    ai_reason TEXT,
    full_content TEXT,
    summary TEXT,
    batch_id TEXT,
    created_at TEXT DEFAULT (datetime('now', '+8 hours'))
  );

  CREATE TABLE IF NOT EXISTS briefs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT CHECK(type IN ('batch','daily','weekly')) NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    date TEXT NOT NULL,
    label TEXT,
    news_id INTEGER REFERENCES news(id),
    created_at TEXT DEFAULT (datetime('now', '+8 hours'))
  );

  CREATE INDEX IF NOT EXISTS idx_news_time ON news(time);
  CREATE INDEX IF NOT EXISTS idx_news_source ON news(source);
  CREATE INDEX IF NOT EXISTS idx_news_score ON news(ai_score);
  CREATE INDEX IF NOT EXISTS idx_news_batch ON news(batch_id);
  CREATE INDEX IF NOT EXISTS idx_briefs_type_date ON briefs(type, date);
`)

// migrations for existing DBs
try { db.exec(`ALTER TABLE briefs ADD COLUMN label TEXT`); } catch {}
try { db.exec(`ALTER TABLE briefs ADD COLUMN news_id INTEGER REFERENCES news(id)`); } catch {}
try { db.exec(`ALTER TABLE news ADD COLUMN title_cn TEXT`); } catch {}
try { db.exec(`ALTER TABLE news ADD COLUMN category TEXT`); } catch {}
try { db.exec(`ALTER TABLE news ADD COLUMN region TEXT`); } catch {}
try { db.exec(`ALTER TABLE news ADD COLUMN country TEXT`); } catch {}
try { db.exec(`ALTER TABLE news ADD COLUMN datetime_display TEXT`); } catch {}
try { db.exec(`CREATE INDEX IF NOT EXISTS idx_news_category ON news(category)`); } catch {}
try { db.exec(`CREATE INDEX IF NOT EXISTS idx_news_region ON news(region)`); } catch {}
try { db.exec(`CREATE INDEX IF NOT EXISTS idx_news_country ON news(country)`); } catch {}

export default db
