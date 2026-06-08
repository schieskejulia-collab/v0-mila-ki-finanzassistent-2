"use client"

import React, { useState, useRef } from 'react'
import { useFinance } from '@/lib/store'
import { getMilaTip } from '@/lib/mila-knowledge'

export function TransactionForm({
  userStatus = 'selbstständig'
}: {
  userStatus?: string
}) {
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [title, setTitle] = useState('')
  const [receiptImage, setReceiptImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const { addExpense, addIncome } = useFinance()

  // Dynamische Kategorien
  const categories = userStatus === 'angestellt' 
    ? {
        income: ['Gehalt', 'Nebenjob', 'Rückerstattung', 'Sonstiges'],
        expense: ['Arbeitsmittel', 'Fahrtkosten / Pendeln', 'Homeoffice', 'Fachbücher / Kurse', 'Miete / Wohnen', 'Freizeit & Abo']
      }
    : {
        income: ['Kunden-Projekt', 'Dienstleistung', 'Produktverkauf', 'Sonstiges'],
        expense: ['Software & Tools', 'Büro & Coworking', 'Reisekosten', 'Bewirtung', 'Marketing']
      }

  // Mila Tipp finden, sobald Kategorie gewählt wird
  const activeTip = type === 'expense' ? getMilaTip(category) : null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setReceiptImage(reader.result as string)
        // Hier könnte man später eine automatische Erkennung (OCR) triggern
        if (!title) setTitle("Scan vom " + new Date().toLocaleDateString())
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || !category || !title) return

    const value = parseFloat(amount)

    if (type === 'expense') {
      addExpense({
        amount: value,
        category: category,
        date: new Date().toISOString(),
        vendor: title,
        vat: 19,
        hasReceipt: !!receiptImage,
      })
    } else {
      addIncome({
        amount: value,
        date: new Date().toISOString(),
        client: title,
        vat: 19,
        status: 'bezahlt',
        source: category,
      })
    }
    
    // Formular zurücksetzen
    setAmount('')
    setTitle('')
    setCategory('')
    setReceiptImage(null)
  }

  return (
    <form onSubmit={handleSubmit} className="w-full p-4 bg-card rounded-2xl border border-border shadow-lg space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-foreground">Buchung erfassen</h3>
        {type === 'expense' && (
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`p-2 rounded-full transition-all ${receiptImage ? 'bg-green-500 text-white' : 'bg-primary/10 text-primary'}`}
          >
            {receiptImage ? '✅ Beleg geladen' : '📷 Beleg scannen'}
          </button>
        )}
      </div>
      
      <input 
        type="file" 
        accept="image/*" 
        capture="environment" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />

      {/* Switcher */}
      <div className="flex bg-muted p-1 rounded-xl">
        <button
          type="button"
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${type === 'expense' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
          onClick={() => { setType('expense'); setCategory(''); }}
        >
          Ausgabe
        </button>
        <button
          type="button"
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${type === 'income' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
          onClick={() => { setType('income'); setCategory(''); }}
        >
          Einnahme
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Betrag (€)</label>
          <input
            type="number"
            step="0.01"
            placeholder="0,00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Kategorie</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm outline-none"
          >
            <option value="">Wählen...</option>
            {categories[type].map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Titel / Händler</label>
        <input
          type="text"
          placeholder={type === 'expense' ? 'z.B. Amazon, DB, Taxi' : 'z.B. Projekt XY'}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm outline-none"
        />
      </div>

      {/* MILA TIPP LIVE ANZEIGE */}
      {activeTip && (
        <div className="bg-primary/5 p-3 rounded-xl border-l-4 border-primary animate-in fade-in slide-in-from-top-2">
          <p className="text-[10px] font-bold text-primary uppercase mb-1">Milas Tipp ✨</p>
          <p className="text-xs italic text-foreground/90">{activeTip.nische}</p>
        </div>
      )}

      <button
        type="submit"
        className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl text-sm shadow-lg active:scale-95 transition-all"
      >
        Eintrag speichern
      </button>
    </form>
  )
}

