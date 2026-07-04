'use client'

import Link from 'next/link'
import { useFinance } from '@/lib/store'

function formatEuro(value?: number) {
  if (!value) return ''

  return value.toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  })
}

export default function DokumentePage() {
  const { documents } = useFinance()

  return (
    <main className="min-h-screen max-w-md mx-auto p-6 pb-40 space-y-5">

      <div>
        <Link href="/" className="text-sm text-slate-500">
          ← Zurück
        </Link>

        <h1 className="mt-4 text-3xl font-black text-slate-950">
          📂 Dokumente
        </h1>

        <p className="text-sm text-slate-500">
          Alles, was Mila sich gemerkt hat.
        </p>
      </div>

      {documents.length === 0 && (
        <section className="rounded-3xl bg-violet-50 p-5">
          <p className="font-black text-violet-700">
            Noch keine Dokumente
          </p>

          <p className="mt-2 text-sm text-slate-600">
            Scanne einen Beleg oder lade eine Rechnung hoch.
            Mila legt sie dann hier ab.
          </p>
        </section>
      )}

      <div className="space-y-3">
        {documents.map((doc) => (
          <section
            key={doc.id}
            className="rounded-3xl bg-white p-5 shadow-sm border"
          >
            <div className="flex justify-between gap-3">

              <div>
                <p className="font-black text-slate-900">
                  {doc.title}
                </p>

                <p className="text-sm text-slate-500">
                  {doc.partner}
                </p>
              </div>

              <span className="text-xs font-black uppercase text-violet-600">
                {doc.type}
              </span>

            </div>

            {doc.amount && (
              <p className="mt-3 text-xl font-black">
                {formatEuro(doc.amount)}
              </p>
            )}

            {doc.dueDate && (
              <p className="mt-2 text-sm text-red-600">
                ⏰ Fällig: {doc.dueDate}
              </p>
            )}

            <p className="mt-3 text-xs text-slate-400">
              gespeichert bis {doc.keepUntil}
            </p>

          </section>
        ))}
      </div>

    </main>
  )
}