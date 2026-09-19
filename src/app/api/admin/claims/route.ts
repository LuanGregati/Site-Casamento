import { NextResponse } from "next/server";
import { listClaimsWithGift } from "@/lib/db";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const claims = await listClaimsWithGift();
  const total = claims.reduce((acc: number, c: any) => acc + Number(c.value_cents), 0);
  return NextResponse.json({
    claims: claims.map((c) => ({
      id: c.id,
      gift_name: c.gift_name,
      gift_emoji: c.gift_emoji,
      guest_name: c.guest_name,
      guest_phone: c.guest_phone,
      value_cents: Number(c.value_cents),
      created_at: c.created_at,
    })),
    total_cents: total,
  });
}
