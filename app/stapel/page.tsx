'use client'

import Link from 'next/link'
import { useMemo, useRef, useState } from 'react'
import { getActiveClientId, supabase } from '@/lib/supabase'

type ScanState = {
  id: string
  name: string
  file: File
  status: 'waiting' | 'scanning' | 'done' | 'error'
  error?: string
  scan?: any
}

type ReviewQuestion = {
  id: string
  documentId: string
  field: string
  question: string
  reason: string
  options?: string[]
}

type BatchResult = {
  summary: {
    received: number
    autoSorted: number
    needsReview: number
    lineItems: number
    lineItemsNeedingContext: number
  }
  documents: any[]
  reviewQueue: ReviewQuestion[]
}

function normalizedDocumentType(value: unknown) {
  const type = String(value || '').trim().toLowerCase()
  if (type === 'quittung' || type === 'kassenbon') return 'beleg'
  if (type === 'mahnung' || type === 'forderung') return 'rechnung'
  if (['beleg', 'rechnung', 'vertrag', 'bescheid', 'inkasso', 'sonstiges'].includes(type)) return type
  return 'sonstiges'
}

function safeDate(value: unknown) {
  const raw = String(value || '').trim()
  if (!raw) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

function numberValue(value: unknown) {
  const parsed = Number(String(value ?? '').replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

function directionLabel(value: unknown) {
  if (value === 'income') return 'Einnahme erkannt'
  if (value === 'expense') return 'Ausgabe erkannt'
  return 'Nachweis / noch kein bestätigter Geldfluss'
}

export default function StapelPage() {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [items, setItems] = useState<ScanState[]>([])
  const [batch, setBatch] = useState<BatchResult | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [running, setRunning] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [savedCount, setSavedCount] = useState(0)
  const [completed, setCompleted] = useState(false)
  const [error, setError] = useState('')

  const finished = items.filter((item) => item.status === 'done').length
  const failed = items.filter((item) => item.status === 'error').length
  const total = items.length
  const progress = total > 0 ? Math.round(((finished + failed) / total) * 100) : 0

  const reviewDocumentIds = useMemo(
    () => new Set(batch?.reviewQueue.map((question) => question.documentId) || []),
    [batch],
  )

  const answeredCount = useMemo(
    () => batch?.reviewQueue.filter((question) => String(answers[question.id] || '').trim()).length || 0,
    [answers, batch],
  )

  const allAnswered = Boolean(
    batch && batch.reviewQueue.every((question) => String(answers[question.id] || '').trim()),
  )

  function answerQuestion(questionId: string, value: string) {
    setAnswers((current) => ({ ...current, [questionId]: value }))
  }

  async function chooseFiles(fileList: FileList | null) {
    if (!fileList || running || finalizing) return

    const files = Array.from(fileList).slice(0, 20)
    if (files.length === 0) return

    setError('')
    setBatch(null)
    setAnswers({})
    setSavedCount(0)
    setCompleted(false)

    const initial: ScanState[] = files.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      name: file.name,
      file,
      status: 'waiting',
    }))

    setItems(initial)
    setRunning(true)
    const scans: any[] = []

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index]
      const id = initial[index].id
      setItems((current) =>
        current.map((item) => (item.id === id ? { ...item, status: 'scanning' } : item)),
      )

      try {
        const scan = await scanFile(file)
        const enriched = {
          ...scan,
          id,
          fileName: file.name,
        }
        scans.push(enriched)
        setItems((current) =>
          current.map((item) =>
            item.id === id ? { ...item, status: 'done', scan: enriched } : item,
          ),
        )
      } catch (scanError: any) {
        setItems((current) =>
          current.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: 'error',
                  error: scanError?.message || 'Dokument konnte nicht gelesen werden.',
                }
              : item,
          ),
        )
      }
    }

    if (scans.length > 0) {
      try {
        const response = await fetch('/api/mila/batch-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scans,
            context: { userMode: 'mixed' },
          }),
        })
        const json = await response.json()
        if (!response.ok || !json?.success) {
          throw new Error(json?.error || 'Stapel konnte nicht vorsortiert werden.')
        }
        setBatch(json.data)
      } catch (batchError: any) {
        setError(batchError?.message || 'Mila konnte den Stapel nicht zusammenführen.')
      }
    }

    setRunning(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function finalizeBatch() {
    if (!batch || finalizing || completed) return

    if (batch.reviewQueue.length > 0 && !allAnswered) {
      setError('Bitte beantworte zuerst nur die noch offenen Mila-Fragen.')
      return
    }

    const activeClientId = getActiveClientId()
    if (!activeClientId) {
      setError('Bitte zuerst oben einen Mandanten auswählen. Ohne eindeutige Zuordnung speichert Mila keinen Stapel.')
      return
    }

    setError('')
    setFinalizing(true)
    const uploadedPaths: string[] = []
    const createdDocumentIds: string[] = []

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error('Bitte melde dich erneut an, bevor Mila den Stapel ablegt.')
      }

      const sourceById = new Map(items.map((item) => [item.id, item]))
      let saved = 0

      for (const document of batch.documents) {
        const source = sourceById.get(document.id)
        if (!source || source.status !== 'done' || !source.file) continue

        const documentId = crypto.randomUUID()
        const extension =
          source.file.name.split('.').pop()?.toLowerCase() ||
          (source.file.type === 'application/pdf' ? 'pdf' : 'jpg')
        const storagePath = `${user.id}/${documentId}.${extension}`

        const { error: uploadError } = await supabase.storage
          .from('mila-dokumente')
          .upload(storagePath, source.file, {
            contentType: source.file.type || 'application/octet-stream',
            upsert: false,
          })

        if (uploadError) throw uploadError
        uploadedPaths.push(storagePath)

        const scan = source.scan || {}
        const documentQuestions = batch.reviewQueue.filter(
          (question) => question.documentId === document.id,
        )
        const answerLines = documentQuestions
          .map((question) => {
            const answer = String(answers[question.id] || '').trim()
            return answer ? `${question.question} → ${answer}` : ''
          })
          .filter(Boolean)

        const noteParts = [
          `Mila Stapel · ${document.storageGroup || 'Nachweise'}`,
          directionLabel(document.financialDirection),
          answerLines.length > 0 ? `Bestätigter Kontext: ${answerLines.join(' | ')}` : 'Ohne Rückfrage organisatorisch vorsortiert.',
        ]

        const knownFacts = document?.plan?.interpretation?.knownFacts || {}
        const amount = numberValue(document.amount ?? scan.amount)
        const documentDate = safeDate(document.documentDate ?? scan.documentDate ?? knownFacts.documentDate)
        const dueDate = safeDate(scan.dueDate ?? scan.due_date ?? knownFacts.dueDate)

        const { error: documentError } = await supabase.from('documents').insert({
          id: documentId,
          user_id: user.id,
          title: String(document.title || scan.title || source.name || 'Dokument').trim(),
          partner: String(document.vendor || scan.vendor || scan.partner || '').trim() || null,
          amount,
          type: normalizedDocumentType(document.documentType ?? scan.documentType ?? scan.type),
          status: 'geprueft',
          document_date: documentDate,
          due_date: dueDate,
          file_name: source.file.name,
          file_url: storagePath,
          note: noteParts.join(' · '),
        })

        if (documentError) throw documentError
        createdDocumentIds.push(documentId)

        if (documentQuestions.length > 0) {
          const now = new Date().toISOString()
          const questionRows = documentQuestions.map((question) => ({
            user_id: user.id,
            document_id: documentId,
            question: question.question,
            answer: String(answers[question.id] || '').trim(),
            status: 'done',
            answered_at: now,
            completed_at: now,
          }))

          const { error: questionError } = await supabase
            .from('client_questions')
            .insert(questionRows)

          if (questionError) throw questionError
        }

        saved += 1
        setSavedCount(saved)
      }

      if (saved === 0) {
        throw new Error('Es gab kein erfolgreich gelesenes Dokument zum Speichern.')
      }

      setCompleted(true)
    } catch (saveError: any) {
      if (createdDocumentIds.length > 0) {
        await supabase.from('documents').delete().in('id', createdDocumentIds)
      }
      if (uploadedPaths.length > 0) {
        await supabase.storage.from('mila-dokumente').remove(uploadedPaths)
      }
      setSavedCount(0)
      setError(saveError?.message || 'Mila konnte den Stapel nicht vollständig speichern.')
    } finally {
      setFinalizing(false)
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-md space-y-5 p-5 pb-40 text-slate-950">
      <header>
        <Link href="/" className="text-sm font-semibold text-slate-500">← Zurück</Link>
        <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-violet-600">Mila Stapel</p>
        <h1 className="mt-2 text-3xl font-black">Belege rein. Mila sortiert.</h1>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
          Mehrere Fotos oder PDFs auf einmal auswählen. Mila liest sie einzeln, bündelt den Stapel und fragt nur dort nach, wo der Kontext wirklich fehlt.
        </p>
      </header>

      {!completed && (
        <label className={`flex min-h-44 w-full flex-col items-center justify-center rounded-[2rem] border-2 border-dashed p-6 text-center ${running || finalizing ? 'border-slate-200 bg-slate-50' : 'cursor-pointer border-violet-200 bg-violet-50'}`}>
          <span className="text-4xl">{running || finalizing ? '⏳' : '📚'}</span>
          <p className="mt-3 text-lg font-black">
            {running ? 'Mila liest deinen Stapel …' : finalizing ? 'Mila legt den Stapel ab …' : 'Mehrere Belege auswählen'}
          </p>
          <p className="mt-2 text-xs font-semibold text-slate-500">Bis zu 20 Bilder oder PDFs in einem Durchgang.</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            disabled={running || finalizing}
            onChange={(event) => void chooseFiles(event.target.files)}
            className="hidden"
          />
        </label>
      )}

      {total > 0 && (
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Verarbeitung</p>
              <p className="mt-1 text-xl font-black">{finished + failed} von {total}</p>
            </div>
            <span className="rounded-full bg-violet-100 px-3 py-2 text-sm font-black text-violet-700">{progress}%</span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-violet-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-4 space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black">{item.name}</p>
                  {item.error && <p className="mt-1 text-xs font-semibold text-rose-600">{item.error}</p>}
                </div>
                <span className="shrink-0 text-sm font-black">
                  {item.status === 'waiting' ? '○' : item.status === 'scanning' ? '…' : item.status === 'done' ? '✓' : '⚠️'}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {error && <p className="rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</p>}

      {completed && (
        <section className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6 text-center">
          <div className="text-4xl">✅</div>
          <h2 className="mt-3 text-2xl font-black text-emerald-900">Stapel sauber abgelegt.</h2>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-emerald-800">
            {savedCount} Dokument{savedCount === 1 ? '' : 'e'} liegen jetzt in der ausgewählten Mandantenmappe. Bestätigte Rückfragen wurden als nachvollziehbarer Kontext mitgespeichert.
          </p>
          <Link href="/dokumente" className="mt-5 inline-flex rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white">
            Mandantenmappe öffnen
          </Link>
        </section>
      )}

      {batch && !completed && (
        <>
          <section className="rounded-[2rem] border border-emerald-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Analyse fertig</p>
            <h2 className="mt-2 text-2xl font-black">{batch.summary.received} Dokumente verarbeitet</h2>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Metric label="Automatisch sortiert" value={batch.summary.autoSorted} good />
              <Metric label="Brauchen dich" value={batch.summary.needsReview} />
            </div>
            {batch.summary.lineItems > 0 && (
              <p className="mt-4 text-sm font-semibold text-slate-500">
                Mila hat {batch.summary.lineItems} einzelne Positionen erkannt. {batch.summary.lineItemsNeedingContext > 0 ? `${batch.summary.lineItemsNeedingContext} davon brauchen noch Kontext.` : 'Keine Position braucht zusätzlichen Kontext.'}
              </p>
            )}
          </section>

          {batch.reviewQueue.length > 0 ? (
            <section className="rounded-[2rem] border border-amber-100 bg-amber-50 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">Nur das braucht dich</p>
                  <h2 className="mt-2 text-2xl font-black">{batch.reviewQueue.length} konkrete Fragen</h2>
                </div>
                <span className="rounded-full bg-white px-3 py-2 text-xs font-black text-amber-800">
                  {answeredCount}/{batch.reviewQueue.length}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {batch.reviewQueue.map((question, index) => {
                  const answer = String(answers[question.id] || '')
                  return (
                    <article key={question.id} className="rounded-2xl bg-white p-4 shadow-sm">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-700">Frage {index + 1}</p>
                      <p className="mt-2 text-base font-black leading-snug">{question.question}</p>
                      <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-500">{question.reason}</p>

                      {question.options && question.options.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {question.options.map((option) => (
                            <button
                              type="button"
                              key={option}
                              onClick={() => answerQuestion(question.id, option)}
                              className={answer === option
                                ? 'rounded-full bg-violet-600 px-3 py-2 text-xs font-black text-white'
                                : 'rounded-full bg-violet-50 px-3 py-2 text-xs font-black text-violet-700'}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <input
                          value={answer}
                          onChange={(event) => answerQuestion(question.id, event.target.value)}
                          placeholder="Kurze Antwort …"
                          className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      )}
                    </article>
                  )
                })}
              </div>
            </section>
          ) : (
            <section className="rounded-[2rem] bg-emerald-50 p-5">
              <p className="text-xl font-black text-emerald-800">✓ Mila braucht nichts von dir.</p>
              <p className="mt-2 text-sm font-semibold text-emerald-700">Der Stapel konnte ohne zusätzliche Rückfragen vorsortiert werden.</p>
            </section>
          )}

          <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Vorsortierung</p>
            <div className="mt-4 space-y-2">
              {batch.documents.map((document) => (
                <div key={document.id} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-black">{document.title}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {document.storageGroup} · {document.financialDirection === 'income' ? 'Einnahme' : document.financialDirection === 'expense' ? 'Ausgabe' : 'Nachweis'}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1.5 text-[10px] font-black ${reviewDocumentIds.has(document.id) ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {reviewDocumentIds.has(document.id) ? 'KONTEXT' : 'SORTIERT'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <button
            type="button"
            disabled={finalizing || (batch.reviewQueue.length > 0 && !allAnswered)}
            onClick={() => void finalizeBatch()}
            className="w-full rounded-2xl bg-violet-600 py-4 font-black text-white shadow-md disabled:opacity-40"
          >
            {finalizing ? `Mila legt ab … ${savedCount}/${batch.summary.received}` : batch.reviewQueue.length > 0 && !allAnswered ? `Noch ${batch.reviewQueue.length - answeredCount} Frage(n) offen` : 'Sortierung übernehmen & ablegen'}
          </button>

          <p className="rounded-2xl bg-slate-50 p-4 text-xs font-semibold leading-relaxed text-slate-500">
            Mila speichert erst nach diesem Schritt. Automatische Vorsortierung und deine Antworten bleiben so nachvollziehbar getrennt. Steuerliche oder rechtliche Entscheidungen trifft Mila dabei nicht.
          </p>
        </>
      )}
    </main>
  )
}

function Metric({ label, value, good = false }: { label: string; value: number; good?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 ${good ? 'bg-emerald-50' : 'bg-amber-50'}`}>
      <p className={`text-3xl font-black ${good ? 'text-emerald-700' : 'text-amber-700'}`}>{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</p>
    </div>
  )
}

async function scanFile(file: File) {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  let response: Response

  if (isPdf) {
    const formData = new FormData()
    formData.append('file', file)
    response = await fetch('/api/mila/scan-document', {
      method: 'POST',
      body: formData,
    })
  } else {
    const imageBase64 = await resizeAndConvertToBase64(file, 1400)
    response = await fetch('/api/mila/scan-receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64 }),
    })
  }

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw new Error('Scanner hat keine gültige Antwort geliefert.')
  }

  const json = await response.json()
  if (!response.ok || !json?.success) {
    throw new Error(json?.error || 'Dokument konnte nicht gelesen werden.')
  }

  return json.data?.data || json.data
}

function resizeAndConvertToBase64(file: File, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        if (width > height && width > maxSize) {
          height *= maxSize / width
          width = maxSize
        } else if (height >= width && height > maxSize) {
          width *= maxSize / height
          height = maxSize
        }

        canvas.width = Math.round(width)
        canvas.height = Math.round(height)
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Bild konnte nicht vorbereitet werden.'))
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.84))
      }
      img.onerror = () => reject(new Error('Bild konnte nicht geladen werden.'))
      img.src = event.target?.result as string
    }
    reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden.'))
    reader.readAsDataURL(file)
  })
}
