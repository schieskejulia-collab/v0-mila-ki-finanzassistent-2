"use client"

import React, { useState } from 'react'
import { formatEuro } from '@/lib/utils'
import { useFinance } from '@/lib/store'

export function TransactionForm({
  userStatus = 'selbstständig'
}: {
  userStatus?: string
}) {
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [title, setTitle] = useState('')
const {
  addExpense,
  addIncome,
} = useFinance()

  // Dynamische Kategorien je nachdem, ob der User angestellt oder selbstständig ist
  const categories = userStatus === 'angestellt' 
    ? {
        income: ['Gehalt', 'Nebenjob', 'Rückerstattung', 'Sonstiges'],
        expense: ['Arbeitsmittel', 'Fahrtkosten / Pendeln', 'Homeoffice', 'Fachbücher / Kurse', 'Miete / Wohnen', 'Freizeit & Abo']
      }
    : {
        income: ['Kunden-Projekt', 'Dienstleistung', 'Produktverkauf', 'Sonstiges'],
        expense: ['Software & Tools', 'Büro & Coworking', 'Reisekosten', 'Bewirtung', 'Marketing']
      }
const normalizeCategory = (label: string) => {
  const map: Record<string, string> = {
    "Software & Tools": "software",
    "Büro & Coworking": "miete",
    "Reisekosten": "reisen",
    "Bewirtung": "bewirtung",
    "Marketing": "marketing",

    "Arbeitsmittel": "buerobedarf",
    "Fahrtkosten / Pendeln": "reisen",
    "Homeoffice": "miete",
    "Fachbücher / Kurse": "weiterbildung",
    "Miete / Wohnen": "miete",
    "Freizeit & Abo": "abo",
  }

  return map[label] || "sonstiges"
}

  const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault()
  if (!amount || !category || !title) return

  const value = parseFloat(amount)
  const normalized = normalizeCategory(category)

  if (type === 'expense') {
    addExpense({
      amount: value,
      category: normalized,
      date: new Date().toISOString(),
      vendor: title,
      vat: 19,
      hasReceipt: false,
    })
  } else {
    addIncome({
      amount: value,
      date: new Date().toISOString(),
      client: title,
      vat: 19,
      status: 'offen',
      source: normalized,
    })
  }

  setAmount('')
  setTitle('')
  setCategory('')
}

  // ← WICHTIG!
    })
  }

  setAmount('')
  setTitle('')
  setCategory('')
}

    // Formular zurücksetzen
    setAmount('')
    setTitle('')
    setCategory('')
  }

  return (
    <form onSubmit={handleSubmit} className="w-full p-4 bg-card rounded-xl border border-border space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Neue Buchung erfassen</h3>
      
      {/* Switcher zwischen Einnahme und Ausgabe */}
      <div className="flex bg-muted p-1 rounded-lg">
        <button
          type="button"
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${type === 'expense' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
          onClick={() => { setType('expense'); setCategory(''); }}
        >
          Ausgabe / Beleg
        </button>
        <button
          type="button"
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${type === 'income' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
          onClick={() => { setType('income'); setCategory(''); }}
        >
          Einnahme / Gehalt
        </button>
      </div>

      {/* Titel / Beschreibung */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Beschreibung</label>
        <input
          type="text"
          placeholder={type === 'expense' ? 'z.B. Adobe Abo, Zugticket' : 'z.B. Gehalt Mai, Projekt X'}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
        />
      </div>

      {/* Betrag */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Betrag in €</label>
        <input
          type="number"
          step="0.01"
          placeholder="0,00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
        />
      </div>

      {/* Kategorie-Auswahl */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Kategorie</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
        >
          <option value="">-- Bitte wählen --</option>
          {categories[type].map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Absenden Button */}
      <button
        type="submit"
        className="w-full py-2.5 bg-primary text-primary-foreground font-medium rounded-lg text-sm shadow-md hover:opacity-90 transition-all"
      >
        Eintrag speichern
      </button>
    </form>
  )
}
