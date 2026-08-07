'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useFinance } from '@/lib/store'
import { describeHandoffSummary } from '@/components/dashboard/kanzlei-handoff-section'
import {
  demoPilotBusiness,
  demoPilotDocuments,
  demoPilotExpenses,
  demoPilotObligations,
} from '@/lib/demo-pilot-data'

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
  const [demoMode, setDemoMode] = useState(false)

  useEffect(() => {
    const search = new URLSearchParams(window.location.search)
    const requestedDemo = search.get('demo') === '1'
    const savedMode = window.localStorage.getItem('mila-pilot-mode')
    const nextDemoMode = requestedDemo || savedMode === 'demo'

    setDemoMode(nextDemoMode)

    if (requestedDemo) {
      window.localStorage.setItem('mila-pilot-mode', 'demo')
    }
  }, [])

  function startOwnMappe() {
    window.localStorage.setItem('mila-pilot-mode', 'mandant')
    setDemoMode(false)
  }

  function startDemoMappe() {
    window.localStorage.setItem('mila-pilot-mode', 'demo')
    setDemoMode(true)
  }

  const activeDocuments = demoMode ? demoPilotDocuments : documents
  const activeExpenses = demoMode ? demoPilotExpenses : expenses
  const activeObligations = demoMode ? demoPilotObligations : obligations

  const missingReceipts = activeExpenses.filter((expense: any) => {
    return expense?.hasReceipt === false || expense?.has_receipt === false
  })

  const openQuestions = activeDocuments.filter((doc) => {
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

  const openObligations = activeObligations.filter((item: any) => {
    const status = String(item.status || '').toLowerCase()
    return !['erledigt', 'bezahlt', 'archiviert'].includes(status)
  })

  const issueCount =
    missingReceipts.length +
    openQuestions.length +
    openObligations.length

  const handoff = {
    documentCount: activeDocuments.length,
    missingReceiptCount: missingReceipts.length,
    openQuestionCount: openQuestions.length,
    openObligationCount: openObligations.length,
    completion: demoMode
      ? demoPilotBusiness.handoffCompletion
      : Math.max(15, Math.min(100, 100 - issueCount * 12)),
  }

  return (
    <main className="min-h-screen max-w-md mx-auto p-6 pb-40 space-y-5 text-slate-950">

      <div>
        <Link href="/" className="text-sm text-slate-500">
          ← Zurück
        </Link>

        <h1 className="mt-4 text-3xl font-black text-slate-950">
          📂 {demoMode ? 'Demo-Mappe' : 'Mandantenmappe'}
        </h1>

        <p className="text-sm text-slate-500">
          {demoMode
            ? `${demoPilotBusiness.name}: vorbereitete Beispielunterlagen für den Termin.`
            : 'Arbeitsmappe für deine VA-Vorbereitung: Belege, Rückfragen, Nachweise und Kanzlei-Übergabe.'}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-violet-50 p-2">
          <button
            type="button"
            onClick={startDemoMappe}
            className={
              demoMode
                ? 'rounded-xl bg-white px-3 py-3 text-sm font-black text-violet-700 shadow-sm'
                : 'rounded-xl px-3 py-3 text-sm font-black text-slate-500'
            }
          >
            Demo-Mappe
          </button>

          <button
            type="button"
            onClick={startOwnMappe}
            className={
              demoMode
                ? 'rounded-xl px-3 py-3 text-sm font-black text-slate-500'
                : 'rounded-xl bg-white px-3 py-3 text-sm font-black text-violet-700 shadow-sm'
            }
          >
            Mandant
          </button>
        </div>
      </div>

      {demoMode && (
        <section className="rounded-3xl border border-violet-100 bg-violet-50 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">
                Demo-Zustand
              </p>

              <h2 className="mt-2 text-xl font-black text-slate-950">
                {demoPilotBusiness.name}
              </h2>
            </div>

            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-violet-700 shadow-sm">
              Keine echten Daten
            </span>
          </div>

          <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600">
            Diese Mappe zeigt, wie Mila im Termin wirkt: Belege sind
            vorsortiert, zwei Rückfragen bleiben sichtbar und offene Pflichten
            sind für die Kanzlei vorbereitet. Genau so kann Julia die
            Vorbereitung als Service übernehmen.
          </p>

          <button
            type="button"
            onClick={startOwnMappe}
            className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm font-black text-violet-700 shadow-sm"
          >
            Zu meinem echten Betrieb wechseln
          </button>
        </section>
      )}

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
            value={activeDocuments.length}
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
            <li>✓ Sonderfälle nur als Kontext und Nachweisbedarf notiert</li>
          </ul>
        </div>

        <p className="mt-3 text-xs font-semibold leading-relaxed text-slate-400">
          Mila bereitet als internes Arbeitssystem vor. Steuerliche Bewertung
          und finale Buchung bleiben bei der Kanzlei.
        </p>
      </section>

      <section className="rounded-3xl border border-violet-100 bg-violet-50 p-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">
          Service-Modell
        </p>

        <h2 className="mt-2 text-xl font-black text-slate-950">
          Julia kann die Mappe selbst führen
        </h2>

        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
          Der Betrieb muss nicht direkt ein neues System lernen. Für den Start
          kann Julia die Unterlagen mit Mila vorbereiten und die fertige
          Übersicht an Mandant oder Kanzlei geben.
        </p>
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
          Mandanten-Kontext
        </p>

        <h2 className="mt-2 text-xl font-black text-slate-950">
          Sonderfälle nicht entscheiden, sondern sichtbar machen
        </h2>

        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
          Krankheit, Pflege, Behinderung, Ausland, Firmenwagen, Reisekosten
          oder besondere Verträge gehören als Hinweis in die Mappe. Mila fragt
          nach Zeitraum und Nachweis, die Bewertung bleibt bei der zuständigen
          Fachstelle.
        </p>
      </section>

      {activeDocuments.length === 0 && (
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

          <button
            type="button"
            onClick={startDemoMappe}
            className="mt-3 w-full rounded-2xl bg-white px-4 py-3 text-sm font-black text-violet-700 shadow-sm"
          >
            Erst Demo-Mappe ansehen
          </button>
        </section>
      )}

      <div className="space-y-3">
        {activeDocuments.map((doc) => (
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
            {demoMode ? (
              <p className="mt-4 rounded-2xl bg-violet-50 p-3 text-xs font-black uppercase tracking-wider text-violet-700">
                Demo-Unterlage
              </p>
            ) : (
              <button
                onClick={() => deleteDocument(doc.id)}
                className="mt-4 text-red-500 font-bold"
              >
                Löschen
              </button>
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
