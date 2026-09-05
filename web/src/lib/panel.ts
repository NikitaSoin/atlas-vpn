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

export interface Panel {
  createSubscription(input: { email: string; months: number }): Promise<Subscription>;
  getSubscription(token: string): Promise<Subscription | null>;
  extendSubscription(token: string, months: number): Promise<Subscription | null>;
}

const SUBSCRIPTION_HOST =
  process.env.SUBSCRIPTION_HOST ?? "https://sub.example.com";

export function buildSubscriptionUrl(token: string): string {
  return `${SUBSCRIPTION_HOST.replace(/\/$/, "")}/sub/${token}`;
}

function addMonths(from: Date, months: number): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d;
}

/** email → допустимый username панели: буквы, цифры, _ и -. */
function usernameFromEmail(email: string): string {
  const base = email.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 24);
  return `${base}_${randomUUID().slice(0, 6)}`;
}

/* ------------------------------- Мок (dev) ------------------------------- */

class MockPanel implements Panel {
  private store = new Map<string, Subscription>();

  async createSubscription({ months }: { email: string; months: number }) {
    const token = randomUUID().replace(/-/g, "").slice(0, 16);
    const sub: Subscription = {
      userId: randomUUID(),
      token,
      url: buildSubscriptionUrl(token),
      expiresAt: addMonths(new Date(), months),
    };
    this.store.set(token, sub);
    return sub;
  }

  async getSubscription(token: string) {
    return this.store.get(token) ?? null;
  }

  async extendSubscription(token: string, months: number) {
    const sub = this.store.get(token);
    if (!sub) return null;
    const base = sub.expiresAt > new Date() ? sub.expiresAt : new Date();
    sub.expiresAt = addMonths(base, months);
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

  async createSubscription({ email, months }: { email: string; months: number }) {
    const expiresAt = addMonths(new Date(), months);
    const created = await this.request<{ response: PanelUser }>("/api/users", {
      method: "POST",
      body: JSON.stringify({
        username: usernameFromEmail(email),
        status: "ACTIVE",
        expireAt: expiresAt.toISOString(),
        trafficLimitBytes: 0,
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

  async extendSubscription(token: string, months: number) {
    const current = await this.getSubscription(token);
    if (!current) return null;
    const base = current.expiresAt > new Date() ? current.expiresAt : new Date();
    const expiresAt = addMonths(base, months);
    const updated = await this.request<{ response: PanelUser }>("/api/users", {
      method: "PATCH",
      body: JSON.stringify({
        id: Number(current.userId),
        status: "ACTIVE",
        expireAt: expiresAt.toISOString(),
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
