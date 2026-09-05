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
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
    private readonly squadUuid: string,
  ) {}

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
    const res = await fetch(`${this.baseUrl.replace(/\/$/, "")}${path}`, {
      ...init,
      headers: { ...this.headers(), ...init?.headers },
      cache: "no-store",
      // Панель за границей: если сеть режет, не держим страницу минутами.
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Panel ${res.status} ${path}: ${body.slice(0, 200)}`);
    }
    return res.json() as Promise<T>;
  }

  /** Первый vless:// из подписки — для работы без домена. */
  private async fetchRawLink(shortUuid: string): Promise<string | undefined> {
    try {
      const res = await fetch(
        `${this.baseUrl.replace(/\/$/, "")}/api/sub/${shortUuid}`,
        {
          headers: {
            "X-Forwarded-Proto": "https",
            "X-Forwarded-For": "127.0.0.1",
            "User-Agent": "v2rayNG/1.9.5",
          },
          cache: "no-store",
          signal: AbortSignal.timeout(8000),
        },
      );
      if (!res.ok) return undefined;
      const decoded = Buffer.from(await res.text(), "base64").toString("utf8");
      return decoded.split("\n").find((l) => l.startsWith("vless://"));
    } catch {
      return undefined;
    }
  }

  private async toSubscription(u: PanelUser): Promise<Subscription> {
    return {
      userId: String(u.id),
      token: u.shortUuid,
      url: u.subscriptionUrl,
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
