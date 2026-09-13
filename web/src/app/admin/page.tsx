import Link from "next/link";
import type { ReactNode } from "react";
import { adminConfigured, isAdmin } from "@/lib/admin";
import { getStore } from "@/lib/db";
import { formatDate, stateLabel, subState } from "@/lib/subscription";

/**
 * Воронка: от посещения сайта до оплаты. Считается по своим событиям
 * (таблица `events`), сторонних счётчиков на сайте нет.
 */
const FUNNEL: { event: string; label: string }[] = [
  { event: "page_view", label: "Открыли сайт" },
  { event: "cta_click", label: "Нажали «попробовать»" },
  { event: "tariff_click", label: "Выбрали тариф" },
  { event: "code_sent", label: "Запросили код" },
  { event: "account_created", label: "Подтвердили почту" },
  { event: "trial_started", label: "Включили пробный период" },
  { event: "client_install_click", label: "Пошли ставить приложение" },
  { event: "config_import_click", label: "Импортировали конфигурацию" },
  { event: "checkout_new", label: "Начали оплату" },
  { event: "payment_granted", label: "Оплатили" },
];


export const dynamic = "force-dynamic";

const inputCls =
  "rounded-xl border border-line bg-ink px-3 py-2 text-sm outline-none focus:border-accent";
const btnCls =
  "rounded-xl border border-line px-3 py-1.5 text-xs transition hover:border-accent";

/** Результат последнего действия — приходит параметром после редиректа. */
function Notice({ tone, children }: { tone: "ok" | "bad"; children: ReactNode }) {
  return (
    <p
      className={`mt-3 rounded-xl px-3 py-2 text-sm ${
        tone === "ok" ? "bg-good/10 text-good" : "bg-bad/10 text-bad"
      }`}
    >
      {children}
    </p>
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    err?: string;
    ok?: string;
    fail?: string;
    promo?: string;
    promoerr?: string;
  }>;
}) {
  const { err, ok, fail, promo, promoerr } = await searchParams;

  if (!adminConfigured()) {
    return (
      <main className="mx-auto max-w-md px-5 py-16">
        <h1 className="text-2xl font-semibold">Админка не настроена</h1>
        <p className="mt-2 text-muted">
          Задайте переменную окружения <code>ADMIN_CODE</code> в панели
          хостинга.
        </p>
      </main>
    );
  }

  if (!(await isAdmin())) {
    return (
      <main className="mx-auto max-w-sm px-5 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">Вход</h1>
        {err && (
          <p className="mt-2 text-sm text-red-400">Неверный код, попробуйте ещё раз.</p>
        )}
        <form
          action="/api/admin"
          method="POST"
          className="mt-6 space-y-4 rounded-2xl border border-line bg-surface p-6"
        >
          <input type="hidden" name="action" value="login" />
          <input
            type="password"
            name="code"
            required
            placeholder="Код доступа"
            className="w-full rounded-xl border border-line bg-ink px-4 py-2.5 outline-none focus:border-accent"
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-primary px-4 py-2.5 font-medium text-white transition hover:brightness-110"
          >
            Войти
          </button>
        </form>
      </main>
    );
  }

  const store = getStore();
  const [tickets, stats7, stats1, subs, promos] = await Promise.all([
    store.listTickets(),
    store.eventStats(7),
    store.eventStats(1),
    store.listSubs(200),
    store.listPromos(),
  ]);
  const now = new Date();
  const byState = new Map<string, number>();
  for (const s of subs) {
    const st = subState(s);
    byState.set(st, (byState.get(st) ?? 0) + 1);
  }
  const open = tickets.filter((t) => t.status === "open");
  const today = new Map(stats1.map((s) => [s.event, s.count]));
  const byEvent = new Map(stats7.map((s) => [s.event, s.count]));
  const funnelTop = byEvent.get("page_view") ?? 0;
  const funnel = FUNNEL.map((step) => {
    const count = byEvent.get(step.event) ?? 0;
    return { ...step, count, share: funnelTop > 0 ? Math.round((count / funnelTop) * 100) : 0 };
  });

  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Панель</h1>

      <section className="mt-6 rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-medium">
          Воронка <span className="text-sm text-muted">· за 7 дней, боты отфильтрованы</span>
        </h2>
        <div className="mt-3 space-y-1.5">
          {funnel.map((step) => (
            <div key={step.event} className="flex items-center gap-3 text-sm">
              <span className="w-56 shrink-0 text-muted">{step.label}</span>
              <span className="w-12 shrink-0 text-right font-medium">{step.count}</span>
              <span className="w-12 shrink-0 text-right text-xs text-muted">{step.share}%</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                <span
                  className="block h-full rounded-full bg-accent"
                  style={{ width: `${step.share}%` }}
                />
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">
          Доли считаются от числа открытий сайта. Один человек может дать несколько
          событий, поэтому это воронка по действиям, а не по уникальным людям.
        </p>
      </section>

      <section className="mt-6 rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-medium">
          Все события <span className="text-sm text-muted">· живые люди, боты отфильтрованы</span>
        </h2>
        {stats7.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Событий пока нет.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-muted">
              <tr>
                <th className="py-1 font-normal">Событие</th>
                <th className="py-1 font-normal">Сегодня</th>
                <th className="py-1 font-normal">7 дней</th>
              </tr>
            </thead>
            <tbody>
              {stats7.map((s) => (
                <tr key={s.event} className="border-t border-line/60">
                  <td className="py-1.5">{s.event}</td>
                  <td className="py-1.5">{today.get(s.event) ?? 0}</td>
                  <td className="py-1.5">{s.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-medium">
          Подписки{" "}
          <span className="text-sm text-muted">
            · пробных: {byState.get("trial") ?? 0} · платных: {byState.get("active") ?? 0} ·
            истекших: {(byState.get("grace") ?? 0) + (byState.get("expired") ?? 0)} ·
            бесплатных: {subs.filter((s) => s.planId === "unlimited").length}
          </span>
        </h2>
        {/*
          Бесплатный доступ для своих: подписка без срока и лимита трафика.
          Прав на управление сервисом не даёт. Кнопка в строке — для тех, кто
          в списке; форма ниже — для любого адреса, если аккаунт старше
          показанных двухсот.
        */}
        {ok && <Notice tone="ok">Готово: {ok}</Notice>}
        {fail && (
          <Notice tone="bad">
            Не вышло: {fail}. Аккаунт с такой почтой не найден или доступ уже в этом состоянии.
          </Notice>
        )}
        <form action="/api/admin" method="POST" className="mt-3 flex flex-wrap items-center gap-2">
          <input type="hidden" name="action" value="grant_unlimited" />
          <input
            type="email"
            name="email"
            required
            placeholder="почта аккаунта"
            className={`${inputCls} min-w-0 flex-1`}
          />
          <button type="submit" className={btnCls}>
            Выдать бесплатный доступ
          </button>
        </form>
        {subs.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Пока никого.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="mt-3 w-full text-sm">
              <thead className="text-left text-muted">
                <tr>
                  <th className="py-1 font-normal">Email</th>
                  <th className="py-1 font-normal">Статус</th>
                  <th className="py-1 font-normal">До</th>
                  <th className="py-1 font-normal">TG</th>
                  <th className="py-1 font-normal">Приглашён</th>
                  <th className="py-1 font-normal"></th>
                </tr>
              </thead>
              <tbody>
                {subs.map((s) => {
                  const free = s.planId === "unlimited";
                  const inviter = s.referredBy
                    ? subs.find((x) => x.token === s.referredBy)?.email ?? "да"
                    : "";
                  return (
                    <tr key={s.token} className="border-t border-line/60">
                      <td className="py-1.5">{s.email}</td>
                      <td className="py-1.5">
                        {free ? "Бесплатный" : stateLabel[subState(s)].split(" — ")[0]}
                        {!s.panelToken && s.planId !== "none" && (
                          <span className="ml-1 text-amber-700">· без доступа в панели</span>
                        )}
                      </td>
                      <td className="py-1.5">{free ? "∞" : formatDate(s.expiresAt)}</td>
                      <td className="py-1.5">{s.telegramChatId ? "✓" : ""}</td>
                      <td className="py-1.5 text-muted">{inviter}</td>
                      <td className="py-1.5 text-right">
                        <form action="/api/admin" method="POST">
                          <input
                            type="hidden"
                            name="action"
                            value={free ? "revoke_unlimited" : "grant_unlimited"}
                          />
                          <input type="hidden" name="email" value={s.email} />
                          <button type="submit" className={btnCls}>
                            {free ? "Снять бесплатный" : "Бесплатно навсегда"}
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-medium">
          Промокоды{" "}
          <span className="text-sm text-muted">· код даёт дни, применяется в кабинете</span>
        </h2>
        {promo && (
          <Notice tone="ok">
            Создан код <b className="font-mono">{promo}</b>
          </Notice>
        )}
        {promoerr && (
          <Notice tone="bad">
            Код <b className="font-mono">{promoerr}</b> уже существует.
          </Notice>
        )}
        {/*
          Настройки: сколько дней (готовые сроки или своё число), сколько раз
          можно применить (1 — разовый) и до какой даты действует. Пустой код
          сгенерируется сам — придуманные людьми коды подбираются перебором.
        */}
        <form
          action="/api/admin"
          method="POST"
          className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]"
        >
          <input type="hidden" name="action" value="create_promo" />
          <label className="text-xs text-muted">
            Срок
            <select name="days" defaultValue="7" className={`${inputCls} mt-1 w-full`}>
              <option value="7">7 дней (неделя)</option>
              <option value="14">14 дней</option>
              <option value="30">30 дней (месяц)</option>
              <option value="90">90 дней</option>
              <option value="180">180 дней (полгода)</option>
              <option value="365">365 дней (год)</option>
            </select>
          </label>
          <label className="text-xs text-muted">
            Своё число дней
            <input
              type="number"
              name="days_custom"
              min={1}
              max={365}
              placeholder="если не из списка"
              className={`${inputCls} mt-1 w-full`}
            />
          </label>
          <label className="text-xs text-muted">
            Применений (1 — разовый)
            <input
              type="number"
              name="uses"
              min={1}
              max={10000}
              defaultValue={1}
              className={`${inputCls} mt-1 w-full`}
            />
          </label>
          <label className="text-xs text-muted">
            Действует до
            <input type="date" name="expires" className={`${inputCls} mt-1 w-full`} />
          </label>
          <label className="text-xs text-muted">
            Код (пусто — сгенерировать)
            <input
              name="code"
              maxLength={32}
              placeholder="IREK…"
              className={`${inputCls} mt-1 w-full uppercase`}
            />
          </label>
          <button type="submit" className={`${btnCls} sm:col-span-5 sm:justify-self-start`}>
            Создать промокод
          </button>
        </form>
        {promos.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Промокодов пока нет.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="mt-3 w-full text-sm">
              <thead className="text-left text-muted">
                <tr>
                  <th className="py-1 font-normal">Код</th>
                  <th className="py-1 font-normal">Дней</th>
                  <th className="py-1 font-normal">Осталось применений</th>
                  <th className="py-1 font-normal">Действует до</th>
                </tr>
              </thead>
              <tbody>
                {promos.map((p) => {
                  const dead = p.usesLeft <= 0 || (p.expiresAt !== null && p.expiresAt <= now);
                  return (
                    <tr key={p.code} className={`border-t border-line/60 ${dead ? "text-muted" : ""}`}>
                      <td className="py-1.5 font-mono">{p.code}</td>
                      <td className="py-1.5">{p.days}</td>
                      <td className="py-1.5">{p.usesLeft}</td>
                      <td className="py-1.5">
                        {p.expiresAt ? formatDate(p.expiresAt) : "бессрочно"}
                        {dead && " · не действует"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <h2 className="mt-10 text-xl font-semibold tracking-tight">
        Обращения{" "}
        <span className="text-muted">
          · открытых: {open.length} из {tickets.length}
        </span>
      </h2>

      <div className="mt-8 space-y-2">
        {tickets.length === 0 && (
          <p className="text-muted">Пока пусто — ни одного обращения.</p>
        )}
        {tickets.map((t) => {
          const last = t.messages[t.messages.length - 1];
          return (
            <Link
              key={t.id}
              href={`/admin/t/${t.id}`}
              className={`block rounded-2xl border p-4 transition hover:border-accent ${
                t.status === "open" ? "border-line bg-surface" : "border-line/50 bg-ink"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <span className="font-medium">
                  #{t.id} · {t.email}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs ${
                    t.status === "open"
                      ? "bg-accent-soft text-accent-ink"
                      : "bg-surface-2 text-muted"
                  }`}
                >
                  {t.status === "open" ? "открыто" : "закрыто"}
                </span>
              </div>
              {last && (
                <p className="mt-1.5 truncate text-sm text-muted">
                  {last.author === "admin" ? "Вы: " : ""}
                  {last.body}
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </main>
  );
}
