/**
 * Временный мост: выдать доступ в VPN-панели аккаунтам, которым сайт не смог
 * его выдать сам.
 *
 * Зачем: IP сервера панели заблокирован в сети хостинга сайта, и сайт до
 * панели не дозванивается. С ноутбука панель доступна, поэтому эту работу
 * можно сделать отсюда. Как только у панели будет доступный IP (или домен
 * за Cloudflare), скрипт станет не нужен — сайт делает то же самое сам
 * (`provisionPending` в web/src/lib/subscription.ts).
 *
 * Запуск из папки web:
 *   node scripts/provision.mjs
 *
 * Ключи берутся из ../СТАРТ_С_КЛЮЧАМИ.md (файл в репозиторий не уезжает).
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { randomUUID } from "node:crypto";
import pg from "pg";

const KEYS = new URL("../../СТАРТ_С_КЛЮЧАМИ.md", import.meta.url);
const keys = readFileSync(KEYS, "utf8");
const val = (name) =>
  (keys.match(new RegExp(`^${name}=(.*)$`, "m"))?.[1] ?? "").trim();

const PANEL_URL = (process.env.PANEL_URL ?? val("PANEL_URL")).replace(/\/$/, "");
const PANEL_TOKEN = process.env.PANEL_TOKEN ?? val("PANEL_TOKEN");
const SQUAD = process.env.PANEL_SQUAD_UUID ?? val("PANEL_SQUAD_UUID");
const DATABASE_URL = process.env.DATABASE_URL ?? val("DATABASE_URL");
const CA = readFileSync(`${homedir()}/.cloud-certs/root.crt`, "utf8");
const GRACE_HOURS = 24;
const TRIAL_TRAFFIC_GB = Number(process.env.TRIAL_TRAFFIC_GB ?? 10);

function pgConfig(url) {
  const m = url.match(
    /^postgres(?:ql)?:\/\/([^:/@]+):(.*)@([^@/:]+)(?::(\d+))?\/([^?]+)(?:\?(.*))?$/,
  );
  if (!m) throw new Error("не разобрать DATABASE_URL");
  const dec = (v) => {
    try {
      return decodeURIComponent(v);
    } catch {
      return v;
    }
  };
  return {
    user: dec(m[1]),
    password: dec(m[2]),
    host: m[3],
    port: m[4] ? Number(m[4]) : 5432,
    database: dec(m[5]),
    ssl: { ca: CA, rejectUnauthorized: true },
    connectionTimeoutMillis: 30000,
  };
}

async function createInPanel({ email, expiresAt, isTrial }) {
  const expireAt = isTrial
    ? expiresAt
    : new Date(expiresAt.getTime() + GRACE_HOURS * 3600_000);
  const username = `${email.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 24)}_${randomUUID().slice(0, 6)}`;
  const res = await fetch(`${PANEL_URL}/api/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PANEL_TOKEN}`,
      "X-Forwarded-Proto": "https",
      "X-Forwarded-For": "127.0.0.1",
    },
    body: JSON.stringify({
      username,
      status: "ACTIVE",
      expireAt: expireAt.toISOString(),
      trafficLimitBytes: isTrial ? Math.round(TRIAL_TRAFFIC_GB * 1024 ** 3) : 0,
      trafficLimitStrategy: "NO_RESET",
      activeInternalSquads: [SQUAD],
      email,
    }),
  });
  if (!res.ok) throw new Error(`панель ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const u = (await res.json()).response;
  return { shortUuid: u.shortUuid, url: u.subscriptionUrl ?? null };
}

/** Прямой vless:// линк — его копируют и кодируют в QR. */
async function fetchRawLink(shortUuid) {
  try {
    const res = await fetch(`${PANEL_URL}/api/sub/${shortUuid}`, {
      headers: {
        "X-Forwarded-Proto": "https",
        "X-Forwarded-For": "127.0.0.1",
        "User-Agent": "v2rayNG/1.9.5",
      },
    });
    if (!res.ok) return null;
    const decoded = Buffer.from(await res.text(), "base64").toString("utf8");
    return decoded.split("\n").find((l) => l.startsWith("vless://")) ?? null;
  } catch {
    return null;
  }
}

const pool = new pg.Pool(pgConfig(DATABASE_URL));
try {
  // Берём и тех, кому доступ ещё не выдан, и тех, у кого не сохранена ссылка.
  const { rows } = await pool.query(
    `SELECT token, email, is_trial, expires_at, panel_token FROM subscriptions
     WHERE plan_id <> 'none' AND (panel_token IS NULL OR panel_link IS NULL)
     ORDER BY created_at`,
  );
  if (rows.length === 0) {
    console.log("Все аккаунты уже с доступом — делать нечего.");
  }
  for (const r of rows) {
    try {
      let shortUuid = r.panel_token;
      let url = null;
      if (!shortUuid) {
        ({ shortUuid, url } = await createInPanel({
          email: r.email,
          expiresAt: new Date(r.expires_at),
          isTrial: r.is_trial,
        }));
      } else {
        url = `${PANEL_URL}/api/sub/${shortUuid}`;
      }
      const link = await fetchRawLink(shortUuid);
      await pool.query(
        `UPDATE subscriptions SET panel_token = $2, panel_url = $3, panel_link = COALESCE($4, panel_link)
         WHERE token = $1`,
        [r.token, shortUuid, url, link],
      );
      console.log(`✓ ${r.email} → ${shortUuid}${link ? " (ссылка сохранена)" : " (без ссылки)"}`);
    } catch (e) {
      console.log(`✗ ${r.email}: ${e.message}`);
    }
  }
} finally {
  await pool.end();
}
