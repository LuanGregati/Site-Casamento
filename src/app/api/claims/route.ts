import { NextResponse } from "next/server";
import { getActiveGift, findGuest, createClaim } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const giftId = Number(body.giftId);
  const phone = normalizePhone(String(body.phone || ""));
  if (!giftId || !phone) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }
  const gift = await getActiveGift(giftId);
  if (!gift) return NextResponse.json({ error: "Presente não encontrado." }, { status: 404 });
  const guest = await findGuest(phone);
  if (!guest) return NextResponse.json({ error: "Convidado não encontrado." }, { status: 404 });

  await createClaim(giftId, phone, guest.name, gift.price_cents);

  return NextResponse.json({ ok: true });
}
