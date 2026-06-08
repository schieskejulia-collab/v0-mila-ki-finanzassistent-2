"use client"

import { MorningBriefing } from "../components/ui/morning-briefing"
import React, { useState } from 'react'
import { TransactionForm } from '../components/ui/transaction-form'
import { useFinance } from '../lib/store'

export default function HomePage() {
  const [successMessage, setSuccessMessage] = useState('')
const {
  userName,
  userStatus,
  summary,
} = useFinance()
  // Absolut sichere Euro-Formatierung ohne externe Datei
  const zeigeEuro = (betrag: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(betrag)
  }

  const status = userStatus

  return (
    <div className="space-y-6 p-4">
      <div className="space-y-1">
<MorningBriefing />
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
         Hallo, {userName || 'Macher'} 👋
        </h1>
        <p className="text-sm text-muted-foreground">
          Schön, dass du da bist. Hier ist deine Finanz-Übersicht als <span className="font-semibold text-primary">{status}</span>.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card p-4 rounded-xl border border-border">
          <p className="text-xs font-medium text-muted-foreground">Einnahmen</p>
          <p className="text-lg font-bold text-emerald-600 mt-1">{zeigeEuro(summary.income)}</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border">
          <p className="text-xs font-medium text-muted-foreground">Ausgaben</p>
          <p className="text-lg font-bold text-rose-600 mt-1">{zeigeEuro(summary.expense)}</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border col-span-2">
          <p className="text-xs font-medium text-muted-foreground">
            {status === 'angestellt' ? 'Verfügbares Budget' : 'Aktueller Gewinn'}
          </p>
          <p className="text-xl font-extrabold text-foreground mt-1">{zeigeEuro(summary.profit)}</p>
        </div>
      </div>

      {successMessage && (
        <div className="bg-emerald-500/10 text-emerald-600 text-sm font-medium p-3 rounded-lg text-center border border-emerald-500/20 transition-all">
          ✨ {successMessage}
        </div>
      )}

      <div className="bg-muted p-4 rounded-xl text-xs text-muted-foreground leading-relaxed">
        <p className="font-semibold text-foreground mb-1">💡 Beta-Test-Hinweis:</p>
        Deine Eingaben werden aktuell live im Zwischenspeicher deiner App verrechnet.
      </div>
    </div>
  )
}
