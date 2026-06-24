"use client"

import React, { useEffect, useState } from 'react'
import { ReceiptUpload } from "@/components/ui/receipt-upload"
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
  
  const { addExpense, addIncome } = useFinance()

  // Dynamische Kategorien je nachdem, ob der User angestellt oder selbstständig ist
  const categories = {

  income:

    userStatus === 'angestellt'

      ? ['Gehalt', 'Nebenjob', 'Rückerstattung', 'Sonstiges']

      : ['Kunden-Projekt', 'Dienstleistung', 'Produktverkauf', 'Sonstiges'],

  expense: [

    'Software & KI',

    'Werkzeug & Material',

    'Arbeitskleidung',

    'Gesundheit & Arbeitsschutz',

    'Fahrtkosten & Fahrzeuge',

    'Reisen & Unterkünfte',

    'Bewirtung',

    'Weiterbildung & Fachliteratur',

    'Telefon & Internet',

    'Marketing & Werbung',

    'Miete & Räume',

    'Leistungen Dritter',

    'Rechtsberatung',

    'Versicherungen',

    'Bankgebühren & Finanzen',

    'Mitgliedschaften & Beiträge',

    'Geschenke & Aufmerksamkeiten',

    'Versand & Porto',

    'Homeoffice',

    'Prüfung nötig',

    'Sonstiges',

  ],

}

  // Mappt die angezeigten Labels auf deine Datenbank-Werte
  const normalizeCategory = (label: string) => {

  const map: Record<string, string> = {

    'Software & KI': 'software',

    'Werkzeug & Material': 'werkzeug',

    'Arbeitskleidung': 'arbeitskleidung',

    'Gesundheit & Arbeitsschutz': 'gesundheit',

    'Fahrtkosten & Fahrzeuge': 'fahrzeug',

    'Reisen & Unterkünfte': 'reisen',

    'Bewirtung': 'bewirtung',

    'Weiterbildung & Fachliteratur': 'weiterbildung',

    'Telefon & Internet': 'telefon',

    'Marketing & Werbung': 'marketing',

    'Miete & Räume': 'miete',

    'Leistungen Dritter': 'dienstleister',

    'Rechtsberatung': 'recht',

    'Versicherungen': 'versicherung',

    'Bankgebühren & Finanzen': 'finanzen',

    'Mitgliedschaften & Beiträge': 'beitraege',

    'Geschenke & Aufmerksamkeiten': 'geschenke',

    'Versand & Porto': 'versand',

    'Homeoffice': 'homeoffice',

    'Prüfung nötig': 'pruefung',

    'Sonstiges': 'sonstiges',

    Gehalt: 'gehalt',

    Nebenjob: 'nebenjob',

    Rückerstattung: 'rueckerstattung',

    'Kunden-Projekt': 'kundenprojekt',

    Dienstleistung: 'dienstleistung',

    Produktverkauf: 'produktverkauf',

  }
const detectCategoryFromText = (text: string) => {

  const lower = text.toLowerCase()

  const rules: { label: string; words: string[] }[] = [

    {

      label: 'Software & KI',

      words: ['adobe', 'canva', 'openai', 'chatgpt', 'claude', 'figma', 'notion', 'hosting', 'domain'],

    },

    {

      label: 'Werkzeug & Material',

      words: ['obi', 'bauhaus', 'hornbach', 'würth', 'werkzeug', 'schrauben', 'material'],

    },

    {

      label: 'Fahrtkosten & Fahrzeuge',

      words: ['aral', 'shell', 'total', 'diesel', 'benzin', 'tankstelle', 'reifen', 'werkstatt'],

    },

    {

      label: 'Reisen & Unterkünfte',

      words: ['hotel', 'bahn', 'db', 'airbnb', 'flug', 'übernachtung'],

    },

    {

      label: 'Bewirtung',

      words: ['restaurant', 'café', 'essen', 'bewirtung', 'mittagessen'],

    },

    {

      label: 'Telefon & Internet',

      words: ['vodafone', 'telekom', 'o2', 'telefon', 'internet', 'mobilfunk'],

    },

  ]

  const match = rules.find((rule) =>

    rule.words.some((word) => lower.includes(word))

  )

  return match?.label || ''

}

  // Hilfsfunktion: Sucht das passende Label für ein von der KI geliefertes Kürzel (z.B. "software" -> "Software & Tools")
  const findLabelByNormalized = (normalizedValue: string) => {
    const currentExpenseCategories = categories.expense
    const found = currentExpenseCategories.find(cat => normalizeCategory(cat) === normalizedValue.toLowerCase())
    return found || ""
  }

  // Wird aufgerufen, wenn Mila den Beleg erfolgreich ausgelesen hat
  const handleScanSuccess = (data: { amount: number; vendor: string; category: string; title: string }) => {
useEffect(() => {
  if (type !== 'expense') return

  const detected = detectCategoryFromText(`${title}`)

  if (detected && (!category || category === 'Sonstiges')) {
    setCategory(detected)
  }
}, [title, type, category])

    setType('expense') // Belege sind immer Ausgaben
    setAmount(data.amount.toString())
    setTitle(data.vendor || data.title)
    
    // Versuche die von Groq erkannte Kategorie direkt zuzuordnen
    const matchedLabel = findLabelByNormalized(data.category)
    setCategory(matchedLabel)
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
        hasReceipt: true, // Da wir es gescannt haben
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

    // Formular zurücksetzen
    setAmount('')
    setTitle('')
    setCategory('')
  }

  return (
    <div className="w-full space-y-4">
      
      {/* Der Beleg-Scanner wird nur bei Ausgaben oben eingeblendet */}
      {type === 'expense' && (
        <ReceiptUpload onScanSuccess={handleScanSuccess} />
      )}

      <form onSubmit={handleSubmit} className="w-full p-4 bg-card rounded-xl border border-border space-y-4">
        <h3 className="text-lg font-semibold text-foreground">
          {type === 'expense' ? 'Ausgabe manuell erfassen' : 'Neue Einnahme erfassen'}
        </h3>
        
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
          <label className="text-xs font-medium text-muted-foreground">
            {type === 'expense' ? 'Händler / Geschäft' : 'Beschreibung'}
          </label>
          <input
            type="text"
            placeholder={type === 'expense' ? 'z.B. Adobe Abo, Supermarkt' : 'z.B. Gehalt Mai, Projekt X'}
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
    </div>
  )
}
