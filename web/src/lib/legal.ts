import { readFile } from "node:fs/promises";
import path from "node:path";
import { getCompany, type Company } from "./brand";
import { siteUrl } from "./site";

/**
 * Юридические документы сайта. Тексты лежат файлами в `src/content/legal`,
 * версии — здесь: при изменении текста поднимаем версию, потому что версия
 * записывается в базу вместе с акцептом пользователя и в споре доказывает,
 * с какой именно редакцией человек согласился.
 */
export const LEGAL_DOCS = {
  offer: {
    file: "offer.md",
    title: "Публичная оферта",
    version: "1.1",
    from: "10 сентября 2026 г.",
  },
  rules: {
    file: "rules.md",
    title: "Правила использования сервиса",
    version: "1.1",
    from: "10 сентября 2026 г.",
  },
  privacy: {
    file: "privacy.md",
    title: "Политика в отношении обработки персональных данных",
    version: "1.1",
    from: "10 сентября 2026 г.",
  },
} as const;

export type LegalDocId = keyof typeof LEGAL_DOCS;

export const isLegalDoc = (v: string): v is LegalDocId => v in LEGAL_DOCS;

// Дата действия у каждого документа своя: редакции меняются не одновременно,
// и одна общая дата врала бы про непересмотренный документ.

/** Краткие сведения об операторе — для первого раздела политики. */
function operatorBlock(c: Company): string {
  const parts = [
    `${c.form} ${c.name}`,
    c.ogrnip && `ОГРНИП ${c.ogrnip}`,
    c.inn && `ИНН ${c.inn}`,
    c.address && `адрес: ${c.address}`,
    c.email && `электронная почта: ${c.email}`,
  ].filter(Boolean);
  return parts.length > 1 ? parts.join(", ") + "." : "Реквизиты будут указаны после регистрации сервиса.";
}

/** Блок реквизитов для последнего раздела оферты. */
function requisitesBlock(c: Company): string {
  if (!c.name) return "Реквизиты будут указаны после регистрации сервиса.";
  return [
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
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Пункт об уведомлении Роскомнадзора о трансграничной передаче.
 *
 * Утверждать, что уведомление подано, пока оно не подано, нельзя: это было бы
 * ложным сведением в публичном документе. Поэтому текст появляется только
 * после того, как в RKN_TRANSFER_NOTICE записаны дата и номер уведомления.
 * До этого документ честно говорит о самом факте передачи, без заявлений о
 * выполненных формальностях.
 */
function rknNoticeBlock(): string {
  const notice = process.env.RKN_TRANSFER_NOTICE?.trim();
  // Пока уведомление не подано — не пишем ничего. Раньше здесь стояла отсылка
  // к ст. 12 152-ФЗ, но она ничего не сообщала читателю: закон и так
  // действует. Заявлять о поданном уведомлении до подачи нельзя, поэтому
  // пункт просто появляется, когда появляется его предмет.
  return notice
    ? `7.4. Оператор направил в Роскомнадзор уведомление о намерении осуществлять
трансграничную передачу персональных данных в порядке ст. 12 152-ФЗ
(${notice}).`
    : "";
}

/** Подстановка реквизитов и значений в шаблонные места документа. */
function fillTemplate(text: string, docId: LegalDocId): string {
  const company = getCompany();
  return text
    .split("{{РЕДАКЦИЯ}}")
    .join(`Редакция ${LEGAL_DOCS[docId].version} от ${LEGAL_DOCS[docId].from}`)
    .split("{{САЙТ}}")
    .join(siteUrl())
    .split("{{ПОЧТА}}")
    .join(company.email || "адрес будет указан после запуска")
    .split("{{ОПЕРАТОР}}")
    .join(operatorBlock(company))
    .split("{{РЕКВИЗИТЫ}}")
    .join(requisitesBlock(company))
    .split("{{УВЕДОМЛЕНИЕ_РКН}}")
    .join(rknNoticeBlock())
    .split("{{ИСПОЛНИТЕЛЬ}}")
    .join(
      company.name
        ? `${company.form.toLowerCase()} ${company.name} (ОГРНИП ${company.ogrnip}, ИНН ${company.inn})`
        : "индивидуальный предприниматель, реквизиты которого указаны в разделе 17",
    );
}

export async function readLegalDoc(id: LegalDocId): Promise<string> {
  const file = path.join(process.cwd(), "src/content/legal", LEGAL_DOCS[id].file);
  return fillTemplate(await readFile(file, "utf8"), id);
}

/** Строка версий для записи в базу вместе с акцептом. */
export function currentVersions(): string {
  return Object.entries(LEGAL_DOCS)
    .map(([id, d]) => `${id}:${d.version}`)
    .join(";");
}
