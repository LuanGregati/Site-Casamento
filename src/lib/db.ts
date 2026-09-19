import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";

function getPostgresUrl(): string | undefined {
  // Vercel Neon com prefixo custom cria STORAGE_DATABASE_URL, senão DATABASE_URL/POSTGRES_URL
  const env = process.env as Record<string, string | undefined>;
  // procura qualquer var terminada em DATABASE_URL ou POSTGRES_URL (casa com STORAGE_*, NEON_*, etc)
  for (const k of Object.keys(env)) {
    if (k.endsWith("DATABASE_URL") || k.endsWith("POSTGRES_URL")) {
      const v = env[k];
      if (v && v.startsWith("postgres")) return v;
    }
  }
  return env.DATABASE_URL || env.POSTGRES_URL;
}

const isPostgres = !!getPostgresUrl();

// ---------- Postgres helpers ----------
let pgSql: ReturnType<typeof neon> | null = null;
function pg(): ReturnType<typeof neon> {
  if (pgSql) return pgSql;
  const url = getPostgresUrl()!;
  pgSql = neon(url);
  return pgSql;
}

let pgReady: Promise<void> | null = null;
async function ensurePg() {
  if (pgReady) return pgReady;
  pgReady = (async () => {
    const sql = pg();
    await sql`
      CREATE TABLE IF NOT EXISTS guests (
        phone TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        companions TEXT NOT NULL DEFAULT '[]',
        status TEXT NOT NULL DEFAULT 'VOU',
        role TEXT NOT NULL DEFAULT 'convidado',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS gifts (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        emoji TEXT NOT NULL DEFAULT '🎁',
        image TEXT NOT NULL DEFAULT '',
        price_cents INTEGER NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS claims (
        id SERIAL PRIMARY KEY,
        gift_id INTEGER NOT NULL REFERENCES gifts(id),
        guest_phone TEXT NOT NULL,
        guest_name TEXT NOT NULL,
        value_cents INTEGER NOT NULL,
        created_at TEXT NOT NULL
      )
    `;
    // migração image se tabela antiga sem coluna
    try {
      await sql`ALTER TABLE gifts ADD COLUMN IF NOT EXISTS image TEXT DEFAULT ''`;
    } catch {}
    const rows = (await sql`SELECT COUNT(*)::int AS n FROM gifts`) as { n: number }[];
    if (rows[0]?.n === 0) {
      const now = new Date().toISOString();
      const defaults: [string, string, number][] = [
        ["Geladeira", "🧊", 200000],
        ["Air Fryer", "🍟", 60000],
        ["Smart TV", "📺", 250000],
        ["Jogo de Panelas", "🍳", 30000],
        ["Lua de Mel", "✈️", 500000],
        ["Jantar Romântico", "🍷", 40000],
      ];
      for (const [name, emoji, price] of defaults) {
        await sql`INSERT INTO gifts (name, emoji, price_cents, active, created_at) VALUES (${name}, ${emoji}, ${price}, 1, ${now})`;
      }
    }
  })();
  return pgReady;
}

// ---------- SQLite helpers ----------
let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (isPostgres) throw new Error("getDb() não funciona em Postgres, use funções async");
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
  try {
    db.exec("ALTER TABLE gifts ADD COLUMN image TEXT DEFAULT ''");
  } catch {}
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

// ---------- API unificada (async, funciona nos dois) ----------
export function isPostgresMode(): boolean {
  return isPostgres;
}

export async function findGuest(phone: string): Promise<GuestRow | null> {
  if (isPostgres) {
    await ensurePg();
    const rows = (await pg()`SELECT * FROM guests WHERE phone = ${phone} LIMIT 1`) as GuestRow[];
    return rows[0] || null;
  }
  const row = getDb().prepare("SELECT * FROM guests WHERE phone = ?").get(phone) as GuestRow | undefined;
  return row || null;
}

export async function listGuests(): Promise<GuestRow[]> {
  if (isPostgres) {
    await ensurePg();
    return (await pg()`SELECT * FROM guests ORDER BY created_at DESC`) as GuestRow[];
  }
  return getDb().prepare("SELECT * FROM guests ORDER BY created_at DESC").all() as GuestRow[];
}

export async function upsertGuest(phone: string, name: string, companionsJson: string, status: string) {
  const now = new Date().toISOString();
  if (isPostgres) {
    await ensurePg();
    const sql = pg();
    // tenta update, se não achar faz insert - evita ON CONFLICT com subselect que o neon não gosta
    const existing = (await sql`SELECT phone, role FROM guests WHERE phone = ${phone} LIMIT 1`) as {
      phone: string;
      role: string;
    }[];
    if (existing.length > 0) {
      await sql`UPDATE guests SET name = ${name}, companions = ${companionsJson}, status = ${status}, updated_at = ${now} WHERE phone = ${phone}`;
    } else {
      await sql`INSERT INTO guests (phone, name, companions, status, role, created_at, updated_at) VALUES (${phone}, ${name}, ${companionsJson}, ${status}, 'convidado', ${now}, ${now})`;
    }
    return;
  }
  getDb().prepare(
    `INSERT INTO guests (phone, name, companions, status, role, created_at, updated_at)
     VALUES (?, ?, ?, ?, COALESCE((SELECT role FROM guests WHERE phone = ?), 'convidado'), ?, ?)
     ON CONFLICT(phone) DO UPDATE SET name = excluded.name, companions = excluded.companions, status = excluded.status, updated_at = excluded.updated_at`
  ).run(phone, name, companionsJson, status, phone, now, now);
}

export async function deleteGuest(phone: string) {
  if (isPostgres) {
    await ensurePg();
    const sql = pg();
    await sql`DELETE FROM claims WHERE guest_phone = ${phone}`;
    await sql`DELETE FROM guests WHERE phone = ${phone}`;
    return;
  }
  const db = getDb();
  db.prepare("DELETE FROM claims WHERE guest_phone = ?").run(phone);
  db.prepare("DELETE FROM guests WHERE phone = ?").run(phone);
}

export async function updateGuestRole(phone: string, role: string) {
  const now = new Date().toISOString();
  if (isPostgres) {
    await ensurePg();
    await pg()`UPDATE guests SET role = ${role}, updated_at = ${now} WHERE phone = ${phone}`;
    return;
  }
  getDb().prepare("UPDATE guests SET role = ?, updated_at = ? WHERE phone = ?").run(role, now, phone);
}

export async function listGifts(activeOnly: boolean): Promise<GiftRow[]> {
  if (isPostgres) {
    await ensurePg();
    if (activeOnly) {
      return (await pg()`SELECT * FROM gifts WHERE active = 1 ORDER BY price_cents ASC`) as GiftRow[];
    }
    return (await pg()`SELECT * FROM gifts ORDER BY active DESC, price_cents ASC`) as GiftRow[];
  }
  const db = getDb();
  if (activeOnly) return db.prepare("SELECT * FROM gifts WHERE active = 1 ORDER BY price_cents ASC").all() as GiftRow[];
  return db.prepare("SELECT * FROM gifts ORDER BY active DESC, price_cents ASC").all() as GiftRow[];
}

export async function getGift(id: number): Promise<GiftRow | null> {
  if (isPostgres) {
    await ensurePg();
    const rows = (await pg()`SELECT * FROM gifts WHERE id = ${id} LIMIT 1`) as GiftRow[];
    return rows[0] || null;
  }
  const row = getDb().prepare("SELECT * FROM gifts WHERE id = ?").get(id) as GiftRow | undefined;
  return row || null;
}

export async function getActiveGift(id: number): Promise<GiftRow | null> {
  if (isPostgres) {
    await ensurePg();
    const rows = (await pg()`SELECT * FROM gifts WHERE id = ${id} AND active = 1 LIMIT 1`) as GiftRow[];
    return rows[0] || null;
  }
  const row = getDb().prepare("SELECT * FROM gifts WHERE id = ? AND active = 1").get(id) as GiftRow | undefined;
  return row || null;
}

export async function createGift(name: string, emoji: string, image: string, price_cents: number, active: number): Promise<number> {
  const now = new Date().toISOString();
  if (isPostgres) {
    await ensurePg();
    const rows = (await pg()`INSERT INTO gifts (name, emoji, image, price_cents, active, created_at) VALUES (${name}, ${emoji}, ${image}, ${price_cents}, ${active}, ${now}) RETURNING id`) as { id: number }[];
    return rows[0].id;
  }
  const r = getDb().prepare("INSERT INTO gifts (name, emoji, image, price_cents, active, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(name, emoji, image, price_cents, active, now);
  return Number(r.lastInsertRowid);
}

export async function updateGift(id: number, name: string, emoji: string, image: string, price_cents: number, active: number) {
  if (isPostgres) {
    await ensurePg();
    await pg()`UPDATE gifts SET name = ${name}, emoji = ${emoji}, image = ${image}, price_cents = ${price_cents}, active = ${active} WHERE id = ${id}`;
    return;
  }
  getDb().prepare("UPDATE gifts SET name = ?, emoji = ?, image = ?, price_cents = ?, active = ? WHERE id = ?").run(name, emoji, image, price_cents, active, Number(id));
}

export async function deleteGift(id: number) {
  if (isPostgres) {
    await ensurePg();
    await pg()`DELETE FROM gifts WHERE id = ${id}`;
    return;
  }
  getDb().prepare("DELETE FROM gifts WHERE id = ?").run(id);
}

export async function createClaim(gift_id: number, guest_phone: string, guest_name: string, value_cents: number) {
  const now = new Date().toISOString();
  if (isPostgres) {
    await ensurePg();
    await pg()`INSERT INTO claims (gift_id, guest_phone, guest_name, value_cents, created_at) VALUES (${gift_id}, ${guest_phone}, ${guest_name}, ${value_cents}, ${now})`;
    return;
  }
  getDb().prepare("INSERT INTO claims (gift_id, guest_phone, guest_name, value_cents, created_at) VALUES (?, ?, ?, ?, ?)").run(gift_id, guest_phone, guest_name, value_cents, now);
}

export async function listClaimsWithGift(): Promise<(ClaimRow & { gift_name: string; gift_emoji: string })[]> {
  if (isPostgres) {
    await ensurePg();
    return (await pg()`SELECT c.*, g.name AS gift_name, g.emoji AS gift_emoji FROM claims c JOIN gifts g ON g.id = c.gift_id ORDER BY c.created_at DESC`) as any[];
  }
  return getDb().prepare(`SELECT c.*, g.name AS gift_name, g.emoji AS gift_emoji FROM claims c JOIN gifts g ON g.id = c.gift_id ORDER BY c.created_at DESC`).all() as any[];
}
