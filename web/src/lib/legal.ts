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
  return out.replace("{{РЕКВИЗИТЫ}}", requisitesBlock());
}

/** Блок реквизитов для последнего раздела оферты. */
function requisitesBlock(): string {
  const c = getCompany();
  if (!c.name) return "Реквизиты будут указаны после регистрации сервиса.";
  const lines = [
    `${c.form} ${c.name}`,
    c.ogrnip && `ОГРНИП: ${c.ogrnip}`,
    c.inn && `ИНН: ${c.inn}`,
    c.address && `Адрес: ${c.address}`,
    c.email && `Электронная почта: ${c.email}`,
    c.bank.account && `Расчётный счёт: ${c.bank.account}`,
    c.bank.name && `Банк: ${c.bank.name}`,
    c.bank.bik && `БИК: ${c.bank.bik}`,
    c.bank.corr && `Корреспондентский счёт: ${c.bank.corr}`,
    c.bank.inn && `ИНН банка: ${c.bank.inn}`,
  ].filter(Boolean);
  return lines.join("\n");
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
