import type { Metadata } from "next";
import { Golos_Text } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { brand } from "@/lib/brand";
import PageView from "./page-view";
import "./globals.css";

const golos = Golos_Text({
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: `${brand.name} — ${brand.tagline.toLowerCase()}`,
  description: brand.description,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
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
            <nav className="flex items-center gap-6 text-[15px] text-muted">
              <Link href="/#tarify" className="hover:text-fg">
                Тарифы
              </Link>
              <Link href="/#faq" className="hover:text-fg">
                Вопросы
              </Link>
              <Link href="/support" className="hover:text-fg">
                Поддержка
              </Link>
            </nav>
          </div>
        </header>

        {children}
        <PageView />

        <footer className="mt-24 border-t border-line/70">
          <div className="mx-auto flex max-w-5xl flex-col gap-2 px-5 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
            <span>
              © {new Date().getFullYear()} {brand.name} — {brand.tagline.toLowerCase()}
            </span>
            <a href={brand.supportTelegram} target="_blank" rel="noreferrer">
              Поддержка в Telegram
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
