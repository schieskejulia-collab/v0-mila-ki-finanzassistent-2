'use client'

import { useEffect, useMemo, useState } from 'react'
import { useFinance } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import { createDocument } from '@/lib/mila-documents'
import { ReceiptUpload } from '@/components/ui/receipt-upload'
import { CATEGORY_LIST, detectCategory, getCategoryLabel } from '@/lib/categories'
import { findMerchantMemory, saveMerchantMemory } from '@/lib/merchant-memory'

const INKASSO_LABEL = 'Inkasso / Forderung'
const categories = Array.from(new Set([...CATEGORY_LIST.map((category) => category.label), INKASSO_LABEL]))

function normalizeCategoryText(value: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

function resolveCategoryLabel(value: string) {
  const normalized = normalizeCategoryText(value)
  if (normalized === 'inkasso' || normalized.includes('forderung')) return INKASSO_LABEL
  const exactCategory = categories.find((category) => normalizeCategoryText(category) === normalized)
  return exactCategory || getCategoryLabel(detectCategory(value))
}

function numberValue(value: unknown) {
  const parsed = Number(String(value ?? '').replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : 0
}

function expenseTitle(expense: any) {
  return expense?.title || expense?.description || expense?.merchant || expense?.partner || expense?.vendor || 'Offene Zahlung'
}

function isMissingReceipt(expense: any) {
  return expense?.hasReceipt === false || expense?.has_receipt === false
}

function formatEuro(value: number) {
  return value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

export default function NeueBuchungPage() {
  const { addExpense, addIncome, addObligation, incomes, expenses, obligations, addDocument } = useFinance()

  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [partner, setPartner] = useState('')
  const [category, setCategory] = useState('Sonstiges')
  const [note, setNote] = useState('')
  const [status, setStatus] = useState('offen')
  const [dueDate, setDueDate] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [scannedFile, setScannedFile] = useState<File | null>(null)
  const [scanMessage, setScanMessage] = useState('')
  const [receiptMatch, setReceiptMatch] = useState<any | null>(null)
  const [receiptMismatch, setReceiptMismatch] = useState('')
  const [allowSeparateSave, setAllowSeparateSave] = useState(false)
  const [targetExpenseId, setTargetExpenseId] = useState('')

  const numericAmount = numberValue(amount)
  const openMissingExpenses = useMemo(() => (expenses || []).filter(isMissingReceipt), [expenses])
  const targetExpense = useMemo(
    () => (targetExpenseId ? openMissingExpenses.find((expense: any) => String(expense?.id || '') === targetExpenseId) || null : null),
    [openMissingExpenses, targetExpenseId]
  )

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setTargetExpenseId(params.get('expenseId') || '')
  }, [])

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
    setReceiptMatch(null)
    setReceiptMismatch('')
    setAllowSeparateSave(false)
  }

  function updateTitle(value: string) {
    setTitle(value)
    if (type === 'expense') setCategory(getCategoryLabel(detectCategory(value)))
  }

  function checkReceiptAgainstOpenPayments(scannedAmount: number) {
    setReceiptMatch(null)
    setReceiptMismatch('')
    setAllowSeparateSave(false)

    if (scannedAmount <= 0) return

    if (targetExpense) {
      const targetAmount = numberValue(targetExpense.amount)
      if (Math.abs(targetAmount - scannedAmount) < 0.01) {
        setReceiptMatch(targetExpense)
      } else {
        setReceiptMismatch(
          `Du wolltest einen Beleg für ${expenseTitle(targetExpense)} · ${formatEuro(targetAmount)} zuordnen. Der hochgeladene Beleg hat ${formatEuro(scannedAmount)}. Das passt nicht.`
        )
      }
      return
    }

    if (openMissingExpenses.length === 0) return

    const exactMatches = openMissingExpenses.filter(
      (expense: any) => Math.abs(numberValue(expense?.amount) - scannedAmount) < 0.01
    )

    if (exactMatches.length === 1) {
      setReceiptMatch(exactMatches[0])
      return
    }

    if (exactMatches.length > 1) {
      setReceiptMismatch(
        `Der Betrag ${formatEuro(scannedAmount)} passt zu mehreren offenen Zahlungen. Bitte starte die Zuordnung direkt bei der richtigen Zahlung in der Mappe.`
      )
      return
    }

    const openAmounts = openMissingExpenses
      .slice(0, 4)
      .map((expense: any) => `${expenseTitle(expense)} · ${formatEuro(numberValue(expense?.amount))}`)
      .join(' | ')

    setReceiptMismatch(
      `Dieser Beleg passt vom Betrag zu keiner offenen Zahlung. Erkannter Beleg: ${formatEuro(scannedAmount)}. Offen sind z. B.: ${openAmounts}`
    )
  }

  function handleScanSuccess(rawData: any, file: File) {
    const scannedData = rawData?.data?.data || rawData?.data || rawData
    if (!scannedData) {
      setScanMessage('Mila konnte aus der Datei keine verwertbaren Angaben lesen.')
      return
    }

    setScannedFile(file)

    const scannedTitle = String(scannedData.title || '').trim()
    const scannedVendor = String(scannedData.vendor || '').trim()
    const scannedNote = String(scannedData.note || '').trim()
    const scannedAmount = numberValue(scannedData.amount)
    const suggestedCategory = String(scannedData.suggestedCategory || scannedData.category || '').trim()
    const documentType = String(scannedData.documentType || '').toLowerCase()
    const combinedText = `${scannedTitle} ${scannedVendor} ${scannedNote} ${suggestedCategory} ${documentType}`.toLowerCase()
    const isInkasso = documentType === 'inkasso' || combinedText.includes('inkasso') || combinedText.includes('forderung') || combinedText.includes('aktenzeichen')

    const rememberedMerchant = findMerchantMemory(scannedVendor)
    const rememberedCategory = rememberedMerchant ? getCategoryLabel(rememberedMerchant.category) : ''
    const proposedCategory = isInkasso
      ? INKASSO_LABEL
      : rememberedCategory
        ? rememberedCategory
        : suggestedCategory && suggestedCategory.toLowerCase() !== 'unklar'
          ? resolveCategoryLabel(suggestedCategory)
          : getCategoryLabel(detectCategory(`${scannedTitle} ${scannedVendor} ${scannedNote}`))

    setType('expense')
    setTitle(scannedTitle || (scannedVendor ? `Beleg von ${scannedVendor}` : 'Beleg'))
    setAmount(scannedAmount > 0 ? String(scannedAmount) : '')
    setPartner(scannedVendor)
    setDueDate(String(scannedData.dueDate || scannedData.due_date || scannedData.document?.dueDate || scannedData.document?.due_date || ''))
    setNote(scannedNote)
    setCategory(proposedCategory || 'Sonstiges')
    setScanMessage('Mila hat die erkannten Angaben übernommen. Bitte kurz prüfen und anschließend speichern.')

    checkReceiptAgainstOpenPayments(scannedAmount)
  }

  async function alsOffenenPunktSpeichern() {
    if (!title.trim() || !amount || !partner.trim() || !dueDate) {
      alert('Bitte Titel, Betrag, Anbieter und Fälligkeit eintragen.')
      return
    }

    const normalizedPartner = partner.trim().toLowerCase()
    const normalizedAmount = numberValue(amount)
    const duplicate = (obligations || []).some((item: any) => {
      const itemPartner = String(item.partner || item.creditor || '').trim().toLowerCase()
      return itemPartner === normalizedPartner && Number(item.amount || 0) === normalizedAmount && String(item.dueDate || item.due_date || '') === dueDate
    })

    if (duplicate) {
      alert('Dieser offene Punkt ist bereits gespeichert.')
      return
    }

    await addObligation({
      id: crypto.randomUUID(),
      title: title.trim(),
      partner: partner.trim(),
      creditor: partner.trim(),
      amount: normalizedAmount,
      type: category === INKASSO_LABEL ? 'inkasso' : 'rechnung',
      area: 'business',
      dueDate,
      due_date: dueDate as any,
      status: 'offen',
      priority: category === INKASSO_LABEL ? 'wichtig' : 'normal',
      reminderDays: [14, 3, 0],
      reminder_days: 3 as any,
    })
    alert('Als offener Punkt gespeichert.')
  }

  async function markMatchedExpenseAsHavingReceipt(expense: any, userId: string) {
    if (!expense?.id) throw new Error('Die offene Zahlung hat keine eindeutige ID.')

    const { error } = await supabase
      .from('expenses')
      .update({ hasReceipt: true })
      .eq('id', expense.id)
      .eq('user_id', userId)

    if (error) throw error
  }

  async function speichern() {
    if (isSaving) return
    if (!title.trim() || !amount || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      alert('Bitte Titel und einen gültigen Betrag eintragen.')
      return
    }

    if (scannedFile && receiptMismatch && !allowSeparateSave) {
      alert('Mila hat eine Abweichung erkannt. Bitte zuerst den passenden Beleg wählen oder bewusst „separat ablegen“ bestätigen.')
      return
    }

    setIsSaving(true)
    let uploadedPath = ''

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw new Error('Bitte melde dich erneut an, bevor du Unterlagen speicherst.')

      const payload: any = {
        title: title.trim(),
        amount: numericAmount,
        note: note.trim(),
        date: new Date().toISOString().slice(0, 10),
        source: scannedFile ? 'scan' : 'manuell',
        vat: 19,
      }

      if (type === 'expense') {
        payload.vendor = partner.trim()
        payload.category = category || 'Sonstiges'
        payload.hasReceipt = Boolean(scannedFile)
      } else {
        payload.client = partner.trim()
        payload.status = status
        payload.due_date = dueDate || null
        payload.tax_reserve = 0
      }

      const separateDocumentOnly = Boolean(scannedFile && receiptMismatch && allowSeparateSave)
      const existingItems = type === 'expense' ? expenses : incomes
      const duplicate = existingItems.find((item: any) => {
        const normalize = (value: unknown) => String(value || '').trim().toLowerCase()
        return normalize(item.title) === normalize(payload.title)
          && normalize(item.partner || item.vendor || item.client) === normalize(payload.vendor || payload.client)
          && Number(item.amount) === Number(payload.amount)
          && String(item.date || '').slice(0, 10) === String(payload.date || '').slice(0, 10)
      })

      if (duplicate && !receiptMatch && !separateDocumentOnly) {
        const proceed = window.confirm('Eine sehr ähnliche Buchung existiert bereits. Trotzdem speichern?')
        if (!proceed) return
      }

      let documentId = ''
      if (scannedFile) {
        if (scannedFile.size > 10 * 1024 * 1024) throw new Error('Die Datei ist größer als 10 MB.')
        documentId = crypto.randomUUID()
        const extension = scannedFile.name.split('.').pop()?.toLowerCase() || (scannedFile.type === 'application/pdf' ? 'pdf' : 'jpg')
        uploadedPath = `${user.id}/${documentId}.${extension}`

        const { error: uploadError } = await supabase.storage
          .from('mila-dokumente')
          .upload(uploadedPath, scannedFile, {
            contentType: scannedFile.type || 'application/octet-stream',
            upsert: false,
          })
        if (uploadError) throw uploadError
      }

      if (partner.trim() && type === 'expense') {
        saveMerchantMemory({
          merchant: partner.trim(),
          category: category === INKASSO_LABEL ? 'inkasso' : detectCategory(category),
          taxHint: 'depends',
        })
      }

      if (type === 'expense') {
        if (scannedFile && receiptMatch) {
          await markMatchedExpenseAsHavingReceipt(receiptMatch, user.id)
        } else if (!separateDocumentOnly) {
          await addExpense(payload)
        }
      } else if (!separateDocumentOnly) {
        await addIncome(payload)
      }

      if (scannedFile && uploadedPath && documentId) {
        try {
          await addDocument(createDocument({
            id: documentId,
            title: payload.title,
            partner: partner.trim(),
            amount: numericAmount,
            type: type === 'income' ? 'rechnung' : 'beleg',
            status: 'neu',
            dueDate: dueDate || undefined,
            fileName: scannedFile.name,
            fileUrl: uploadedPath,
            note: receiptMatch
              ? `${note.trim()}${note.trim() ? ' · ' : ''}Beleg organisatorisch zu Zahlung ${expenseTitle(receiptMatch)} (${formatEuro(numberValue(receiptMatch.amount))}) zugeordnet.`
              : separateDocumentOnly
                ? `${note.trim()}${note.trim() ? ' · ' : ''}Bewusst separat abgelegt; keiner offenen Zahlung zugeordnet.`
                : note.trim(),
          }))
        } catch (documentError) {
          await supabase.storage.from('mila-dokumente').remove([uploadedPath])
          throw documentError
        }
      }

      resetForm()
      alert(
        receiptMatch
          ? 'Beleg wurde geprüft, der gewählten offenen Zahlung zugeordnet und in der Mandantenmappe gespeichert.'
          : separateDocumentOnly
            ? 'Unterlage wurde separat gespeichert. Es wurde keine neue Zahlung erzeugt.'
            : scannedFile
              ? 'Unterlage wurde gespeichert und der Mandantenmappe hinzugefügt.'
              : 'Eintrag wurde gespeichert.'
      )

      window.location.href = '/dokumente'
    } catch (error: any) {
      if (uploadedPath) await supabase.storage.from('mila-dokumente').remove([uploadedPath])
      alert(error?.message || 'Speichern ist fehlgeschlagen.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-md space-y-5 p-6 pb-40 text-slate-950">
      <header>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Eingang</p>
        <h1 className="mt-2 text-3xl font-black">Beleg erfassen</h1>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
          Foto oder PDF einlesen, erkannte Angaben prüfen und anschließend strukturiert in der Mandantenmappe ablegen.
        </p>
      </header>

      {targetExpense && (
        <section className="rounded-3xl border border-violet-200 bg-violet-50 p-5">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">Beleg zuordnen für</p>
          <p className="mt-2 text-lg font-black">{expenseTitle(targetExpense)} · {formatEuro(numberValue(targetExpense.amount))}</p>
          <p className="mt-2 text-sm font-semibold text-slate-600">Mila prüft den hochgeladenen Beleg genau gegen diese Zahlung.</p>
        </section>
      )}

      <ReceiptUpload onScanSuccess={handleScanSuccess} />

      {scanMessage && (
        <section className="rounded-2xl bg-violet-50 p-4 text-sm font-semibold leading-relaxed text-violet-800">
          {scanMessage}
        </section>
      )}

      {receiptMatch && scannedFile && (
        <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">✓ Passende offene Zahlung gefunden</p>
          <p className="mt-2 text-lg font-black">{expenseTitle(receiptMatch)} · {formatEuro(numberValue(receiptMatch.amount))}</p>
          <p className="mt-2 text-sm font-semibold text-slate-600">Beim Speichern wird kein neuer Zahlungs-Eintrag erzeugt. Der Beleg wird dieser offenen Zahlung zugeordnet.</p>
        </section>
      )}

      {receiptMismatch && scannedFile && (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-800">⚠️ Beleg passt vermutlich nicht</p>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-700">{receiptMismatch}</p>
          {!allowSeparateSave ? (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={resetForm} className="rounded-2xl bg-white px-3 py-3 text-xs font-black text-slate-700 ring-1 ring-amber-200">Anderen Beleg wählen</button>
              <button type="button" onClick={() => setAllowSeparateSave(true)} className="rounded-2xl bg-amber-600 px-3 py-3 text-xs font-black text-white">Separat ablegen</button>
            </div>
          ) : (
            <p className="mt-4 rounded-2xl bg-white p-3 text-xs font-black text-amber-800">Bewusst als separates Dokument bestätigt. Die offene Zahlung bleibt unverändert.</p>
          )}
        </section>
      )}

      <section className="border-t border-slate-100 pt-4">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-400">Angaben prüfen oder manuell ergänzen</p>
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-2">
          <button type="button" onClick={() => setType('expense')} className={type === 'expense' ? 'rounded-2xl bg-white px-4 py-4 text-sm font-black text-slate-950 shadow-sm' : 'rounded-2xl px-4 py-4 text-sm font-black text-slate-500'}>Ausgabe</button>
          <button type="button" onClick={() => setType('income')} className={type === 'income' ? 'rounded-2xl bg-white px-4 py-4 text-sm font-black text-violet-700 shadow-sm' : 'rounded-2xl px-4 py-4 text-sm font-black text-slate-500'}>Einnahme</button>
        </div>
      </section>

      <div className="space-y-3">
        <input className="w-full rounded-2xl border border-violet-100 bg-white p-4 outline-none focus:ring-2 focus:ring-violet-500" placeholder="Titel" value={title} onChange={(event) => updateTitle(event.target.value)} />
        <input className="w-full rounded-2xl border border-violet-100 bg-white p-4 outline-none focus:ring-2 focus:ring-violet-500" placeholder="Betrag" type="number" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} />
        <input className="w-full rounded-2xl border border-violet-100 bg-white p-4 outline-none focus:ring-2 focus:ring-violet-500" placeholder={type === 'expense' ? 'Händler / Anbieter' : 'Zahlungsquelle'} value={partner} onChange={(event) => setPartner(event.target.value)} />

        {type === 'expense' && (
          <select className="w-full rounded-2xl border border-violet-100 bg-white p-4 outline-none focus:ring-2 focus:ring-violet-500" value={category} onChange={(event) => setCategory(event.target.value)}>
            {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        )}

        {type === 'income' && (
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="w-full rounded-2xl border border-violet-100 bg-white p-4 outline-none focus:ring-2 focus:ring-violet-500">
            <option value="offen">Erwartet</option>
            <option value="bezahlt">Eingegangen</option>
            <option value="ueberfaellig">Überfällig</option>
          </select>
        )}

        <div>
          <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Fällig am</label>
          <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="mt-2 h-14 w-full rounded-2xl border border-violet-100 bg-white px-4 outline-none focus:ring-2 focus:ring-violet-500" />
        </div>

        <textarea className="min-h-28 w-full rounded-2xl border border-violet-100 bg-white p-4 outline-none focus:ring-2 focus:ring-violet-500" placeholder="Notiz oder fehlender Kontext" value={note} onChange={(event) => setNote(event.target.value)} />
      </div>

      {type === 'expense' && title && dueDate && (
        <button type="button" onClick={alsOffenenPunktSpeichern} className="w-full rounded-2xl border border-violet-200 bg-white py-4 font-black text-violet-700">Zusätzlich als offenen Punkt merken</button>
      )}

      <button type="button" onClick={speichern} disabled={isSaving || Boolean(receiptMismatch && scannedFile && !allowSeparateSave)} className="w-full rounded-2xl bg-violet-600 py-4 font-black text-white shadow-md disabled:opacity-40">
        {isSaving ? 'Speichere ...' : receiptMatch ? 'Beleg zuordnen & zur Mappe' : allowSeparateSave ? 'Nur Dokument separat ablegen' : 'Speichern & zur Mappe'}
      </button>

      <section className="rounded-2xl bg-slate-50 p-4 text-xs font-semibold leading-relaxed text-slate-500">
        Mila prüft organisatorische Plausibilität und stoppt bei erkennbaren Abweichungen. Die fachliche steuerliche Bewertung bleibt bei der zuständigen Kanzlei.
      </section>
    </main>
  )
}
