import { brand } from "./brand";

export type Platform = "ios" | "android" | "windows" | "macos";

export type VpnClient = {
  id: string;
  name: string;
  /** Короткое пояснение, почему пользователь может выбрать именно этот клиент. */
  note: string;
  /** Ссылка на установку. Для Android может быть прямой APK. */
  installUrl: string;
  /** Подпись к кнопке установки. */
  installLabel: string;
  /**
   * Собирает deep-link, импортирующий подписку в клиент одним тапом.
   *
   * ВАЖНО: схемы отличаются между версиями приложений и иногда меняются.
   * Перед запуском каждую нужно проверить руками на живом устройстве.
   * Универсальный запасной путь — кнопка «Скопировать ссылку» и QR-код,
   * они работают в любом клиенте независимо от схемы.
   */
  deepLink?: (subscriptionUrl: string) => string;
  recommended?: boolean;
};

const label = encodeURIComponent(brand.nameLatin);

export const clientsByPlatform: Record<Platform, VpnClient[]> = {
  ios: [
    {
      id: "streisand",
      name: "Streisand",
      note: "Бесплатный, простой интерфейс. Оптимален для большинства.",
      installUrl: "https://apps.apple.com/app/streisand/id6450534064",
      installLabel: "Установить из App Store",
      deepLink: (url) => `streisand://import/${url}`,
      recommended: true,
    },
    {
      id: "v2box",
      name: "V2Box",
      note: "Бесплатный. Запасной вариант, если Streisand недоступен.",
      installUrl: "https://apps.apple.com/app/v2box-v2ray-client/id6446814690",
      installLabel: "Установить из App Store",
      deepLink: (url) =>
        `v2box://install-sub?url=${encodeURIComponent(url)}&name=${label}`,
    },
    {
      id: "shadowrocket",
      name: "Shadowrocket",
      note: "Платный, ~$3 разово. Самый функциональный, для опытных.",
      installUrl: "https://apps.apple.com/app/shadowrocket/id932747118",
      installLabel: "Купить в App Store",
      deepLink: (url) =>
        `shadowrocket://add/sub://${Buffer.from(url).toString("base64")}`,
    },
  ],
  android: [
    {
      id: "v2rayng",
      name: "v2rayNG",
      note: "Бесплатный, ставится напрямую с нашего сайта — Google Play не нужен.",
      installUrl:
        "https://github.com/2dust/v2rayNG/releases/latest",
      installLabel: "Скачать APK",
      deepLink: (url) => `v2rayng://install-sub?url=${encodeURIComponent(url)}`,
      recommended: true,
    },
    {
      id: "karing",
      name: "Karing",
      note: "Бесплатный, есть в Google Play. Удобнее интерфейс.",
      installUrl:
        "https://play.google.com/store/apps/details?id=com.karing.app",
      installLabel: "Установить из Google Play",
      deepLink: (url) => `karing://install-config?url=${encodeURIComponent(url)}`,
    },
  ],
  windows: [
    {
      id: "clash-verge",
      name: "Clash Verge Rev",
      note: "Бесплатный, современный интерфейс, автообновление подписки.",
      installUrl:
        "https://github.com/clash-verge-rev/clash-verge-rev/releases/latest",
      installLabel: "Скачать установщик",
      deepLink: (url) => `clash://install-config?url=${encodeURIComponent(url)}`,
      recommended: true,
    },
    {
      id: "v2rayn",
      name: "v2rayN",
      note: "Бесплатный, максимум настроек. Для тех, кто любит контроль.",
      installUrl: "https://github.com/2dust/v2rayN/releases/latest",
      installLabel: "Скачать установщик",
    },
  ],
  macos: [
    {
      id: "clash-verge-mac",
      name: "Clash Verge Rev",
      note: "Бесплатный, есть сборки под Apple Silicon и Intel.",
      installUrl:
        "https://github.com/clash-verge-rev/clash-verge-rev/releases/latest",
      installLabel: "Скачать .dmg",
      deepLink: (url) => `clash://install-config?url=${encodeURIComponent(url)}`,
      recommended: true,
    },
    {
      id: "streisand-mac",
      name: "Streisand",
      note: "Тот же клиент, что на iPhone — одна подписка на оба устройства.",
      installUrl: "https://apps.apple.com/app/streisand/id6450534064",
      installLabel: "Установить из App Store",
      deepLink: (url) => `streisand://import/${url}`,
    },
  ],
};

export const platformLabels: Record<Platform, string> = {
  ios: "iPhone / iPad",
  android: "Android",
  windows: "Windows",
  macos: "macOS",
};

export const platformOrder: Platform[] = ["ios", "android", "windows", "macos"];
