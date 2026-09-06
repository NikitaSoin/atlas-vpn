/**
 * Планировщик напоминаний внутри процесса сайта: раз в 10 минут проверяет,
 * кому пора написать. Отдельный воркер и cron на хостинге не нужны.
 * Тот же проход можно дёрнуть вручную: GET /api/cron?key=ADMIN_CODE.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.REMINDERS_DISABLED === "1") return;
  const { runReminders } = await import("./lib/notify");
  const { provisionPending, reconcilePanel } = await import("./lib/subscription");
  const tick = async () => {
    try {
      const r = await reconcilePanel();
      if (r) console.log(`[panel] выровнено сроков: ${r}`);
      const n = await runReminders();
      if (n) console.log(`[reminders] отправлено: ${n}`);
    } catch (e) {
      console.error("[reminders]", (e as Error).message);
    }
  };
  // Выдача доступов — часто и дёшево (запрос в базу), напоминания — раз в 10 минут.
  const provisionTick = async () => {
    try {
      const p = await provisionPending();
      if (p) console.log(`[panel] доведено доступов: ${p}`);
    } catch (e) {
      console.error("[panel]", (e as Error).message);
    }
  };
  setTimeout(provisionTick, 5_000);
  setInterval(provisionTick, 60_000);
  setTimeout(tick, 30_000);
  setInterval(tick, 10 * 60_000);

  // Чистка статистики: храним не дольше, чем нужно для цели (ч. 7 ст. 5
  // 152-ФЗ). Срок задаётся EVENTS_RETENTION_DAYS, по умолчанию год.
  const { getStore } = await import("./lib/db");
  const purge = async () => {
    try {
      const days = Number(process.env.EVENTS_RETENTION_DAYS ?? 365);
      const removed = await getStore().purgeOldEvents(days);
      if (removed) console.log(`[статистика] удалено записей старше ${days} дней: ${removed}`);
    } catch (e) {
      console.error("[статистика]", (e as Error).message);
    }
  };
  setTimeout(purge, 60_000);
  setInterval(purge, 24 * 60 * 60_000);
}
