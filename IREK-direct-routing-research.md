# IREK VPN — домены прямого доступа

Дата: 13.09.2026. Статус: исследовательский реестр для ТЗ и согласования, НЕ протестированный профиль INCY. На сервер и пользователям ничего не опубликовано.

## Как читать список

Каждый обычный домен означает сам домен **и все его поддомены**. Это требование к реализации, а не утверждение, что все возможные хосты существуют. Например, правило для avito.ru покрывает любой поддомен внутри avito.ru; avito.st — отдельный корень для ресурсов, поэтому указан отдельно. Префикс full: означает только конкретный хост, без расширения на чужой общий сервис.

Рекомендуемая семантика Xray — `domain:example.ru`; `full:host.example.net` для точечного общего хостинга. Проверить преобразование DirectSites в правила Xray в установленной версии INCY: не использовать поиск подстроки и не вставлять `*.example.ru` без проверки поддержки. Источник: https://xtls.github.io/config/routing.html

Фактически найденные поддомены ниже взяты из публичного community-списка; это свидетельство присутствия в источнике, НЕ проверка DNS, владения, мобильного API или работы в конкретной сети. Если по сервису ничего не найдено, это явно указано. Полного публичного реестра всех API приложений нет. Для новых сторонних доменов нужна отдельная запись даже при покрытии всех поддоменов главного сайта.

Основные источники — v2fly/domain-list-community (MIT; снимок и лицензия в sources) и официальные страницы. Большие списки экосистем отобраны вручную: не включены целиком рекламные категории, глобальные облачные зоны, домены с опечатками и зарубежные банковские группы. Наличие домена в архивном списке не подтверждает актуальный статус банка: старые домены оставлены только там, где это явно отмечено, перед выпуском проверить.

## Как будут обновляться правила

1. Публикуем проверенный JSON-профиль по постоянному HTTPS-адресу своего сайта, например `/routing/ru-direct.json` (это планируемый путь, сейчас не создан).
2. В ответ VPN-подписки добавляем заголовок `autorouting: incy://autorouting/onadd/https://irekcloud.ru/routing/ru-direct.json`.
3. При импорте/обновлении подписки INCY получает профиль и привязывает его к URL. У существующих пользователей нужно проверить первичное получение при обновлении подписки.
4. Мы меняем файл по тому же адресу; INCY скачивает новую версию периодически. По документации интервал по умолчанию 24 часа, есть ручное «Обновить сейчас». Это не мгновенная push-доставка: устройство должно иметь доступ к источнику, работу в фоне и применение к текущему соединению проверить на целевых ОС.
5. Сохраняем стабильное Name, меняем LastUpdated при выпуске. Храним предыдущую версию; откат выпускаем как новую версию с более свежей меткой. Проверяем сохранение рабочего профиля при недоступности/ошибке источника до массового включения.

Документация: https://docs.incy.cc/autorouting/ и https://docs.incy.cc/routing/

Общая политика: выбранные сервисы DIRECT, остальное VPN. На iOS — домены; Android при необходимости дополнительно package names, проверенные для установленных приложений. Яндекс Браузер целиком не исключать. Не включать все .ru, geoip:ru, все IP облачных провайдеров или shared CDN. Прямой трафик идёт с IP пользователя; это нужно понятно обозначить в интерфейсе.

## Чем отличаются белые списки операторов

Белый список оператора определяет, какие назначения он пропускает при ограничении мобильного интернета. Наш список определяет лишь путь — через VPN или напрямую. DIRECT может помочь разрешённому оператором сервису, если VPN-сервер недоступен, но не добавляет сайт в операторский список. Работа direct-правил при недоступном туннеле требует проверки поведения INCY. Community-списки отличаются от гарантии оператора и могут зависеть от региона и сети; нельзя переносить их полностью в наш профиль.

Источник поддоменов: https://github.com/hxehex/russia-mobile-internet-whitelist (снимок 13.09.2026; MIT-лицензия сохранена).

## Реестр


### Банки


#### Сбер

- Домены и все поддомены: `sber.ru`, `sberbank.ru`, `sberbank.com`, `sbrf.ru`, `id.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/sber
- Найдены в community-списке (уже покрываются правилами выше): `bfds.sberbank.ru`, `cms-res-web.online.sberbank.ru`, `esa-res.online.sberbank.ru`, `id.sber.ru`, `online.sberbank.ru`, `pl-res.online.sberbank.ru`, `www.sberbank.ru`.

#### Т-Банк и прежние домены Росбанка

- Домены и все поддомены: `tbank.ru`, `tinkoff.ru`, `tcsbank.ru`, `cdn-tinkoff.ru`, `t-static.ru`, `my-tbank.ru`, `tbank-online.com`, `t-bank-app.ru`, `t-bank-app.su`, `rosbank.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/tbank-ru
- Найдены в community-списке (уже покрываются правилами выше): `cdn.tbank.ru`, `cobrowsing.tbank.ru`, `hrc.tbank.ru`, `id.tbank.ru`, `imgproxy.cdn-tinkoff.ru`, `le.tbank.ru`.

#### Альфа-Банк

- Домены и все поддомены: `alfa.me`, `alfabank.ru`, `alfabank.st`, `alfadirect.ru`, `myapelsin.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-bank-ru
- Найдены в community-списке (уже покрываются правилами выше): `alfa-mobile.alfabank.ru`, `metrics.alfabank.ru`.

#### ВТБ

- Домены и все поддомены: `vtb.ru`, `vtb-direct.com`, `pochtabank.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-bank-ru
- Найдены в community-списке (уже покрываются правилами выше): `chat3.vtb.ru`, `s.vtb.ru`, `sso-app4.vtb.ru`, `sso-app5.vtb.ru`, `www.vtb.ru`.

#### Газпромбанк

- Домены и все поддомены: `gazprombank.ru`, `gazprombank.com`, `gazprombank.investments`, `gpb.ru`, `gid.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-bank-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Совкомбанк / Халва

- Домены и все поддомены: `sovcombank.ru`, `hva.im`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-bank-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Россельхозбанк

- Домены и все поддомены: `rshb.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-bank-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### ПСБ

- Домены и все поддомены: `psb.ru`, `psbank.ru`, `payment.ru`, `psb-ocenka.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-bank-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### МКБ

- Домены и все поддомены: `mkb.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-bank-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### МТС Банк

- Домены и все поддомены: `mtsbank.ru`, `mtsdengi.ru`, `dbo-dengi.online`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-bank-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Райффайзен

- Домены и все поддомены: `raiffeisen.ru`, `raiffeisen-media.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-bank-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### ОТП

- Домены и все поддомены: `otpbank.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-bank-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Точка

- Домены и все поддомены: `tochka.com`, `tochka-tech.com`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-bank-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### БКС

- Домены и все поддомены: `bcs.ru`, `bcs-bank.ru`, `broker.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-bank-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### ДОМ.РФ

- Домены и все поддомены: `domrfbank.ru`, `xn--d1aqf.xn--p1ai`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-bank-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Зенит

- Домены и все поддомены: `zenit.ru`, `credit-zenit.ru`, `zenit-card.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-bank-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### ББР

- Домены и все поддомены: `bbr.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-bank-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Россия

- Домены и все поддомены: `abr.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-bank-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Абсолют

- Домены и все поддомены: `absolutbank.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-bank-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Ак Барс

- Домены и все поддомены: `akbars.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-bank-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Алеф-Банк

- Домены и все поддомены: `alefbank.com`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-bank-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Алмазэргиэнбанк

- Домены и все поддомены: `ankb.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-bank-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Азиатско-Тихоокеанский банк

- Домены и все поддомены: `atb.su`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-bank-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Авангард

- Домены и все поддомены: `avangard.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-bank-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Аверс

- Домены и все поддомены: `aversbank.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-bank-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Банк 131

- Домены и все поддомены: `bank131.com`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-bank-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Бланк

- Домены и все поддомены: `blanc.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-bank-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Банк Санкт-Петербург

- Домены и все поддомены: `bspb.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-bank-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Финам

- Домены и все поддомены: `finambank.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-bank-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Форштадт

- Домены и все поддомены: `forshtadt.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-bank-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Кубань Кредит

- Домены и все поддомены: `kubankredit.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-bank-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### МФК

- Домены и все поддомены: `mfk-bank.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-bank-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Ноосфера

- Домены и все поддомены: `noosferabank.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-bank-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Приморье

- Домены и все поддомены: `primbank.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-bank-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Примсоцбанк

- Домены и все поддомены: `pskb.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-bank-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Ренессанс Банк

- Домены и все поддомены: `rencredit.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-bank-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Синара

- Домены и все поддомены: `sinara.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-bank-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Солид

- Домены и все поддомены: `solid.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-bank-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Татсоцбанк

- Домены и все поддомены: `tatsotsbank.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-bank-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### ТКБ

- Домены и все поддомены: `tkbbank.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-bank-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Уралсиб

- Домены и все поддомены: `uralsib.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-bank-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Зираат

- Домены и все поддомены: `ziraatbank.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-bank-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Банк Ермак

- Домены и все поддомены: `bankermak.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-bank-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Банк БФА

- Домены и все поддомены: `bfa.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-bank-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Ozon Банк

- Домены и все поддомены: `ozon.ru`, `ozoncard.ru`, `ozon-credit.ru`.
- Статус: доменная основа; уточнить отдельные API банка.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/ozon
- Найдены в community-списке (уже покрываются правилами выше): `adv.ozon.ru`, `autodiscover.ord.ozon.ru`, `bank.ozon.ru`, `invest.ozon.ru`, `learning.ozon.ru`, `mapi.learning.ozon.ru`, `ord.ozon.ru`, `owa.ozon.ru`, `pay.ozon.ru`, `securepay.ozon.ru`, `seller.ozon.ru`, `ws.seller.ozon.ru`, `www.ozon.ru`, `xapi.ozon.ru`.

#### Яндекс Банк

- Домены и все поддомены: `bank.yandex.ru`, `yandex-bank.net`.
- Статус: bank.yandex.ru покрывается yandex.ru; API проверить.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/yandex
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### WB Банк

- Домены и все поддомены: `wb-bank.ru`, `wbpay.ru`, `paywb.ru`, `paywb.com`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/wildberries
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

### Оплата


#### СБП / НСПК

- Домены и все поддомены: `nspk.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-bank-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Платёжные сервисы Сбера

- Домены и все поддомены: `payecom.ru`, `platiecom.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/sber
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Best2Pay

- Домены и все поддомены: `best2pay.net`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-bank-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

### Маркетплейсы и магазины


#### Авито

- Домены и все поддомены: `avito.ru`, `avito.st`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/avito
- Найдены в community-списке (уже покрываются правилами выше): `00.img.avito.st`, `01.img.avito.st`, `02.img.avito.st`, `03.img.avito.st`, `04.img.avito.st`, `05.img.avito.st`, `06.img.avito.st`, `07.img.avito.st`, `08.img.avito.st`, `09.img.avito.st`, `10.img.avito.st`, `11.img.avito.st`, `12.img.avito.st`, `13.img.avito.st`, `14.img.avito.st`, `15.img.avito.st`, `16.img.avito.st`, `17.img.avito.st`, `18.img.avito.st`, `19.img.avito.st`, `20.img.avito.st`, `21.img.avito.st`, `22.img.avito.st`, `23.img.avito.st`, `24.img.avito.st`, `25.img.avito.st`, `26.img.avito.st`, `27.img.avito.st`, `28.img.avito.st`, `29.img.avito.st`, `30.img.avito.st`, `31.img.avito.st`, `32.img.avito.st`, `33.img.avito.st`, `34.img.avito.st`, `35.img.avito.st`, `36.img.avito.st`, `37.img.avito.st`, `38.img.avito.st`, `39.img.avito.st`, `40.img.avito.st`, `41.img.avito.st`, `42.img.avito.st`, `43.img.avito.st`, `44.img.avito.st`, `45.img.avito.st`, `46.img.avito.st`, `47.img.avito.st`, `48.img.avito.st`, `49.img.avito.st`, `50.img.avito.st`, `51.img.avito.st`, `52.img.avito.st`, `53.img.avito.st`, `54.img.avito.st`, `55.img.avito.st`, `56.img.avito.st`, `57.img.avito.st`, `58.img.avito.st`, `59.img.avito.st`, `60.img.avito.st`, `61.img.avito.st`, `62.img.avito.st`, `63.img.avito.st`, `64.img.avito.st`, `65.img.avito.st`, `66.img.avito.st`, `67.img.avito.st`, `68.img.avito.st`, `69.img.avito.st`, `70.img.avito.st`, `71.img.avito.st`, `72.img.avito.st`, `73.img.avito.st`, `74.img.avito.st`, `75.img.avito.st`, `76.img.avito.st`, `77.img.avito.st`, `78.img.avito.st`, `79.img.avito.st`, `80.img.avito.st`, `81.img.avito.st`, `82.img.avito.st`, `83.img.avito.st`, `84.img.avito.st`, `85.img.avito.st`, `86.img.avito.st`, `87.img.avito.st`, `88.img.avito.st`, `89.img.avito.st`, `90.img.avito.st`, `91.img.avito.st`, `92.img.avito.st`, `93.img.avito.st`, `94.img.avito.st`, `95.img.avito.st`, `96.img.avito.st`, `97.img.avito.st`, `98.img.avito.st`, `99.img.avito.st`, `api.avito.ru`, `cs.avito.ru`, `m.avito.ru`, `sntr.avito.ru`, `st.avito.ru`, `stats.avito.ru`, `www.avito.ru`, `www.avito.st`.

#### Ozon

- Домены и все поддомены: `ozon.ru`, `ozon.com`, `ozon.app`, `ozone.ru`, `ozonusercontent.com`, `o3.ru`, `o3t.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/ozon
- Найдены в community-списке (уже покрываются правилами выше): `adv.ozon.ru`, `autodiscover.ord.ozon.ru`, `bank.ozon.ru`, `invest.ozon.ru`, `ir.ozone.ru`, `learning.ozon.ru`, `mapi.learning.ozon.ru`, `ord.ozon.ru`, `owa.ozon.ru`, `pay.ozon.ru`, `securepay.ozon.ru`, `seller.ozon.ru`, `st.ozone.ru`, `vt-1.ozone.ru`, `ws.seller.ozon.ru`, `www.ozon.ru`, `xapi.ozon.ru`.

#### Wildberries

- Домены и все поддомены: `wildberries.ru`, `wb.ru`, `wbbasket.ru`, `wb-basket.ru`, `wbcontent.net`, `wbstatic.net`, `wbstatic.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/wildberries
- Найдены в community-списке (уже покрываются правилами выше): `a.wb.ru`, `banners-website.wildberries.ru`, `chat-prod.wildberries.ru`, `dnd.wb.ru`, `finance.wb.ru`, `fw.wb.ru`, `jitsi.wb.ru`, `user-geo-data.wildberries.ru`.

#### Мегамаркет

- Домены и все поддомены: `megamarket.ru`, `megamarket.tech`, `sbermegamarket.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/sber
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### DNS

- Домены и все поддомены: `dns-shop.ru`, `dns-com.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-retail-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Ситилинк

- Домены и все поддомены: `citilink.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-retail-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### М.Видео

- Домены и все поддомены: `mvideo.ru`, `acmvid.com`, `full:mvideo.edna.io`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/mvideo
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Lamoda

- Домены и все поддомены: `lamoda.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-retail-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Детский мир

- Домены и все поддомены: `detmir.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-retail-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Fix Price

- Домены и все поддомены: `fix-price.com`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-retail-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

### Продукты и доставка


#### Пятёрочка / Перекрёсток / Чижик / X5 Клуб

- Домены и все поддомены: `5ka.ru`, `perekrestok.ru`, `perekrestok.com`, `chizhik.club`, `x5.ru`, `x5club.ru`, `clubx5.ru`, `idx5.ru`, `x5id.ru`, `x5paket.ru`, `x5static.net`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/x5
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### ВкусВилл

- Домены и все поддомены: `vkusvill.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-retail-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Магнит

- Домены и все поддомены: `magnit.ru`, `magnit.com`, `mm.ru`, `kazanexpress.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/magnit
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Лента

- Домены и все поддомены: `lenta.com`, `lenta.tech`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-retail-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Ашан

- Домены и все поддомены: `auchan.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-retail-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### METRO

- Домены и все поддомены: `metro-cc.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-retail-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Дикси

- Домены и все поддомены: `dixy.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-retail-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Азбука вкуса

- Домены и все поддомены: `av.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-retail-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### SPAR

- Домены и все поддомены: `myspar.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-retail-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Купер

- Домены и все поддомены: `kuper.ru`, `restnproducts.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/sber
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Самокат

- Домены и все поддомены: `samokat.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/sber
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Додо Пицца

- Домены и все поддомены: `dodopizza.ru`, `dodopizza.com`, `dodois.com`, `dodois.io`, `dodostatic.net`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-retail-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Вкусно — и точка

- Домены и все поддомены: `vkusnoitochka.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-retail-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Ростикс

- Домены и все поддомены: `rostics.ru`, `uni.rest`, `unirest.tech`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-retail-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Достаевский

- Домены и все поддомены: `dostaevsky.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-retail-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

### Аптеки


#### Аптека.ру

- Домены и все поддомены: `apteka.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-medicine-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Апрель

- Домены и все поддомены: `apteka-april.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-medicine-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Аптеки Плюс

- Домены и все поддомены: `aptekiplus.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-medicine-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Фармленд

- Домены и все поддомены: `farmlend.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-medicine-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Горздрав

- Домены и все поддомены: `gorzdrav.org`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-medicine-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Мегаптека

- Домены и все поддомены: `megapteka.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-medicine-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Планета Здоровья

- Домены и все поддомены: `planetazdorovo.ru`, `pz.help`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-medicine-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Столички

- Домены и все поддомены: `stolichki.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-medicine-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Ютека

- Домены и все поддомены: `uteka.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-medicine-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Здравсити

- Домены и все поддомены: `zdravcity.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-medicine-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### ЕАПТЕКА

- Домены и все поддомены: `eapteka.ru`, `eaptechka.online`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/sber
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Ригла

- Домены и все поддомены: `rigla.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://www.rigla.ru/
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### 36,6

- Домены и все поддомены: `366.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://app.366.ru/api/mobile/static/files/oferta.pdf
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

### Яндекс


#### ID, Поиск, Почта, Диск, Документы, Карты, Навигатор, Go, Еда, Лавка, Маркет, Музыка, Плюс, Путешествия, Алиса

- Домены и все поддомены: `ya.ru`, `yandex.ru`, `yandex.com`, `yandex.net`, `yandexgo.com`, `yastatic.net`, `yastatic-net.ru`, `yastat.net`, `yccdn.ru`, `yndx.net`, `clck.ru`, `ya.cc`.
- Статус: покрытие экосистемы по доменам; проверить каждый целевой сценарий.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/yandex
- Найдены в community-списке (уже покрываются правилами выше): `300.ya.ru`, `3475482542.mc.yandex.ru`, `an.yandex.ru`, `api-maps.yandex.ru`, `api.browser.yandex.com`, `api.browser.yandex.ru`, `api.events.plus.yandex.net`, `api.s3.yandex.net`, `api.uxfeedback.yandex.net`, `avatars.mds.yandex.com`, `avatars.mds.yandex.net`, `bro-bg-store.s3.yandex.com`, `bro-bg-store.s3.yandex.net`, `bro-bg-store.s3.yandex.ru`, `brontp-pre.yandex.ru`, `browser.yandex.com`, `browser.yandex.ru`, `cdn.s3.yandex.net`, `cdn.yandex.ru`, `cdnrhkgfkkpupuotntfj.svc.cdn.yandex.net`, `cloud.cdn.yandex.com`, `cloud.cdn.yandex.net`, `cloud.cdn.yandex.ru`, `cloudcdn-ams19.cdn.yandex.net`, `cloudcdn-m9-10.cdn.yandex.net`, `cloudcdn-m9-12.cdn.yandex.net`, `cloudcdn-m9-13.cdn.yandex.net`, `cloudcdn-m9-14.cdn.yandex.net`, `cloudcdn-m9-15.cdn.yandex.net`, `cloudcdn-m9-2.cdn.yandex.net`, `cloudcdn-m9-3.cdn.yandex.net`, `cloudcdn-m9-4.cdn.yandex.net`, `cloudcdn-m9-5.cdn.yandex.net`, `cloudcdn-m9-6.cdn.yandex.net`, `cloudcdn-m9-7.cdn.yandex.net`, `cloudcdn-m9-9.cdn.yandex.net`, `collections.yandex.com`, `collections.yandex.ru`, `csp.yandex.net`, `dr.yandex.net`, `dr2.yandex.net`, `egress.yandex.net`, `enterprise.api-maps.yandex.ru`, `favicon.yandex.com`, `favicon.yandex.net`, `favicon.yandex.ru`, `frontend.vh.yandex.ru`, `http-check-headers.yandex.ru`, `informer.yandex.ru`, `kiks.yandex.com`, `kiks.yandex.ru`, `log.strm.yandex.ru`, `mail.yandex.com`, `mail.yandex.ru`, `mc.yandex.com`, `mc.yandex.ru`, `mediafeeds.yandex.com`, `mediafeeds.yandex.ru`, `neuro.translate.yandex.ru`, `s3.yandex.net`, `sba.yandex.com`, `sba.yandex.net`, `sba.yandex.ru`, `speller.yandex.net`, `static-mon.yandex.net`, `storage.ape.yandex.net`, `strm-rad-23.strm.yandex.net`, `strm.yandex.net`, `strm.yandex.ru`, `surveys.yandex.ru`, `sync.browser.yandex.net`, `travel.yandex.ru`, `travel.yastatic.net`, `uslugi.yandex.ru`, `uxfeedback-cdn.s3.yandex.net`, `uxfeedback.yandex.ru`, `wap.yandex.com`, `wap.yandex.ru`, `yabro-wbplugin.edadeal.yandex.ru`, `yabs.yandex.ru`, `zen-yabro-morda.mediascope.mc.yandex.ru`, `zen.yandex.com`, `zen.yandex.net`, `zen.yandex.ru`.

#### Кинопоиск

- Домены и все поддомены: `kinopoisk.ru`, `kinopoisk-ru.clstorage.net`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/kinopoisk
- Найдены в community-списке (уже покрываются правилами выше): `api.plus.kinopoisk.ru`, `crowdtest.payment-widget-smarttv.plus.tst.kinopoisk.ru`, `crowdtest.payment-widget.plus.tst.kinopoisk.ru`, `external-api.mediabilling.kinopoisk.ru`, `external-api.plus.kinopoisk.ru`, `graphql-web.kinopoisk.ru`, `graphql.kinopoisk.ru`, `hd.kinopoisk.ru`, `ma.kinopoisk.ru`, `microapps.kinopoisk.ru`, `oneclick-payment.kinopoisk.ru`, `payment-widget-smarttv.plus.kinopoisk.ru`, `payment-widget.kinopoisk.ru`, `payment-widget.plus.kinopoisk.ru`, `quiz.kinopoisk.ru`, `sso.kinopoisk.ru`, `st-im.kinopoisk.ru`, `st.kinopoisk.ru`, `tickets.widget.kinopoisk.ru`, `touch.kinopoisk.ru`, `widgets.kinopoisk.ru`, `www.kinopoisk.ru`.

### Госуслуги и медицина


#### Госуслуги / ЕСИА

- Домены и все поддомены: `gosuslugi.ru`, `gu-st.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-gov-ru
- Найдены в community-списке (уже покрываются правилами выше): `bot.gosuslugi.ru`, `contract.gosuslugi.ru`, `esia.gosuslugi.ru`, `gosweb.gosuslugi.ru`, `lk.gosuslugi.ru`, `map.gosuslugi.ru`, `novorossiya.gosuslugi.ru`, `partners.gosuslugi.ru`, `pos.gosuslugi.ru`, `sfd.gosuslugi.ru`, `voter.gosuslugi.ru`, `www.gosuslugi.ru`.

#### Госключ

- Домены и все поддомены: `goskey.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-gov-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### ФНС / Мой налог

- Домены и все поддомены: `nalog.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-gov-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Москва / Подмосковье

- Домены и все поддомены: `mos.ru`, `mosreg.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-gov-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### ЕМИАС

- Домены и все поддомены: `emias.info`, `emias.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-medicine-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Единая биометрическая система

- Домены и все поддомены: `ebs.ru`.
- Статус: основа; проверить на устройствах.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/category-gov-ru
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

### Автомобиль и транспорт — кандидаты


#### Парковки России

- Домены и все поддомены: `parking.mos.ru`.
- Статус: предлагается; API приложения и необходимость DIRECT проверить.
- Источник: https://parking.mos.ru/
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Автодор / T-pass

- Домены и все поддомены: `avtodor-tr.ru`.
- Статус: предлагается; API приложения и необходимость DIRECT проверить.
- Источник: https://avtodor-tr.ru/business/services/mobile-app/
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### StarLine

- Домены и все поддомены: `starline.ru`, `starline.online`.
- Статус: предлагается; API приложения и необходимость DIRECT проверить.
- Источник: https://support.starline.ru/communities/27/topics/85816-telematika-na-sajte-i-v-prilozhenii-na-telefone
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Pandora

- Домены и все поддомены: `pandora-on.com`.
- Статус: предлагается; API приложения и необходимость DIRECT проверить.
- Источник: https://pandorainfo.com/wp-content/uploads/2017/04/manual_DXL-1800L.pdf
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Делимобиль

- Домены и все поддомены: `delimobil.ru`.
- Статус: предлагается; API приложения и необходимость DIRECT проверить.
- Источник: https://delimobil.ru/
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### BelkaCar

- Домены и все поддомены: `belkacar.ru`.
- Статус: предлагается; API приложения и необходимость DIRECT проверить.
- Источник: https://belkacar.ru/
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### Ситидрайв

- Домены и все поддомены: `citydrive.ru`.
- Статус: предлагается; API приложения и необходимость DIRECT проверить.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/sber
- Отдельные поддомены в использованном community-списке не найдены; охват — домен и все поддомены, отдельные API/CDN уточняются тестированием.

#### 2ГИС

- Домены и все поддомены: `2gis.ae`, `2gis.am`, `2gis.az`, `2gis.by`, `2gis.com`, `2gis.com.cy`, `2gis.cz`, `2gis.ge`, `2gis.kg`, `2gis.kz`, `2gis.ru`, `2gis.tj`, `2gis.uz`, `2gis.tech`.
- Статус: предлагается; API приложения и необходимость DIRECT проверить.
- Источник: https://raw.githubusercontent.com/v2fly/domain-list-community/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/2gis
- Найдены в community-списке (уже покрываются правилами выше): `ams2-cdn.2gis.com`, `api.2gis.ru`, `api.photo.2gis.com`, `api.reviews.2gis.com`, `catalog.api.2gis.com`, `d-assets.2gis.ru`, `disk.2gis.com`, `favorites.api.2gis.com`, `filekeeper-vod.2gis.com`, `i0.photo.2gis.com`, `i1.photo.2gis.com`, `i2.photo.2gis.com`, `i3.photo.2gis.com`, `i4.photo.2gis.com`, `i5.photo.2gis.com`, `i6.photo.2gis.com`, `i7.photo.2gis.com`, `i8.photo.2gis.com`, `i9.photo.2gis.com`, `jam.api.2gis.com`, `keys.api.2gis.com`, `mapgl.2gis.com`, `public-api.reviews.2gis.com`, `s0.bss.2gis.com`, `s1.bss.2gis.com`, `styles.api.2gis.com`, `tile0.maps.2gis.com`, `tile1.maps.2gis.com`, `tile2.maps.2gis.com`, `tile3.maps.2gis.com`, `tile4.maps.2gis.com`.

## Следующие кандидаты — ещё не включены в реестр правил

- АЗС: Газпромнефть, Лукойл, Роснефть, Татнефть, Teboil.
- Электрозарядки: 2Chargers, Electro.cars, РусГидро ЭЗС, Россети, Яндекс Заправки. Подобрать под города пользователей.
- Приложения автомобилей: HAVAL Connection, CHERY, EXEED, Geely, Changan, LADA Connect; отдельно Li Auto и Zeekr. Не отправлять все китайские/зарубежные серверы напрямую без проверки региона аккаунта и приложения.
- Страхование и авто: РЕСО, Ингосстрах, АльфаСтрахование, Росгосстрах, Ренессанс Страхование, Авто.ру, Дром, Автокод, Exist, Emex, Autodoc.
- Дом: Домклик, Циан, Госуслуги Дом, Мосэнергосбыт, МособлЕИРЦ, ПИК Комфорт, Домиленд, приложения домофона и управляющей компании.
- Транспорт: РЖД, Туту, Аэрофлот, S7, Победа, Московский транспорт, Whoosh, Юрент.
- Связь: МТС, МегаФон, Билайн, T2, Yota, Ростелеком.
- Посылки: Почта России, СДЭК; актуальный статус брендов/приложений проверять при включении.
- Учёба: МЭШ, Дневник.ру, Учи.ру, РЭШ, Сферум; VK, Mail и облако Mail согласовать отдельно.
- Дополнить исходный охват: Мир, ЮMoney, ЮKassa, СФР, Росреестр, региональные МФЦ, Эльдорадо, Лемана ПРО. Требуется отдельная проверка актуальных доменов/API.
- Дополнительные региональные банки: Челиндбанк, Челябинвестбанк, УБРиР, Локо-Банк, СДМ-Банк, Центр-инвест, Металлинвестбанк. Проверить сайты и мобильные API перед включением.


## Приёмка перед внедрением

- Подтвердить владельца и актуальность дополнительных доменов, выбрать нужные банки/сервисы. Community-источник не является окончательным доказательством владения.
- На актуальных INCY iOS/Android проверить вход, каталог/карту, загрузку изображений, переход к оплате; сами платежи и команды управления автомобилем не выполнять в автоматической проверке.
- Проверить Wi-Fi, LTE, смену сети, IPv4/IPv6 и соответствие DNS прямому маршруту. Не собирать пароли, OTP, тела банковских запросов или полную историю пользователя.
- При недостающем домене фиксировать только hostname, сервис, ОС/версию и результат маршрута. Проверить общий CDN перед добавлением.
- Убедиться, что посторонние сайты, открытые через Яндекс Браузер, сохраняют VPN-маршрут; нет широких .ru/IP-исключений.
- Проверить импорт вместе с подпиской, последующее автообновление, обновление вручную, недоступный/невалидный файл и откат на тестовых аккаунтах.

## Воспроизводимость

`routing-inventory.json` — машинный реестр с источником на каждую группу и найденными поддоменами. Это не JSON-профиль для прямого импорта INCY.
`sources/` — неизменённые снимки списков; туда входят и неотобранные домены. Не подключать sources целиком к клиентам.
`collect_sources.py` скачивает свежую upstream-версию; запуск не нужен для использования готового реестра. `build_inventory.py` строит файлы из локальных источников.


Коммит v2fly: `5d939545c84e2a534f8e85ba6ffb2b51fa18fb76`.
