import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: `${brand.name} — ${brand.tagline}`,
  description: brand.description,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body className="min-h-screen antialiased">
        <header className="border-b border-line/60">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-sm text-white">
                A
              </span>
              {brand.name}
            </Link>
            <nav className="flex items-center gap-6 text-sm text-muted">
              <Link href="/#tarify" className="hover:text-fg">
                Тарифы
              </Link>
              <Link href="/#faq" className="hover:text-fg">
                Вопросы
              </Link>
              <a
                href={brand.supportTelegram}
                className="hover:text-fg"
                target="_blank"
                rel="noreferrer"
              >
                Поддержка
              </a>
            </nav>
          </div>
        </header>

        {children}

        <footer className="mt-24 border-t border-line/60">
          <div className="mx-auto flex max-w-5xl flex-col gap-2 px-5 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
            <span>
              © {new Date().getFullYear()} {brand.name}
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
