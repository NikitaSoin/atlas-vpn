import { randomUUID } from "node:crypto";

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
};

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

export interface Store {
  findSubByEmail(email: string): Promise<SubRecord | null>;
  findSubByToken(token: string): Promise<SubRecord | null>;
  createSub(rec: Omit<SubRecord, "createdAt">): Promise<SubRecord>;
  /** Продление: та же подписка, тот же токен, срок прибавляется к остатку. */
  extendSub(token: string, months: number, autoRenew: boolean): Promise<SubRecord | null>;
  createTicket(email: string, body: string): Promise<Ticket>;
  getTicketByToken(token: string): Promise<Ticket | null>;
  getTicketById(id: number): Promise<Ticket | null>;
  listTickets(): Promise<Ticket[]>;
  addMessage(ticketId: number, author: "user" | "admin", body: string): Promise<void>;
  setTicketStatus(ticketId: number, status: "open" | "closed"): Promise<void>;
}

function addMonths(from: Date, months: number): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d;
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
`;

type PgRow = Record<string, unknown>;

class PgStore implements Store {
  // Тип пула без импорта типов pg на верхнем уровне (пакет серверный).
  private pool: { query(sql: string, params?: unknown[]): Promise<{ rows: PgRow[] }> } | null = null;
  private ready: Promise<void> | null = null;

  constructor(private url: string) {}

  private async init() {
    if (!this.ready) {
      this.ready = (async () => {
        const { Pool } = await import("pg");
        this.pool = new Pool({ connectionString: this.url, max: 5 });
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
    };
  }

  async findSubByEmail(email: string) {
    const { rows } = await this.q("SELECT * FROM subscriptions WHERE email = $1", [email]);
    return rows[0] ? this.rowToSub(rows[0]) : null;
  }

  async findSubByToken(token: string) {
    const { rows } = await this.q("SELECT * FROM subscriptions WHERE token = $1", [token]);
    return rows[0] ? this.rowToSub(rows[0]) : null;
  }

  async createSub(rec: Omit<SubRecord, "createdAt">) {
    const { rows } = await this.q(
      `INSERT INTO subscriptions (token, email, plan_id, months, auto_renew, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [rec.token, rec.email, rec.planId, rec.months, rec.autoRenew, rec.expiresAt],
    );
    return this.rowToSub(rows[0]);
  }

  async extendSub(token: string, months: number, autoRenew: boolean) {
    const current = await this.findSubByToken(token);
    if (!current) return null;
    const base = current.expiresAt > new Date() ? current.expiresAt : new Date();
    const next = addMonths(base, months);
    const { rows } = await this.q(
      "UPDATE subscriptions SET expires_at = $2, auto_renew = $3, months = $4 WHERE token = $1 RETURNING *",
      [token, next, autoRenew, months],
    );
    return this.rowToSub(rows[0]);
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
  private tickets: Ticket[] = [];
  private nextTicketId = 1;

  async findSubByEmail(email: string) {
    return this.subs.find((s) => s.email === email) ?? null;
  }
  async findSubByToken(token: string) {
    return this.subs.find((s) => s.token === token) ?? null;
  }
  async createSub(rec: Omit<SubRecord, "createdAt">) {
    const full = { ...rec, createdAt: new Date() };
    this.subs.push(full);
    return full;
  }
  async extendSub(token: string, months: number, autoRenew: boolean) {
    const sub = this.subs.find((s) => s.token === token);
    if (!sub) return null;
    const base = sub.expiresAt > new Date() ? sub.expiresAt : new Date();
    sub.expiresAt = addMonths(base, months);
    sub.autoRenew = autoRenew;
    sub.months = months;
    return sub;
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
