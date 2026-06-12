'use client'

import { useState } from 'react'

export default function NeueBuchungPage() {
  // Neue States für den Typ und die erweiterten Felder
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [partner, setPartner] = useState('') // Händler bei Ausgabe, Kunde bei Einnahme
  const [category, setCategory] = useState('Sonstiges')
  const [note, setNote] = useState('')

  async function speichern() {
    if (!title || !amount) {
      alert('Bitte zumindest Titel und Betrag ausfüllen! ⚠️')
      return
    }

    // Der Pfad entscheidet sich dynamisch nach dem gewählten Typ
    const apiPath = type === 'expense' ? '/api/expenses' : '/api/incomes'
    
    // Wir bereiten die Daten passend für die jeweilige API-Route vor
    const payload: any = {
      title,
      amount: Number(amount),
      note,
    }

    if (type === 'expense') {
      payload.vendor = partner // Ausgaben erwarten 'vendor'
      payload.category = category
    } else {
      payload.client = partner // Einnahmen erwarten 'client'
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
        // Formular zurücksetzen
        setTitle('')
        setAmount('')
        setPartner('')
        setNote('')
      } else {
        alert(`Fehler beim Speichern: ${data.error} ❌`)
      }
    } catch (error: any) {
      alert(`Netzwerkfehler: ${error.message} ❌`)
    }
  }

  return (
    <main className="min-h-screen p-6 space-y-4 max-w-md mx-auto pb-24">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Neue Buchung</h1>

      {/* Umschalter zwischen Ausgabe und Einnahme */}
      <div className="flex bg-gray-100 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => setType('expense')}
          className={`flex-1 py-2 text-center rounded-lg font-medium text-sm transition-all ${
            type === 'expense'
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          💸 Ausgabe
        </button>
        <button
          type="button"
          onClick={() => setType('income')}
          className={`flex-1 py-2 text-center rounded-lg font-medium text-sm transition-all ${
            type === 'income'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-gray-500 hover:text-purple-600'
          }`}
        >
          💰 Einnahme
        </button>
      </div>

      {/* Pflichtfelder */}
      <div className="space-y-3 pt-2">
        <input
          className="w-full border rounded-xl p-3 bg-white text-gray-800"
          placeholder="Titel (z.B. Software-Abo)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <input
          className="w-full border rounded-xl p-3 bg-white text-gray-800"
          placeholder="Betrag (z.B. 12.50)"
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      {/* Dynamische Felder je nach Typ */}
      <div className="space-y-3">
        <input
          className="w-full border rounded-xl p-3 bg-white text-gray-800"
          placeholder={type === 'expense' ? 'Händler / Laden (optional)' : 'Kunde / Client (optional)'}
          value={partner}
          onChange={(e) => setPartner(e.target.value)}
        />

        {type === 'expense' && (
          <select
            className="w-full border rounded-xl p-3 bg-white text-gray-800"
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
          className="w-full border rounded-xl p-3 bg-white text-gray-800"
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
