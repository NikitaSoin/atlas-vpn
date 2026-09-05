import { randomBytes, randomUUID } from "node:crypto";

/**
 * Хранилище: подписки и обращения в поддержку.
 *
 * Боевой режим — PostgreSQL (переменная DATABASE_URL, управляемая база
 * на Timeweb). Без неё работает память процесса — для локальной разработки.
 * Файл на диске не вариант: контейнер приложения пересобирается при каждом
 * пуше, и всё записанное стирается.
 */

export type SubRecord = {
  token: string;
  email: string;
  planId: string;
  months: number;
  autoRenew: boolean;
  expiresAt: Date;
  createdAt: Date;
  /** Пробный период без оплаты. После первой оплаты становится false. */
  isTrial: boolean;
  /** Пробный период уже брали — второй не даём. */
  trialUsed: boolean;
  /**
   * Идентификатор пользователя в VPN-панели (shortUuid). null — доступ ещё
   * не заведён: панель была недоступна при регистрации, планировщик
   * повторяет попытку. Аккаунт на сайте существует независимо от панели.
   */
  panelToken: string | null;
  /** chat_id пользователя в Telegram-боте, если привязал уведомления. */
  telegramChatId: string | null;
  /** Когда отправили «заканчивается через сутки» / «закончилась». */
  notifiedExpiring: Date | null;
  notifiedExpired: Date | null;
};

export type SubPatch = Partial<
  Pick<SubRecord, "planId" | "months" | "autoRenew" | "expiresAt" | "isTrial" | "trialUsed">
>;

export type ReminderKind = "expiring" | "expired";

export type TicketMessage = {
  author: "user" | "admin";
  body: string;
  createdAt: Date;
};

export type Ticket = {
  id: number;
  token: string;
  email: string;
  status: "open" | "closed";
  createdAt: Date;
  messages: TicketMessage[];
};

export type EventRecord = {
  event: string;
  path: string;
  ip: string;
  ua: string;
  ref: string;
};

export interface Store {
  addEvent(e: EventRecord): Promise<void>;
  /** Счётчики событий за последние N дней, по убыванию. */
  eventStats(days: number): Promise<{ event: string; count: number }[]>;
  findSubByEmail(email: string): Promise<SubRecord | null>;
  findSubByToken(token: string): Promise<SubRecord | null>;
  findSubByTelegram(chatId: string): Promise<SubRecord | null>;
  createSub(rec: NewSub): Promise<SubRecord>;
  /** Изменить срок/тариф/флаги. Токен и ссылка не меняются. */
  updateSub(token: string, patch: SubPatch): Promise<SubRecord | null>;
  setTelegram(token: string, chatId: string | null): Promise<void>;
  setPanelToken(token: string, panelToken: string): Promise<void>;
  /** Аккаунты, для которых доступ в панели ещё не заведён. */
  listUnprovisioned(limit: number): Promise<SubRecord[]>;
  /** Последние подписки — для админки. */
  listSubs(limit: number): Promise<SubRecord[]>;
  /**
   * Кому пора напомнить: заканчивается в ближайшие `hours` часов и ещё не
   * предупреждали, либо уже закончилась (не старше недели) и не сообщали.
   */
  listDueReminders(hours: number): Promise<{ sub: SubRecord; kind: ReminderKind }[]>;
  markNotified(token: string, kind: ReminderKind): Promise<void>;
  /** Код подтверждения почты (регистрация и вход). Живёт `ttlMinutes`. */
  createEmailCode(email: string, ttlMinutes: number): Promise<string>;
  /** true — код верный и не просрочен; код гасится при любом исходе проверки. */
  consumeEmailCode(email: string, code: string): Promise<boolean>;
  createTicket(email: string, body: string): Promise<Ticket>;
  getTicketByToken(token: string): Promise<Ticket | null>;
  getTicketById(id: number): Promise<Ticket | null>;
  listTickets(): Promise<Ticket[]>;
  addMessage(ticketId: number, author: "user" | "admin", body: string): Promise<void>;
  setTicketStatus(ticketId: number, status: "open" | "closed"): Promise<void>;
}

export type NewSub = Pick<
  SubRecord,
  "token" | "email" | "planId" | "months" | "autoRenew" | "expiresAt" | "isTrial"
> & { panelToken?: string | null };

/** Наш собственный токен аккаунта — хвост личной ссылки, не зависит от панели. */
export function newAccountToken(): string {
  return randomBytes(12).toString("hex");
}

function newCode(): string {
  // 6 цифр: 100000–999999.
  return String(100000 + (randomBytes(4).readUInt32BE(0) % 900000));
}

/** Кому и какое напоминание пора слать — общая логика для обоих хранилищ. */
function dueKind(sub: SubRecord, now: Date, hours: number): ReminderKind | null {
  const ms = sub.expiresAt.getTime() - now.getTime();
  if (ms > 0 && ms <= hours * 3600_000 && !sub.notifiedExpiring) return "expiring";
  if (ms <= 0 && ms > -7 * 86400_000 && !sub.notifiedExpired) return "expired";
  return null;
}

/* ------------------------------ PostgreSQL ------------------------------ */

const SCHEMA = `
CREATE TABLE IF NOT EXISTS subscriptions (
  token       TEXT PRIMARY KEY,
  email       TEXT UNIQUE NOT NULL,
  plan_id     TEXT NOT NULL,
  months      INT NOT NULL,
  auto_renew  BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Миграции: таблица могла быть создана до появления этих колонок.
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS is_trial BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS panel_token TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS trial_used BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS notified_expiring TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS notified_expired TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS subscriptions_expires_at ON subscriptions (expires_at);
CREATE TABLE IF NOT EXISTS email_codes (
  email       TEXT PRIMARY KEY,
  code        TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS tickets (
  id          SERIAL PRIMARY KEY,
  token       TEXT UNIQUE NOT NULL,
  email       TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ticket_messages (
  id          SERIAL PRIMARY KEY,
  ticket_id   INT NOT NULL REFERENCES tickets(id),
  author      TEXT NOT NULL,
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS events (
  id          SERIAL PRIMARY KEY,
  event       TEXT NOT NULL,
  path        TEXT NOT NULL DEFAULT '',
  ip          TEXT NOT NULL DEFAULT '',
  ua          TEXT NOT NULL DEFAULT '',
  ref         TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS events_created_at ON events (created_at);
`;

type PgRow = Record<string, unknown>;

/**
 * Параметры подключения. Управляемая PostgreSQL Timeweb подписана их
 * собственным корневым сертификатом, которого нет в системном наборе Node.
 * Чтобы `sslmode=verify-full` проходил, PEM-содержимое этого сертификата
 * кладём в DATABASE_SSL_CA. Тогда `sslmode` из строки убираем: параметры,
 * распарсенные из строки, перекрывают явный `ssl`, а нам нужен именно он.
 * Без DATABASE_SSL_CA строка используется как есть.
 */
/**
 * Панель хостинга при вставке многострочного PEM может потерять переводы
 * строк или заменить их на литеральные «\n». Восстанавливаем каноничный
 * вид: заголовки на своих строках, base64 по 64 символа. Принимаем и
 * вариант, когда в переменной лежит только base64 сертификата без заголовков.
 */
export function normalizePem(raw: string): string {
  const text = raw.replace(/\\n/g, "\n").trim();
  const blocks = [...text.matchAll(/-----BEGIN ([A-Z ]+)-----([\s\S]*?)-----END \1-----/g)];
  const wrap = (label: string, body: string) =>
    `-----BEGIN ${label}-----\n${body.replace(/[^A-Za-z0-9+/=]/g, "").replace(/(.{64})/g, "$1\n").trim()}\n-----END ${label}-----`;
  if (blocks.length === 0) return wrap("CERTIFICATE", text);
  return blocks.map((m) => wrap(m[1], m[2])).join("\n");
}

/**
 * Разбор строки подключения «вручную»: пароль, вставленный в панель как есть,
 * может содержать `#`, `>`, `@` и прочее, что ломает стандартный разбор URL.
 * Берём пароль как всё между первым «user:» и ПОСЛЕДНИМ «@» перед хостом,
 * а если он был закодирован (%23 и т. п.) — декодируем.
 */
export function parseDbUrl(raw: string) {
  const m = raw
    .trim()
    .match(/^postgres(?:ql)?:\/\/([^:\/@]+):(.*)@([^@\/:]+)(?::(\d+))?\/([^?]+)(?:\?(.*))?$/);
  if (!m) return null;
  const decode = (v: string) => {
    try {
      return decodeURIComponent(v);
    } catch {
      return v;
    }
  };
  const params = new URLSearchParams(m[6] ?? "");
  return {
    user: decode(m[1]),
    password: decode(m[2]),
    host: m[3],
    port: m[4] ? Number(m[4]) : 5432,
    database: decode(m[5]),
    sslmode: params.get("sslmode"),
  };
}

function pgConfig(url: string) {
  const rawCa = process.env.DATABASE_SSL_CA?.trim();
  const ca = rawCa ? normalizePem(rawCa) : "";
  const parsed = parseDbUrl(url);
  if (!parsed) {
    // Непохоже на наш формат — отдаём строку как есть, пусть разбирает pg.
    return ca ? { connectionString: url, ssl: { ca, rejectUnauthorized: true } } : { connectionString: url };
  }
  const { user, password, host, port, database, sslmode } = parsed;
  const ssl = ca
    ? { ca, rejectUnauthorized: true }
    : sslmode && sslmode !== "disable"
      ? { rejectUnauthorized: sslmode === "verify-full" || sslmode === "verify-ca" }
      : undefined;
  return { user, password, host, port, database, ...(ssl ? { ssl } : {}) };
}

class PgStore implements Store {
  // Тип пула без импорта типов pg на верхнем уровне (пакет серверный).
  private pool: { query(sql: string, params?: unknown[]): Promise<{ rows: PgRow[] }> } | null = null;
  private ready: Promise<void> | null = null;

  constructor(private url: string) {}

  private async init() {
    if (!this.ready) {
      this.ready = (async () => {
        const { Pool } = await import("pg");
        this.pool = new Pool({ ...pgConfig(this.url), max: 5 });
        await this.pool.query(SCHEMA);
      })();
    }
    await this.ready;
  }

  private async q(sql: string, params?: unknown[]) {
    await this.init();
    return this.pool!.query(sql, params);
  }

  private rowToSub(r: PgRow): SubRecord {
    return {
      token: r.token as string,
      email: r.email as string,
      planId: r.plan_id as string,
      months: r.months as number,
      autoRenew: r.auto_renew as boolean,
      expiresAt: new Date(r.expires_at as string),
      createdAt: new Date(r.created_at as string),
      isTrial: Boolean(r.is_trial),
      trialUsed: Boolean(r.trial_used),
      panelToken: (r.panel_token as string | null) ?? null,
      telegramChatId: (r.telegram_chat_id as string | null) ?? null,
      notifiedExpiring: r.notified_expiring ? new Date(r.notified_expiring as string) : null,
      notifiedExpired: r.notified_expired ? new Date(r.notified_expired as string) : null,
    };
  }

  async addEvent(e: EventRecord) {
    await this.q(
      "INSERT INTO events (event, path, ip, ua, ref) VALUES ($1, $2, $3, $4, $5)",
      [e.event, e.path, e.ip, e.ua, e.ref],
    );
  }

  async eventStats(days: number) {
    const { rows } = await this.q(
      `SELECT event, COUNT(*)::int AS count FROM events
       WHERE created_at > now() - ($1 || ' days')::interval
       GROUP BY event ORDER BY count DESC`,
      [days],
    );
    return rows.map((r) => ({ event: r.event as string, count: r.count as number }));
  }

  async findSubByEmail(email: string) {
    const { rows } = await this.q("SELECT * FROM subscriptions WHERE email = $1", [email]);
    return rows[0] ? this.rowToSub(rows[0]) : null;
  }

  async findSubByToken(token: string) {
    const { rows } = await this.q("SELECT * FROM subscriptions WHERE token = $1", [token]);
    return rows[0] ? this.rowToSub(rows[0]) : null;
  }

  async findSubByTelegram(chatId: string) {
    const { rows } = await this.q(
      "SELECT * FROM subscriptions WHERE telegram_chat_id = $1",
      [chatId],
    );
    return rows[0] ? this.rowToSub(rows[0]) : null;
  }

  async createSub(rec: NewSub) {
    const { rows } = await this.q(
      `INSERT INTO subscriptions (token, email, plan_id, months, auto_renew, expires_at, is_trial, panel_token, trial_used)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [rec.token, rec.email, rec.planId, rec.months, rec.autoRenew, rec.expiresAt, rec.isTrial, rec.panelToken ?? null, rec.isTrial],
    );
    return this.rowToSub(rows[0]);
  }

  async setPanelToken(token: string, panelToken: string) {
    await this.q("UPDATE subscriptions SET panel_token = $2 WHERE token = $1", [token, panelToken]);
  }

  async listUnprovisioned(limit: number) {
    const { rows } = await this.q(
      "SELECT * FROM subscriptions WHERE panel_token IS NULL AND plan_id <> 'none' ORDER BY created_at LIMIT $1",
      [limit],
    );
    return rows.map((r) => this.rowToSub(r));
  }

  async updateSub(token: string, patch: SubPatch) {
    const current = await this.findSubByToken(token);
    if (!current) return null;
    const next = { ...current, ...patch };
    const { rows } = await this.q(
      `UPDATE subscriptions
       SET plan_id = $2, months = $3, auto_renew = $4, expires_at = $5, is_trial = $6, trial_used = $7,
           -- новый срок — новые напоминания
           notified_expiring = CASE WHEN expires_at <> $5 THEN NULL ELSE notified_expiring END,
           notified_expired  = CASE WHEN expires_at <> $5 THEN NULL ELSE notified_expired END
       WHERE token = $1 RETURNING *`,
      [token, next.planId, next.months, next.autoRenew, next.expiresAt, next.isTrial, next.trialUsed || next.isTrial],
    );
    return this.rowToSub(rows[0]);
  }

  async setTelegram(token: string, chatId: string | null) {
    // Один чат — одна подписка: отвязываем чат от прежней, если была.
    if (chatId) {
      await this.q(
        "UPDATE subscriptions SET telegram_chat_id = NULL WHERE telegram_chat_id = $1 AND token <> $2",
        [chatId, token],
      );
    }
    await this.q("UPDATE subscriptions SET telegram_chat_id = $2 WHERE token = $1", [
      token,
      chatId,
    ]);
  }

  async listSubs(limit: number) {
    const { rows } = await this.q(
      "SELECT * FROM subscriptions ORDER BY created_at DESC LIMIT $1",
      [limit],
    );
    return rows.map((r) => this.rowToSub(r));
  }

  async listDueReminders(hours: number) {
    const { rows } = await this.q(
      `SELECT * FROM subscriptions
       WHERE (expires_at > now() AND expires_at <= now() + ($1 || ' hours')::interval
              AND notified_expiring IS NULL)
          OR (expires_at <= now() AND expires_at > now() - interval '7 days'
              AND notified_expired IS NULL)
       ORDER BY expires_at LIMIT 200`,
      [hours],
    );
    const now = new Date();
    return rows
      .map((r) => this.rowToSub(r))
      .map((sub) => ({ sub, kind: dueKind(sub, now, hours) }))
      .filter((x): x is { sub: SubRecord; kind: ReminderKind } => x.kind !== null);
  }

  async markNotified(token: string, kind: ReminderKind) {
    const col = kind === "expiring" ? "notified_expiring" : "notified_expired";
    await this.q(`UPDATE subscriptions SET ${col} = now() WHERE token = $1`, [token]);
  }

  async createEmailCode(email: string, ttlMinutes: number) {
    const code = newCode();
    await this.q(
      `INSERT INTO email_codes (email, code, expires_at)
       VALUES ($1, $2, now() + ($3 || ' minutes')::interval)
       ON CONFLICT (email) DO UPDATE SET code = EXCLUDED.code, expires_at = EXCLUDED.expires_at`,
      [email, code, ttlMinutes],
    );
    await this.q("DELETE FROM email_codes WHERE expires_at < now()");
    return code;
  }

  async consumeEmailCode(email: string, code: string) {
    // Гасим код при любой попытке — перебор шести цифр не даём.
    const { rows } = await this.q(
      "DELETE FROM email_codes WHERE email = $1 RETURNING code, expires_at",
      [email],
    );
    const rec = rows[0];
    return Boolean(rec && rec.code === code && new Date(rec.expires_at as string) > new Date());
  }

  private async hydrateTicket(r: PgRow): Promise<Ticket> {
    const { rows } = await this.q(
      "SELECT author, body, created_at FROM ticket_messages WHERE ticket_id = $1 ORDER BY id",
      [r.id],
    );
    return {
      id: r.id as number,
      token: r.token as string,
      email: r.email as string,
      status: r.status as Ticket["status"],
      createdAt: new Date(r.created_at as string),
      messages: rows.map((m) => ({
        author: m.author as TicketMessage["author"],
        body: m.body as string,
        createdAt: new Date(m.created_at as string),
      })),
    };
  }

  async createTicket(email: string, body: string) {
    const token = randomUUID().replace(/-/g, "").slice(0, 20);
    const { rows } = await this.q(
      "INSERT INTO tickets (token, email) VALUES ($1, $2) RETURNING *",
      [token, email],
    );
    await this.q(
      "INSERT INTO ticket_messages (ticket_id, author, body) VALUES ($1, 'user', $2)",
      [rows[0].id, body],
    );
    return this.hydrateTicket(rows[0]);
  }

  async getTicketByToken(token: string) {
    const { rows } = await this.q("SELECT * FROM tickets WHERE token = $1", [token]);
    return rows[0] ? this.hydrateTicket(rows[0]) : null;
  }

  async getTicketById(id: number) {
    const { rows } = await this.q("SELECT * FROM tickets WHERE id = $1", [id]);
    return rows[0] ? this.hydrateTicket(rows[0]) : null;
  }

  async listTickets() {
    const { rows } = await this.q(
      "SELECT * FROM tickets ORDER BY (status = 'open') DESC, id DESC LIMIT 200",
    );
    return Promise.all(rows.map((r) => this.hydrateTicket(r)));
  }

  async addMessage(ticketId: number, author: "user" | "admin", body: string) {
    await this.q(
      "INSERT INTO ticket_messages (ticket_id, author, body) VALUES ($1, $2, $3)",
      [ticketId, author, body],
    );
  }

  async setTicketStatus(ticketId: number, status: "open" | "closed") {
    await this.q("UPDATE tickets SET status = $2 WHERE id = $1", [ticketId, status]);
  }
}

/* ---------------------- Память процесса (разработка) --------------------- */

class MemoryStore implements Store {
  private subs: SubRecord[] = [];
  private codes = new Map<string, { code: string; expiresAt: Date }>();
  private tickets: Ticket[] = [];
  private nextTicketId = 1;
  private events: (EventRecord & { createdAt: Date })[] = [];

  async addEvent(e: EventRecord) {
    this.events.push({ ...e, createdAt: new Date() });
    if (this.events.length > 5000) this.events.shift();
  }

  async eventStats(days: number) {
    const since = Date.now() - days * 86400_000;
    const counts = new Map<string, number>();
    for (const e of this.events) {
      if (e.createdAt.getTime() < since) continue;
      counts.set(e.event, (counts.get(e.event) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([event, count]) => ({ event, count }))
      .sort((a, b) => b.count - a.count);
  }

  async findSubByEmail(email: string) {
    return this.subs.find((s) => s.email === email) ?? null;
  }
  async findSubByToken(token: string) {
    return this.subs.find((s) => s.token === token) ?? null;
  }
  async findSubByTelegram(chatId: string) {
    return this.subs.find((s) => s.telegramChatId === chatId) ?? null;
  }
  async createSub(rec: NewSub) {
    const full: SubRecord = {
      ...rec,
      trialUsed: rec.isTrial,
      panelToken: rec.panelToken ?? null,
      createdAt: new Date(),
      telegramChatId: null,
      notifiedExpiring: null,
      notifiedExpired: null,
    };
    this.subs.push(full);
    return full;
  }
  async updateSub(token: string, patch: SubPatch) {
    const sub = this.subs.find((s) => s.token === token);
    if (!sub) return null;
    if (patch.expiresAt && patch.expiresAt.getTime() !== sub.expiresAt.getTime()) {
      sub.notifiedExpiring = null;
      sub.notifiedExpired = null;
    }
    Object.assign(sub, patch);
    if (sub.isTrial) sub.trialUsed = true;
    return sub;
  }
  async setPanelToken(token: string, panelToken: string) {
    const sub = this.subs.find((s) => s.token === token);
    if (sub) sub.panelToken = panelToken;
  }
  async listUnprovisioned(limit: number) {
    return this.subs.filter((s) => !s.panelToken && s.planId !== "none").slice(0, limit);
  }
  async setTelegram(token: string, chatId: string | null) {
    for (const s of this.subs) {
      if (chatId && s.telegramChatId === chatId && s.token !== token) s.telegramChatId = null;
      if (s.token === token) s.telegramChatId = chatId;
    }
  }
  async listSubs(limit: number) {
    return [...this.subs].reverse().slice(0, limit);
  }
  async listDueReminders(hours: number) {
    const now = new Date();
    return this.subs
      .map((sub) => ({ sub, kind: dueKind(sub, now, hours) }))
      .filter((x): x is { sub: SubRecord; kind: ReminderKind } => x.kind !== null);
  }
  async markNotified(token: string, kind: ReminderKind) {
    const sub = this.subs.find((s) => s.token === token);
    if (!sub) return;
    if (kind === "expiring") sub.notifiedExpiring = new Date();
    else sub.notifiedExpired = new Date();
  }
  async createEmailCode(email: string, ttlMinutes: number) {
    const code = newCode();
    this.codes.set(email, { code, expiresAt: new Date(Date.now() + ttlMinutes * 60_000) });
    return code;
  }
  async consumeEmailCode(email: string, code: string) {
    const rec = this.codes.get(email);
    this.codes.delete(email);
    return Boolean(rec && rec.code === code && rec.expiresAt > new Date());
  }
  async createTicket(email: string, body: string) {
    const ticket: Ticket = {
      id: this.nextTicketId++,
      token: randomUUID().replace(/-/g, "").slice(0, 20),
      email,
      status: "open",
      createdAt: new Date(),
      messages: [{ author: "user", body, createdAt: new Date() }],
    };
    this.tickets.push(ticket);
    return ticket;
  }
  async getTicketByToken(token: string) {
    return this.tickets.find((t) => t.token === token) ?? null;
  }
  async getTicketById(id: number) {
    return this.tickets.find((t) => t.id === id) ?? null;
  }
  async listTickets() {
    return [...this.tickets].sort(
      (a, b) => Number(b.status === "open") - Number(a.status === "open") || b.id - a.id,
    );
  }
  async addMessage(ticketId: number, author: "user" | "admin", body: string) {
    this.tickets.find((t) => t.id === ticketId)?.messages.push({
      author,
      body,
      createdAt: new Date(),
    });
  }
  async setTicketStatus(ticketId: number, status: "open" | "closed") {
    const t = this.tickets.find((x) => x.id === ticketId);
    if (t) t.status = status;
  }
}

/* ------------------------------------------------------------------------ */

// globalThis — чтобы hot reload в dev не создавал новое хранилище на каждый файл.
const g = globalThis as unknown as { __store?: Store };

export function getStore(): Store {
  if (!g.__store) {
    const url = process.env.DATABASE_URL;
    g.__store = url ? new PgStore(url) : new MemoryStore();
  }
  return g.__store;
}

export const usingMemoryStore = !process.env.DATABASE_URL;
