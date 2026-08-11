'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useFinance } from '@/lib/store'

const LEGACY_DISMISSED_KEY = 'mila-dismissed-legacy-expenses'

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
  if (documentCount === 0 && missingReceiptCount === 0) {
    return {
      label: 'Noch nicht gestartet',
      description:
        'Sobald die ersten Unterlagen erfasst sind, zeigt Mila hier den Bearbeitungsstand.',
      badge: 'bg-slate-100 text-slate-600',
    }
  }

  const openCount =
    missingReceiptCount + openQuestionCount + openObligationCount

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

function expenseTitle(expense: any) {
  return (
    expense?.title ||
    expense?.description ||
    expense?.merchant ||
    expense?.partner ||
    expense?.vendor ||
    'Nicht zugeordneter Eintrag'
  )
}

function expenseAmount(expense: any) {
  const value = Number(expense?.amount || 0)
  return Number.isFinite(value) ? value : 0
}

function legacyFingerprint(expense: any) {
  return [
    expenseTitle(expense),
    expenseAmount(expense),
    String(expense?.merchant || expense?.partner || ''),
    String(expense?.createdAt || expense?.created_at || expense?.date || ''),
  ].join('|')
}

function loadDismissedLegacyExpenses() {
  if (typeof window === 'undefined') return [] as string[]

  try {
    const raw = window.localStorage.getItem(LEGACY_DISMISSED_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return [] as string[]
  }
}

export default function DokumentePage() {
  const {
    documents,
    expenses,
    obligations,
    deleteDocument,
    deleteExpense,
  } = useFinance()

  const [dismissedLegacyExpenses, setDismissedLegacyExpenses] = useState<string[]>(
    loadDismissedLegacyExpenses
  )

  const missingReceipts = expenses.filter((expense: any) => {
    const isMissing = expense?.hasReceipt === false || expense?.has_receipt === false
    if (!isMissing) return false

    if (!expense?.id) {
      return !dismissedLegacyExpenses.includes(legacyFingerprint(expense))
    }

    return true
  })

  const openQuestions = getOpenQuestions(documents)
  const openObligations = getOpenObligations(obligations)

  const status = getStatus({
    documentCount: documents.length,
    missingReceiptCount: missingReceipts.length,
    openQuestionCount: openQuestions.length,
    openObligationCount: openObligations.length,
  })

  async function removeMissingReceipt(expense: any) {
    const confirmed = window.confirm(
      'Diesen offenen Eintrag wirklich löschen? Der zugehörige Ausgaben-Datensatz wird entfernt.'
    )

    if (!confirmed) return

    try {
      if (!expense?.id) {
        const fingerprint = legacyFingerprint(expense)
        const next = Array.from(
          new Set([...dismissedLegacyExpenses, fingerprint])
        )

        setDismissedLegacyExpenses(next)
        window.localStorage.setItem(LEGACY_DISMISSED_KEY, JSON.stringify(next))
        return
      }

      await deleteExpense(expense)
    } catch (error: any) {
      window.alert(error?.message || 'Der offene Eintrag konnte nicht gelöscht werden.')
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-md space-y-5 p-6 pb-40 text-slate-950">
      <header>
        <Link href="/" className="text-sm font-semibold text-slate-500">
          ← Zurück
        </Link>

        <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-violet-600">
          Arbeitsmappe
        </p>

        <h1 className="mt-2 text-3xl font-black">Mandantenmappe</h1>

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
            <h2 className="mt-2 text-2xl font-black">{status.label}</h2>
          </div>

          <span className={`rounded-full px-3 py-2 text-xs font-black ${status.badge}`}>
            {documents.length} Dokumente
          </span>
        </div>

        <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600">
          {status.description}
        </p>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <MappeMetric label="Dokumente" value={documents.length} />
          <MappeMetric label="Fehlende Belege" value={missingReceipts.length} />
          <MappeMetric label="Rückfragen" value={openQuestions.length} />
        </div>

        <div className="mt-4 rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-black">Offene Punkte</p>

          <div className="mt-3 space-y-2 text-sm font-semibold text-slate-600">
            <p>{missingReceipts.length === 0 ? '✓' : '•'} Fehlende Belege: {missingReceipts.length}</p>
            <p>{openQuestions.length === 0 ? '✓' : '•'} Rückfragen: {openQuestions.length}</p>
            <p>{openObligations.length === 0 ? '✓' : '•'} Offene Pflichten/Fristen: {openObligations.length}</p>
          </div>
        </div>
      </section>

      {missingReceipts.length > 0 && (
        <section className="rounded-3xl border border-amber-100 bg-amber-50 p-5">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">
            Fehlende Belege
          </p>

          <h2 className="mt-2 text-xl font-black">Diese offenen Einträge brauchen Aufmerksamkeit</h2>

          <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
            Diese Ausgaben sind vorhanden, haben aber keinen zugeordneten Beleg. Du kannst einen neuen Beleg erfassen oder einen fehlerhaften Testeintrag löschen.
          </p>

          <div className="mt-4 space-y-3">
            {missingReceipts.map((expense: any, index: number) => (
              <div key={expense?.id || `missing-${index}`} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-900">{expenseTitle(expense)}</p>
                    {(expense?.merchant || expense?.partner) && (
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {expense?.merchant || expense?.partner}
                      </p>
                    )}
                  </div>

                  {expenseAmount(expense) > 0 && (
                    <span className="text-sm font-black text-slate-900">
                      {formatEuro(expenseAmount(expense))}
                    </span>
                  )}
                </div>

                <p className="mt-3 text-xs font-bold text-amber-700">Kein Beleg zugeordnet</p>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Link
                    href="/neue-buchungen"
                    className="rounded-xl bg-violet-600 px-3 py-3 text-center text-xs font-black text-white"
                  >
                    Beleg erfassen
                  </Link>

                  <button
                    type="button"
                    onClick={() => void removeMissingReceipt(expense)}
                    className="rounded-xl bg-white px-3 py-3 text-xs font-black text-red-500 ring-1 ring-red-100"
                  >
                    Eintrag löschen
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {documents.length === 0 && (
        <section className="rounded-3xl bg-violet-50 p-5">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-600">Noch keine Unterlagen</p>
          <h2 className="mt-2 text-xl font-black">Starte mit dem ersten Beleg</h2>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
            Scanne einen Beleg oder lade eine Rechnung hoch. Mila legt die erfassten Unterlagen anschließend in dieser Mappe ab.
          </p>
          <Link href="/neue-buchungen" className="mt-4 inline-flex rounded-2xl bg-violet-600 px-4 py-3 text-sm font-black text-white">
            Beleg erfassen
          </Link>
        </section>
      )}

      <div className="space-y-3">
        {documents.map((doc) => (
          <section key={doc.id} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex justify-between gap-3">
              <div>
                <p className="font-black text-slate-900">{doc.title}</p>
                {doc.partner && <p className="text-sm text-slate-500">{doc.partner}</p>}
              </div>
              <span className="text-xs font-black uppercase text-violet-600">{doc.type}</span>
            </div>

            {doc.amount && <p className="mt-3 text-xl font-black">{formatEuro(doc.amount)}</p>}
            {doc.note && <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm font-semibold leading-relaxed text-slate-600">{doc.note}</p>}
            {doc.dueDate && <p className="mt-3 text-sm font-bold text-amber-700">Fällig: {doc.dueDate}</p>}

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-400">{doc.keepUntil ? `gespeichert bis ${doc.keepUntil}` : ''}</p>
              <button type="button" onClick={() => deleteDocument(doc.id)} className="text-sm font-black text-red-500">Löschen</button>
            </div>
          </section>
        ))}
      </div>

      <section className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Grenze</p>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
          Mila organisiert und macht fehlende Angaben sichtbar. Steuerliche Bewertung und finale Buchungsentscheidungen bleiben bei der zuständigen Kanzlei.
        </p>
      </section>
    </main>
  )
}

function MappeMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-violet-50 p-3 text-center">
      <p className="text-xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase leading-tight tracking-wider text-slate-400">{label}</p>
    </div>
  )
}
