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

export function BookingForm() {
  const { addExpense, addIncome, triggerMilaFeedback } = useFinance()

  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [amount, setAmount] = useState('')
  const [title, setTitle] = useState('')
  const [partner, setPartner] = useState('')
  const [category, setCategory] = useState('sonstiges')
  const [note, setNote] = useState('')

  const amountNumber = Number(amount || 0)
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
    const scanAmount = data.amount ? String(data.amount) : ''

    const autoCategory = inferCategory(`${scanTitle} ${scanVendor}`)

    setType('expense')
    setTitle(scanTitle)
    setPartner(scanVendor)
    setAmount(scanAmount)
    setCategory(autoCategory)
    setNote('Automatisch von Mila ausgelesen 📸')
  }

  async function speichern() {
    if (!title || !amount) {
      alert('Bitte Titel und Betrag eintragen.')
      return
    }

    if (type === 'expense') {
      await addExpense({
        title,
        vendor: partner,
        amount,
        category: usedCategory,
        note,
      })

      triggerMilaFeedback(usedCategory)
    } else {
      await addIncome({
        title,
        client: partner,
        amount,
        note,
        status: 'offen',
      })
    }

    setTitle('')
    setAmount('')
    setPartner('')
    setCategory('sonstiges')
    setNote('')
  }

  return (
    <section className="rounded-[2rem] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-black text-slate-950">
          Buchung erfassen
        </h2>

        <div className="rounded-full bg-violet-100 px-4 py-2 text-sm font-black text-violet-700">
          📸 Beleg scannen
        </div>
      </div>

      <ReceiptUpload onScanSuccess={handleScanSuccess} />

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
          Ausgabe
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
          Einnahme
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
            Betrag (€)
          </p>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="0,00"
            className="w-full rounded-2xl border border-violet-100 bg-white p-3 text-lg font-black outline-none"
          />
        </div>

        {type === 'expense' && (
          <div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              Kategorie
            </p>
            <select
              value={usedCategory}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-2xl border border-violet-100 bg-white p-3 text-lg outline-none"
            >
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-3">
        <input
          value={title}
          onChange={(e) => {
            const value = e.target.value
            setTitle(value)
            if (type === 'expense') {
              setCategory(inferCategory(`${value} ${partner} ${note}`))
            }
          }}
          placeholder={type === 'expense' ? 'Titel / Händler' : 'Titel / Projekt'}
          className="w-full rounded-2xl border border-violet-100 bg-white p-3 text-lg outline-none"
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
          className="w-full rounded-2xl border border-violet-100 bg-white p-3 text-lg outline-none"
        />

        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Notiz optional"
          className="w-full rounded-2xl border border-violet-100 bg-white p-3 text-lg outline-none"
        />
      </div>

      <div className="mt-4 rounded-2xl bg-violet-50 p-4">
        <p className="text-xs font-black uppercase text-violet-700">
          Milas Tipp ✨
        </p>

        {type === 'expense' ? (
          <p className="mt-2 text-sm font-semibold text-slate-700">
            Ich ordne das als <strong>{readableCategory}</strong> ein.
            {amountNumber > 0 && (
              <>
                {' '}Grobe Steuerwirkung bei 30%: <strong>{formatEuro(taxHint)}</strong>.
              </>
            )}
          </p>
        ) : (
          <p className="mt-2 text-sm font-semibold text-slate-700">
            Bei dieser Einnahme wären ca. <strong>{formatEuro(taxHint)}</strong> Rücklage fürs Finanzamt sinnvoll.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={speichern}
        className="mt-5 w-full rounded-2xl bg-violet-600 py-4 text-lg font-black text-white shadow-sm"
      >
        Eintrag speichern
      </button>
    </section>
  )
}