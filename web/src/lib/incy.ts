/**
 * Профиль маршрутизации для приложения INCY.
 *
 * Зачем он нужен. Приложение само решает, что заворачивать в тоннель и каким
 * DNS пользоваться. Если у пользователя эти настройки сбиты — а по умолчанию
 * они у всех разные, — включённый VPN выглядит как «интернет пропал совсем».
 * Поэтому маршрутизацию задаём мы: подписка отдаёт готовый профиль, и
 * поведение перестаёт зависеть от того, что человек когда-то нажал.
 *
 * Формат и способ доставки — из документации INCY (проверено 07.09.2026):
 * incy.gitbook.io/docs/dokumentaciya-dlya-razrabotchikov/marshrutizaciya-routing
 * Профиль отдаётся заголовком `routing` в виде `://routing/onadd/{base64}` —
 * это добавляет профиль и сразу делает его активным. Другие клиенты
 * незнакомый заголовок игнорируют, поэтому отдаём его всем.
 *
 * Профили с одинаковым `Name` не дублируются, а обновляются.
 */

/**
 * Метка версии профиля. Приложение обновляет сохранённый профиль, только если
 * здесь значение больше прежнего, поэтому её надо поднимать РУКАМИ при правке
 * профиля — и нельзя подставлять текущее время: иначе клиент будет считать
 * профиль новым при каждом обновлении подписки и заново качать геофайлы.
 */
const PROFILE_VERSION = "1788746400"; // 07.09.2026, вторая редакция

/**
 * Российские ресурсы, которые пускаем мимо тоннеля. Здесь ТОЛЬКО конкретные
 * домены: гео-категории (`geosite:ru`, `geoip:ru`) использовать нельзя.
 * Проверено на устройстве владельца 07.09.2026 — приложение не смогло собрать
 * конфигурацию целиком:
 *   common/geodata: illegal domain rule: geosite:ru
 *   common/geodata: failed to check code RU from geosite.dat > EOF
 * То есть вшитый в приложение гео-файл кода RU не содержит, и одно такое
 * правило роняет весь профиль, а вместе с ним и подключение.
 */
const RU_DIRECT = [
  // Госуслуги, налоговая, городские сервисы
  "gosuslugi.ru", "nalog.gov.ru", "nalog.ru", "mos.ru", "pfr.gov.ru", "sfr.gov.ru",
  // Банки: с зарубежного адреса они часто просто не пускают
  "sberbank.ru", "sber.ru", "vtb.ru", "alfabank.ru", "tbank.ru", "tinkoff.ru",
  "gazprombank.ru", "raiffeisen.ru", "psbank.ru", "open.ru", "sovcombank.ru",
  "mkb.ru", "rshb.ru", "pochtabank.ru", "nspk.ru", "mironline.ru",
  // Почта, поиск, карты, медиа
  "yandex.ru", "ya.ru", "yandex.net", "yandex.com", "mail.ru", "vk.com", "vk.ru",
  "ok.ru", "userapi.com", "mycdn.me", "dzen.ru", "kinopoisk.ru", "rutube.ru",
  "2gis.ru", "rambler.ru", "lenta.ru", "rbc.ru", "ria.ru",
  // Маркетплейсы и доставка
  "ozon.ru", "wildberries.ru", "avito.ru", "dns-shop.ru", "mvideo.ru",
  "sbermarket.ru", "delivery-club.ru", "samokat.ru",
  // Операторы связи
  "mts.ru", "megafon.ru", "beeline.ru", "tele2.ru", "rt.ru",
];

/** Значение заголовка `routing`: добавить профиль и сразу включить его. */
export function incyRoutingHeader(): string {
  const json = JSON.stringify(ROUTING_PROFILE);
  return `://routing/onadd/${Buffer.from(json, "utf8").toString("base64")}`;
}
