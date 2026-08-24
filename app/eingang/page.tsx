'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight, FilePlus2, FolderUp, Loader2, Zap } from 'lucide-react'
import { getActiveClientId, supabase } from '@/lib/supabase'

export default function EingangPage() {
  const [clientId, setClientId] = useState('')
  const [clientName, setClientName] = useState('Aktive Akte')
  const [subject, setSubject] = useState('')
  const [summary, setSummary] = useState('')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const activeId = getActiveClientId()
      setClientId(activeId)
      if (!activeId) return

      const { data } = await supabase.from('clients').select('name').eq('id', activeId).maybeSingle()
      if (data?.name) setClientName(String(data.name))
    }

    void load()
  }, [])

  async function createCase() {
    setError('')
    setNotice('')
    if (!clientId) {
      setError('Bitte zuerst in „Akte & Übernahme“ eine aktive Akte wählen.')
      return
    }
    if (!subject.trim() || !summary.trim()) {
      setError('Bitte Anliegen und kurze Zusammenfassung ausfüllen.')
      return
    }

    setSaving(true)
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      if (!token) throw new Error('Bitte neu anmelden.')

      const response = await fetch('/api/mila/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          clientId,
          source: 'manual',
          subject: subject.trim(),
          text: summary.trim(),
          fields: { category: 'Eingang', urgency: 'normal' },
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data?.success) throw new Error(data?.error || 'Mila konnte den Eingang nicht anlegen.')

      setSubject('')
      setSummary('')
      setNotice('Eingang angelegt. Der Vorgang ist jetzt in Mila verknüpft.')
    } catch (cause: any) {
      setError(cause?.message || 'Der Eingang konnte nicht angelegt werden.')
    } finally {
      setSaving(false)
    }
  }

  return <main className="min-h-screen bg-gradient-to-b from-[#fbf9ff] to-white px-5 pb-28 pt-8 text-slate-950">
    <div className="mx-auto max-w-md">
      <p className="text-xs font-black uppercase tracking-[.18em] text-violet-600">Mila · Eingang</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight">Was ist neu hereingekommen?</h1>
      <p className="mt-2 text-sm font-medium leading-6 text-slate-500">Aktive Akte: <span className="font-black text-violet-700">{clientName}</span></p>

      {notice && <p className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold leading-6 text-emerald-800">{notice}</p>}
      {error && <p className="mt-5 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-bold leading-6 text-rose-700">{error}</p>}

      <section className="mt-6 rounded-[1.7rem] border border-violet-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600"><FilePlus2 className="h-5 w-5" /></span><div><h2 className="font-black">Neuen Vorgang erfassen</h2><p className="mt-0.5 text-xs font-semibold text-slate-500">Kurz festhalten – Mila legt genau einen Vorgang an.</p></div></div>
        <input value={subject} onChange={event => setSubject(event.target.value)} placeholder="Anliegen in einem Satz" className="mt-5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-violet-400" />
        <textarea value={summary} onChange={event => setSummary(event.target.value)} placeholder="Was wurde gesagt, geschickt oder angefragt?" className="mt-3 min-h-32 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-violet-400" />
        <button type="button" onClick={() => void createCase()} disabled={saving} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3.5 text-sm font-black text-white disabled:bg-violet-200">{saving ? <><Loader2 className="h-4 w-4 animate-spin" />Mila legt an…</> : <><Zap className="h-4 w-4" />Vorgang anlegen</>}</button>
      </section>

      <Link href="/neue-buchungen" className="mt-4 flex items-center gap-4 rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-sm"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600"><FolderUp className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block font-black">Unterlagen-Stapel hochladen</span><span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">Mehrere Belege oder PDFs auf einmal in einen Vorgang übernehmen.</span></span><ArrowRight className="h-4 w-4 text-violet-600" /></Link>

      <Link href="/jetzt" className="mt-4 flex items-center justify-between rounded-xl bg-slate-950 px-5 py-4 text-sm font-black text-white">Offene Vorgänge ansehen <ArrowRight className="h-4 w-4" /></Link>
    </div>
  </main>
}