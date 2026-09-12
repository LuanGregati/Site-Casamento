import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";

export const runtime = "nodejs";

// Convidado registra que pagou/enviou o presente (valor cheio, na confiança)
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const giftId = Number(body.giftId);
  const phone = normalizePhone(String(body.phone || ""));
  if (!giftId || !phone) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }
  const db = getDb();
  const gift = db.prepare("SELECT * FROM gifts WHERE id = ? AND active = 1").get(giftId) as any;
  if (!gift) return NextResponse.json({ error: "Presente não encontrado." }, { status: 404 });
  const guest = db.prepare("SELECT * FROM guests WHERE phone = ?").get(phone) as any;
  if (!guest) return NextResponse.json({ error: "Convidado não encontrado." }, { status: 404 });

  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO claims (gift_id, guest_phone, guest_name, value_cents, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(giftId, phone, guest.name, gift.price_cents, now);

  return NextResponse.json({ ok: true });
}
