import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { getStore, type SubRecord } from "./db";

/**
 * Сессия кабинета — httpOnly cookie с токеном подписки. Токен и так является
 * секретом (это хвост персональной ссылки), отдельной таблицы сессий не нужно.
 * Ставится после триала/оплаты и после входа по ссылке из письма.
 */
export const SESSION_COOKIE = "irek_session";
const YEAR = 60 * 60 * 24 * 365;

export function setSession(res: NextResponse, token: string) {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: YEAR,
  });
}

export function clearSession(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
}

/** Подписка текущего посетителя по cookie, либо null. */
export async function currentSub(): Promise<SubRecord | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    return await getStore().findSubByToken(token);
  } catch {
    return null;
  }
}
