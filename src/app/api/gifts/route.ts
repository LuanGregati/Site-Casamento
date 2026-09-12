import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";

function toGift(row: any) {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    image: row.image || "",
    price_cents: row.price_cents,
    active: row.active === 1,
  };
}

// Lista: pública traz só ativos; admin vê todos
export async function GET() {
  const admin = await isAdmin();
  const rows = (
    admin
      ? getDb().prepare("SELECT * FROM gifts ORDER BY active DESC, price_cents ASC").all()
      : getDb().prepare("SELECT * FROM gifts WHERE active = 1 ORDER BY price_cents ASC").all()
  ) as any[];
  return NextResponse.json({ gifts: rows.map(toGift) });
}

// Admin: criar ou editar (passando id)
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const emoji = String(body.emoji || "🎁").trim().slice(0, 8) || "🎁";
  const price_cents = Math.round(Number(body.price_reais) * 100);
  const active = body.active === false ? 0 : 1;
  const image = typeof body.image === "string" ? body.image : "";

  if (name.length < 2) return NextResponse.json({ error: "Informe o nome do presente." }, { status: 400 });
  if (!(price_cents > 0)) return NextResponse.json({ error: "Informe um valor maior que zero." }, { status: 400 });
  if (image && (!image.startsWith("data:image/") || image.length > 2000000)) {
    return NextResponse.json({ error: "Foto inválida ou muito grande." }, { status: 400 });
  }

  const db = getDb();
  const now = new Date().toISOString();
  if (body.id) {
    db.prepare("UPDATE gifts SET name = ?, emoji = ?, image = ?, price_cents = ?, active = ? WHERE id = ?").run(
      name, emoji, image, price_cents, active, Number(body.id)
    );
    return NextResponse.json({ ok: true });
  }
  const r = db.prepare("INSERT INTO gifts (name, emoji, image, price_cents, active, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
    name, emoji, image, price_cents, active, now
  );
  return NextResponse.json({ ok: true, id: Number(r.lastInsertRowid) });
}

export async function DELETE(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "id inválido." }, { status: 400 });
  getDb().prepare("DELETE FROM gifts WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
