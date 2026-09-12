import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { normalizePhone, isValidPhone } from "@/lib/phone";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const phone = normalizePhone(String(body.phone || ""));
  const name = String(body.name || "").trim();
  const status = body.status === "NAO_VOU" ? "NAO_VOU" : "VOU";
  const companions = Array.isArray(body.companions)
    ? body.companions.map((c: unknown) => String(c || "").trim()).filter(Boolean).slice(0, 10)
    : [];

  if (!isValidPhone(phone)) {
    return NextResponse.json({ error: "Celular inválido. Digite DDD + número." }, { status: 400 });
  }
  if (name.length < 2) {
    return NextResponse.json({ error: "Informe seu nome." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const db = getDb();
  db.prepare(
    `INSERT INTO guests (phone, name, companions, status, role, created_at, updated_at)
     VALUES (?, ?, ?, ?, COALESCE((SELECT role FROM guests WHERE phone = ?), 'convidado'), ?, ?)
     ON CONFLICT(phone) DO UPDATE SET name = excluded.name, companions = excluded.companions, status = excluded.status, updated_at = excluded.updated_at`
  ).run(phone, name, JSON.stringify(companions), status, phone, now, now);

  return NextResponse.json({
    guest: { phone, name, companions, status },
  });
}
