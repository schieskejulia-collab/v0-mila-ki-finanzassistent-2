'use client'

import { useState } from 'react'
import { useFinance } from '@/lib/store'
import { ReceiptUpload } from '@/components/ui/receipt-upload'
import {
  CATEGORY_LIST,
  detectCategory,
  getCategoryLabel,
} from '@/lib/categories'
import {
  findMerchantMemory,
  saveMerchantMemory,
} from '@/lib/merchant-memory'
import { MilaScanReview } from '@/components/ui/mila-scan-review'
const INKASSO_LABEL = '⚖️ Inkasso / Forderung'

const categories = Array.from(
  new Set([
    ...CATEGORY_LIST.map((category) => category.label),
    INKASSO_LABEL,
  ])
)

function getTaxHint(category: string) {
  const pruefen = [
    'Reisen & Unterkünfte',
    'Bewirtung',
    'Fahrtkosten & Fahrzeuge',
    'Privat / Nicht absetzbar',
    'Sonstiges',
  ]

  if (
    category === 'Privat / Nicht absetzbar' ||
    category === INKASSO_LABEL
  ) {
    return 'wahrscheinlich nein / private Verpflichtung'
  }

  if (pruefen.includes(category)) {
    return 'prüfbar / abhängig vom Zweck'
  }

  return 'wahrscheinlich ja'
}

function formatEuro(value: number) {
  return Number(value || 0).toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  })
}

function normalizeCategoryText(value: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

function resolveCategoryLabel(value: string) {
  const normalized = normalizeCategoryText(value)

  if (
    normalized === 'inkasso' ||
    normalized.includes('forderung')
  ) {
    return INKASSO_LABEL
  }

  const exactCategory = categories.find(
    (category) =>
      normalizeCategoryText(category) === normalized
  )

  if (exactCategory) {
    return exactCategory
  }

  const detected = detectCategory(value)
  return getCategoryLabel(detected)
}

function displayConfidence(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return null
  }

  const percent = value <= 1 ? value * 100 : value
  return Math.max(0, Math.min(100, Math.round(percent)))
}

export default function NeueBuchungPage() {
  const {
    addExpense,
    addIncome,
    addObligation,
    incomes,
    expenses,
    obligations,
  } = useFinance()

  const [type, setType] =
    useState<'expense' | 'income'>('expense')

  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [partner, setPartner] = useState('')
  const [category, setCategory] = useState('Sonstiges')
  const [note, setNote] = useState('')
  const [status, setStatus] = useState('offen')
  const [dueDate, setDueDate] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const [scanSuggestion, setScanSuggestion] =
    useState('')

  const [scanConfidence, setScanConfidence] =
    useState<number | null>(null)

  const [
    scanNeedsConfirmation,
    setScanNeedsConfirmation,
  ] = useState(false)

  const [scanReviewReason, setScanReviewReason] =
    useState('')

  const [scanAlternatives, setScanAlternatives] =
    useState<string[]>([])

  const numericAmount = Number(
    String(amount || 0).replace(',', '.')
  )

  const taxStatus = getTaxHint(category)

  const deductible =
    type === 'expense' &&
    taxStatus === 'wahrscheinlich ja'

  const taxReserve = 0
  const taxHint = deductible
    ? numericAmount * 0.3
    : 0

  const confidencePercent =
    displayConfidence(scanConfidence)

  function resetScanReview() {
    setScanSuggestion('')
    setScanConfidence(null)
    setScanNeedsConfirmation(false)
    setScanReviewReason('')
    setScanAlternatives([])
  }

  function updateTitle(value: string) {
    setTitle(value)

    if (type === 'expense' && !scanNeedsConfirmation) {
      const detected = detectCategory(value)
      setCategory(getCategoryLabel(detected))
    }
  }

  function updatePartner(value: string) {
    setPartner(value)
  }

  function chooseScanCategory(option: string) {
    const selectedCategory =
      resolveCategoryLabel(option)

    setCategory(selectedCategory)
    setScanSuggestion(selectedCategory)
    setScanNeedsConfirmation(false)
    setScanReviewReason(
      'Danke – ich übernehme deine Auswahl.'
    )
  }

  const handleScanSuccess = (rawData: any) => {
    const scannedData =
      rawData?.data?.data ||
      rawData?.data ||
      rawData

    if (!scannedData) {
      alert(
        'Mila hat keine auswertbaren Daten erhalten.'
      )
      return
    }

    const scannedTitle = String(
      scannedData.title || ''
    ).trim()

    const scannedVendor = String(
      scannedData.vendor || ''
    ).trim()

    const scannedNote = String(
      scannedData.note || ''
    ).trim()

    const documentType = String(
      scannedData.documentType || ''
    ).toLowerCase()

    const scannedCategory = String(
      scannedData.category || ''
    ).trim()

    const suggestedCategory = String(
      scannedData.suggestedCategory ||
        scannedCategory ||
        ''
    ).trim()

    const scanText = `
      ${scannedTitle}
      ${scannedVendor}
      ${scannedNote}
      ${suggestedCategory}
      ${documentType}
    `.toLowerCase()

    const isInkasso =
      documentType === 'inkasso' ||
      suggestedCategory.toLowerCase() ===
        'inkasso' ||
      scanText.includes('inkasso') ||
      scanText.includes('forderung') ||
      scanText.includes('aktenzeichen')

    const detectedCategory = detectCategory(
      `
        ${scannedTitle}
        ${scannedVendor}
        ${scannedNote}
        ${suggestedCategory}
      `
    )

    const fallbackCategory =
      getCategoryLabel(detectedCategory)
const rememberedMerchant =
  findMerchantMemory(scannedVendor)

const rememberedCategory =
  rememberedMerchant
    ? getCategoryLabel(
        rememberedMerchant.category
      )
    : ''
   const proposedCategory = isInkasso
  ? INKASSO_LABEL
  : rememberedCategory
    ? rememberedCategory
    : suggestedCategory &&
        suggestedCategory.toLowerCase() !==
          'unklar'
      ? resolveCategoryLabel(
          suggestedCategory
        )
      : fallbackCategory
    const needsConfirmation =
  !isInkasso &&
  !rememberedMerchant &&
  Boolean(scannedData.needsConfirmation)

    const alternatives: string[] = Array.isArray(
      scannedData.alternatives
    )
      ? Array.from(
          new Set<string>(
            scannedData.alternatives
              .map((item: unknown) =>
                String(item || '').trim()
              )
              .filter(Boolean)
          )
        )
      : []

    setType('expense')

    setTitle(
      scannedTitle ||
        (scannedVendor
          ? `Beleg von ${scannedVendor}`
          : 'Beleg')
    )

    setAmount(
      String(scannedData.amount ?? '')
    )

    setPartner(scannedVendor)

    setDueDate(
      String(
        scannedData.dueDate ||
          scannedData.due_date ||
          scannedData.document?.dueDate ||
          scannedData.document?.due_date ||
          ''
      )
    )

    setNote(
      scannedNote ||
        'Automatisch von Mila ausgelesen 📸'
    )

    setScanSuggestion(
      isInkasso
        ? INKASSO_LABEL
        : proposedCategory || 'Unklar'
    )

    setScanConfidence(
  rememberedMerchant
    ? rememberedMerchant.confidence
    : typeof scannedData.confidence ===
        'number'
      ? scannedData.confidence
      : null
)

    setScanNeedsConfirmation(
      needsConfirmation
    )

    setScanReviewReason(
  rememberedMerchant
    ? `Ich kenne ${scannedVendor} bereits aus deiner letzten Auswahl.`
    : String(
        scannedData.reviewReason || ''
      )
)
    setScanAlternatives(alternatives)

    if (isInkasso) {
      setCategory(INKASSO_LABEL)
      return
    }

    if (needsConfirmation) {
      setCategory('Sonstiges')
      return
    }

    setCategory(
      proposedCategory || 'Sonstiges'
    )
  }

  async function alsVerpflichtungSpeichern() {
    if (
      !title.trim() ||
      !amount ||
      !partner.trim() ||
      !dueDate
    ) {
      alert(
        'Bitte Titel, Betrag, Anbieter und Fälligkeit eintragen 🧾'
      )
      return
    }

    const normalizedPartner =
      partner.trim().toLowerCase()

    const normalizedAmount = Number(
      String(amount).replace(',', '.')
    )

    const duplicate = (obligations || []).some(
      (item: any) => {
        const itemPartner = String(
          item.partner ||
            item.creditor ||
            ''
        )
          .trim()
          .toLowerCase()

        const itemAmount = Number(
          item.amount || 0
        )

        const itemDueDate =
          item.dueDate ||
          item.due_date ||
          ''

        return (
          itemPartner === normalizedPartner &&
          itemAmount === normalizedAmount &&
          itemDueDate === dueDate
        )
      }
    )

    if (duplicate) {
      alert(
        'Diese Verpflichtung kennt Mila bereits 🧾'
      )
      return
    }

    try {
      await addObligation({
        id: crypto.randomUUID(),
        title: title.trim(),
        partner: partner.trim(),
        creditor: partner.trim(),
        amount: normalizedAmount,
        type:
          category === INKASSO_LABEL
            ? 'inkasso'
            : 'rechnung',
        area: 'privat',
        dueDate,
        due_date: dueDate as any,
        status: 'offen',
        priority:
          category === INKASSO_LABEL
            ? 'wichtig'
            : 'normal',
        reminderDays: [14, 3, 0],
        reminder_days: 3 as any,
      })

      console.log(
        'Als Verpflichtung gespeichert'
      )
    } catch (error: any) {
      alert(
        `Verpflichtung konnte nicht gespeichert werden: ${
          error?.message ||
          'Unbekannter Fehler'
        }`
      )
    }
  }

  async function speichern() {
    if (isSaving) return

    if (!title.trim() || !amount) {
      alert(
        'Bitte zumindest Titel und Betrag ausfüllen! ⚠️'
      )
      return
    }

    if (
      type === 'expense' &&
      scanNeedsConfirmation
    ) {
      alert(
        'Bitte beantworte zuerst Milas kurze Rückfrage zur Kategorie. 🧠'
      )
      return
    }

    setIsSaving(true)

    const payload: any = {
      title: title.trim(),
      amount: numericAmount,
      note: note || '',
      date: new Date()
        .toISOString()
        .slice(0, 10),
    }

    if (type === 'expense') {
      payload.vendor = partner || ''
      payload.category =
        category || 'Sonstiges'
      payload.hasReceipt = true
      payload.vat = 19
      payload.source = 'manuell'
    } else {
      payload.client = partner || ''
      payload.tax_reserve = taxReserve
      payload.status = status
      payload.due_date =
        dueDate || null
      payload.source = 'manuell'
      payload.vat = 19
    }

    try {
      const existingItems =
        type === 'expense'
          ? expenses
          : incomes

      const duplicate = existingItems.find(
        (item: any) => {
          const normalize = (
            value: unknown
          ) =>
            String(value || '')
              .trim()
              .toLowerCase()

          const sameTitle =
            normalize(item.title) ===
            normalize(payload.title)

          const samePartner =
            normalize(
              item.partner ||
                item.vendor ||
                item.client
            ) ===
            normalize(
              payload.partner ||
                payload.vendor ||
                payload.client
            )

          const sameAmount =
            Number(item.amount) ===
            Number(payload.amount)

          const sameDate =
            String(item.date || '').slice(
              0,
              10
            ) ===
            String(payload.date || '').slice(
              0,
              10
            )

          return (
            sameTitle &&
            samePartner &&
            sameAmount &&
            sameDate
          )
        }
      )

      if (duplicate) {
        const trotzdemSpeichern =
          window.confirm(
            '⚠️ Eine sehr ähnliche Buchung existiert bereits.\n\nMöchtest du sie trotzdem speichern?'
          )

        if (!trotzdemSpeichern) {
          return
        }
      }

      if (
        partner &&
        type === 'expense'
      ) {
        saveMerchantMemory({
          merchant: partner,
          category:
            category === INKASSO_LABEL
              ? 'inkasso'
              : detectCategory(category),
          taxHint:
            taxStatus === 'wahrscheinlich ja'
              ? 'likely'
              : taxStatus ===
                  'wahrscheinlich nein / private Verpflichtung'
                ? 'private'
                : 'depends',
        })
      }

      if (type === 'expense') {
        await addExpense(payload)
      } else {
        await addIncome(payload)
      }

      setTitle('')
      setAmount('')
      setPartner('')
      setNote('')
      setStatus('offen')
      setDueDate('')
      setCategory('Sonstiges')
      resetScanReview()
    } catch (error: any) {
      alert(
        `Netzwerkfehler: ${
          error?.message ||
          'Unbekannter Fehler'
        } ❌`
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-md space-y-4 p-6 pb-40">
      <h1 className="text-3xl font-black text-slate-950">
        Neue Buchung
      </h1>

      <ReceiptUpload
        onScanSuccess={handleScanSuccess}
      />

      <div className="border-t border-gray-100 pt-4">
        <p className="mb-2 text-xs font-black uppercase tracking-wide text-gray-400">
          Oder manuell eintragen
        </p>
      </div>

      <div className="relative z-50 grid grid-cols-2 gap-2 rounded-2xl bg-gray-100 p-2">
        <button
          type="button"
          onPointerDown={(event) => {
            event.preventDefault()
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
          onPointerDown={(event) => {
            event.preventDefault()
            setType('income')
            resetScanReview()
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
          onChange={(event) =>
            updateTitle(event.target.value)
          }
        />

        <input
          className="w-full rounded-2xl border bg-white p-4 text-gray-900 outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Betrag"
          type="number"
          step="0.01"
          value={amount}
          onChange={(event) =>
            setAmount(event.target.value)
          }
        />

        <input
          className="w-full rounded-2xl border bg-white p-4 text-gray-900 outline-none focus:ring-2 focus:ring-purple-500"
          placeholder={
            type === 'expense'
              ? 'Händler / Laden'
              : 'Zahlungsquelle (optional)'
          }
          value={partner}
          onChange={(event) =>
            updatePartner(event.target.value)
          }
        />

        {type === 'income' && (
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value)
            }
            className="w-full rounded-2xl border bg-white p-4 text-gray-900 outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="offen">
              🟡 Erwartet
            </option>

            <option value="bezahlt">
              🟢 Eingegangen
            </option>

            <option value="ueberfaellig">
              🔴 Überfällig
            </option>
          </select>
        )}

        <div className="space-y-1">
          <p className="text-xs font-bold text-slate-500">
            Fällig am
          </p>

          <input
            type="date"
            value={dueDate}
            onChange={(event) =>
              setDueDate(event.target.value)
            }
            className="h-14 w-full rounded-2xl border bg-white px-4 text-gray-900 outline-none focus:ring-2 focus:ring-purple-500"
          />

          <p className="text-xs text-slate-500">
            Optional – Mila nutzt das für
            Rechnungen, Fristen und
            Erinnerungen 🧾
          </p>
        </div>

        {type === 'expense' && (
          <select
            className="w-full rounded-2xl border bg-white p-4 text-gray-900 outline-none focus:ring-2 focus:ring-purple-500"
            value={category}
            onChange={(event) => {
              setCategory(
                event.target.value
              )

              if (
                scanNeedsConfirmation
              ) {
                setScanSuggestion(
                  event.target.value
                )
                setScanNeedsConfirmation(
                  false
                )
                setScanReviewReason(
                  'Danke – ich übernehme deine Auswahl.'
                )
              }
            }}
          >
            {categories.map((cat) => (
              <option
                key={cat}
                value={cat}
              >
                {cat}
              </option>
            ))}
          </select>
        )}

        <input
          className="w-full rounded-2xl border bg-white p-4 text-gray-900 outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Notiz"
          value={note}
          onChange={(event) =>
            setNote(event.target.value)
          }
        />
      </div>

      {type === 'expense' &&
  amount &&
  scanSuggestion && (
    <MilaScanReview
      suggestion={scanSuggestion}
      confidence={scanConfidence}
      needsConfirmation={scanNeedsConfirmation}
      reviewReason={scanReviewReason}
      alternatives={scanAlternatives}
      category={category}
      taxStatus={taxStatus}
      taxHint={taxHint}
      deductible={deductible}
      onSelectCategory={chooseScanCategory}
    />
)}

      {type === 'expense' &&
        amount &&
        !scanSuggestion && (
          <section className="rounded-2xl bg-violet-50 p-4 text-sm text-slate-700">
            <p className="font-black text-violet-700">
              Mila Einschätzung
            </p>

            <p className="mt-1">
              Kategorie:{' '}
              <strong>{category}</strong>
            </p>

            <p>
              Steuerlich absetzbar:{' '}
              <strong>{taxStatus}</strong>
            </p>

            {deductible && (
              <p>
                Grobe Steuerwirkung bei
                30 %:{' '}
                <strong>
                  {formatEuro(taxHint)}
                </strong>
              </p>
            )}
          </section>
        )}

      {type === 'income' && amount && (
        <section className="rounded-2xl bg-emerald-50 p-4 text-sm text-slate-700">
          <p className="font-black text-emerald-700">
            Mila Einschätzung
          </p>

          <p>
            Empfohlene Rücklage fürs
            Finanzamt:{' '}
            <strong>
              {formatEuro(taxReserve)}
            </strong>
          </p>
        </section>
      )}

      {type === 'expense' && title && (
        <button
          type="button"
          onClick={
            alsVerpflichtungSpeichern
          }
          className="w-full rounded-2xl bg-purple-600 py-4 font-black text-white shadow-md"
        >
          🧾 Als Verpflichtung speichern
        </button>
      )}

      <button
        type="button"
        onClick={speichern}
        disabled={
          isSaving ||
          (type === 'expense' &&
            scanNeedsConfirmation)
        }
        className={`w-full rounded-2xl py-4 font-black text-white shadow-md disabled:opacity-50 ${
          type === 'expense'
            ? 'bg-slate-900'
            : 'bg-purple-600'
        }`}
      >
        {isSaving
          ? 'Speichere...'
          : type === 'expense' &&
              scanNeedsConfirmation
            ? 'Bitte Kategorie bestätigen'
            : type === 'expense'
              ? 'Ausgabe speichern'
              : 'Einnahme speichern'}
      </button>
    </main>
  )
}
