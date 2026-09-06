import Link from "next/link";
import { notFound } from "next/navigation";
import { marked } from "marked";
import { isLegalDoc, LEGAL_DOCS, readLegalDoc } from "@/lib/legal";

export function generateStaticParams() {
  return Object.keys(LEGAL_DOCS).map((doc) => ({ doc }));
}

export async function generateMetadata({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  return isLegalDoc(doc) ? { title: LEGAL_DOCS[doc].title } : {};
}

/** Страница юридического документа. Текст — из файла, разметка — Markdown. */
export default async function LegalPage({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  if (!isLegalDoc(doc)) notFound();
  const html = await marked.parse(await readLegalDoc(doc));

  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <Link href="/" className="text-sm text-muted hover:text-fg">
        ← На главную
      </Link>
      <article className="legal mt-8" dangerouslySetInnerHTML={{ __html: html }} />
      <p className="mt-12 border-t border-line pt-6 text-sm text-muted">
        Редакция {LEGAL_DOCS[doc].version}. Другие документы:{" "}
        {Object.entries(LEGAL_DOCS)
          .filter(([id]) => id !== doc)
          .map(([id, d], i) => (
            <span key={id}>
              {i > 0 && " · "}
              <Link href={`/legal/${id}`} className="text-accent-ink hover:underline">
                {d.title.toLowerCase()}
              </Link>
            </span>
          ))}
      </p>
    </main>
  );
}
