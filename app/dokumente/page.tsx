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

function getOpenQuestions(documents: any[]) {
  return documents.filter((doc) => {
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
}

function getOpenObligations(obligations: any[]) {
  return obligations.filter((item) => {
    const status = String(item.status || '').toLowerCase()
    return !['erledigt', 'bezahlt', 'archiviert'].includes(status)
  })
}

function getStatus({
  documentCount,
  missingReceiptCount,
  openQuestionCount,
  openObligationCount,
}: {
  documentCount: number
  missingReceiptCount: number
  openQuestionCount: number
  openObligationCount: number
}) {
  if (documentCount === 0) {
    return {
      label: 'Noch nicht gestartet',
      description:
        'Sobald die ersten Unterlagen erfasst sind, zeigt Mila hier den Bearbeitungsstand.',
      badge: 'bg-slate-100 text-slate-600',
    }
  }

  const openCount =
    missingReceiptCount +
    openQuestionCount +
    openObligationCount

  if (openCount === 0) {
    return {
      label: 'Bereit zur Übergabe',
      description:
        'Für die aktuell erfassten Unterlagen sind keine organisatorischen Rückfragen mehr offen.',
      badge: 'bg-emerald-100 text-emerald-700',
    }
  }

  return {
    label: 'In Bearbeitung',
    description: `${openCount} offene Punkte sollten vor der Übergabe noch geklärt werden.`,
    badge: 'bg-amber-100 text-amber-700',
  }
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

  const openQuestions = getOpenQuestions(documents)
  const openObligations = getOpenObligations(obligations)

  const status = getStatus({
    documentCount: documents.length,
    missingReceiptCount: missingReceipts.length,
    openQuestionCount: openQuestions.length,
    openObligationCount: openObligations.length,
  })

  return (
    <main className="mx-auto min-h-screen max-w-md space-y-5 p-6 pb-40 text-slate-950">
      <header>
        <Link href="/" className="text-sm font-semibold text-slate-500">
          ← Zurück
        </Link>

        <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-violet-600">
          Arbeitsmappe
        </p>

        <h1 className="mt-2 text-3xl font-black">
          Mandantenmappe
        </h1>

        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
          Dokumente, fehlende Belege, Rückfragen und offene Punkte für die
          organisatorische Übergabe.
        </p>
      </header>

      <section className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
              Bearbeitungsstand
            </p>

            <h2 className="mt-2 text-2xl font-black">
              {status.label}
            </h2>
          </div>

          <span className={`rounded-full px-3 py-2 text-xs font-black ${status.badge}`}>
            {documents.length} Dokumente
          </span>
        </div>

        <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600">
          {status.description}
        </p>

        <div className="mt-5 grid grid-cols-3 gap-2">
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
            Offene Punkte
          </p>

          <div className="mt-3 space-y-2 text-sm font-semibold text-slate-600">
            <p>
              {missingReceipts.length === 0 ? '✓' : '•'} Fehlende Belege:
              {' '}{missingReceipts.length}
            </p>
            <p>
              {openQuestions.length === 0 ? '✓' : '•'} Rückfragen:
              {' '}{openQuestions.length}
            </p>
            <p>
              {openObligations.length === 0 ? '✓' : '•'} Offene Pflichten/Fristen:
              {' '}{openObligations.length}
            </p>
          </div>
        </div>
      </section>

      {documents.length === 0 && (
        <section className="rounded-3xl bg-violet-50 p-5">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-600">
            Noch keine Unterlagen
          </p>

          <h2 className="mt-2 text-xl font-black">
            Starte mit dem ersten Beleg
          </h2>

          <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
            Scanne einen Beleg oder lade eine Rechnung hoch. Mila legt die
            erfassten Unterlagen anschließend in dieser Mappe ab.
          </p>

          <Link
            href="/neue-buchungen"
            className="mt-4 inline-flex rounded-2xl bg-violet-600 px-4 py-3 text-sm font-black text-white"
          >
            Beleg erfassen
          </Link>
        </section>
      )}

      <div className="space-y-3">
        {documents.map((doc) => (
          <section
            key={doc.id}
            className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"
          >
            <div className="flex justify-between gap-3">
              <div>
                <p className="font-black text-slate-900">
                  {doc.title}
                </p>

                {doc.partner && (
                  <p className="text-sm text-slate-500">
                    {doc.partner}
                  </p>
                )}
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

            {doc.note && (
              <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm font-semibold leading-relaxed text-slate-600">
                {doc.note}
              </p>
            )}

            {doc.dueDate && (
              <p className="mt-3 text-sm font-bold text-amber-700">
                Fällig: {doc.dueDate}
              </p>
            )}

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-400">
                {doc.keepUntil ? `gespeichert bis ${doc.keepUntil}` : ''}
              </p>

              <button
                type="button"
                onClick={() => deleteDocument(doc.id)}
                className="text-sm font-black text-red-500"
              >
                Löschen
              </button>
            </div>
          </section>
        ))}
      </div>

      <section className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
          Grenze
        </p>

        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
          Mila organisiert und macht fehlende Angaben sichtbar. Steuerliche
          Bewertung und finale Buchungsentscheidungen bleiben bei der
          zuständigen Kanzlei.
        </p>
      </section>
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