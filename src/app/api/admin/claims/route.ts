import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const db = getDb();
  const claims = db.prepare(
    `SELECT c.*, g.name AS gift_name, g.emoji AS gift_emoji
     FROM claims c JOIN gifts g ON g.id = c.gift_id
     ORDER BY c.created_at DESC`
  ).all() as any[];
  const total = claims.reduce((acc: number, c: any) => acc + c.value_cents, 0);
  return NextResponse.json({
    claims: claims.map((c) => ({
      id: c.id,
      gift_name: c.gift_name,
      gift_emoji: c.gift_emoji,
      guest_name: c.guest_name,
      guest_phone: c.guest_phone,
      value_cents: c.value_cents,
      created_at: c.created_at,
    })),
    total_cents: total,
  });
}
