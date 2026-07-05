'use client'

import { useState } from 'react'
import { useFinance } from '@/lib/store'
import type { Obligation } from '@/lib/mila-obligations'

function money(value: number) {
  return value.toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  })
}

export default function VerpflichtungenPage() {
  const { obligations, addObligation, deleteObligation } = useFinance()

  const [title, setTitle] = useState('')
  const [partner, setPartner] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] =
    useState<Obligation['priority']>('normal')

  function speichern() {
    if (!title || !amount || !dueDate) {
      alert('Bitte Titel, Betrag und Datum eintragen 🪬')
      return
    }

  const item: Obligation = {
  id: crypto.randomUUID(),

  title,
  partner,
  creditor: partner as any,

  amount: Number(amount),

  type: 'rechnung',
  area: 'privat',

  dueDate,
  due_date: dueDate as any,

  status: 'offen',

  priority,

  reminderDays: [14, 3, 0],
  reminder_days: 3 as any,
}

  return (
    <main className="min-h-screen max-w-md mx-auto p-6 pb-32 space-y-5">

      <h1 className="text-3xl font-black">
        🧾 Verpflichtungen
      </h1>

      <section className="rounded-3xl bg-white p-5 shadow space-y-3">

        <input
          className="w-full rounded-xl border p-3"
          placeholder="Rechnung / Rate"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <input
          className="w-full rounded-xl border p-3"
          placeholder="Gläubiger / Anbieter"
          value={partner}
          onChange={(e) => setPartner(e.target.value)}
        />

        <input
          className="w-full rounded-xl border p-3"
          placeholder="Betrag"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <input
          className="w-full rounded-xl border p-3"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />

        <select
          className="w-full rounded-xl border p-3"
          value={priority}
          onChange={(e) =>
            setPriority(e.target.value as Obligation['priority'])
          }
        >
          <option value="existenz">
            🔴 Existenz wichtig
          </option>

          <option value="wichtig">
            🟡 Wichtig
          </option>

          <option value="normal">
            🟢 Normal
          </option>
        </select>

        <button
          onClick={speichern}
          className="w-full rounded-2xl bg-purple-600 py-4 font-black text-white"
        >
          Speichern 🪬
        </button>

      </section>


      <section className="space-y-3">

        {obligations.map((item) => (

          <div
            key={item.id}
            className="rounded-2xl bg-white p-4 shadow"
          >

            <p className="font-black">
              {item.title}
            </p>

            <p className="text-sm text-gray-500">
              {item.partner}
            </p>

            <p>
              {money(item.amount)}
            </p>

            <p className="text-sm">
              Fällig: {item.dueDate}
            </p>

            <button
              onClick={() => deleteObligation(item.id)}
              className="mt-3 text-red-500"
            >
              Löschen
            </button>

          </div>

        ))}

      </section>

    </main>
  )
}