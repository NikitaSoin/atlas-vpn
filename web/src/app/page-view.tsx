"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Отправляет page_view на каждую смену страницы. Лёгкий, без библиотек. */
export default function PageView() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return; // себя не считаем
    try {
      navigator.sendBeacon(
        "/api/track",
        new Blob(
          [JSON.stringify({ event: "page_view", path: pathname })],
          { type: "application/json" },
        ),
      );
    } catch {
      /* не мешаем странице */
    }
  }, [pathname]);

  return null;
}
