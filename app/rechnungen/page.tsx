'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useFinance } from '@/lib/store'

function formatEuro(value: number) {
  return value.toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  })
}

function formatDate(value?: string) {
  if (!value) return 'Kein Datum'
  return new Date(value).toLocaleDateString('de-DE')
}

function isInvoiceIncome(income: any) {
  const invoiceNumber =
    income.invoiceNumber ||
    income.invoice_number ||
    ''

  const invoiceMarker = [
    income.type,
    income.source,
    income.documentType,
    income.document_type,
    income.note,
    income.notes,
  ]
    .map((value) =>
      String(value || '').toLowerCase()
    )
    .join(' ')

  return (
    String(invoiceNumber).trim().length > 0 ||
    invoiceMarker.includes('rechnung') ||
    invoiceMarker.includes('invoice')
  )
}

export default function RechnungenPage() {
  const { incomes } = useFinance()

  // Nicht jede Einnahme ist automatisch eine Rechnung.
  // Unterhalt, private Zahlungen oder einfache Einnahmen bleiben nur Buchungen.
  const rechnungen = useMemo(() => {
    return incomes.filter(isInvoiceIncome).map((income, index) => {
      const rechnungsNummer =
        income.invoiceNumber ||
        income.invoice_number ||
        `RE-2026-${1000 + index}`

      return {
        id: income.id,
        kunde: income.client || 'Unbekannter Kunde',
        betrag: income.amount || 0,
        datum: income.date,
        nummer: rechnungsNummer,
        status: income.status || 'offen',
        titel: income.title || 'Dienstleistung',
      }
    }).sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime())
  }, [incomes])

  return (
    <main className="min-h-screen space-y-5 bg-[#fbf9ff] p-4 pb-40 text-slate-950">
      <Link href="/buchungen" className="inline-flex text-sm font-bold text-slate-500">
        ← Zurück zu Finanzen
      </Link>

      <section className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Rechnungen</h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Deine generierten und offenen Rechnungen.
          </p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-xl">
          📄
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">
          Alle Dokumente ({rechnungen.length})
        </h2>

        {rechnungen.length === 0 ? (
          <div className="rounded-3xl bg-white p-5 text-center text-sm font-bold text-slate-500 shadow-sm">
            Noch keine echten Rechnungen vorhanden.
          </div>
        ) : (
          rechnungen.map((rechnung) => (
            <div
              key={rechnung.id}
              className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-violet-600">
                    {rechnung.nummer}
                  </p>

                  <h3 className="mt-1 text-lg font-black text-slate-900">
                    {rechnung.kunde}
                  </h3>

                  <p className="mt-0.5 text-xs font-semibold text-slate-400">
                    Projekt: {rechnung.titel}
                  </p>
                </div>

                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                    rechnung.status === 'bezahlt'
                      ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                      : 'border-amber-100 bg-amber-50 text-amber-700'
                  }`}
                >
                  {rechnung.status}
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">
                    Rechnungsdatum
                  </p>

                  <p className="text-xs font-black text-slate-700">
                    {formatDate(rechnung.datum)}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase text-slate-400">
                    Gesamtbetrag
                  </p>

                  <p className="text-base font-black text-slate-900">
                    {formatEuro(rechnung.betrag)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled
                className="mt-1 w-full cursor-not-allowed rounded-xl border border-dashed border-slate-200 bg-slate-50 py-2.5 text-center text-xs font-bold text-slate-400"
              >
                🔒 PDF-Download (wird bald freigeschaltet)
              </button>
            </div>
          ))
        )}
      </section>
    </main>
  )
}
