'use client'

import { useFinance } from '@/lib/store'
import Link from 'next/link'

function formatEuro(value: number) {
  return value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

export default function BuchungenPage() {
  const { expenses, incomes, summary } = useFinance()

  // Kombiniere Einnahmen und Ausgaben für eine chronologische Liste
  const alleTransaktionen = [
    ...(expenses || []).map(e => ({ ...e, typ: 'ausgabe' })),
    ...(incomes || []).map(i => ({ ...i, typ: 'einnahme' }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="min-h-screen bg-[#F8F9FC] pb-24 font-sans antialiased text-slate-900">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 p-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-md mx-auto">
          <h1 className="text-xl font-black text-slate-950">Deine Buchungen</h1>
          <p className="text-xs text-slate-500 mt-0.5">Alle erfassten Einnahmen & Ausgaben</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 mt-6 space-y-4">
        {/* Kleine Statistik-Übersicht */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Einnahmen gesamt</p>
            <p className="text-lg font-black text-emerald-600 mt-0.5">{formatEuro(summary?.totalIncomes || 0)}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Ausgaben gesamt</p>
            <p className="text-lg font-black text-rose-600 mt-0.5">{formatEuro(summary?.totalExpenses || 0)}</p>
          </div>
        </div>

        {/* Transaktionsliste */}
        <div className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm space-y-4">
          <h2 className="text-xs uppercase tracking-wider font-bold text-slate-400">Verlauf</h2>

          {alleTransaktionen.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <span className="text-2xl">📒</span>
              <p className="text-xs text-slate-500">Noch keine Buchungen vorhanden.</p>
              <Link href="/neue-buchungen" className="inline-block text-xs text-purple-600 font-bold underline">
                Jetzt erste Buchung hinzufügen
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {alleTransaktionen.map((t: any, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-900">{t.title || (t.typ === 'ausgabe' ? 'Ausgabe' : 'Einnahme')}</p>
                    <p className="text-[10px] text-slate-400">
                      {t.date} {t.vendor || t.client ? `· ${t.vendor || t.client}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-black ${t.typ === 'ausgabe' ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {t.typ === 'ausgabe' ? '-' : '+'}{formatEuro(Number(t.amount))}
                    </p>
                    {t.category && (
                      <span className="text-[9px] bg-slate-200/60 px-2 py-0.5 rounded-full text-slate-600 font-semibold uppercase tracking-wider">
                        {t.category}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
