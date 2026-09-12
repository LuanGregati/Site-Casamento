import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (db) return db;
  const dir = join(process.cwd(), "data");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  db = new DatabaseSync(join(dir, "wedding.db"));
  db.exec(`
    CREATE TABLE IF NOT EXISTS guests (
      phone TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      companions TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'VOU',
      role TEXT NOT NULL DEFAULT 'convidado',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS gifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      emoji TEXT NOT NULL DEFAULT '🎁',
      price_cents INTEGER NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gift_id INTEGER NOT NULL REFERENCES gifts(id),
      guest_phone TEXT NOT NULL,
      guest_name TEXT NOT NULL,
      value_cents INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  seed(db);
  // Migração: coluna de foto do presente (para bancos criados antes)
  try {
    db.exec("ALTER TABLE gifts ADD COLUMN image TEXT DEFAULT ''");
  } catch {
    // coluna já existe
  }
  return db;
}

function seed(db: DatabaseSync) {
  const row = db.prepare("SELECT COUNT(*) AS n FROM gifts").get() as { n: number };
  if (row.n > 0) return;
  const now = new Date().toISOString();
  const defaults = [
    ["Geladeira", "🧊", 200000],
    ["Air Fryer", "🍟", 60000],
    ["Smart TV", "📺", 250000],
    ["Jogo de Panelas", "🍳", 30000],
    ["Lua de Mel", "✈️", 500000],
    ["Jantar Romântico", "🍷", 40000],
  ] as const;
  const stmt = db.prepare(
    "INSERT INTO gifts (name, emoji, price_cents, active, created_at) VALUES (?, ?, ?, 1, ?)"
  );
  for (const [name, emoji, price] of defaults) stmt.run(name, emoji, price, now);
}

export type GuestRow = {
  phone: string;
  name: string;
  companions: string;
  status: string;
  role: string;
  created_at: string;
  updated_at: string;
};

export type GiftRow = {
  id: number;
  name: string;
  emoji: string;
  image: string;
  price_cents: number;
  active: number;
  created_at: string;
};

export type ClaimRow = {
  id: number;
  gift_id: number;
  guest_phone: string;
  guest_name: string;
  value_cents: number;
  created_at: string;
};

export function parseCompanions(json: string): string[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}
