'use client'

import { useState } from 'react'
import { useFinance, CATEGORY_LABELS, inferCategory } from '@/lib/store'
import { ReceiptUpload } from '@/components/ui/receipt-upload'

function formatEuro(value: number) {
  return value.toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  })
}

function normalizeAmount(value: string) {
  const number = Number(String(value || '').replace(',', '.'))
  return Number.isFinite(number) ? number : 0
}

export function BookingForm() {
  const {
    addExpense,
    addIncome,
    triggerMilaFeedback,
    expenses,
    incomes,
  } = useFinance()

  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [amount, setAmount] = useState('')
  const [title, setTitle] = useState('')
  const [partner, setPartner] = useState('')
  const [category, setCategory] = useState('sonstiges')
  const [note, setNote] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [scanMessage, setScanMessage] = useState('')

  const amountNumber = normalizeAmount(amount)
  const detectedCategory = inferCategory(`${title} ${partner} ${note}`)

  const usedCategory =
    type === 'expense' && category === 'sonstiges'
      ? detectedCategory
      : category

  const readableCategory = CATEGORY_LABELS[usedCategory] || usedCategory
  const taxHint = amountNumber > 0 ? amountNumber * 0.3 : 0

  function handleScanSuccess(data: any) {
    if (!data) return

    const scanTitle = data.title || ''
    const scanVendor = data.vendor || ''
    const scanAmount = data.amount ? String(data.amount).replace('.', ',') : ''
    const autoCategory = inferCategory(`${scanTitle} ${scanVendor}`)

    setType('expense')
    setTitle(scanTitle)
    setPartner(scanVendor)
    setAmount(scanAmount)
    setCategory(autoCategory)
    setNote('Automatisch von Mila ausgelesen 📸')
    setScanMessage('Beleg erkannt. Bitte kurz prüfen und speichern.')
  }

  function resetForm() {
    setTitle('')
    setAmount('')
    setPartner('')
    setCategory('sonstiges')
    setNote('')
    setScanMessage('')
  }

  function isDuplicateExpense() {
    if (type !== 'expense') return false

    return expenses.some((expense) => {
      const sameAmount = Number(expense.amount) === amountNumber
      const sameVendor =
        String(expense.vendor || expense.title || '').toLowerCase().trim() ===
        String(partner || title).toLowerCase().trim()

      return sameAmount && sameVendor && amountNumber > 0
    })
  }

  function isDuplicateIncome() {
    if (type !== 'income') return false

    return incomes.some((income) => {
      const sameAmount = Number(income.amount) === amountNumber
      const sameClient =
        String(income.client || income.title || '').toLowerCase().trim() ===
        String(partner || title).toLowerCase().trim()

      return sameAmount && sameClient && amountNumber > 0
    })
  }

  async function speichern() {
    if (isSaving) return

    if (!title.trim() || !amount.trim() || amountNumber <= 0) {
      alert('Bitte Titel und gültigen Betrag eintragen.')
      return
    }

    if (isDuplicateExpense()) {
      const ok = confirm(
        'Mila hat eine mögliche Doppelbuchung erkannt. Trotzdem speichern?'
      )
      if (!ok) return
    }

    if (isDuplicateIncome()) {
      const ok = confirm(
        'Mila hat eine mögliche doppelte Einnahme erkannt. Trotzdem speichern?'
      )
      if (!ok) return
    }

    setIsSaving(true)

    try {
      if (type === 'expense') {
        await addExpense({
          title: title.trim(),
          vendor: partner.trim(),
          amount: amountNumber,
          category: usedCategory,
          note: note.trim(),
          hasReceipt: scanMessage.length > 0,
        })

        triggerMilaFeedback(usedCategory)
      } else {
        await addIncome({
          title: title.trim(),
          client: partner.trim(),
          amount: amountNumber,
          note: note.trim(),
          status: 'offen',
        })
      }

      resetForm()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="rounded-[2rem] bg-white p-5 shadow-sm">
      <div className="mb-4">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-500">
          Neue Buchung
        </p>
        <h2 className="mt-2 text-2xl font-black text-slate-950">
          Einnahme oder Ausgabe erfassen
        </h2>
      </div>

      <ReceiptUpload onScanSuccess={handleScanSuccess} />

      {scanMessage && (
        <div className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
          📸 {scanMessage}
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 rounded-2xl bg-violet-50 p-1">
        <button
          type="button"
          onClick={() => setType('expense')}
          className={
            type === 'expense'
              ? 'rounded-2xl bg-white py-3 text-sm font-black text-slate-950 shadow-sm'
              : 'py-3 text-sm font-black text-slate-500'
          }
        >
          📉 Ausgabe
        </button>

        <button
          type="button"
          onClick={() => setType('income')}
          className={
            type === 'income'
              ? 'rounded-2xl bg-white py-3 text-sm font-black text-slate-950 shadow-sm'
              : 'py-3 text-sm font-black text-slate-500'
          }
        >
          💰 Einnahme
        </button>
      </div>

      <div className="mt-4 space-y-3">
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          placeholder="0,00 €"
          className="w-full rounded-2xl border border-violet-100 bg-white p-4 text-3xl font-black text-slate-950 outline-none"
        />

        <input
          value={title}
          onChange={(e) => {
            const value = e.target.value
            setTitle(value)

            if (type === 'expense') {
              setCategory(inferCategory(`${value} ${partner} ${note}`))
            }
          }}
          placeholder={type === 'expense' ? 'Was wurde bezahlt?' : 'Wofür kam Geld rein?'}
          className="w-full rounded-2xl border border-violet-100 bg-white p-3 text-lg font-semibold outline-none"
        />

        <input
          value={partner}
          onChange={(e) => {
            const value = e.target.value
            setPartner(value)

            if (type === 'expense') {
              setCategory(inferCategory(`${title} ${value} ${note}`))
            }
          }}
          placeholder={type === 'expense' ? 'Händler optional' : 'Kunde optional'}
          className="w-full rounded-2xl border border-violet-100 bg-white p-3 text-lg font-semibold outline-none"
        />

        {type === 'expense' && (
          <select
            value={usedCategory}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-2xl border border-violet-100 bg-white p-3 text-lg font-semibold outline-none"
          >
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        )}

        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Notiz optional"
          className="w-full rounded-2xl border border-violet-100 bg-white p-3 text-lg font-semibold outline-none"
        />
      </div>

      <div className="mt-4 rounded-2xl bg-violet-50 p-4">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-700">
          Mila denkt mit ✨
        </p>

        {type === 'expense' ? (
          <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-700">
            Ich ordne diese Ausgabe als <strong>{readableCategory}</strong> ein.
            {amountNumber > 0 && (
              <>
                {' '}Als grobe Orientierung wären bei 30% etwa{' '}
                <strong>{formatEuro(taxHint)}</strong> steuerlich relevant.
              </>
            )}
          </p>
        ) : (
          <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-700">
            Bei dieser Einnahme wären ca. <strong>{formatEuro(taxHint)}</strong>{' '}
            als Rücklage eine vorsichtige Orientierung.
          </p>
        )}

        <p className="mt-2 text-[11px] font-semibold text-slate-500">
          Hinweis: Mila gibt Orientierung und ersetzt keine Steuerberatung.
        </p>
      </div>

      <button
        type="button"
        onClick={speichern}
        disabled={isSaving}
        className="mt-5 w-full rounded-2xl bg-violet-600 py-4 text-lg font-black text-white shadow-sm disabled:opacity-50"
      >
        {isSaving ? 'Speichere...' : 'Eintrag speichern'}
      </button>
    </section>
  )
}