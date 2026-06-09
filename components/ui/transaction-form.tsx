"use client"

import React, { useState, useRef } from 'react'
import { useFinance, STEUER_TIPPS, getMilaTipForUser } from '@/lib/store'

export function TransactionForm() {
  const { userStatus = 'selbstständig', userName = 'Julia', addExpense, addIncome } = useFinance()
  
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [title, setTitle] = useState('')
  const [receiptImage, setReceiptImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Deine individuellen Kategorien je nach Status
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

  // Mila findet die Nische und die Absetzbarkeit
  const activeTippData = type === 'expense' && category 
    ? STEUER_TIPPS.find(t => t.kategorie.toLowerCase().includes(category.toLowerCase()) || t.keywords.some(k => category.toLowerCase().includes(k)))
    : null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setReceiptImage(reader.result as string)
        if (!title) setTitle("Beleg vom " + new Date().toLocaleDateString())
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = () => {
    if (!amount || !category || !title) {
      alert("Mila braucht noch ein paar Infos von dir, Julia! Bitte füll alles aus.");
      return;
    }
    const value = parseFloat(amount.replace(',', '.'));
    if (type === 'expense') {
      addExpense({ amount: value, category, date: new Date().toISOString(), vendor: title, vat: 19, hasReceipt: !!receiptImage })
    } else {
      addIncome({ amount: value, date: new Date().toISOString(), client: title, vat: 19, source: category, status: 'bezahlt' })
    }
    setAmount(''); setTitle(''); setCategory(''); setReceiptImage(null);
  }

  return (
    <div className="w-full p-5 bg-card rounded-[2rem] border-2 border-primary/10 shadow-xl space-y-5 relative overflow-hidden">
      {/* Dekorativer Hintergrund für Mila-Vibe */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
      
      <div className="flex justify-between items-center relative z-10">
        <div>
          <h3 className="text-xl font-extrabold text-foreground">Neue Buchung</h3>
          <p className="text-xs text-muted-foreground">Lass uns das gemeinsam erledigen!</p>
        </div>
        {type === 'expense' && (
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()} 
            className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all shadow-lg ${receiptImage ? 'bg-green-500 text-white' : 'bg-primary text-white hover:scale-105'}`}
          >
            <span className="text-xl">{receiptImage ? '✅' : '📷'}</span>
            <span className="text-[8px] font-bold uppercase mt-1">{receiptImage ? 'Geladen' : 'Scan'}</span>
          </button>
        )}
      </div>
      
      <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

      {/* Switcher zwischen Einnahme und Ausgabe */}
      <div className="flex bg-muted/50 p-1.5 rounded-2xl">
        <button 
          type="button" 
          className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all ${type === 'expense' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground'}`} 
          onClick={() => { setType('expense'); setCategory(''); }}
        >
          AUSGABE
        </button>
        <button 
          type="button" 
          className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all ${type === 'income' ? 'bg-background text-green-600 shadow-sm' : 'text-muted-foreground'}`} 
          onClick={() => { setType('income'); setCategory(''); }}
        >
          EINNAHME
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Betrag in €</label>
          <input 
            type="text" 
            inputMode="decimal"
            placeholder="0,00" 
            value={amount} 
            onChange={(e) => setAmount(e.target.value)} 
            className="w-full px-4 py-3 bg-muted/30 border-2 border-transparent focus:border-primary/20 rounded-2xl text-base font-bold outline-none transition-all" 
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Kategorie</label>
          <select 
            value={category} 
            onChange={(e) => setCategory(e.target.value)} 
            className="w-full px-4 py-3 bg-muted/30 border-2 border-transparent focus:border-primary/20 rounded-2xl text-sm font-bold outline-none appearance-none transition-all"
          >
            <option value="">Wählen...</option>
            {currentCategories[type].map((cat: string) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Beschreibung / Händler</label>
        <input 
          type="text" 
          placeholder={type === 'expense' ? 'Wo warst du shoppen?' : 'Wer hat dich bezahlt?'} 
          value={title} 
          onChange={(e) => setTitle(e.target.value)} 
          className="w-full px-4 py-3 bg-muted/30 border-2 border-transparent focus:border-primary/20 rounded-2xl text-sm font-medium outline-none transition-all" 
        />
      </div>

      {/* --- HIER IST MILAS SEELE: DIE NISCHEN & ABSETZBARKEIT --- */}
      {activeTippData && (
        <div className="bg-primary/5 rounded-[1.5rem] p-4 border-l-8 border-primary animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex justify-between items-center mb-2">
            <p className="text-[10px] font-black text-primary uppercase tracking-tighter">Milas Insider-Wissen ✨</p>
            <span className="text-[9px] font-bold bg-primary/20 text-primary px-2 py-0.5 rounded-full uppercase">
              {activeTippData.status_info}
            </span>
          </div>
          <p className="text-sm font-bold text-foreground mb-1">{activeTippData.titel}</p>
          <p className="text-xs italic leading-relaxed text-foreground/80">
            "{activeTippData.nische[userStatus]}"
          </p>
        </div>
      )}

      <button 
        type="button"
        onClick={handleSubmit}
        className="w-full py-4 bg-primary text-white font-black rounded-2xl text-sm shadow-xl shadow-primary/20 active:scale-[0.98] transition-all uppercase tracking-widest"
      >
        Buchung speichern
      </button>
    </div>
  )
}
