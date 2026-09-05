import { randomUUID } from "node:crypto";

/**
 * Слой доступа к VPN-панели.
 *
 * Пока VPS не поднят, работает мок-реализация: она выдаёт правдоподобную
 * подписочную ссылку, чтобы весь UX сайта можно было пройти целиком.
 * Когда появится сервер, здесь меняется только `RemnawavePanel` —
 * страницы и API-роуты трогать не нужно.
 */

export type Subscription = {
  /** Внутренний идентификатор пользователя в панели. */
  userId: string;
  /** Короткий токен, он же часть публичной ссылки на подписку. */
  token: string;
  /** Ссылка, которую пользователь вставляет в VPN-клиент. */
  url: string;
  /** Дата окончания доступа. */
  expiresAt: Date;
};

export interface Panel {
  createSubscription(input: {
    email: string;
    months: number;
  }): Promise<Subscription>;
  getSubscription(token: string): Promise<Subscription | null>;
}

const SUBSCRIPTION_HOST =
  process.env.SUBSCRIPTION_HOST ?? "https://sub.example.com";

function buildUrl(token: string): string {
  return `${SUBSCRIPTION_HOST.replace(/\/$/, "")}/sub/${token}`;
}

function addMonths(from: Date, months: number): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d;
}

/** Мок на время разработки. Хранит подписки в памяти процесса. */
class MockPanel implements Panel {
  private store = new Map<string, Subscription>();

  async createSubscription({ months }: { email: string; months: number }) {
    const token = randomUUID().replace(/-/g, "").slice(0, 24);
    const sub: Subscription = {
      userId: randomUUID(),
      token,
      url: buildUrl(token),
      expiresAt: addMonths(new Date(), months),
    };
    this.store.set(token, sub);
    return sub;
  }

  async getSubscription(token: string) {
    return this.store.get(token) ?? null;
  }
}

/**
 * Боевая реализация поверх Remnawave.
 * TODO: сверить пути и формат ответа с версией панели, которую развернём —
 * заполнять по её OpenAPI-схеме, а не по памяти.
 */
class RemnawavePanel implements Panel {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
  ) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl.replace(/\/$/, "")}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
        ...init?.headers,
      },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Panel request failed: ${res.status} ${path}`);
    }
    return res.json() as Promise<T>;
  }

  async createSubscription({
    email,
    months,
  }: {
    email: string;
    months: number;
  }): Promise<Subscription> {
    const expiresAt = addMonths(new Date(), months);
    const created = await this.request<{
      response: { uuid: string; subscriptionUuid: string };
    }>("/api/users", {
      method: "POST",
      body: JSON.stringify({
        username: email,
        expireAt: expiresAt.toISOString(),
        status: "ACTIVE",
      }),
    });
    const token = created.response.subscriptionUuid;
    return {
      userId: created.response.uuid,
      token,
      url: buildUrl(token),
      expiresAt,
    };
  }

  async getSubscription(token: string): Promise<Subscription | null> {
    try {
      const found = await this.request<{
        response: { uuid: string; expireAt: string };
      }>(`/api/users/by-subscription/${token}`);
      return {
        userId: found.response.uuid,
        token,
        url: buildUrl(token),
        expiresAt: new Date(found.response.expireAt),
      };
    } catch {
      return null;
    }
  }
}

const mock = new MockPanel();

export function getPanel(): Panel {
  const baseUrl = process.env.PANEL_URL;
  const token = process.env.PANEL_TOKEN;
  if (baseUrl && token) return new RemnawavePanel(baseUrl, token);
  return mock;
}

export const usingMockPanel = !(process.env.PANEL_URL && process.env.PANEL_TOKEN);
