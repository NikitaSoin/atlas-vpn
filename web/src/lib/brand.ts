/**
 * Единая точка брендирования. Меняешь здесь — меняется на всём сайте.
 * Дизайн-система IREK: свобода + простота + надёжность, без «кибербезопасности».
 *
 * 🔴 Формулировки намеренно описывают защиту соединения, а не доступ к
 * заблокированным ресурсам: с 01.09.2025 установлена ответственность за
 * рекламу средств обхода ограничений. Тексты про «доступ к любимым сайтам»,
 * смену региона магазина приложений и обход блокировок сюда возвращать нельзя.
 */
export const brand = {
  name: "IREK VPN",
  nameLatin: "IREK",
  tagline: "Просто работает",
  heroTitle: "Ваше соединение — только ваше",
  description:
    "Шифрует интернет-соединение на iPhone, Android, Mac и Windows: в кафе, отеле и любой чужой сети никто не видит, что вы делаете.",
  supportTelegram: "https://t.me/irek_vpn",
  supportEmail: "help@example.com",
  domain: "irekvpn.example.com",
} as const;

/**
 * Реквизиты исполнителя для подвала сайта и юридических документов.
 * Требование ст. 9 Закона «О защите прав потребителей»: потребитель должен
 * знать, с кем он заключает договор.
 *
 * Читаются функцией, а не константой: значения переменных окружения,
 * прочитанные на верхнем уровне модуля, подставляются в сборку и перестают
 * меняться при смене настроек на хостинге.
 *
 * 🔴 Заполнить до публичного запуска. Пока поля пустые, подвал показывает
 * предупреждение вместо реквизитов.
 */
export type Company = {
  form: string;
  name: string;
  ogrnip: string;
  inn: string;
  address: string;
  email: string;
};

export function getCompany(): Company {
  return {
    form: "Индивидуальный предприниматель",
    name: process.env.COMPANY_NAME?.trim() ?? "",
    ogrnip: process.env.COMPANY_OGRNIP?.trim() ?? "",
    inn: process.env.COMPANY_INN?.trim() ?? "",
    address: process.env.COMPANY_ADDRESS?.trim() ?? "",
    email: process.env.COMPANY_EMAIL?.trim() ?? "",
  };
}

export function companyFilled(c = getCompany()): boolean {
  return Boolean(c.name && c.ogrnip && c.inn);
}
