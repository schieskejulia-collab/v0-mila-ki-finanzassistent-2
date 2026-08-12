'use client'

import { useEffect, useState } from 'react'

type Question = {
  id: string
  question: string
  answer?: string
  status: string
}

export default function MandantUploadPage() {
  const [token, setToken] = useState('')
  const [clientName, setClientName] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [ready, setReady] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [note, setNote] = useState('')
  const [questionId, setQuestionId] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('token') || ''
    setToken(t)
    void load(t)
  }, [])

  async function load(t: string) {
    setReady(false)
    if (!t) {
      setMessage('Dieser Upload-Link ist unvollständig.')
      setReady(true)
      return
    }

    const response = await fetch(`/api/client-portal?token=${encodeURIComponent(t)}`, {
      cache: 'no-store',
    })
    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      setMessage(data?.error || 'Dieser Upload-Link ist nicht mehr gültig.')
      setQuestions([])
      setReady(true)
      return
    }

    setClientName(String(data?.clientName || ''))
    setQuestions(Array.isArray(data?.questions) ? data.questions : [])
    setMessage('')
    setReady(true)
  }

  async function answer(q: Question) {
    const text = (answers[q.id] || '').trim()
    if (!text) return

    setSending(true)
    const response = await fetch('/api/client-portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, questionId: q.id, answer: text }),
    })
    const data = await response.json().catch(() => ({}))
    setSending(false)

    if (!response.ok) {
      setMessage(data?.error || 'Antwort konnte nicht übermittelt werden.')
      return
    }

    setAnswers((current) => ({ ...current, [q.id]: '' }))
    setMessage('Antwort wurde sicher übermittelt. Danke.')
    await load(token)
  }

  async function upload() {
    if (!file) {
      setMessage('Bitte zuerst eine Datei auswählen.')
      return
    }

    setSending(true)
    const form = new FormData()
    form.set('token', token)
    form.set('file', file)
    form.set('note', note)
    if (questionId) form.set('questionId', questionId)

    const response = await fetch('/api/client-portal/upload', {
      method: 'POST',
      body: form,
    })
    const data = await response.json().catch(() => ({}))
    setSending(false)

    if (!response.ok) {
      setMessage(data?.error || 'Datei konnte nicht übermittelt werden.')
      return
    }

    setFile(null)
    setNote('')
    setQuestionId('')
    const input = document.getElementById('client-file') as HTMLInputElement | null
    if (input) input.value = ''
    setMessage(`„${data?.filename || 'Datei'}“ wurde sicher übermittelt.`)
    await load(token)
  }

  return (
    <main className="mx-auto min-h-screen max-w-md space-y-5 p-5 pb-20 text-slate-950">
      <header className="rounded-[2rem] bg-gradient-to-br from-violet-700 to-fuchsia-500 p-6 text-white">
        <p className="text-xs font-black uppercase tracking-[.18em] text-white/70">
          Mila · sicherer Mandantenbereich
        </p>
        <h1 className="mt-2 text-3xl font-black">Unterlagen & Rückfragen</h1>
        <p className="mt-3 text-sm font-semibold text-white/85">
          {clientName ? `Bereich für ${clientName}.` : 'Sicherer Bereich für Nachreichungen.'}
        </p>
      </header>

      {message && (
        <div className="rounded-2xl bg-violet-50 p-4 text-sm font-bold text-violet-800">
          {message}
        </div>
      )}

      {ready && token && (
        <section className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[.16em] text-violet-600">
            Beleg nachreichen
          </p>
          <h2 className="mt-2 text-xl font-black">Foto oder PDF senden</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            Die Datei wird automatisch diesem Mandanten zugeordnet. Maximal 10 MB; PDF, JPG, PNG oder WEBP.
          </p>

          <input
            id="client-file"
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            className="mt-4 block w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold"
          />

          {questions.length > 0 && (
            <select
              value={questionId}
              onChange={(event) => setQuestionId(event.target.value)}
              className="mt-3 w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold"
            >
              <option value="">Allgemeine Nachreichung</option>
              {questions.map((q) => (
                <option key={q.id} value={q.id}>{q.question}</option>
              ))}
            </select>
          )}

          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            placeholder="Kurze Anmerkung (optional)"
            className="mt-3 w-full resize-none rounded-2xl border border-slate-200 p-4 text-sm font-semibold"
          />

          <button
            type="button"
            disabled={sending}
            onClick={() => void upload()}
            className="mt-3 w-full rounded-2xl bg-violet-600 p-4 font-black text-white disabled:opacity-50"
          >
            {sending ? 'Wird übermittelt …' : 'Datei sicher übermitteln'}
          </button>
        </section>
      )}

      {ready && questions.length === 0 && clientName && (
        <div className="rounded-3xl bg-emerald-50 p-5 font-semibold text-emerald-800">
          ✓ Aktuell sind keine Rückfragen offen.
        </div>
      )}

      {questions.map((q) => (
        <section key={q.id} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[.16em] text-violet-600">Rückfrage</p>
          <h2 className="mt-2 text-lg font-black">{q.question}</h2>

          {q.answer ? (
            <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm font-semibold">
              Antwort gesendet: {q.answer}
            </p>
          ) : (
            <>
              <textarea
                value={answers[q.id] || ''}
                onChange={(event) => setAnswers({ ...answers, [q.id]: event.target.value })}
                rows={3}
                placeholder="Antwort eingeben …"
                className="mt-4 w-full resize-none rounded-2xl border border-slate-200 p-4 font-semibold"
              />
              <button
                type="button"
                disabled={sending}
                onClick={() => void answer(q)}
                className="mt-3 w-full rounded-2xl bg-violet-600 p-4 font-black text-white disabled:opacity-50"
              >
                Antwort senden
              </button>
            </>
          )}
        </section>
      ))}
    </main>
  )
}
