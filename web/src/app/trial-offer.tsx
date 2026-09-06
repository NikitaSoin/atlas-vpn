import TrackedLink from "./tracked-link";
import { TRIAL_DAYS, TRIAL_TRAFFIC_GB } from "@/lib/plans";

/**
 * Блок «первое подключение»: пробный период одним предложением.
 *
 * Показывается до регистрации тоже — по макету 02 бесплатный вариант виден
 * ещё на главной и в тарифах, а сам пробный доступ включается после
 * подтверждения почты (выбор переносится параметром `trial=1`).
 */
export default function TrialOffer({
  signedIn,
  place,
}: {
  /** Вошедшему включаем пробный сразу кнопкой, гостя ведём в регистрацию. */
  signedIn: boolean;
  /** Откуда нажали — попадёт в аналитику. */
  place: string;
}) {
  return (
    <section className="rounded-2xl border border-accent bg-accent-soft/40 p-6 sm:flex sm:items-center sm:justify-between sm:gap-8">
      <div>
        <span className="text-xs font-medium tracking-[0.12em] text-accent-ink">
          ПЕРВОЕ ПОДКЛЮЧЕНИЕ
        </span>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          {TRIAL_DAYS} дня — <em className="not-italic text-accent-ink">Бесплатно</em>
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {TRIAL_TRAFFIC_GB} ГБ трафика на всех ваших устройствах.
          <br />
          Без карты и автоматических списаний.
        </p>
      </div>
      <div className="mt-5 shrink-0 sm:mt-0 sm:text-right">
        {signedIn ? (
          <form action="/api/trial" method="POST">
            <button className="rounded-xl bg-primary px-5 py-3 font-medium text-white transition hover:brightness-110">
              Включить пробный доступ
            </button>
          </form>
        ) : (
          <TrackedLink
            href="/start?mode=signup&trial=1"
            event="cta_click"
            detail={place}
            className="inline-block rounded-xl bg-primary px-5 py-3 font-medium text-white transition hover:brightness-110"
          >
            Попробовать бесплатно
          </TrackedLink>
        )}
        <p className="mt-2 text-xs text-muted">
          {signedIn
            ? "Пробный период доступен один раз"
            : "После регистрации поможем подключиться"}
        </p>
      </div>
    </section>
  );
}
