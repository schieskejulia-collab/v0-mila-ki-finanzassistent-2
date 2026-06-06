"use client"

import React, { useState } from 'react'
import React, { useState } from 'react'
import { TransactionForm } from '../components/transaction-form'
import { getTotals, USER } from '../lib/data'
import { formatEuro } from '../lib/utils'
export default function HomePage() {
  // Wir holen uns die Startwerte aus deinen Daten
  const initialTotals = getTotals()
  const [totals, setTotals] = useState(initialTotals)
  const [successMessage, setSuccessMessage] = useState('')

  // Diese Funktion wird aufgerufen, wenn jemand das Formular absendet
  const handleAddTransaction = (newTransaction: any) => {
    // Hier berechnen wir die Live-Zahlen im State neu
    setTotals((prev) => {
      const isExpense = newTransaction.type === 'expense'
      const amountAbs = Math.abs(newTransaction.amount)

      const newIncome = isExpense ? prev.income : prev.income + amountAbs
      const newExpense = isExpense ? prev.expense + amountAbs : prev.expense
      const newProfit = newIncome - newExpense

      return {
        ...prev,
        income: newIncome,
        expense: newExpense,
        profit: newProfit,
        // Offene Rechnungen bleiben erst mal gleich, bis wir sie abhaken
        openInvoices: prev.openInvoices 
      }
    })

    // Kleines visuelles Feedback auf dem Handy
    setSuccessMessage('Erfolgreich gebucht!')
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  const status = USER.status || 'selbstständig'

  return (
    <div className="space-y-6 p-4">
      {/* Begrüßung */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Hallo, {USER.name || 'Macher'} 👋
        </h1>
        <p className="text-sm text-muted-foreground">
          Schön, dass du da bist. Hier ist deine Finanz-Übersicht als <span className="font-semibold text-primary">{status}</span>.
        </p>
      </div>

      {/* Finanz-Karten (Dashboard) */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card p-4 rounded-xl border border-border">
          <p className="text-xs font-medium text-muted-foreground">Einnahmen</p>
          <p className="text-lg font-bold text-emerald-600 mt-1">{formatEuro(totals.income)}</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border">
          <p className="text-xs font-medium text-muted-foreground">Ausgaben</p>
          <p className="text-lg font-bold text-rose-600 mt-1">{formatEuro(totals.expense)}</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border col-span-2">
          <p className="text-xs font-medium text-muted-foreground">
            {status === 'angestellt' ? 'Verfügbares Budget' : 'Aktueller Gewinn'}
          </p>
          <p className="text-xl font-extrabold text-foreground mt-1">{formatEuro(totals.profit)}</p>
        </div>
      </div>

      {/* Feedback nach dem Speichern */}
      {successMessage && (
        <div className="bg-emerald-500/10 text-emerald-600 text-sm font-medium p-3 rounded-lg text-center border border-emerald-500/20 transition-all">
          ✨ {successMessage}
        </div>
      )}

      {/* Das neue Formular */}
      <TransactionForm 
        onAddTransaction={handleAddTransaction} 
        userStatus={status} 
      />

      {/* Info-Box für Testkunden */}
      <div className="bg-muted p-4 rounded-xl text-xs text-muted-foreground leading-relaxed">
        <p className="font-semibold text-foreground mb-1">💡 Beta-Test-Hinweis:</p>
        Deine Eingaben werden aktuell live im Zwischenspeicher deiner App verrechnet. Perfekt, um Mila mit verschiedenen Zahlen auszuprobieren!
      </div>
    </div>
  )
}
