import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminPassword } from "@/lib/admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({}));
  if (String(password || "") !== adminPassword()) {
    return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
  }
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, "ok", {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });
  return NextResponse.json({ ok: true });
}
