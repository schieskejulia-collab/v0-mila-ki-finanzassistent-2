'use client'

import { useState } from 'react'
import { ReceiptUpload } from '@/components/ui/receipt-upload'

export default function NeueBuchungPage() {
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [partner, setPartner] = useState('') 
  const [category, setCategory] = useState('Sonstiges')
  const [note, setNote] = useState('')

  // Diese Funktion wird aufgerufen, wenn Mila den Beleg erfolgreich über Groq ausgelesen hat
  // Sie befüllt die Felder im Formular automatisch, damit du alles kontrollieren kannst!
  const handleScanSuccess = (scannedData: any) => {
    if (!scannedData) return
    
    setType('expense') // Belege sind in der Regel Ausgaben
    setTitle(scannedData.title || '')
    setAmount(scannedData.amount ? String(scannedData.amount) : '')
    setPartner(scannedData.vendor || '')
    setCategory(scannedData.category || 'Sonstiges')
    setNote('Automatisch von Mila ausgelesen 📸')
  }

  async function speichern() {
    if (!title || !amount) {
      alert('Bitte zumindest Titel und Betrag ausfüllen! ⚠️')
      return
    }

    const apiPath = type === 'expense' ? '/api/expenses' : '/api/incomes'
    
    const payload: any = {
      title,
      amount: Number(amount),
      note: note || '', // Verhindert den null-Fehler in der Datenbank
    }

    if (type === 'expense') {
      payload.vendor = partner || ''
      payload.category = category
    } else {
      payload.client = partner || ''
    }

    try {
      const res = await fetch(apiPath, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (data.success) {
        alert(`${type === 'expense' ? 'Ausgabe' : 'Einnahme'} erfolgreich gespeichert! ✅`)
        // Formular nach Erfolg zurücksetzen
        setTitle('')
        setAmount('')
        setPartner('')
        setNote('')
        setCategory('Sonstiges')
      } else {
        alert(`Fehler beim Speichern: ${data.error} ❌`)
      }
    } catch (error: any) {
      alert(`Netzwerkfehler: ${error.message} ❌`)
    }
  }

  return (
    <main className="min-h-screen p-6 space-y-4 max-w-md mx-auto pb-40">
      <h1 className="text-3xl font-bold mb-2 text-gray-800">Neue Buchung</h1>

      {/* 📸 DER BELEGSCANNER GANZ OBEN – Jetzt korrekt verknüpft! */}
      <div className="mb-4">
        <ReceiptUpload onScanSuccess={handleScanSuccess} /> 
      </div>

      <div className="border-t border-gray-100 my-4 pt-4">
        <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Oder manuell eintragen</p>
      </div>

    {/* Umschalter zwischen Ausgabe und Einnahme */}
<div className="flex bg-gray-100 p-1 rounded-xl">
  <button
    type="button"
    onClick={() => setType('expense')}
    className={`relative z-10 flex-1 py-3 text-center rounded-xl font-bold text-sm transition-all ${
      type === 'expense'
        ? 'bg-white text-gray-900 shadow-sm'
        : 'text-gray-500'
    }`}
  >
    💸 Ausgabe
  </button>

  <button
    type="button"
    onClick={() => setType('income')}
    className={`relative z-10 flex-1 py-3 text-center rounded-xl font-bold text-sm transition-all ${
      type === 'income'
        ? 'bg-purple-600 text-white shadow-sm'
        : 'text-gray-500'
    }`}
  >
    💰 Einnahme
  </button>
</div>

      {/* Eingabefelder */}
      <div className="space-y-3">
        <input
          className="w-full border rounded-xl p-3 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Titel"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <input
          className="w-full border rounded-xl p-3 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Betrag"
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <input
          className="w-full border rounded-xl p-3 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder={type === 'expense' ? 'Händler / Laden (optional)' : 'Kunde / Client (optional)'}
          value={partner}
          onChange={(e) => setPartner(e.target.value)}
        />

        {type === 'expense' && (
          <select
            className="w-full border rounded-xl p-3 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="Sonstiges">Sonstiges</option>
            <option value="Software">Software & IT</option>
            <option value="Marketing">Marketing</option>
            <option value="Bewirtung">Bewirtung</option>
            <option value="Reisen">Reisen/Fahrtkosten</option>
          </select>
        )}

        <input
          className="w-full border rounded-xl p-3 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Notiz (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <button
        onClick={speichern}
        className={`w-full text-white font-semibold py-4 rounded-xl shadow-md transition-colors mt-4 ${
          type === 'expense' ? 'bg-gray-800 hover:bg-gray-950' : 'bg-purple-600 hover:bg-purple-700'
        }`}
      >
        {type === 'expense' ? 'Ausgabe speichern' : 'Einnahme speichern'}
      </button>
    </main>
  )
}
