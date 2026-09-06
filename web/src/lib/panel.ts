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
  /** Идентификатор пользователя в панели (uuid) — нужен для продления. */
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
  createSubscription(input: CreateInput): Promise<Subscription>;
  getSubscription(token: string): Promise<Subscription | null>;
  /** Новый срок и (опционально) лимит. Сайт — источник правды по датам. */
  updateSubscription(token: string, input: UpdateInput): Promise<Subscription | null>;
}

/**
 * Запасной путь к панели — ретранслятор на Cloudflare Workers.
 *
 * Сеть хостинга сайта и сеть сервера панели не видят друг друга: пакеты не
 * доходят в обе стороны. Cloudflare доступен обеим, поэтому если прямой
 * адрес не отвечает, запросы идут через него. Адрес не секрет, поэтому
 * задан прямо здесь: сайт чинится сам, без правки переменных на хостинге.
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

/** email → допустимый username панели: буквы, цифры, _ и -. */
function usernameFromEmail(email: string): string {
  const base = email.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 24);
  return `${base}_${randomUUID().slice(0, 6)}`;
}

/* ------------------------------- Мок (dev) ------------------------------- */

class MockPanel implements Panel {
  private store = new Map<string, Subscription>();

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
  /**
   * Адрес, по которому панель реально отвечает. Начинаем с прямого, при
   * сетевой ошибке один раз пробуем ретранслятор и дальше держимся за то,
   * что сработало. Ошибки самой панели (4xx/5xx) переключением не считаются.
   */
  private activeBase: string;

  constructor(
    baseUrl: string,
    private readonly token: string,
    private readonly squadUuid: string,
  ) {
    this.activeBase = baseUrl.replace(/\/$/, "");
  }

  /** Кандидаты по порядку: текущий рабочий, затем ретранслятор. */
  private bases(): string[] {
    const proxy = panelProxyUrl();
    return proxy && proxy !== this.activeBase ? [this.activeBase, proxy] : [this.activeBase];
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

  private async toSubscription(u: PanelUser): Promise<Subscription> {
    return {
      userId: String(u.id),
      token: u.shortUuid,
      // Панель отдаёт ссылку на свой прямой адрес. Собираем её от рабочего:
      // если сайт ходит через ретранслятор, клиент получит тот же путь и
      // сможет обновлять подписку даже там, где прямой адрес недоступен.
      url: `${this.activeBase}/api/sub/${u.shortUuid}`,
      rawLink: await this.fetchRawLink(u.shortUuid),
      expiresAt: new Date(u.expireAt),
    };
  }

  async createSubscription({ email, expiresAt, trafficLimitBytes = 0 }: CreateInput) {
    const created = await this.request<{ response: PanelUser }>("/api/users", {
      method: "POST",
      body: JSON.stringify({
        username: usernameFromEmail(email),
        status: "ACTIVE",
        expireAt: expiresAt.toISOString(),
        trafficLimitBytes,
        // Лимит триала считается один раз за весь срок, без сброса по дням.
        trafficLimitStrategy: "NO_RESET",
        activeInternalSquads: [this.squadUuid],
        email,
      }),
    });
    return this.toSubscription(created.response);
  }

  async getSubscription(token: string) {
    try {
      const found = await this.request<{ response: PanelUser }>(
        `/api/users/by-short-uuid/${token}`,
      );
      return await this.toSubscription(found.response);
    } catch {
      return null;
    }
  }

  async updateSubscription(token: string, { expiresAt, trafficLimitBytes }: UpdateInput) {
    const current = await this.getSubscription(token);
    if (!current) return null;
    const updated = await this.request<{ response: PanelUser }>("/api/users", {
      method: "PATCH",
      body: JSON.stringify({
        id: Number(current.userId),
        status: "ACTIVE",
        expireAt: expiresAt.toISOString(),
        ...(trafficLimitBytes !== undefined ? { trafficLimitBytes } : {}),
      }),
    });
    return this.toSubscription(updated.response);
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
