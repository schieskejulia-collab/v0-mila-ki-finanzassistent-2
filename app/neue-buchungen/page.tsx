'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFinance } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import { createDocument } from '@/lib/mila-documents'
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

const INKASSO_LABEL = 'Inkasso / Forderung'

const categories = Array.from(
  new Set([
    ...CATEGORY_LIST.map((category) => category.label),
    INKASSO_LABEL,
  ])
)

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

  if (exactCategory) return exactCategory

  return getCategoryLabel(detectCategory(value))
}

export default function NeueBuchungPage() {
  const router = useRouter()

  const {
    addExpense,
    addIncome,
    addObligation,
    incomes,
    expenses,
    obligations,
    addDocument,
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
  const [scannedFile, setScannedFile] =
    useState<File | null>(null)
  const [scanMessage, setScanMessage] = useState('')

  const numericAmount = Number(
    String(amount || 0).replace(',', '.')
  )

  function resetForm() {
    setTitle('')
    setAmount('')
    setPartner('')
    setCategory('Sonstiges')
    setNote('')
    setStatus('offen')
    setDueDate('')
    setScannedFile(null)
    setScanMessage('')
  }

  function updateTitle(value: string) {
    setTitle(value)

    if (type === 'expense') {
      const detected = detectCategory(value)
      setCategory(getCategoryLabel(detected))
    }
  }

  function handleScanSuccess(rawData: any, file: File) {
    setScannedFile(file)

    const scannedData =
      rawData?.data?.data ||
      rawData?.data ||
      rawData

    if (!scannedData) {
      setScanMessage(
        'Mila konnte aus der Datei keine verwertbaren Angaben lesen.'
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

    const suggestedCategory = String(
      scannedData.suggestedCategory ||
        scannedData.category ||
        ''
    ).trim()

    const documentType = String(
      scannedData.documentType || ''
    ).toLowerCase()

    const combinedText = `
      ${scannedTitle}
      ${scannedVendor}
      ${scannedNote}
      ${suggestedCategory}
      ${documentType}
    `.toLowerCase()

    const isInkasso =
      documentType === 'inkasso' ||
      combinedText.includes('inkasso') ||
      combinedText.includes('forderung') ||
      combinedText.includes('aktenzeichen')

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
          : getCategoryLabel(
              detectCategory(
                `${scannedTitle} ${scannedVendor} ${scannedNote}`
              )
            )

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
    setNote(scannedNote)
    setCategory(
      proposedCategory || 'Sonstiges'
    )
    setScanMessage(
      'Mila hat die erkannten Angaben übernommen. Bitte kurz prüfen und anschließend speichern.'
    )
  }

  async function alsOffenenPunktSpeichern() {
    if (
      !title.trim() ||
      !amount ||
      !partner.trim() ||
      !dueDate
    ) {
      alert(
        'Bitte Titel, Betrag, Anbieter und Fälligkeit eintragen.'
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
        'Dieser offene Punkt ist bereits gespeichert.'
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
        area: 'betrieb',
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

      alert('Als offener Punkt gespeichert.')
    } catch (error: any) {
      alert(
        error?.message ||
          'Der offene Punkt konnte nicht gespeichert werden.'
      )
    }
  }

  async function speichern() {
    if (isSaving) return

    if (
      !title.trim() ||
      !amount ||
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      alert(
        'Bitte Titel und einen gültigen Betrag eintragen.'
      )
      return
    }

    setIsSaving(true)

    let uploadedPath = ''

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error(
          'Bitte melde dich erneut an, bevor du Unterlagen speicherst.'
        )
      }

      const payload: any = {
        title: title.trim(),
        amount: numericAmount,
        note: note.trim(),
        date: new Date()
          .toISOString()
          .slice(0, 10),
        source: scannedFile
          ? 'scan'
          : 'manuell',
        vat: 19,
      }

      if (type === 'expense') {
        payload.vendor = partner.trim()
        payload.category =
          category || 'Sonstiges'
        payload.hasReceipt =
          Boolean(scannedFile)
      } else {
        payload.client = partner.trim()
        payload.status = status
        payload.due_date =
          dueDate || null
        payload.tax_reserve = 0
      }

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
        const proceed = window.confirm(
          'Eine sehr ähnliche Buchung existiert bereits. Trotzdem speichern?'
        )

        if (!proceed) {
          return
        }
      }

      let documentId = ''

      if (scannedFile) {
        if (
          scannedFile.size >
          10 * 1024 * 1024
        ) {
          throw new Error(
            'Die Datei ist größer als 10 MB.'
          )
        }

        documentId = crypto.randomUUID()

        const extension =
          scannedFile.name
            .split('.')
            .pop()
            ?.toLowerCase() ||
          (scannedFile.type ===
          'application/pdf'
            ? 'pdf'
            : 'jpg')

        uploadedPath =
          `${user.id}/${documentId}.${extension}`

        const { error: uploadError } =
          await supabase.storage
            .from('mila-dokumente')
            .upload(
              uploadedPath,
              scannedFile,
              {
                contentType:
                  scannedFile.type ||
                  'application/octet-stream',
                upsert: false,
              }
            )

        if (uploadError) {
          throw uploadError
        }
      }

      if (
        partner.trim() &&
        type === 'expense'
      ) {
        saveMerchantMemory({
          merchant: partner.trim(),
          category:
            category === INKASSO_LABEL
              ? 'inkasso'
              : detectCategory(category),
          taxHint: 'depends',
        })
      }

      if (type === 'expense') {
        await addExpense(payload)
      } else {
        await addIncome(payload)
      }

      if (
        scannedFile &&
        uploadedPath &&
        documentId
      ) {
        try {
          await addDocument(
            createDocument({
              id: documentId,
              title: payload.title,
              partner: partner.trim(),
              amount: numericAmount,
              type:
                type === 'income'
                  ? 'rechnung'
                  : 'beleg',
              status: 'neu',
              dueDate:
                dueDate || undefined,
              fileName:
                scannedFile.name,
              fileUrl: uploadedPath,
              note: note.trim(),
            })
          )
        } catch (documentError) {
          await supabase.storage
            .from('mila-dokumente')
            .remove([uploadedPath])

          throw documentError
        }
      }

      resetForm()

      alert(
        scannedFile
          ? 'Unterlage wurde gespeichert und der Mandantenmappe hinzugefügt.'
          : 'Eintrag wurde gespeichert.'
      )

      router.push('/dokumente')
    } catch (error: any) {
      if (uploadedPath) {
        await supabase.storage
          .from('mila-dokumente')
          .remove([uploadedPath])
      }

      alert(
        error?.message ||
          'Speichern ist fehlgeschlagen.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-md space-y-5 p-6 pb-40 text-slate-950">
      <header>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">
          Eingang
        </p>

        <h1 className="mt-2 text-3xl font-black">
          Beleg erfassen
        </h1>

        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
          Foto oder PDF einlesen, erkannte Angaben prüfen und anschließend
          strukturiert in der Mandantenmappe ablegen.
        </p>
      </header>

      <ReceiptUpload
        onScanSuccess={handleScanSuccess}
      />

      {scanMessage && (
        <section className="rounded-2xl bg-violet-50 p-4 text-sm font-semibold leading-relaxed text-violet-800">
          {scanMessage}
        </section>
      )}

      <section className="border-t border-slate-100 pt-4">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
          Angaben prüfen oder manuell ergänzen
        </p>

        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-2">
          <button
            type="button"
            onClick={() =>
              setType('expense')
            }
            className={
              type === 'expense'
                ? 'rounded-2xl bg-white px-4 py-4 text-sm font-black text-slate-950 shadow-sm'
                : 'rounded-2xl px-4 py-4 text-sm font-black text-slate-500'
            }
          >
            Ausgabe
          </button>

          <button
            type="button"
            onClick={() =>
              setType('income')
            }
            className={
              type === 'income'
                ? 'rounded-2xl bg-white px-4 py-4 text-sm font-black text-violet-700 shadow-sm'
                : 'rounded-2xl px-4 py-4 text-sm font-black text-slate-500'
            }
          >
            Einnahme
          </button>
        </div>
      </section>

      <div className="space-y-3">
        <input
          className="w-full rounded-2xl border border-violet-100 bg-white p-4 outline-none focus:ring-2 focus:ring-violet-500"
          placeholder="Titel"
          value={title}
          onChange={(event) =>
            updateTitle(
              event.target.value
            )
          }
        />

        <input
          className="w-full rounded-2xl border border-violet-100 bg-white p-4 outline-none focus:ring-2 focus:ring-violet-500"
          placeholder="Betrag"
          type="number"
          step="0.01"
          value={amount}
          onChange={(event) =>
            setAmount(
              event.target.value
            )
          }
        />

        <input
          className="w-full rounded-2xl border border-violet-100 bg-white p-4 outline-none focus:ring-2 focus:ring-violet-500"
          placeholder={
            type === 'expense'
              ? 'Händler / Anbieter'
              : 'Zahlungsquelle'
          }
          value={partner}
          onChange={(event) =>
            setPartner(
              event.target.value
            )
          }
        />

        {type === 'expense' && (
          <select
            className="w-full rounded-2xl border border-violet-100 bg-white p-4 outline-none focus:ring-2 focus:ring-violet-500"
            value={category}
            onChange={(event) =>
              setCategory(
                event.target.value
              )
            }
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

        {type === 'income' && (
          <select
            value={status}
            onChange={(event) =>
              setStatus(
                event.target.value
              )
            }
            className="w-full rounded-2xl border border-violet-100 bg-white p-4 outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="offen">
              Erwartet
            </option>
            <option value="bezahlt">
              Eingegangen
            </option>
            <option value="ueberfaellig">
              Überfällig
            </option>
          </select>
        )}

        <div>
          <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
            Fällig am
          </label>

          <input
            type="date"
            value={dueDate}
            onChange={(event) =>
              setDueDate(
                event.target.value
              )
            }
            className="mt-2 h-14 w-full rounded-2xl border border-violet-100 bg-white px-4 outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        <textarea
          className="min-h-28 w-full rounded-2xl border border-violet-100 bg-white p-4 outline-none focus:ring-2 focus:ring-violet-500"
          placeholder="Notiz oder fehlender Kontext"
          value={note}
          onChange={(event) =>
            setNote(
              event.target.value
            )
          }
        />
      </div>

      {type === 'expense' && title && dueDate && (
        <button
          type="button"
          onClick={alsOffenenPunktSpeichern}
          className="w-full rounded-2xl border border-violet-200 bg-white py-4 font-black text-violet-700"
        >
          Zusätzlich als offenen Punkt merken
        </button>
      )}

      <button
        type="button"
        onClick={speichern}
        disabled={isSaving}
        className="w-full rounded-2xl bg-violet-600 py-4 font-black text-white shadow-md disabled:opacity-50"
      >
        {isSaving
          ? 'Speichere ...'
          : 'Speichern & zur Mappe'}
      </button>

      <section className="rounded-2xl bg-slate-50 p-4 text-xs font-semibold leading-relaxed text-slate-500">
        Mila strukturiert und ordnet die erfassten Angaben. Die fachliche
        steuerliche Bewertung bleibt bei der zuständigen Kanzlei.
      </section>
    </main>
  )
}