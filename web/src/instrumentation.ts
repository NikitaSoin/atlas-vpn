/**
 * Планировщик напоминаний внутри процесса сайта: раз в 10 минут проверяет,
 * кому пора написать. Отдельный воркер и cron на хостинге не нужны.
 * Тот же проход можно дёрнуть вручную: GET /api/cron?key=ADMIN_CODE.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.REMINDERS_DISABLED === "1") return;
  const { runReminders } = await import("./lib/notify");
  const { provisionPending } = await import("./lib/subscription");
  const tick = async () => {
    try {
      const p = await provisionPending();
      if (p) console.log(`[panel] доведено доступов: ${p}`);
      const n = await runReminders();
      if (n) console.log(`[reminders] отправлено: ${n}`);
    } catch (e) {
      console.error("[reminders]", (e as Error).message);
    }
  };
  setTimeout(tick, 30_000);
  setInterval(tick, 10 * 60_000);
}
