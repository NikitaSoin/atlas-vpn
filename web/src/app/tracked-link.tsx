"use client";

import Link from "next/link";
import { trackClient } from "@/lib/track-client";

/**
 * Ссылка, отмечающая клик в своей аналитике. Событие уходит через sendBeacon,
 * поэтому переход не задерживается и не срывается, если запрос не дошёл.
 */
export default function TrackedLink({
  href,
  event,
  detail = "",
  className,
  children,
}: {
  href: string;
  event: string;
  /** Что именно нажали: идентификатор тарифа, место кнопки и т.п. */
  detail?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={className} onClick={() => trackClient(event, detail)}>
      {children}
    </Link>
  );
}
