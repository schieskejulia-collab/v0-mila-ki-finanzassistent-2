'use client'
import { useState } from 'react'
import { useFinance } from '@/lib/store'
import { ReceiptUpload } from '@/components/ui/receipt-upload'
import { CATEGORY_LIST, detectCategory, getCategoryLabel } from '@/lib/categories'
import { saveMerchantMemory } from '@/lib/merchant-memory'
const categories = CATEGORY_LIST.map((category) => category.label)

function getTaxHint(category: string) {
  const pruefen = [
    'Reisen & Unterkünfte',
    'Bewirtung',
    'Fahrtkosten & Fahrzeuge',
    'Privat / Nicht absetzbar',
    'Sonstiges',
  ]

  if (category === 'Privat / Nicht absetzbar') {
    return 'wahrscheinlich nein'
  }

  if (pruefen.includes(category)) {
    return 'prüfbar / abhängig vom Zweck'
  }

  return 'wahrscheinlich ja'
}

function formatEuro(value: number) {
  return value.toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  })
}
function shouldCalculateTaxReserve(title: string) {
  const text = title.toLowerCase()

  return ![
    'test',
    'kindergeld',
    'unterhalt',
    'erstattung',
    'rückzahlung',
    'rueckzahlung',
    'darlehen',
    'kredit',
    'privat',
    'umbuchung',
    'geschenk',
    'lohn',
    'gehalt',
  ].some((word) => text.includes(word))
}
export default function NeueBuchungPage() {
const { documents, setDocuments, addExpense, addIncome, incomes, expenses } = useFinance()
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [partner, setPartner] = useState('')
  const [category, setCategory] = useState('Sonstiges')
const [note, setNote] = useState('')
const [status, setStatus] = useState('offen')
const [dueDate, setDueDate] = useState('')
const [isSaving, setIsSaving] = useState(false)
  const numericAmount = Number(amount || 0)
  const taxStatus = getTaxHint(category)
const deductible = type === 'expense' && taxStatus === 'wahrscheinlich 
const taxReserve = 0
  const taxHint = deductible ? numericAmount * 0.3 : 0

  function updateTitle(value: string) {
  setTitle(value)

  if (type === 'expense') {
    const detected = detectCategory(value)
    setCategory(getCategoryLabel(detected))
  }
}

function updatePartner(value: string) {
  setPartner(value)
}

  const handleScanSuccess = (rawData: any) => {
  const scannedData = rawData?.data || rawData

  if (!scannedData) return

  setType('expense')
  setTitle(String(scannedData.title || '').trim())
  setAmount(String(scannedData.amount ?? ''))
  setPartner(String(scannedData.vendor || '').trim())

  const categoryId =
    scannedData.category ||
    detectCategory(`${scannedData.title || ''} ${scannedData.vendor || ''}`)

  setCategory(getCategoryLabel(categoryId))
setNote(scannedData.note || 'Automatisch von Mila ausgelesen 📸')

if (scannedData.document) {
  setDocuments([...documents, scannedData.document])
}
}
  async function speichern() {
  if (isSaving) return

  if (!title || !amount) {
    alert('Bitte zumindest Titel und Betrag ausfüllen! ⚠️')
    return
  }

  setIsSaving(true)

  const payload: any = {
    title: title.trim(),
    amount: numericAmount,
    note: note || '',
    date: new Date().toISOString().slice(0, 10),
  }

  if (type === 'expense') {
    payload.vendor = partner || ''
    payload.category = category || 'Sonstiges'
    payload.hasReceipt = true
    payload.vat = 19
    payload.source = 'manuell'
  } else {
    payload.client = partner || ''
    payload.tax_reserve = taxReserve
    payload.status = status
    payload.due_date = dueDate || null
    payload.source = 'manuell'
    payload.vat = 19
  }

  try {
    const existingItems = type === 'expense' ? expenses : incomes

    const duplicate = existingItems.find((item: any) => {
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

    if (partner && type === 'expense') {
      saveMerchantMemory({
        merchant: partner,
        category: detectCategory(category),
        taxHint: taxStatus,
      })
    }

    if (type === 'expense') {
      await addExpense(payload)
    } else {
      await addIncome(payload)
    }

    alert(`${type === 'expense' ? 'Ausgabe' : 'Einnahme'} erfolgreich gespeichert! ✅`)

    setTitle('')
    setAmount('')
    setPartner('')
    setNote('')
    setStatus('offen')
    setDueDate('')
    setCategory('Sonstiges')
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
      className="h-14 w-full rounded-2xl border bg-white px-4 text-gray-900 outline-none focus:ring-2 focus:ring-purple-500"
      aria-label="Fälligkeitsdatum"
    />

    <p className="text-xs text-slate-500">
      Fälligkeitsdatum optional
    </p>
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
      <strong>{taxStatus}</strong>
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