"use client";

import { useState } from "react";

/** Поле только для чтения с кнопкой «Скопировать» — для реферальной ссылки. */
export default function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Буфер обмена недоступен (старый браузер, http): текст можно выделить руками.
    }
  }
  return (
    <div className="mt-3 flex items-center gap-2">
      <input
        readOnly
        value={value}
        onFocus={(e) => e.currentTarget.select()}
        className="min-w-0 flex-1 truncate rounded-xl border border-line bg-ink px-3 py-2 text-sm outline-none"
      />
      <button
        type="button"
        onClick={copy}
        className="shrink-0 rounded-xl border border-line px-3 py-2 text-sm transition hover:border-accent"
      >
        {copied ? "Скопировано" : "Скопировать"}
      </button>
    </div>
  );
}
