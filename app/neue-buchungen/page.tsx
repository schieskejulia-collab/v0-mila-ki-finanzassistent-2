'use client'

import { useState } from 'react'

export default function NeueBuchungPage() {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')

  async function speichern() {
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        amount,
      }),
    })

    const data = await res.json()

    console.log(data)
    alert('Gespeichert ✅')
  }

  return (
    <main className="min-h-screen p-6 space-y-4">
      <h1 className="text-3xl font-bold">
        Neue Buchung
      </h1>

      <input
        className="w-full border rounded-xl p-3"
        placeholder="Titel"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <input
        className="w-full border rounded-xl p-3"
        placeholder="Betrag"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <button
        onClick={speichern}
        className="bg-violet-600 text-white px-4 py-3 rounded-xl"
      >
        Speichern
      </button>
    </main>
  )
}