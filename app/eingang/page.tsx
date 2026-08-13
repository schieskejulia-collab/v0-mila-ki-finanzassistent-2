'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type CaseStatus = 'new' | 'needs_info' | 'standard' | 'human_review' | 'in_progress' | 'waiting' | 'done'
type CaseItem = {
  id: string
  source: string
  caller_name: string | null
  company: string | null
  phone: string | null
  email: string | null
  subject: string
  summary: string
  category: string
  status: CaseStatus
  handoff_summary: string | null
  handoff_ready: boolean
}
type Task = { id: string; case_id: string | null; title: string; status: string; next_action: string | null }
type Update = {
  id: string
  case_id: string
  kind: 'question' | 'answer' | 'note' | 'handoff'
  content: string
  status: 'open' | 'waiting' | 'done'
  created_at: string
}

const statusLabel: Record<CaseStatus, string> = {
  new: 'Neu',
  needs_info: 'Infos fehlen',
  standard: 'Standardfall',
  human_review: 'Mensch prüfen',
  in_progress: 'In Arbeit',
  waiting: 'Wartet',
  done: 'Erledigt',
}

export default function EingangPage() {
  const [cases, setCases] = useState<CaseItem[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [updates, setUpdates] = useState<Update[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [handoff, setHandoff] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    setError('')
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) {
      setError('Bitte zuerst anmelden.')
      setLoading(false)
      return
    }

    const [caseResult, taskResult, updateResult] = await Promise.all([
      supabase.from('mila_intake_cases').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('mila_coordination_tasks').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('mila_case_updates').select('*').order('created_at', { ascending: true }).limit(300),
    ])

    if (caseResult.error || taskResult.error || updateResult.error) {
      setError('Mila konnte den Vorgangskreis nicht vollständig laden.')
    }
    setCases((caseResult.data || []) as CaseItem[])
    setTasks((taskResult.data || []) as Task[])
    setUpdates((updateResult.data || []) as Update[])
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  const current = cases.find((item) => item.id === selected) || null
  const currentUpdates = updates.filter((item) => item.case_id === selected)
  const currentTasks = tasks.filter((item) => item.case_id === selected)
  const stats = useMemo(
    () => ({
      open: cases.filter((item) => item.status !== 'done').length,
      questions: updates.filter((item) => item.kind === 'question' && item.status !== 'done').length,
      follow: tasks.filter((item) => item.status !== 'done').length,
      ready: cases.filter((item) => item.handoff_ready && item.status !== 'done').length,
    }),
    [cases, tasks, updates],
  )

  async function addUpdate(kind: Update['kind']) {
    if (!current || !text.trim()) return
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return

    const status = kind === 'question' ? 'waiting' : 'done'
    const { error: insertError } = await supabase.from('mila_case_updates').insert({
      user_id: auth.user.id,
      case_id: current.id,
      kind,
      content: text.trim(),
      status,
    })
    if (insertError) {
      setError('Eintrag konnte nicht gespeichert werden.')
      return
    }
    if (kind === 'question') {
      await supabase.from('mila_intake_cases').update({ status: 'waiting' }).eq('id', current.id)
    }
    setText('')
    setNotice(kind === 'question' ? 'Rückfrage gespeichert – Vorgang wartet auf Antwort.' : 'Eintrag gespeichert.')
    await load()
  }

  async function followUp() {
    if (!current) return
    if (currentTasks.some((task) => task.status !== 'done')) {
      setNotice('Für diesen Vorgang gibt es bereits eine offene Nachfass-Aufgabe.')
      return
    }
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return

    const { error: insertError } = await supabase.from('mila_coordination_tasks').insert({
      user_id: auth.user.id,
      case_id: current.id,
      title: `Nachfassen: ${current.subject}`,
      contact_name: current.caller_name || current.company,
      contact_channel: current.email || current.phone,
      goal: current.summary || current.subject,
      status: 'open',
      next_action: 'Offene Rückfrage oder nächsten Schritt nachfassen',
    })
    if (insertError) setError('Nachfassen konnte nicht angelegt werden.')
    else {
      setNotice('Nachfass-Aufgabe angelegt.')
      await load()
    }
  }

  async function closeQuestion(item: Update) {
    const { error: updateError } = await supabase.from('mila_case_updates').update({ status: 'done' }).eq('id', item.id)
    if (!updateError) await load()
  }

  async function closeTask(item: Task) {
    const { error: updateError } = await supabase.from('mila_coordination_tasks').update({ status: 'done' }).eq('id', item.id)
    if (!updateError) await load()
  }

  async function prepareHandoff() {
    if (!current) return
    if (currentUpdates.some((item) => item.kind === 'question' && item.status !== 'done')) {
      setError('Es gibt noch offene Rückfragen. Erst klären, dann übergeben.')
      return
    }

    const summary = handoff.trim() || [
      `Anliegen: ${current.subject}`,
      `Ausgangslage: ${current.summary || '–'}`,
      `Kontakt: ${current.caller_name || current.company || '–'}`,
      `Dokumentation: ${currentUpdates.filter((item) => item.kind !== 'handoff').map((item) => `${item.kind}: ${item.content}`).join(' | ') || 'keine Ergänzungen'}`,
      `Offene Koordination: ${currentTasks.filter((task) => task.status !== 'done').map((task) => task.title).join(', ') || 'keine'}`,
    ].join('\n')

    const { error: updateError } = await supabase
      .from('mila_intake_cases')
      .update({ handoff_summary: summary, handoff_ready: true, status: 'human_review' })
      .eq('id', current.id)

    if (updateError) setError('Übergabe konnte nicht vorbereitet werden.')
    else {
      setHandoff('')
      setNotice('Übergabe ist vorbereitet und wartet auf menschliche Prüfung.')
      await load()
    }
  }

  async function finish() {
    if (!current) return
    if (!current.handoff_ready) {
      setError('Bitte zuerst eine Übergabe vorbereiten.')
      return
    }
    const hasOpenWork = currentTasks.some((task) => task.status !== 'done') || currentUpdates.some((item) => item.kind === 'question' && item.status !== 'done')
    if (hasOpenWork) {
      setError('Noch nicht erledigen: Es gibt offene Rückfragen oder Nachfass-Aufgaben.')
      return
    }

    const { error: updateError } = await supabase
      .from('mila_intake_cases')
      .update({ status: 'done', completed_at: new Date().toISOString() })
      .eq('id', current.id)

    if (updateError) setError('Vorgang konnte nicht abgeschlossen werden.')
    else {
      setNotice('Kreis geschlossen: Vorgang vollständig erledigt.')
      await load()
    }
  }

  return (
    <main className="min-h-screen bg-[#fbf9ff] px-4 pb-40 pt-5 text-slate-950">
      <header>
        <p className="text-[11px] font-black uppercase tracking-[.22em] text-violet-500">Mila Vorgangskreis</p>
        <h1 className="mt-1 text-3xl font-black">Vom Eingang bis erledigt</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">Rückfragen, Nachfassen und Übergabe bleiben am selben Vorgang – bis wirklich nichts mehr offen ist.</p>
      </header>

      <section className="mt-5 grid grid-cols-2 gap-3">
        {[
          ['Offene Vorgänge', stats.open],
          ['Offene Rückfragen', stats.questions],
          ['Nachfassen', stats.follow],
          ['Übergabebereit', stats.ready],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-2xl font-black text-violet-700">{value}</p>
            <p className="text-xs font-black text-slate-500">{label}</p>
          </div>
        ))}
      </section>

      {notice && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{notice}</p>}
      {error && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>}

      <section className="mt-6">
        <h2 className="text-xl font-black">Vorgänge</h2>
        <div className="mt-3 space-y-2">
          {loading ? (
            <p className="rounded-2xl bg-white p-4">Lädt…</p>
          ) : (
            cases.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setSelected(item.id)
                  setHandoff(item.handoff_summary || '')
                  setError('')
                }}
                className={`w-full rounded-2xl border p-4 text-left shadow-sm ${selected === item.id ? 'border-violet-400 bg-violet-50' : 'border-slate-100 bg-white'}`}
              >
                <div className="flex justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-black uppercase text-violet-500">{item.source} · {item.category}</p>
                    <p className="font-black">{item.subject}</p>
                    <p className="text-xs font-semibold text-slate-500">{item.caller_name || item.company || 'Kontakt nicht angegeben'}</p>
                  </div>
                  <span className="h-fit rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black">{statusLabel[item.status]}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </section>

      {current && (
        <section className="mt-6 rounded-3xl border border-violet-100 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[.18em] text-violet-500">Aktiver Vorgang</p>
          <h2 className="mt-1 text-xl font-black">{current.subject}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{current.summary || 'Keine Zusammenfassung.'}</p>

          <div className="mt-5">
            <h3 className="font-black">Rückfragen & Verlauf</h3>
            <div className="mt-2 space-y-2">
              {currentUpdates.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">Noch keine Einträge.</p>
              ) : (
                currentUpdates.map((item) => (
                  <div key={item.id} className="rounded-xl bg-slate-50 p-3">
                    <div className="flex justify-between gap-2">
                      <span className="text-[10px] font-black uppercase text-violet-600">{item.kind}</span>
                      {item.kind === 'question' && item.status !== 'done' && (
                        <button onClick={() => closeQuestion(item)} className="text-xs font-black text-emerald-700">Als geklärt markieren</button>
                      )}
                    </div>
                    <p className="mt-1 text-sm font-semibold">{item.content}</p>
                  </div>
                ))
              )}
            </div>
            <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Rückfrage, Antwort oder interne Notiz…" className="mt-3 min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm" />
            <div className="mt-2 grid grid-cols-3 gap-2">
              <button onClick={() => addUpdate('question')} className="rounded-xl bg-amber-50 p-2 text-xs font-black text-amber-800">Rückfrage</button>
              <button onClick={() => addUpdate('answer')} className="rounded-xl bg-emerald-50 p-2 text-xs font-black text-emerald-800">Antwort</button>
              <button onClick={() => addUpdate('note')} className="rounded-xl bg-slate-100 p-2 text-xs font-black">Notiz</button>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <h3 className="font-black">Nachfassen</h3>
              <button onClick={followUp} className="rounded-xl bg-violet-50 px-3 py-2 text-xs font-black text-violet-700">Aufgabe anlegen</button>
            </div>
            <div className="mt-2 space-y-2">
              {currentTasks.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">Keine Aufgabe.</p>
              ) : (
                currentTasks.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
                    <div>
                      <p className="text-sm font-black">{item.title}</p>
                      <p className="text-xs text-slate-500">{item.next_action}</p>
                    </div>
                    {item.status !== 'done' && <button onClick={() => closeTask(item)} className="text-xs font-black text-emerald-700">Erledigt</button>}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6">
            <h3 className="font-black">Übergabe</h3>
            <p className="mt-1 text-xs font-semibold text-slate-500">Mila bündelt den Vorgang. Fachliche Entscheidungen bleiben beim Menschen.</p>
            <textarea value={handoff} onChange={(event) => setHandoff(event.target.value)} placeholder="Optional eigene Übergabe-Zusammenfassung. Leer lassen = Mila erstellt sie aus dem Vorgang." className="mt-3 min-h-28 w-full rounded-xl border border-slate-200 p-3 text-sm" />
            <button onClick={prepareHandoff} className="mt-2 w-full rounded-xl bg-violet-600 py-3 text-sm font-black text-white">Übergabe vorbereiten</button>
            {current.handoff_ready && current.handoff_summary && (
              <div className="mt-3 whitespace-pre-wrap rounded-xl bg-violet-50 p-3 text-sm font-semibold text-violet-950">{current.handoff_summary}</div>
            )}
            <button onClick={finish} className="mt-3 w-full rounded-xl bg-emerald-600 py-3 text-sm font-black text-white">Vorgang vollständig erledigen</button>
          </div>
        </section>
      )}
    </main>
  )
}
