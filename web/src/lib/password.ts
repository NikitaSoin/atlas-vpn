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

// Правила к паролю живут отдельно: они нужны и в браузере.
export { MIN_PASSWORD_LENGTH, passwordProblem } from "./password-rules";

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
