import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { getDb, parseCompanions } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const rows = getDb().prepare("SELECT * FROM guests ORDER BY created_at DESC").all() as any[];
  return NextResponse.json({
    guests: rows.map((r) => ({
      phone: r.phone,
      name: r.name,
      companions: parseCompanions(r.companions),
      status: r.status,
      role: r.role,
      created_at: r.created_at,
    })),
  });
}

// Atualiza papel (role)
export async function PATCH(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const phone = normalizePhone(String(body.phone || ""));
  const role = String(body.role || "").trim().slice(0, 30) || "convidado";
  if (!phone) return NextResponse.json({ error: "Telefone inválido." }, { status: 400 });
  getDb().prepare("UPDATE guests SET role = ?, updated_at = ? WHERE phone = ?").run(
    role, new Date().toISOString(), phone
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const phone = normalizePhone(String(searchParams.get("phone") || ""));
  if (!phone) return NextResponse.json({ error: "Telefone inválido." }, { status: 400 });
  const db = getDb();
  db.prepare("DELETE FROM claims WHERE guest_phone = ?").run(phone);
  db.prepare("DELETE FROM guests WHERE phone = ?").run(phone);
  return NextResponse.json({ ok: true });
}
