import Link from "next/link";
import type { SubState } from "@/lib/subscription";

/**
 * Полоска под шапкой: напоминает о статусе, когда это важно.
 *  - грейс/истекла — предложить продлить (по продуктовому решению);
 *  - зашёл через наш VPN, но кабинет не открыт — подсказать, где статус.
 */
export default function StatusBanner({
  state,
  viaVpn,
  email,
}: {
  state: SubState | null;
  viaVpn: boolean;
  email: string | null;
}) {
  if (state === "grace" || state === "expired") {
    return (
      <div className="border-b border-amber-500/40 bg-amber-500/10">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-5 py-2.5 text-sm">
          <span>
            {state === "grace"
              ? "Подписка закончилась — доступ отключится в ближайшие часы."
              : "Подписка закончилась, VPN выключен."}
          </span>
          <Link
            href={`/checkout?email=${encodeURIComponent(email ?? "")}`}
            className="rounded-lg bg-primary px-3 py-1.5 font-medium text-white transition hover:brightness-110"
          >
            Продлить
          </Link>
        </div>
      </div>
    );
  }
  if (viaVpn && !state) {
    return (
      <div className="border-b border-good/30 bg-good/10">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-5 py-2.5 text-sm">
          <span>Вы сейчас в интернете через наш VPN.</span>
          <Link href="/start?mode=login" className="text-accent-ink hover:underline">
            Войти и посмотреть, сколько осталось
          </Link>
        </div>
      </div>
    );
  }
  return null;
}
