'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Plus,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react'

type JetztStatus = 'offen' | 'erledigt'

type JetztItem = {
  id: string
  raw: string
  who: string
  what: string
  dueAt: string
  missing: string[]
  nextStep: string
  status: JetztStatus
  createdAt: string
  completedAt?: string
}

const STORAGE_KEY = 'mila-jetzt-v1'

function toLocalDateTimeInput(date: Date) {
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60_000)
  return local.toISOString().slice(0, 16)
}

function inferDueAt(text: string) {
  const lower = text.toLowerCase()
  const now = new Date()

  if (lower.includes('heute')) {
    const result = new Date(now)
    result.setHours(18, 0, 0, 0)
    return toLocalDateTimeInput(result)
  }

  if (lower.includes('morgen')) {
    const result = new Date(now)
    result.setDate(result.getDate() + 1)
    result.setHours(12, 0, 0, 0)
    return toLocalDateTimeInput(result)
  }

  const dateMatch = text.match(/\b(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?\b/)
  if (dateMatch) {
    const day = Number(dateMatch[1])
    const month = Number(dateMatch[2]) - 1
    const yearRaw = dateMatch[3]
    const year = yearRaw
      ? Number(yearRaw.length === 2 ? `20${yearRaw}` : yearRaw)
      : now.getFullYear()
    const result = new Date(year, month, day, 12, 0, 0, 0)
    if (!Number.isNaN(result.getTime())) return toLocalDateTimeInput(result)
  }

  return ''
}

function inferWho(text: string) {
  const customerMatch = text.match(/\b(?:für|bei|von)\s+(Kund(?:e|in)\s+[A-Z0-9ÄÖÜ][\wÄÖÜäöüß.-]*)/i)
  if (customerMatch?.[1]) return customerMatch[1].trim()

  const known = text.match(/\b(Jobcenter|Finanzamt|Krankenkasse|Schule|Kita|Jugendamt|Steuerkanzlei|Steuerberater(?:in)?)\b/i)
  if (known?.[1]) return known[1].trim()

  const patterns = [
    /(?:vom|von der|von|bei|für)\s+([A-ZÄÖÜ][\wÄÖÜäöüß.-]*(?:\s+[A-ZÄÖÜ][\wÄÖÜäöüß.-]*){0,2})/,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) return match[1].trim()
  }

  return ''
}

function cleanObject(value: string) {
  return value
    .replace(/\b(?:heute|morgen|bis\s+\w+|dringend|noch|mal|bitte)\b/gi, '')
    .replace(/[.!?]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function inferStructuredTask(text: string, who: string) {
  const clean = text.trim()
  const lower = clean.toLowerCase()

  const forgotMatch = clean.match(/(?:ich\s+)?(?:hab(?:e)?\s+)?vergessen[,]?\s+(.+)/i)
  const missingMatch = clean.match(/(?:es\s+)?fehl(?:t|en)\s+(.+)/i)

  if (forgotMatch?.[1]) {
    const forgotten = cleanObject(forgotMatch[1])

    if (/mit\s*zu\s*berechnen|abzurechnen|berechnen|abrechnen/i.test(forgotten)) {
      const object = cleanObject(
        forgotten
          .replace(/\b(?:mit\s*zu\s*berechnen|abzurechnen|zu\s*berechnen|berechnen|abrechnen)\b.*$/i, '')
          .replace(new RegExp(`\\bfür\\s+${who.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'), '')
      ) || 'fehlende Positionen'

      return {
        what: `${object} prüfen und korrekt nachtragen`,
        missing: [object, 'betroffene Abrechnung'],
        nextStep: `${object} öffnen → betroffene Abrechnung prüfen → fehlende Positionen nachtragen → Abschluss kontrollieren`,
      }
    }

    return {
      what: `${forgotten} nachholen`,
      missing: [forgotten],
      nextStep: `${forgotten} prüfen und als nächsten Arbeitsschritt erledigen`,
    }
  }

  if (missingMatch?.[1]) {
    const missing = cleanObject(missingMatch[1])
    return {
      what: `${missing} beschaffen und Vorgang vervollständigen`,
      missing: [missing],
      nextStep: `${missing} anfordern oder heraussuchen → Vorgang ergänzen → Vollständigkeit prüfen`,
    }
  }

  if (/\bschreiben|antworten|rückmeldung|mail|e-mail\b/i.test(lower)) {
    return {
      what: who ? `Rückmeldung an ${who} vorbereiten und senden` : 'Rückmeldung vorbereiten und senden',
      missing: [],
      nextStep: 'Sachverhalt prüfen → nötige Unterlagen bereitlegen → Nachricht formulieren → vor Versand kontrollieren',
    }
  }

  if (/\bbezahlen|zahlung|überweisen\b/i.test(lower)) {
    return {
      what: 'Zahlung prüfen und ausführen',
      missing: [],
      nextStep: 'Betrag und Empfänger prüfen → Zahlungsdaten öffnen → Zahlung ausführen → Nachweis ablegen',
    }
  }

  if (/\bnachreichen|einreichen|hochladen|senden\b/i.test(lower)) {
    return {
      what: 'Unterlagen vervollständigen und übermitteln',
      missing: [],
      nextStep: 'Benötigte Unterlagen prüfen → fehlende Dokumente ergänzen → vollständig übermitteln → Versand bestätigen',
    }
  }

  return {
    what: clean,
    missing: [],
    nextStep: 'Vorgang kurz prüfen → konkreten nächsten Schritt festlegen → erledigen → Abschluss kontrollieren',
  }
}

function formatDue(value: string) {
  if (!value) return 'Keine Frist gesetzt'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function urgency(value: string) {
  if (!value) return 'normal'
  const due = new Date(value).getTime()
  const hours = (due - Date.now()) / 3_600_000
  if (hours <= 0) return 'overdue'
  if (hours <= 24) return 'urgent'
  return 'normal'
}

export default function JetztPage() {
  const [items, setItems] = useState<JetztItem[]>([])
  const [raw, setRaw] = useState('')
  const [who, setWho] = useState('')
  const [what, setWhat] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [missingText, setMissingText] = useState('')
  const [nextStep, setNextStep] = useState('')
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) setItems(JSON.parse(stored))
    } catch {
      // Mila bleibt auch nutzbar, wenn Browser-Speicher blockiert ist.
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // Kein harter Fehler: Vorgänge bleiben für die laufende Sitzung verfügbar.
    }
  }, [items])

  const openItems = useMemo(
    () => items.filter((item) => item.status === 'offen'),
    [items]
  )

  const doneItems = useMemo(
    () => items.filter((item) => item.status === 'erledigt'),
    [items]
  )

  function milaOrdnen() {
    const clean = raw.trim()
    if (!clean) return

    const inferredWho = inferWho(clean)
    const structured = inferStructuredTask(clean, inferredWho)

    setWho(inferredWho)
    setWhat(structured.what)
    setDueAt(inferDueAt(clean))
    setMissingText(structured.missing.join(', '))
    setNextStep(structured.nextStep)
    setShowDetails(true)
  }

  function reset() {
    setRaw('')
    setWho('')
    setWhat('')
    setDueAt('')
    setMissingText('')
    setNextStep('')
    setShowDetails(false)
  }

  function save(event: FormEvent) {
    event.preventDefault()
    const task = what.trim() || raw.trim()
    if (!task) {
      alert('Sag Mila kurz, was erledigt werden muss.')
      return
    }

    const item: JetztItem = {
      id: crypto.randomUUID(),
      raw: raw.trim(),
      who: who.trim(),
      what: task,
      dueAt,
      missing: missingText
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
      nextStep: nextStep.trim(),
      status: 'offen',
      createdAt: new Date().toISOString(),
    }

    setItems((current) => [item, ...current])
    reset()
  }

  function complete(id: string) {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, status: 'erledigt', completedAt: new Date().toISOString() }
          : item
      )
    )
  }

  function remove(id: string) {
    setItems((current) => current.filter((item) => item.id !== id))
  }

  return (
    <main className="mx-auto min-h-screen max-w-md space-y-5 px-5 pb-32 pt-8">
      <header className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-violet-700">
          <Zap className="h-4 w-4" /> Mila JETZT
        </div>
        <h1 className="text-4xl font-black tracking-tight text-slate-950">
          Was muss jetzt erledigt werden?
        </h1>
        <p className="text-sm font-semibold leading-6 text-slate-500">
          Reinwerfen. Ordnen. Erledigen. Mila hält den Vorgang fest, bis er wirklich zu ist.
        </p>
      </header>

      <form onSubmit={save} className="space-y-3 rounded-[2rem] border border-violet-100 bg-white p-5 shadow-sm">
        <label className="block text-sm font-black text-slate-800">
          Sag es einfach so, wie es dir einfällt
        </label>
        <textarea
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          placeholder="z. B. Jobcenter hat das Schulmaterial vergessen – ich muss denen bis morgen schreiben."
          className="min-h-32 w-full resize-none rounded-3xl border border-slate-200 bg-slate-50 p-4 text-base font-semibold outline-none transition focus:border-violet-400 focus:bg-white"
        />

        <button
          type="button"
          onClick={milaOrdnen}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-100 py-3 font-black text-violet-700"
        >
          <Sparkles className="h-5 w-5" /> Mila, ordne das
        </button>

        {showDetails && (
          <div className="space-y-3 border-t border-slate-100 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <input
                value={who}
                onChange={(event) => setWho(event.target.value)}
                placeholder="Wer will was?"
                className="min-w-0 rounded-2xl border p-3 text-sm font-semibold"
              />
              <input
                type="datetime-local"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
                className="min-w-0 rounded-2xl border p-3 text-sm font-semibold"
              />
            </div>
            <textarea
              value={what}
              onChange={(event) => setWhat(event.target.value)}
              placeholder="Was muss getan werden?"
              className="min-h-20 w-full rounded-2xl border p-3 text-sm font-semibold"
            />
            <input
              value={missingText}
              onChange={(event) => setMissingText(event.target.value)}
              placeholder="Was fehlt? Kommagetrennt, z. B. Bescheid, Rechnung"
              className="w-full rounded-2xl border p-3 text-sm font-semibold"
            />
            <input
              value={nextStep}
              onChange={(event) => setNextStep(event.target.value)}
              placeholder="Was muss als Nächstes passieren?"
              className="w-full rounded-2xl border p-3 text-sm font-semibold"
            />
          </div>
        )}

        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 py-4 font-black text-white shadow-lg shadow-violet-200"
        >
          <Plus className="h-5 w-5" /> JETZT festhalten
        </button>
      </form>

      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-600">Offen</p>
            <h2 className="text-2xl font-black">{openItems.length} Vorgang{openItems.length === 1 ? '' : 'e'}</h2>
          </div>
          {openItems.length > 0 && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
              Mila passt auf
            </span>
          )}
        </div>

        {openItems.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-violet-200 bg-violet-50 p-6 text-center">
            <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-violet-500" />
            <p className="font-black text-slate-800">Gerade nichts Dringendes offen.</p>
            <p className="mt-1 text-sm font-semibold text-slate-500">Genieß den seltenen Moment. 😄</p>
          </div>
        ) : (
          openItems.map((item) => {
            const level = urgency(item.dueAt)
            return (
              <article
                key={item.id}
                className={
                  level === 'overdue'
                    ? 'rounded-[2rem] border-2 border-rose-300 bg-white p-5 shadow-sm'
                    : level === 'urgent'
                      ? 'rounded-[2rem] border-2 border-amber-300 bg-white p-5 shadow-sm'
                      : 'rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm'
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {item.who && (
                      <p className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-violet-600">
                        {item.who}
                      </p>
                    )}
                    <h3 className="break-words text-lg font-black text-slate-950">{item.what}</h3>
                  </div>
                  {level !== 'normal' && <AlertTriangle className="h-6 w-6 shrink-0 text-amber-500" />}
                </div>

                <div className="mt-3 flex items-center gap-2 text-sm font-black text-slate-600">
                  <Clock3 className="h-4 w-4" /> {formatDue(item.dueAt)}
                </div>

                {item.missing.length > 0 && (
                  <div className="mt-4 rounded-2xl bg-amber-50 p-3">
                    <p className="text-xs font-black uppercase tracking-wide text-amber-800">Fehlt noch</p>
                    <p className="mt-1 text-sm font-bold text-amber-950">{item.missing.join(' · ')}</p>
                  </div>
                )}

                {item.nextStep && (
                  <div className="mt-3 rounded-2xl bg-violet-50 p-3">
                    <p className="text-xs font-black uppercase tracking-wide text-violet-700">Nächster Schritt</p>
                    <p className="mt-1 text-sm font-bold text-slate-800">{item.nextStep}</p>
                  </div>
                )}

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => complete(item.id)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Erledigt
                  </button>
                  <button
                    type="button"
                    aria-label="Vorgang löschen"
                    onClick={() => remove(item.id)}
                    className="rounded-2xl bg-slate-100 px-4 text-slate-500"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </article>
            )
          })
        )}
      </section>

      {doneItems.length > 0 && (
        <details className="rounded-3xl bg-white p-4 shadow-sm">
          <summary className="cursor-pointer font-black text-slate-600">
            Erledigt ({doneItems.length})
          </summary>
          <div className="mt-3 space-y-2">
            {doneItems.slice(0, 10).map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-emerald-50 p-3">
                <p className="min-w-0 truncate text-sm font-bold text-emerald-900">✅ {item.what}</p>
                <button type="button" onClick={() => remove(item.id)} className="shrink-0 text-emerald-700" aria-label="Erledigten Vorgang löschen">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </details>
      )}
    </main>
  )
}
