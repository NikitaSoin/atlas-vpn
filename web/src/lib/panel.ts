import { randomUUID } from "node:crypto";

/**
 * Слой доступа к VPN-панели Remnawave (боевой сервер — Рига, панель v3).
 *
 * Реализация проверена против живого API 05.09.2026:
 *  - создание пользователя: POST /api/users
 *  - продление: PATCH /api/users (uuid + новый expireAt)
 *  - поиск: GET /api/users/by-short-uuid/{shortUuid}
 *  - контент подписки: GET /api/sub/{shortUuid} (base64 со списком vless://)
 *
 * Обязательные заголовки: Bearer-токен + X-Forwarded-Proto/For — панель
 * стоит за проверкой reverse-proxy и без них отвечает 403.
 *
 * Без PANEL_URL/PANEL_TOKEN работает мок — сайт можно разрабатывать локально.
 */

export type Subscription = {
  /** Числовой id пользователя в панели — им же идёт продление (PATCH). */
  userId: string;
  /** shortUuid — он же хвост подписочной ссылки и наш токен в БД. */
  token: string;
  /** Публичная подписочная ссылка (работает после настройки домена). */
  url: string;
  /**
   * Прямой vless:// линк — работает уже сейчас, без домена:
   * клиенты импортируют его копированием или через QR.
   */
  rawLink?: string;
  expiresAt: Date;
};

export type CreateInput = {
  /** Только для журнала на нашей стороне; в панель не передаётся. */
  email: string;
  /** Когда панель отключит доступ. Сайт сам считает грейс-период и триал. */
  expiresAt: Date;
  /** Лимит трафика в байтах, 0 — без лимита. Ненулевой только у триала. */
  trafficLimitBytes?: number;
};

export type UpdateInput = {
  expiresAt: Date;
  /** Если задано — переписать лимит (0 снимает лимит после оплаты триала). */
  trafficLimitBytes?: number;
};

export interface Panel {
  /** Адрес панели, который сейчас отвечает (для ссылок и проксирования). */
  publicBase?(): string;
  createSubscription(input: CreateInput): Promise<Subscription>;
  /** `withLink` — тянуть ли vless-линк отдельным запросом (нужен только при выдаче). */
  getSubscription(token: string, withLink?: boolean): Promise<Subscription | null>;
  /** Удалить доступ в панели. Вызывается при удалении аккаунта на сайте. */
  deleteSubscription(token: string): Promise<boolean>;
  /**
   * Новый срок и (опционально) лимит. Сайт — источник правды по датам.
   * `userId` — числовой id из панели: если он известен, лишний поисковый
   * запрос не делается, и продление укладывается в один сетевой вызов.
   */
  updateSubscription(
    token: string,
    input: UpdateInput,
    userId?: string | null,
  ): Promise<Subscription | null>;
}

/**
 * Запасной путь к панели — ретранслятор на Cloudflare Workers.
 *
 * Сеть хостинга сайта и сеть сервера панели не видят друг друга: пакеты не
 * доходят в обе стороны. Cloudflare доступен обеим, поэтому ходим через него
 * СРАЗУ, а прямой адрес держим запасным — иначе каждый первый запрос платил
 * бы таймаут за заведомо мёртвую попытку. Адрес не секрет, поэтому задан
 * прямо здесь: сайт работает без правки переменных на хостинге.
 * Переопределяется переменной PANEL_PROXY_URL, отключается значением "off".
 */
const PANEL_PROXY_DEFAULT = "https://irek-panel-proxy.nikitasoin.workers.dev";

export function panelProxyUrl(): string | null {
  const v = (process.env.PANEL_PROXY_URL ?? PANEL_PROXY_DEFAULT).trim();
  return v && v !== "off" ? v.replace(/\/$/, "") : null;
}

const SUBSCRIPTION_HOST =
  process.env.SUBSCRIPTION_HOST ?? "https://sub.example.com";

export function buildSubscriptionUrl(token: string): string {
  return `${SUBSCRIPTION_HOST.replace(/\/$/, "")}/sub/${token}`;
}

/**
 * Обезличенное имя учётной записи в панели.
 *
 * Почту сюда намеренно НЕ подмешиваем: панель стоит за пределами РФ, и любой
 * персональный признак в ней — трансграничная передача персональных данных.
 * Панели достаточно случайного имени, связь с аккаунтом хранится у нас в базе
 * (`subscriptions.panel_token`).
 */
function newPanelUsername(): string {
  return `u${randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

/* ------------------------------- Мок (dev) ------------------------------- */

class MockPanel implements Panel {
  private store = new Map<string, Subscription>();

  publicBase() {
    return SUBSCRIPTION_HOST.replace(/\/$/, "");
  }

  async createSubscription({ expiresAt }: CreateInput) {
    const token = randomUUID().replace(/-/g, "").slice(0, 16);
    const sub: Subscription = {
      userId: randomUUID(),
      token,
      url: buildSubscriptionUrl(token),
      expiresAt,
    };
    this.store.set(token, sub);
    return sub;
  }

  async getSubscription(token: string) {
    return this.store.get(token) ?? null;
  }

  async updateSubscription(token: string, { expiresAt }: UpdateInput) {
    const sub = this.store.get(token);
    if (!sub) return null;
    sub.expiresAt = expiresAt;
    return sub;
  }

  async deleteSubscription(token: string) {
    return this.store.delete(token);
  }
}

/* ---------------------------- Remnawave (prod) ---------------------------- */

type PanelUser = {
  /** Числовой id — им же идентифицируется пользователь в PATCH /api/users. */
  id: number;
  shortUuid: string;
  subscriptionUrl: string;
  expireAt: string;
};

class RemnawavePanel implements Panel {
  /** Прямой адрес панели из PANEL_URL — запасной путь. */
  private readonly directBase: string;
  /**
   * Адрес, по которому панель реально отвечает. Стартуем с ретранслятора,
   * при сетевой ошибке пробуем прямой и дальше держимся за то, что
   * сработало. Ошибки самой панели (4xx/5xx) переключением не считаются.
   */
  private activeBase: string;

  constructor(
    baseUrl: string,
    private readonly token: string,
    private readonly squadUuid: string,
  ) {
    this.directBase = baseUrl.replace(/\/$/, "");
    this.activeBase = panelProxyUrl() ?? this.directBase;
  }

  /** Кандидаты по порядку: рабочий, ретранслятор, прямой. Без повторов. */
  private bases(): string[] {
    return [...new Set([this.activeBase, panelProxyUrl(), this.directBase].filter(Boolean) as string[])];
  }

  /** Отряд, в который зачисляем новых: разрешается один раз и запоминается. */
  private squadResolved: string | null = null;

  /**
   * Какой отряд указывать при создании пользователя.
   *
   * Идентификатор отряда живёт в переменной окружения, а панель может быть
   * поднята заново — так и случилось 08.09.2026, когда сервер с прежней
   * панелью удалили. В переменной остался идентификатор от старой панели, и
   * панель отвечала «Failed to create user», то есть регистрация молча
   * ломалась на ровном месте.
   *
   * Поэтому идентификатор из переменной проверяем по списку панели, а если
   * такого отряда нет — берём первый существующий и пишем предупреждение.
   * У нас отряд всегда один, так что выбор однозначен.
   */
  private async squad(): Promise<string> {
    if (this.squadResolved) return this.squadResolved;
    try {
      const r = await this.request<{ response: unknown }>("/api/internal-squads");
      const raw = (r as { response: unknown }).response;
      const list = (Array.isArray(raw)
        ? raw
        : ((raw as { internalSquads?: unknown[] } | null)?.internalSquads ?? [])) as {
        uuid: string;
      }[];
      const known = list.some((x) => x.uuid === this.squadUuid);
      if (known || list.length === 0) {
        this.squadResolved = this.squadUuid;
      } else {
        this.squadResolved = list[0].uuid;
        console.warn(
          `[panel] отряд ${this.squadUuid} в панели не найден, использую ${list[0].uuid}. ` +
            "Поправьте PANEL_SQUAD_UUID в переменных окружения.",
        );
      }
    } catch {
      // Панель не ответила — не выдумываем, идём с тем, что задано.
      this.squadResolved = this.squadUuid;
    }
    return this.squadResolved;
  }

  /** Публичный адрес для ссылок клиенту — тот, который отвечает. */
  publicBase(): string {
    return this.activeBase;
  }

  private headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.token}`,
      // Панель требует признаки reverse-proxy (ProxyCheckMiddleware).
      "X-Forwarded-Proto": "https",
      "X-Forwarded-For": "127.0.0.1",
    };
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    let lastError: Error | null = null;
    for (const base of this.bases()) {
      let res: Response;
      try {
        res = await fetch(`${base}${path}`, {
          ...init,
          headers: { ...this.headers(), ...init?.headers },
          cache: "no-store",
          // Панель за границей: если сеть режет, не держим страницу минутами.
          signal: AbortSignal.timeout(5000),
        });
      } catch (e) {
        // Сеть не пустила — пробуем следующий адрес.
        lastError = e as Error;
        continue;
      }
      if (base !== this.activeBase) {
        console.log(`[panel] переключился на ${base}`);
        this.activeBase = base;
      }
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Panel ${res.status} ${path}: ${body.slice(0, 200)}`);
      }
      // DELETE отвечает 204 без тела — разбирать нечего.
      if (res.status === 204) return undefined as T;
      return res.json() as Promise<T>;
    }
    throw new Error(`Панель недоступна ни напрямую, ни через ретранслятор: ${lastError?.message}`);
  }

  /** Первый vless:// из подписки — для работы без домена. */
  private async fetchRawLink(shortUuid: string): Promise<string | undefined> {
    for (const base of this.bases()) {
      try {
        const res = await fetch(
          `${base}/api/sub/${shortUuid}`,
          {
          headers: {
            "X-Forwarded-Proto": "https",
            "X-Forwarded-For": "127.0.0.1",
              "User-Agent": "v2rayNG/1.9.5",
            },
            cache: "no-store",
            signal: AbortSignal.timeout(5000),
          },
        );
        if (!res.ok) return undefined;
        const decoded = Buffer.from(await res.text(), "base64").toString("utf8");
        return decoded.split("\n").find((l) => l.startsWith("vless://"));
      } catch {
        // Следующий адрес.
      }
    }
    return undefined;
  }

  /**
   * `withLink` — тянуть ли vless://-линк отдельным запросом. Нужен только
   * при первой выдаче доступа: дальше он лежит в базе. На продлении лишний
   * поход за ним удваивал время оплаты.
   */
  private async toSubscription(u: PanelUser, withLink: boolean): Promise<Subscription> {
    return {
      userId: String(u.id),
      token: u.shortUuid,
      // Панель отдаёт ссылку на свой прямой адрес. Собираем её от рабочего:
      // если сайт ходит через ретранслятор, клиент получит тот же путь и
      // сможет обновлять подписку даже там, где прямой адрес недоступен.
      url: `${this.activeBase}/api/sub/${u.shortUuid}`,
      rawLink: withLink ? await this.fetchRawLink(u.shortUuid) : undefined,
      expiresAt: new Date(u.expireAt),
    };
  }

  async createSubscription({ expiresAt, trafficLimitBytes = 0 }: CreateInput) {
    const created = await this.request<{ response: PanelUser }>("/api/users", {
      method: "POST",
      body: JSON.stringify({
        username: newPanelUsername(),
        status: "ACTIVE",
        expireAt: expiresAt.toISOString(),
        trafficLimitBytes,
        // Лимит триала считается один раз за весь срок, без сброса по дням.
        trafficLimitStrategy: "NO_RESET",
        activeInternalSquads: [await this.squad()],
        // Поле email панели не заполняем — см. newPanelUsername().
      }),
    });
    return this.toSubscription(created.response, true);
  }

  async getSubscription(token: string, withLink = true) {
    try {
      const found = await this.request<{ response: PanelUser }>(
        `/api/users/by-short-uuid/${token}`,
      );
      return await this.toSubscription(found.response, withLink);
    } catch {
      return null;
    }
  }

  /**
   * Удаление пользователя из панели. Панель принимает uuid, а у нас хранится
   * короткий идентификатор, поэтому uuid берём поиском.
   */
  async deleteSubscription(token: string) {
    try {
      const found = await this.request<{ response: { uuid?: string } }>(
        `/api/users/by-short-uuid/${token}`,
      );
      const uuid = found.response?.uuid;
      if (!uuid) return false;
      await this.request(`/api/users/${uuid}`, { method: "DELETE" });
      return true;
    } catch (e) {
      console.error("[panel] удаление не удалось:", (e as Error).message);
      return false;
    }
  }

  async updateSubscription(
    token: string,
    { expiresAt, trafficLimitBytes }: UpdateInput,
    userId?: string | null,
  ) {
    // id знаем — идём сразу на PATCH, иначе сначала ищем пользователя.
    let id = userId ? Number(userId) : NaN;
    if (!Number.isFinite(id)) {
      const current = await this.getSubscription(token, false);
      if (!current) return null;
      id = Number(current.userId);
    }
    const updated = await this.request<{ response: PanelUser }>("/api/users", {
      method: "PATCH",
      body: JSON.stringify({
        id,
        status: "ACTIVE",
        expireAt: expiresAt.toISOString(),
        ...(trafficLimitBytes !== undefined ? { trafficLimitBytes } : {}),
      }),
    });
    return this.toSubscription(updated.response, false);
  }
}

/* ------------------------------------------------------------------------- */

const g = globalThis as unknown as { __panel?: Panel };

export function getPanel(): Panel {
  if (!g.__panel) {
    const baseUrl = process.env.PANEL_URL;
    const token = process.env.PANEL_TOKEN;
    const squad = process.env.PANEL_SQUAD_UUID;
    g.__panel =
      baseUrl && token && squad
        ? new RemnawavePanel(baseUrl, token, squad)
        : new MockPanel();
  }
  return g.__panel;
}

export const usingMockPanel = !(
  process.env.PANEL_URL &&
  process.env.PANEL_TOKEN &&
  process.env.PANEL_SQUAD_UUID
);
