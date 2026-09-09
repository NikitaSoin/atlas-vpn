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
  name: "IREK",
  nameLatin: "IREK",
  tagline: "Просто работает",
  heroTitle: "Ваше соединение — только ваше",
  description:
    "Личный зашифрованный канал связи через наш сервер за рубежом. Работает на iPhone, Android, Mac и Windows: в кафе, отеле и любой чужой сети никто не видит, что вы делаете.",
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
  /** Адрес регистрации. В подвале не показывается — только в оферте. */
  address: string;
  email: string;
  /**
   * Телефон службы поддержки. Требование эквайера: в контактах должны быть
   * и почта, и телефон. Формат — как набирают, например +7 900 000-00-00.
   */
  phone: string;
  bank: {
    name: string;
    account: string;
    bik: string;
    corr: string;
    inn: string;
  };
};

export function getCompany(): Company {
  return {
    form: "Индивидуальный предприниматель",
    name: process.env.COMPANY_NAME?.trim() ?? "",
    ogrnip: process.env.COMPANY_OGRNIP?.trim() ?? "",
    inn: process.env.COMPANY_INN?.trim() ?? "",
    address: process.env.COMPANY_ADDRESS?.trim() ?? "",
    email: process.env.COMPANY_EMAIL?.trim() ?? "",
    phone: process.env.COMPANY_PHONE?.trim() ?? "",
    bank: {
      name: process.env.COMPANY_BANK_NAME?.trim() ?? "",
      account: process.env.COMPANY_BANK_ACCOUNT?.trim() ?? "",
      bik: process.env.COMPANY_BANK_BIK?.trim() ?? "",
      corr: process.env.COMPANY_BANK_CORR?.trim() ?? "",
      inn: process.env.COMPANY_BANK_INN?.trim() ?? "",
    },
  };
}

export function companyFilled(c = getCompany()): boolean {
  return Boolean(c.name && c.ogrnip && c.inn);
}
