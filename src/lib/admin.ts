import { cookies } from "next/headers";

export const ADMIN_COOKIE = "casamento_admin";
export const GUEST_COOKIE = "casamento_convidado";

export function adminPassword(): string {
  return process.env.ADMIN_PASSWORD || "noivos123";
}

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(ADMIN_COOKIE)?.value === "ok";
}
