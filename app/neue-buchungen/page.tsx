'use client'

import { useState } from 'react'
import { ReceiptUpload } from '@/components/ui/receipt-upload'

const categories = [
  'Sonstiges',
  'Software & IT',
  'Marketing',
  'Bewirtung',
  'Reisen/Fahrtkosten',
  'Bürobedarf',
  'Telefon & Internet',
  'Weiterbildung',
  'Miete/Arbeitsplatz',
]

function detectCategory(text: string) {
  const value = text.toLowerCase()

  if (
    value.includes('hetzner') ||
    value.includes('herzner') ||
    value.includes('hosting') ||
    value.includes('software') ||
    value.includes('openai') ||
    value.includes('chatgpt')
  ) {
    return 'Software & IT'
  }

  if (
    value.includes('instagram') ||
    value.includes('facebook') ||
    value.includes('werbung') ||
    value.includes('canva')
  ) {
    return 'Marketing'
  }

  if (
    value.includes('restaurant') ||
    value.includes('café') ||
    value.includes('bewirtung')
  ) {
    return 'Bewirtung'
  }

  if (
    value.includes('tank') ||
    value.includes('bahn') ||
    value.includes('fahrt') ||
    value.includes('reise')
  ) {
    return 'Reisen/Fahrtkosten'
  }

  if (
    value.includes('papier') ||
    value.includes('stift') ||
    value.includes('drucker') ||
    value.includes('büro')
  ) {
    return 'Bürobedarf'
  }

  if (
    value.includes('telefon') ||
    value.includes('internet') ||
    value.includes('vodafone') ||
    value.includes('telekom')
  ) {
    return 'Telefon & Internet'
  }

  if (
    value.includes('kurs') ||
    value.includes('seminar') ||
    value.includes('weiterbildung')
  ) {
    return 'Weiterbildung'
  }

  return 'Sonstiges'
}

function isDeductible(category: string) {
  return category !== 'Sonstiges'
}

function formatEuro(value: number) {
  return value.toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  })
}

export default function NeueBuchungPage() {
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [partner, setPartner] = useState('')
const [status, setStatus] = useState('offen')
const [dueDate, setDueDate] = useState('')
  const [category, setCategory] = useState('Sonstiges')
  const [note, setNote] = useState('')
const [status, setStatus] = useState('offen')
const [dueDate, setDueDate] = useState('')
const [isSaving, setIsSaving] = useState(false)
  const numericAmount = Number(amount || 0)
  const deductible = type === 'expense' && isDeductible(category)
  const taxReserve = type === 'income' ? numericAmount * 0.3 : 0
  const taxHint = deductible ? numericAmount * 0.3 : 0

  function updateTitle(value: string) {
    setTitle(value)

    if (type === 'expense') {
      const detected = detectCategory(`${value} ${partner} ${note}`)
      setCategory(detected)
    }
  }

  function updatePartner(value: string) {
    setPartner(value)

    if (type === 'expense') {
      const detected = detectCategory(`${title} ${value} ${note}`)
      setCategory(detected)
    }
  }

  const handleScanSuccess = (scannedData: any) => {
    if (!scannedData) return

    setType('expense')
    setTitle(scannedData.title || '')
    setAmount(scannedData.amount ? String(scannedData.amount) : '')
    setPartner(scannedData.vendor || '')

    const detected = scannedData.category || detectCategory(`${scannedData.title || ''} ${scannedData.vendor || ''}`)
    setCategory(detected)

    setNote('Automatisch von Mila ausgelesen 📸')
  }

  async function speichern() {
  if (isSaving) return

  if (!title || !amount) {
    alert('Bitte zumindest Titel und Betrag ausfüllen! ⚠️')
    return
  }

  setIsSaving(true)

  const apiPath = type === 'expense' ? '/api/expenses' : '/api/incomes'

  const payload: any = {
    title: title.trim(),
    amount: numericAmount,
    note: note || '',
    date: new Date().toISOString().slice(0, 10),
  }

  if (type === 'expense') {
    } else {
  payload.client = partner || ''
payload.tax_reserve = taxReserve
payload.status = status
payload.due_date = dueDate || null
payload.source = 'manuell'
payload.vat = 19
}

  try {
    const checkRes = await fetch(apiPath)
    const checkData = await checkRes.json()

    if (checkData.success && Array.isArray(checkData.data)) {
      const duplicate = checkData.data.find((item: any) => {
        const sameTitle =
          String(item.title || '').trim().toLowerCase() ===
          String(payload.title || '').trim().toLowerCase()

        const sameAmount = Number(item.amount) === Number(payload.amount)

        const sameDate =
          String(item.date || '').slice(0, 10) ===
          String(payload.date || '').slice(0, 10)

        return sameTitle && sameAmount && sameDate
      })

      if (duplicate) {
        alert('⚠️ Mögliche Doppelbuchung erkannt. Diese Buchung existiert heute bereits.')
        return
      }
    }

    const res = await fetch(apiPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = await res.json()

    if (data.success) {
      alert(`${type === 'expense' ? 'Ausgabe' : 'Einnahme'} erfolgreich gespeichert! ✅`)
      setTitle('')
      setAmount('')
      setPartner('')
      setNote('')
setStatus('offen')
setDueDate('')
      setCategory('Sonstiges')
    } else {
      alert(`Fehler beim Speichern: ${data.error} ❌`)
    }
  } catch (error: any) {
    alert(`Netzwerkfehler: ${error.message} ❌`)
  } finally {
    setIsSaving(false)
  }
}

  return (
    <main className="min-h-screen max-w-md mx-auto p-6 pb-40 space-y-4">
      <h1 className="text-3xl font-black text-slate-950">Neue Buchung</h1>

      <ReceiptUpload onScanSuccess={handleScanSuccess} />

      <div className="border-t border-gray-100 pt-4">
        <p className="mb-2 text-xs font-black uppercase tracking-wide text-gray-400">
          Oder manuell eintragen
        </p>
      </div>

      <div className="relative z-50 grid grid-cols-2 gap-2 rounded-2xl bg-gray-100 p-2">
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault()
            setType('expense')
          }}
          className={`rounded-2xl px-4 py-4 text-base font-black transition-all ${
            type === 'expense'
              ? 'bg-white text-gray-900 shadow-md'
              : 'text-gray-500'
          }`}
        >
          💸 Ausgabe
        </button>

        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault()
            setType('income')
          }}
          className={`rounded-2xl px-4 py-4 text-base font-black transition-all ${
            type === 'income'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-gray-500'
          }`}
        >
          💰 Einnahme
        </button>
      </div>

      <div className="space-y-3">
        <input
          className="w-full rounded-2xl border bg-white p-4 text-gray-900 outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Titel"
          value={title}
          onChange={(e) => updateTitle(e.target.value)}
        />

        <input
          className="w-full rounded-2xl border bg-white p-4 text-gray-900 outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Betrag"
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <input
          className="w-full rounded-2xl border bg-white p-4 text-gray-900 outline-none focus:ring-2 focus:ring-purple-500"
          placeholder={type === 'expense' ? 'Händler / Laden' : 'Kunde / Client'}
          value={partner}
          onChange={(e) => updatePartner(e.target.value)}
        />
{type === 'income' && (
  <>
    <select
      value={status}
      onChange={(e) => setStatus(e.target.value)}
      className="w-full rounded-2xl border bg-white p-4 text-gray-900 outline-none focus:ring-2 focus:ring-purple-500"
    >
      <option value="offen">🟡 Offen</option>
      <option value="bezahlt">🟢 Bezahlt</option>
      <option value="ueberfaellig">🔴 Überfällig</option>
    </select>

    <input
      type="date"
      value={dueDate}
      onChange={(e) => setDueDate(e.target.value)}
      className="w-full rounded-2xl border bg-white p-4 text-gray-900 outline-none focus:ring-2 focus:ring-purple-500"
    />
  </>
)}
        {type === 'expense' && (
          <select
            className="w-full rounded-2xl border bg-white p-4 text-gray-900 outline-none focus:ring-2 focus:ring-purple-500"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        )}

        <input
          className="w-full rounded-2xl border bg-white p-4 text-gray-900 outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Notiz"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {type === 'expense' && amount && (
        <section className="rounded-2xl bg-violet-50 p-4 text-sm text-slate-700">
          <p className="font-black text-violet-700">Mila Einschätzung</p>
          <p className="mt-1">
            Kategorie: <strong>{category}</strong>
          </p>
          <p>
            Steuerlich absetzbar:{' '}
            <strong>{deductible ? 'wahrscheinlich ja' : 'unklar'}</strong>
          </p>
          {deductible && (
            <p>
              Grobe Steuerwirkung bei 30%: <strong>{formatEuro(taxHint)}</strong>
            </p>
          )}
        </section>
      )}

      {type === 'income' && amount && (
        <section className="rounded-2xl bg-emerald-50 p-4 text-sm text-slate-700">
          <p className="font-black text-emerald-700">Mila Einschätzung</p>
          <p>
            Empfohlene Rücklage fürs Finanzamt:{' '}
            <strong>{formatEuro(taxReserve)}</strong>
          </p>
        </section>
      )}

     <button
  type="button"
  onClick={speichern}
  disabled={isSaving}
  className={`w-full rounded-2xl py-4 font-black text-white shadow-md disabled:opacity-50 ${
    type === 'expense'
      ? 'bg-slate-900'
      : 'bg-purple-600'
  }`}
>
  {isSaving
    ? 'Speichere...'
    : type === 'expense'
    ? 'Ausgabe speichern'
    : 'Einnahme speichern'}
</button>
    </main>
  )
}