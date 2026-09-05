import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "atlas_admin";

/** Сравнение за постоянное время — по образцу из СТАРТ_НОВОГО_ПРОЕКТА.md. */
export function sameCode(value: string | undefined | null): boolean {
  const code = process.env.ADMIN_CODE || "";
  if (!code || !value) return false;
  const a = Buffer.from(String(value));
  const b = Buffer.from(code);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  return sameCode(jar.get(ADMIN_COOKIE)?.value);
}

export const adminConfigured = () => Boolean(process.env.ADMIN_CODE);
