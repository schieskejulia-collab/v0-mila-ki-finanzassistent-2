"use client"

import React, { useState, useRef } from 'react'
import { useFinance, STEUER_TIPPS, getMilaTipForUser } from '@/lib/store'
import { CATEGORY_LIST, type CategoryId } from '@/lib/types'

export function TransactionForm() {
  const { userStatus = 'selbstständig', userName = 'Julia', addExpense, addIncome } = useFinance()
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<CategoryId | ''>('')
  const [title, setTitle] = useState('')
  const [receiptImage, setReceiptImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const activeTipp = type === 'expense' && category 
    ? STEUER_TIPPS.find(t => t.id === category)
    : null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setReceiptImage(reader.result as string)
        if (!title) setTitle("Beleg " + new Date().toLocaleDateString())
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = () => {
    if (!amount || !category || !title) return
    const value = parseFloat(amount.replace(',', '.'));
    if (type === 'expense') {
      addExpense({ amount: value, category: category as CategoryId, date: new Date().toISOString(), vendor: title, vat: 19, hasReceipt: !!receiptImage })
    } else {
      addIncome({ amount: value, date: new Date().toISOString(), client: title, vat: 19, source: 'kunde', status: 'bezahlt' })
    }
    setAmount(''); setTitle(''); setCategory(''); setReceiptImage(null);
  }

  return (
    <div className="w-full p-6 bg-card rounded-[2.5rem] border-2 border-primary/5 shadow-2xl space-y-5">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-black text-foreground">Neue Buchung</h3>
        {type === 'expense' && (
          <button type="button" onClick={() => fileInputRef.current?.click()} className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold transition-all ${receiptImage ? 'bg-green-500 text-white' : 'bg-primary/10 text-primary'}`}>
            {receiptImage ? '✅ Beleg' : '📸 Scan'}
          </button>
        )}
      </div>
      
      <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

      <div className="flex bg-muted/40 p-1.5 rounded-2xl">
        <button type="button" className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all ${type === 'expense' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground'}`} onClick={() => { setType('expense'); setCategory(''); }}>AUSGABE</button>
        <button type="button" className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all ${type === 'income' ? 'bg-background text-green-600 shadow-sm' : 'text-muted-foreground'}`} onClick={() => { setType('income'); setCategory(''); }}>EINNAHME</button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <input type="text" inputMode="decimal" placeholder="Betrag €" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-4 py-3 bg-muted/20 rounded-2xl text-base font-bold outline-none" />
        <select value={category} onChange={(e) => setCategory(e.target.value as CategoryId)} className="w-full px-4 py-3 bg-muted/20 rounded-2xl text-sm font-bold outline-none">
          <option value="">Kategorie...</option>
          {type === 'expense' ? (
            CATEGORY_LIST.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)
          ) : (
            <option value="sonstiges">Einnahme</option>
          )}
        </select>
      </div>

      <input type="text" placeholder={type === 'expense' ? 'Händler / Zweck' : 'Kunde / Quelle'} value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-3 bg-muted/20 rounded-2xl text-sm font-medium outline-none" />

      {activeTipp && (
        <div className="bg-primary/5 rounded-3xl p-5 border-l-8 border-primary animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-2">
            <p className="text-[10px] font-black text-primary uppercase tracking-widest">Mila Insider ✨</p>
            <span className="text-[9px] font-bold bg-primary/20 text-primary px-2 py-0.5 rounded-full uppercase">{activeTipp.status_info}</span>
          </div>
          <p className="text-sm font-bold text-foreground mb-1">{activeTipp.titel}</p>
          <p className="text-xs italic leading-relaxed text-foreground/80">"{activeTipp.nische}"</p>
        </div>
      )}

      <button type="button" onClick={handleSubmit} className="w-full py-4 bg-primary text-white font-black rounded-2xl text-sm shadow-xl active:scale-95 transition-all uppercase tracking-widest">Speichern</button>
    </div>
  )
}
