'use client'

import Link from 'next/link'
import { useMemo, useRef, useState } from 'react'

type ScanState = {
  id: string
  name: string
  status: 'waiting' | 'scanning' | 'done' | 'error'
  error?: string
  scan?: any
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
  reviewQueue: Array<{
    id: string
    documentId: string
    field: string
    question: string
    reason: string
    options?: string[]
  }>
}

export default function StapelPage() {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [items, setItems] = useState<ScanState[]>([])
  const [batch, setBatch] = useState<BatchResult | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')

  const finished = items.filter((item) => item.status === 'done').length
  const failed = items.filter((item) => item.status === 'error').length
  const total = items.length
  const progress = total > 0 ? Math.round(((finished + failed) / total) * 100) : 0

  const reviewDocumentIds = useMemo(
    () => new Set(batch?.reviewQueue.map((question) => question.documentId) || []),
    [batch],
  )

  async function chooseFiles(fileList: FileList | null) {
    if (!fileList || running) return

    const files = Array.from(fileList).slice(0, 20)
    if (files.length === 0) return

    setError('')
    setBatch(null)
    const initial = files.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      name: file.name,
      status: 'waiting' as const,
    }))
    setItems(initial)
    setRunning(true)

    const scans: any[] = []

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index]
      const id = initial[index].id
      setItems((current) => current.map((item) => item.id === id ? { ...item, status: 'scanning' } : item))

      try {
        const scan = await scanFile(file)
        const enriched = {
          ...scan,
          id,
          fileName: file.name,
        }
        scans.push(enriched)
        setItems((current) => current.map((item) => item.id === id ? { ...item, status: 'done', scan: enriched } : item))
      } catch (scanError: any) {
        setItems((current) => current.map((item) => item.id === id ? {
          ...item,
          status: 'error',
          error: scanError?.message || 'Dokument konnte nicht gelesen werden.',
        } : item))
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
        if (!response.ok || !json?.success) throw new Error(json?.error || 'Stapel konnte nicht vorsortiert werden.')
        setBatch(json.data)
      } catch (batchError: any) {
        setError(batchError?.message || 'Mila konnte den Stapel nicht zusammenführen.')
      }
    }

    setRunning(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <main className="mx-auto min-h-screen max-w-md space-y-5 p-5 pb-40 text-slate-950">
      <header>
        <Link href="/" className="text-sm font-semibold text-slate-500">← Zurück</Link>
        <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-violet-600">Mila Stapel</p>
        <h1 className="mt-2 text-3xl font-black">Belege rein. Mila sortiert.</h1>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
          Mehrere Fotos oder PDFs auf einmal auswählen. Mila liest die Dokumente einzeln, bündelt sie anschließend und holt dich nur bei echten Unklarheiten dazu.
        </p>
      </header>

      <label className={`flex min-h-44 w-full flex-col items-center justify-center rounded-[2rem] border-2 border-dashed p-6 text-center ${running ? 'border-slate-200 bg-slate-50' : 'cursor-pointer border-violet-200 bg-violet-50'}`}>
        <span className="text-4xl">{running ? '⏳' : '📚'}</span>
        <p className="mt-3 text-lg font-black">{running ? 'Mila sortiert deinen Stapel …' : 'Mehrere Belege auswählen'}</p>
        <p className="mt-2 text-xs font-semibold text-slate-500">Bis zu 20 Bilder oder PDFs in einem Durchgang.</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          disabled={running}
          onChange={(event) => void chooseFiles(event.target.files)}
          className="hidden"
        />
      </label>

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

      {batch && (
        <>
          <section className="rounded-[2rem] border border-emerald-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Stapel fertig</p>
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
              <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">Nur das braucht dich</p>
              <h2 className="mt-2 text-2xl font-black">{batch.reviewQueue.length} konkrete Fragen</h2>
              <div className="mt-4 space-y-3">
                {batch.reviewQueue.map((question, index) => (
                  <article key={question.id} className="rounded-2xl bg-white p-4 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-700">Frage {index + 1}</p>
                    <p className="mt-2 text-base font-black leading-snug">{question.question}</p>
                    <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-500">{question.reason}</p>
                    {question.options && question.options.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {question.options.map((option) => (
                          <span key={option} className="rounded-full bg-violet-50 px-3 py-2 text-xs font-black text-violet-700">{option}</span>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          ) : (
            <section className="rounded-[2rem] bg-emerald-50 p-5">
              <p className="text-xl font-black text-emerald-800">✓ Mila braucht nichts von dir.</p>
              <p className="mt-2 text-sm font-semibold text-emerald-700">Der Stapel konnte ohne zusätzliche Rückfragen vorsortiert werden.</p>
            </section>
          )}

          <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Im Hintergrund sortiert</p>
            <div className="mt-4 space-y-2">
              {batch.documents.map((document) => (
                <div key={document.id} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-black">{document.title}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{document.storageGroup} · {document.financialDirection === 'income' ? 'Einnahme' : document.financialDirection === 'expense' ? 'Ausgabe' : 'Nachweis'}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1.5 text-[10px] font-black ${reviewDocumentIds.has(document.id) ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {reviewDocumentIds.has(document.id) ? 'PRÜFEN' : 'SORTIERT'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
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
  if (!contentType.includes('application/json')) throw new Error('Scanner hat keine gültige Antwort geliefert.')
  const json = await response.json()
  if (!response.ok || !json?.success) throw new Error(json?.error || 'Dokument konnte nicht gelesen werden.')
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
