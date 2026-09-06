/**
 * Требования к паролю. Отдельный модуль без серверных зависимостей: те же
 * правила нужны и в браузере (подсказка в форме), и на сервере (проверка).
 * Класть их в `password.ts` нельзя — оттуда в клиентскую сборку утянулся бы
 * `node:crypto`, и страница переставала грузиться.
 */
export const MIN_PASSWORD_LENGTH = 8;

/** Самые частые пароли: подбираются за секунды, поэтому отклоняем сразу. */
const WEAK = ["12345678", "123456789", "1234567890", "password", "qwertyui", "qwerty123"];

/** null — пароль годится; строка — что именно не так. */
export function passwordProblem(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов.`;
  }
  if (password.length > 200) return "Пароль слишком длинный.";
  if (WEAK.includes(password.toLowerCase())) return "Такой пароль слишком простой.";
  return null;
}
