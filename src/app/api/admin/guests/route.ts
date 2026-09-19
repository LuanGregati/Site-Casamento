import { NextResponse } from "next/server";
import { listGuests, parseCompanions, deleteGuest } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { normalizePhone } from "@/lib/phone";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const rows = await listGuests();
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

export async function PATCH(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const phone = normalizePhone(String(body.phone || ""));
  const role = String(body.role || "").trim().slice(0, 30) || "convidado";
  if (!phone) return NextResponse.json({ error: "Telefone inválido." }, { status: 400 });
  const { updateGuestRole } = await import("@/lib/db");
  await updateGuestRole(phone, role);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const phone = normalizePhone(String(searchParams.get("phone") || ""));
  if (!phone) return NextResponse.json({ error: "Telefone inválido." }, { status: 400 });
  await deleteGuest(phone);
  return NextResponse.json({ ok: true });
}
