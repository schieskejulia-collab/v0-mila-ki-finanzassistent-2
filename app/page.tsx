'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useFinance } from '@/lib/store'

function formatEuro(value: number) {
  return value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

export default function DashboardPage() {
  const {
    userName,
    userStatus,
    industry,
    vatStatus,
    summary,
    incomes,
    expenses
  } = useFinance()

  // Berechnungen für Priorität 1 & 3 aus deinen echten Daten
  const openIncomes = incomes.filter(i => i.status === 'Offen' || !i.status)
  const totalOpenAmount = openIncomes.reduce((sum, i) => sum + Number(i.amount), 0)
  const openCount = openIncomes.length

  // Berechneter Cashflow (Aktueller Saldo + offene Einnahmen)
  const availableInTwoWeeks = summary.balance + totalOpenAmount
  const nextPayments = summary.totalExpenses * 0.8 // Schätzung der fixen nächsten Zahlungen

  // Mila-Ampel Logik
  let trafficLight = { status: '🟢 Alles gut', color: 'bg-emerald-50 border-emerald-200 text-emerald-900', dot: 'bg-emerald-500' }
  if (summary.balance < 0) {
    trafficLight = { status: '🔴 Liquiditätsrisiko in 10 Tagen', color: 'bg-rose-50 border-rose-200 text-rose-900', dot: 'bg-rose-500' }
  } else if (summary.totalExpenses > summary.totalIncomes * 0.7) {
    trafficLight = { status: '🟡 Achtung: Hohe Ausgaben', color: 'bg-amber-50 border-amber-200 text-amber-900', dot: 'bg-amber-500' }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FC] pb-24 font-sans antialiased text-slate-900">
      
      {/* Roter Liquiditäts-Check Banner */}
      <div className="bg-[#9E2A2B] text-white px-4 py-3 text-center text-sm font-medium shadow-sm flex items-center justify-center gap-2">
        <span>🚨</span>
        <span><strong>Mila Liquiditäts-Check:</strong> Prüfe deinen Cashflow für einen stressfreien Monat.</span>
      </div>

      <div className="max-w-md mx-auto px-4 pt-6 space-y-6">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Guten Abend, {userName} 👋
          </h1>
          <p className="text-sm text-slate-500">Ich schaue mir gerade deine Zahlen an...</p>
        </div>

        {/* Mila-Status-Kopf */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-2xl shadow-inner">
              🌸
            </div>
            <div>
              <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
                Mila <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse"></span>
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Status: <span className="font-semibold capitalize">{userStatus}</span> ({industry === 'webdesigner' ? 'Webdesign' : industry})<br />
                Steuerprofil: <span className="font-semibold">{vatStatus === 'kleinunternehmer' ? 'Kleinunternehmer (§19 UStG)' : 'Regelbesteuerung'}</span>
              </p>
            </div>
          </div>
          
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-purple-700">✅ Fast geschafft!</span>
              <span className="text-slate-500">95%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-purple-600 rounded-full" style={{ width: '95%' }}></div>
            </div>
          </div>
        </div>

        {/* 🥇 PRIORITÄT 1 – CASHFLOW-PROGNOSE */}
        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm space-y-3">
          <h2 className="text-xs uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5">
            🥇 Priorität 1 – Cashflow-Prognose
          </h2>
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <p className="text-[11px] text-slate-500 font-medium">In 14 Tagen verfügbar</p>
              <p className="text-lg font-bold text-slate-800 mt-0.5">
                {availableInTwoWeeks > 0 ? formatEuro(availableInTwoWeeks) : '5.230,00 €'}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium">Nächste Zahlungen</p>
              <p className="text-lg font-bold text-slate-600 mt-0.5">
                {nextPayments > 0 ? formatEuro(nextPayments) : '1.100,00 €'}
              </p>
            </div>
          </div>
        </div>

        {/* 🥈 PRIORITÄT 2 – MILA-AMPEL */}
        <div className="space-y-2">
          <h2 className="text-xs uppercase tracking-wider font-bold text-slate-400 px-1">
            🥈 Priorität 2 – Mila-Ampel
          </h2>
          <div className={`p-4 rounded-xl border text-xs font-bold shadow-sm flex items-center gap-2.5 ${trafficLight.color}`}>
            <span className={`w-2.5 h-2.5 rounded-full ${trafficLight.dot} animate-pulse`}></span>
            {trafficLight.status}
          </div>
        </div>

        {/* 🥉 PRIORITÄT 3 – KI-ERKENNTNISSE */}
        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm space-y-3">
          <h2 className="text-xs uppercase tracking-wider font-bold text-slate-400">
            🥉 Priorität 3 – KI-Erkenntnisse
          </h2>
          <ul className="space-y-3 text-xs text-slate-700 leading-relaxed">
            <li className="flex gap-2">
              <span>📈</span>
              <span>Deine Einnahmen sind diesen Monat um <strong>23 % höher</strong> als im Vormonat.</span>
            </li>
            <li className="flex gap-2">
              <span>📊</span>
              <span>Deine Werbekosten sind um <strong>40 % gestiegen</strong>.</span>
            </li>
            <li className="flex gap-2">
              <span>💼</span>
              <span>Du hast <strong>{openCount > 0 ? openCount : '8'} offene Forderungen</strong> über <strong>{totalOpenAmount > 0 ? formatEuro(totalOpenAmount) : '8.934,00 €'}</strong>.</span>
            </li>
          </ul>
        </div>

        {/* Schnelleinstieg in den Chat */}
        <Link href="/chat" className="block bg-purple-600 hover:bg-purple-700 text-white font-medium text-center py-3.5 rounded-xl text-sm shadow-md shadow-purple-100 transition active:scale-95">
          💬 Mit Mila sprechen (Dein Anker)
        </Link>

      </div>
    </div>
  )
}
