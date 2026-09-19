import { NextResponse } from "next/server";
import { listGifts, createGift, updateGift, deleteGift } from "@/lib/db";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";

function toGift(row: any) {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    image: row.image || "",
    price_cents: row.price_cents,
    active: Number(row.active) === 1,
  };
}

export async function GET() {
  const admin = await isAdmin();
  const rows = await listGifts(!admin);
  return NextResponse.json({ gifts: rows.map(toGift) });
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  try {
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

    if (body.id) {
      await updateGift(Number(body.id), name, emoji, image, price_cents, active);
      return NextResponse.json({ ok: true });
    }
    const id = await createGift(name, emoji, image, price_cents, active);
    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    console.error("POST /api/gifts failed:", e);
    return NextResponse.json({ error: e?.message || "Erro interno ao salvar." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "id inválido." }, { status: 400 });
    await deleteGift(id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("DELETE /api/gifts failed:", e);
    return NextResponse.json({ error: e?.message || "Erro interno." }, { status: 500 });
  }
}
