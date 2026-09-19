import { NextResponse } from "next/server";
import { findGuest, parseCompanions } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { phone } = await req.json().catch(() => ({}));
  const digits = normalizePhone(String(phone || ""));
  if (!digits) return NextResponse.json({ guest: null });
  const row = await findGuest(digits);
  if (!row) return NextResponse.json({ guest: null });
  return NextResponse.json({
    guest: {
      phone: row.phone,
      name: row.name,
      companions: parseCompanions(row.companions),
      status: row.status,
      role: row.role,
    },
  });
}
