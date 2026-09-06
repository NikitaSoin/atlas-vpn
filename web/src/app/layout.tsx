import type { Metadata } from "next";
import { Golos_Text } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { brand, companyFilled, getCompany } from "@/lib/brand";
import { currentSub } from "@/lib/session";
import { viaOurVpn } from "@/lib/site";
import { subState, timeLeft } from "@/lib/subscription";
import PageView from "./page-view";
import StatusBanner from "./status-banner";
import "./globals.css";

const golos = Golos_Text({
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: `${brand.name} — ${brand.tagline.toLowerCase()}`,
  description: brand.description,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [sub, hdrs] = await Promise.all([currentSub(), headers()]);
  const state = sub ? subState(sub) : null;
  const left = sub ? timeLeft(sub) : null;
  const viaVpn = viaOurVpn(hdrs);
  const company = getCompany();
  // На узком экране в шапке помещается только короткая подпись.
  const cabinetLabel =
    sub && state && left
      ? state === "trial" || state === "active"
        ? `Личный кабинет · ${left.days > 1 ? `${left.days} дн.` : `${left.hours} ч.`}`
        : state === "none"
          ? "Личный кабинет"
          : "Личный кабинет · истекла"
      : "Войти или зарегистрироваться";
  const cabinetLabelShort = sub ? "Кабинет" : "Войти";

  return (
    <html lang="ru">
      <body className={`${golos.className} min-h-screen antialiased`}>
        <header className="border-b border-line/70 bg-surface/80 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
            <Link href="/" className="flex items-center gap-2.5 text-lg font-semibold">
              <Image
                src="/emblem.png"
                alt=""
                width={32}
                height={32}
                className="rounded-full"
              />
              <span className="text-primary">IREK</span>
              <span className="-ml-1 text-accent-ink">VPN</span>
            </Link>
            <nav className="flex items-center gap-4 text-[15px] text-muted sm:gap-6">
              <Link href="/#tarify" className="hidden hover:text-fg sm:inline">
                Тарифы
              </Link>
              <Link href="/#faq" className="hidden hover:text-fg sm:inline">
                Вопросы
              </Link>
              <Link href="/support" className="hover:text-fg">
                Поддержка
              </Link>
              <Link
                href={sub ? "/account" : "/start"}
                className={`rounded-full border px-3 py-1 text-sm ${
                  state === "grace" || state === "expired"
                    ? "border-bad/40 text-bad"
                    : sub && state !== "none"
                      ? "border-good/40 text-good"
                      : "border-line hover:text-fg"
                }`}
              >
                <span className="hidden sm:inline">{cabinetLabel}</span>
                <span className="sm:hidden">{cabinetLabelShort}</span>
              </Link>
            </nav>
          </div>
        </header>
        <StatusBanner state={state} viaVpn={viaVpn} email={sub?.email ?? null} />

        {children}
        <PageView />

        <footer className="mt-24 border-t border-line/70">
          <div className="mx-auto max-w-5xl px-5 py-8 text-sm text-muted">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>
                © {new Date().getFullYear()} {brand.name} — {brand.tagline.toLowerCase()}
              </span>
              <nav className="flex flex-wrap gap-x-4 gap-y-1">
                <Link href="/legal/offer" className="hover:text-fg">
                  Оферта
                </Link>
                <Link href="/legal/rules" className="hover:text-fg">
                  Правила использования
                </Link>
                <Link href="/legal/privacy" className="hover:text-fg">
                  Обработка данных
                </Link>
                <a href={brand.supportTelegram} target="_blank" rel="noreferrer" className="hover:text-fg">
                  Поддержка
                </a>
              </nav>
            </div>
            {/* Сведения об исполнителе — требование ст. 9 ЗоЗПП. */}
            <p className="mt-4 border-t border-line/60 pt-4 text-xs leading-relaxed">
              {companyFilled(company) ? (
                <>
                  {/* Адрес регистрации в подвале не показываем: для ИП
                      ст. 9 ЗоЗПП требует ФИО и сведения о госрегистрации,
                      а адрес — это домашний адрес предпринимателя. Полные
                      реквизиты есть в оферте. */}
                  {company.form} {company.name}
                  {company.ogrnip && <> · ОГРНИП {company.ogrnip}</>}
                  {company.inn && <> · ИНН {company.inn}</>}
                  {company.email && <> · {company.email}</>}
                </>
              ) : (
                <span className="text-amber-700">
                  Реквизиты исполнителя не заданы: до публичного запуска заполните
                  переменные COMPANY_* — без них сайт не соответствует ст. 9 Закона
                  «О защите прав потребителей».
                </span>
              )}
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
