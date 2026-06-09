"use client"

import React, { useState, useRef } from 'react'
import { useFinance, getMilaTipForUser } from '@/lib/store'

export function TransactionForm() {
  const { userStatus = 'selbstständig', userName = 'Julia', addExpense, addIncome } = useFinance()
  
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [title, setTitle] = useState('')
  const [receiptImage, setReceiptImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const allCategories: any = {
    angestellt: {
      income: ['Gehalt', 'Nebenjob', 'Rückerstattung'],
      expense: ['Arbeitsmittel', 'Fahrtkosten', 'Homeoffice', 'Weiterbildung', 'Miete']
    },
    selbstständig: {
      income: ['Projekt-Honorar', 'Produktverkauf', 'Provision'],
      expense: ['Software', 'Büro', 'Reisekosten', 'Bewirtung', 'Marketing']
    },
    kleinunternehmer: {
      income: ['Einnahmen', 'Sonstiges'],
      expense: ['Bürobedarf', 'Technik', 'Reisen', 'Marketing']
    },
    freelancer: {
      income: ['Kunden-Projekt', 'Dienstleistung'],
      expense: ['Software & Tools', 'Coworking', 'Reisekosten', 'Bewirtung']
    }
  };

  const currentCategories = allCategories[userStatus] || allCategories['selbstständig'];
  const activeTip = type === 'expense' && category ? getMilaTipForUser(category, userStatus) : null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setReceiptImage(reader.result as string)
        if (!title) setTitle("Scan " + new Date().toLocaleDateString())
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = () => {
    if (!amount || !category || !title) return
    const value = parseFloat(amount.replace(',', '.'));
    if (type === 'expense') {
      addExpense({ amount: value, category, date: new Date().toISOString(), vendor: title, vat: 19, hasReceipt: !!receiptImage })
    } else {
      addIncome({ amount: value, date: new Date().toISOString(), client: title, vat: 19, source: category, status: 'bezahlt' })
    }
    setAmount(''); setTitle(''); setCategory(''); setReceiptImage(null);
  }

  return (
    <div className="w-full p-4 bg-card rounded-2xl border border-border shadow-lg space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold">Neue Buchung</h3>
        {type === 'expense' && (
          <button type="button" onClick={() => fileInputRef.current?.click()} className={`p-2 rounded-xl text-xs font-bold transition-all ${receiptImage ? 'bg-green-500 text-white' : 'bg-primary/10 text-primary'}`}>
            {receiptImage ? '✅ Beleg geladen' : '📷 Beleg scannen'}
          </button>
        )}
      </div>
      <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
      <div className="flex bg-muted p-1 rounded-xl">
        <button type="button" className={`flex-1 py-2 text-xs font-bold rounded-lg ${type === 'expense' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`} onClick={() => setType('expense')}>Ausgabe</button>
        <button type="button" className={`flex-1 py-2 text-xs font-bold rounded-lg ${type === 'income' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`} onClick={() => setType('income')}>Einnahme</button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input type="text" inputMode="decimal" placeholder="Betrag €" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm font-bold outline-none" />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm outline-none">
          <option value="">Kategorie...</option>
          {currentCategories[type].map((cat: string) => <option key={cat} value={cat}>{cat}</option>)}
        </select>
      </div>
      <input type="text" placeholder="Titel / Händler" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm outline-none" />
      {activeTip && (
        <div className="bg-primary/5 p-3 rounded-xl border-l-4 border-primary">
          <p className="text-[10px] font-bold text-primary uppercase mb-1">Mila Insider ✨</p>
          <p className="text-xs italic">{activeTip}</p>
        </div>
      )}
      <button type="button" onClick={handleSubmit} className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl text-sm shadow-md active:scale-95 transition-all">Eintrag speichern</button>
    </div>
  )
}
