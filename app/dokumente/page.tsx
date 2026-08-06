'use client'

import Link from 'next/link'
import { useFinance } from '@/lib/store'
import { describeHandoffSummary } from '@/components/dashboard/kanzlei-handoff-section'

function formatEuro(value?: number) {
  if (!value) return ''

  return value.toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  })
}

export default function DokumentePage() {
  const {
    documents,
    expenses,
    obligations,
    deleteDocument,
  } = useFinance()

  const missingReceipts = expenses.filter((expense: any) => {
    return expense?.hasReceipt === false || expense?.has_receipt === false
  })

  const openQuestions = documents.filter((doc) => {
    const status = String(doc.status || '').toLowerCase()
    const note = String(doc.note || '').toLowerCase()

    return (
      status === 'neu' ||
      note.includes('unklar') ||
      note.includes('rückfrage') ||
      note.includes('rueckfrage') ||
      note.includes('prüfen') ||
      note.includes('pruefen')
    )
  })

  const openObligations = obligations.filter((item: any) => {
    const status = String(item.status || '').toLowerCase()
    return !['erledigt', 'bezahlt', 'archiviert'].includes(status)
  })

  const issueCount =
    missingReceipts.length +
    openQuestions.length +
    openObligations.length

  const handoff = {
    documentCount: documents.length,
    missingReceiptCount: missingReceipts.length,
    openQuestionCount: openQuestions.length,
    openObligationCount: openObligations.length,
    completion: Math.max(15, Math.min(100, 100 - issueCount * 12)),
  }

  return (
    <main className="min-h-screen max-w-md mx-auto p-6 pb-40 space-y-5 text-slate-950">

      <div>
        <Link href="/" className="text-sm text-slate-500">
          ← Zurück
        </Link>

        <h1 className="mt-4 text-3xl font-black text-slate-950">
          📂 Kanzlei-Mappe
        </h1>

        <p className="text-sm text-slate-500">
          Belege, Rückfragen und Unterlagen für die nächste Übergabe.
        </p>
      </div>

      <section className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">
              Monatsmappe
            </p>

            <h2 className="mt-2 text-2xl font-black">
              {handoff.completion}% vorbereitet
            </h2>
          </div>

          <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">
            Pilot
          </span>
        </div>

        <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600">
          {describeHandoffSummary(handoff)}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <MappeMetric
            label="Dokumente"
            value={documents.length}
          />
          <MappeMetric
            label="Fehlende Belege"
            value={missingReceipts.length}
          />
          <MappeMetric
            label="Rückfragen"
            value={openQuestions.length}
          />
        </div>

        <div className="mt-4 rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-black">
            Übergabe-Checkliste
          </p>

          <ul className="mt-3 space-y-2 text-sm font-semibold text-slate-600">
            <li>✓ Belege gesammelt und sichtbar abgelegt</li>
            <li>✓ Fehlende Angaben vor der Kanzlei-Rückfrage markiert</li>
            <li>✓ Pflichten, Bescheide und Fristen separat im Blick</li>
          </ul>
        </div>

        <p className="mt-3 text-xs font-semibold leading-relaxed text-slate-400">
          Mila bereitet vor. Steuerliche Bewertung und finale Buchung bleiben
          bei der Kanzlei.
        </p>
      </section>

      {documents.length === 0 && (
        <section className="rounded-3xl bg-violet-50 p-5">
          <p className="font-black text-violet-700">
            Noch keine Dokumente
          </p>

          <p className="mt-2 text-sm text-slate-600">
            Scanne einen Beleg oder lade eine Rechnung hoch.
            Mila legt sie dann hier ab.
          </p>

          <Link
            href="/neue-buchungen"
            className="mt-4 inline-flex rounded-2xl bg-violet-600 px-4 py-3 text-sm font-black text-white"
          >
            Beleg scannen oder hochladen
          </Link>
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
<button
  onClick={() => deleteDocument(doc.id)}
  className="text-red-500 font-bold"
>
  Löschen
</button>

            <p className="mt-3 text-xs text-slate-400">
              gespeichert bis {doc.keepUntil}
            </p>

          </section>
        ))}
      </div>

    </main>
  )
}

function MappeMetric({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="rounded-2xl bg-violet-50 p-3 text-center">
      <p className="text-xl font-black text-slate-950">
        {value}
      </p>

      <p className="mt-1 text-[10px] font-black uppercase leading-tight tracking-wider text-slate-400">
        {label}
      </p>
    </div>
  )
}
