import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { getDb } from "@/lib/db";
import { buildPixBrcode, pixConfig } from "@/lib/pix";

export const runtime = "nodejs";

// GET /api/pix?giftId=1 -> { brcode, qrDataUrl, value_cents, key }
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const giftId = Number(searchParams.get("giftId"));
  if (!giftId) return NextResponse.json({ error: "giftId inválido." }, { status: 400 });
  const gift = getDb().prepare("SELECT * FROM gifts WHERE id = ? AND active = 1").get(giftId) as any;
  if (!gift) return NextResponse.json({ error: "Presente não encontrado." }, { status: 404 });

  const cfg = pixConfig();
  const brcode = buildPixBrcode(cfg.key, cfg.name, cfg.city, gift.price_cents / 100);
  const qrDataUrl = await QRCode.toDataURL(brcode, { width: 320, margin: 1 });
  return NextResponse.json({
    brcode,
    qrDataUrl,
    value_cents: gift.price_cents,
    gift_name: gift.name,
  });
}
