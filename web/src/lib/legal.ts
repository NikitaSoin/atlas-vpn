import { readFile } from "node:fs/promises";
import path from "node:path";
import { getCompany } from "./brand";

/**
 * Юридические документы сайта. Тексты лежат файлами в `src/content/legal`,
 * версии — здесь: при изменении текста поднимаем версию, потому что версия
 * записывается в базу вместе с акцептом пользователя и в споре доказывает,
 * с какой именно редакцией человек согласился.
 */
export const LEGAL_DOCS = {
  offer: { file: "offer.md", title: "Публичная оферта", version: "1.0" },
  rules: { file: "rules.md", title: "Правила использования сервиса", version: "1.0" },
  privacy: {
    file: "privacy.md",
    title: "Политика в отношении обработки персональных данных",
    version: "1.0",
  },
} as const;

export type LegalDocId = keyof typeof LEGAL_DOCS;

export const isLegalDoc = (v: string): v is LegalDocId => v in LEGAL_DOCS;

/** Подстановка реквизитов ИП в шаблонные места документа. */
function fillCompany(text: string): string {
  const company = getCompany();
  const map: Record<string, string> = {
    "[ФИО]": company.name,
    "[адрес почты поддержки]": company.email,
    "[адрес почты для жалоб]": company.email,
    "[адрес почты]": company.email,
    "[адрес канала поддержки]": "@irek_vpn",
  };
  let out = text;
  for (const [needle, value] of Object.entries(map)) {
    if (value) out = out.split(needle).join(value);
  }
  if (company.ogrnip) out = out.replace(/ОГРНИП `\[…\]`/g, `ОГРНИП \`${company.ogrnip}\``);
  if (company.inn) out = out.replace(/ИНН `\[…\]`/g, `ИНН \`${company.inn}\``);
  return out;
}

export async function readLegalDoc(id: LegalDocId): Promise<string> {
  const file = path.join(process.cwd(), "src/content/legal", LEGAL_DOCS[id].file);
  return fillCompany(await readFile(file, "utf8"));
}

/** Строка версий для записи в базу вместе с акцептом. */
export function currentVersions(): string {
  return Object.entries(LEGAL_DOCS)
    .map(([id, d]) => `${id}:${d.version}`)
    .join(";");
}
