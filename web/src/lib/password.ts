import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

/**
 * Пароли пользователей.
 *
 * Хранится не пароль, а его хеш: scrypt со случайной солью для каждого
 * пользователя. Даже при доступе к базе восстановить пароль нельзя, а
 * одинаковые пароли двух людей дают разные хеши. scrypt выбран потому, что он
 * встроен в Node и намеренно медленный — перебор дорогой.
 *
 * Формат записи: `scrypt$<соль в hex>$<хеш в hex>`.
 */
const KEY_LEN = 64;

/** Минимальные требования: длина важнее «сложности» из спецсимволов. */
export const MIN_PASSWORD_LENGTH = 8;

export function passwordProblem(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов.`;
  }
  if (password.length > 200) return "Пароль слишком длинный.";
  // Самые частые пароли отсекаем сразу: они подбираются за секунды.
  const weak = ["12345678", "123456789", "1234567890", "password", "qwertyui", "qwerty123"];
  if (weak.includes(password.toLowerCase())) return "Такой пароль слишком простой.";
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, KEY_LEN);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, keyHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !keyHex) return false;
  try {
    const key = await scryptAsync(password, Buffer.from(saltHex, "hex"), KEY_LEN);
    const expected = Buffer.from(keyHex, "hex");
    return key.length === expected.length && timingSafeEqual(key, expected);
  } catch {
    return false;
  }
}
