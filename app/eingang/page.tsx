'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Inbox,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react'
import { getActiveClientId, supabase } from '@/lib/supabase'

type CaseItem = {
  id: string
  client_id: string | null
  source: string
  caller_name: string | null
  company: string | null
  phone: string | null
  email: string | null
  subject: string
  summary: string
  urgency: string
  category: string
  status: string
  assigned_to: string | null
  handoff_summary: string | null
  handoff_ready: boolean
  created_at?: string
}

type Task = {
  id: string
  case_id: string | null
  title: string
  status: string
  next_action: string | null
}

type Update = {
  id: string
  case_id: string
  kind: 'question' | 'answer' | 'note' | 'handoff'
  content: string
  status: 'open' | 'waiting' | 'done'
}

const emptyDraft = {
  source: 'phone',
  caller_name: '',
  company: '',
  phone: '',
  email: '',
  subject: '',
  summary: '',
  urgency: 'normal',
  category: 'Bestandsmandant / Kunde',
  assigned_to: '',
  next_action: '',
  sensitive: false,
}

const statusLabel: Record<string, string> = {
  new: 'Neu',
  needs_info: 'Rückfrage',
  standard: 'Standard',
  human_review: 'Prüfung',
  in_progress: 'In Bearbeitung',
  waiting: 'Wartet',
  done: 'Erledigt',
}

export default function EingangPage() {
  const [cases, setCases] = useState<CaseItem[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [updates, setUpdates] = useState<Update[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<any>(emptyDraft)
  const [timelineText, setTimelineText] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    void load()
  }, [])

  async function load(selectId?: string) {
    setError('')
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) {
      setError('Bitte zuerst anmelden.')
      return
    }

    const clientId = getActiveClientId()
    if (!clientId) {
      setCases([])
      setTasks([])
      setUpdates([])
      setSelected(null)
      setError('Bitte zuerst eine aktive Akte auswählen.')
      return
    }

    const caseResult = await supabase
      .from('mila_intake_cases')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (caseResult.error) {
      setError('Mila konnte den Eingang dieser Akte nicht laden.')
      return
    }

    const nextCases = (caseResult.data || []) as CaseItem[]
    const caseIds = nextCases.map((item) => item.id)

    if (caseIds.length === 0) {
      setCases([])
      setTasks([])
      setUpdates([])
      setSelected(null)
      return
    }

    const [taskResult, updateResult] = await Promise.all([
      supabase
        .from('mila_coordination_tasks')
        .select('*')
        .in('case_id', caseIds)
        .order('created_at', { ascending: false })
        .limit(300),
      supabase
        .from('mila_case_updates')
        .select('*')
        .in('case_id', caseIds)
        .order('created_at', { ascending: true })
        .limit(600),
    ])

    if (taskResult.error || updateResult.error) {
      setError('Mila konnte den Eingang nicht vollständig laden.')
    }

    setCases(nextCases)
    setTasks((taskResult.data || []) as Task[])
    setUpdates((updateResult.data || []) as Update[])

    const nextSelected =
      selectId && nextCases.some((item) => item.id === selectId)
        ? selectId
        : selected && nextCases.some((item) => item.id === selected)
          ? selected
          : nextCases[0]?.id || null
    setSelected(nextSelected)
  }

  function patch(key: string, value: unknown) {
    setDraft((current: any) => ({ ...current, [key]: value }))
  }

  async function callMilaCore(payload: Record<string, unknown>) {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    if (!token) throw new Error('Bitte neu anmelden.')

    const clientId = getActiveClientId()
    if (!clientId) throw new Error('Bitte zuerst eine aktive Akte auswählen.')

    const response = await fetch('/api/mila/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ...payload, clientId }),
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok || !data?.success) {
      throw new Error(data?.error || 'Mila konnte den Eingang nicht verarbeiten.')
    }
    return data
  }

  async function createCase() {
    setError('')
    setNotice('')

    if (!draft.subject.trim() || !draft.summary.trim()) {
      setError('Bitte Anliegen und kurze Zusammenfassung ausfüllen.')
      return
    }

    setSaving(true)
    try {
      const result = await callMilaCore({
        source: draft.source,
        subject: draft.subject,
        text: draft.summary,
        fields: {
          caller_name: draft.caller_name,
          company: draft.company,
          phone: draft.phone,
          email: draft.email,
          urgency: draft.urgency,
          category: draft.category,
          assigned_to: draft.assigned_to,
          next_action: draft.next_action,
          sensitive: draft.sensitive,
        },
      })

      setDraft(emptyDraft)
      setShowCreate(false)

      if (result.workspace?.question) {
        setNotice(`Mila hat den Eingang verstanden und eine Rückfrage markiert: ${result.workspace.question}`)
      } else if (result.workspace?.interpretationReady) {
        setNotice('Mila hat den Eingang verstanden. Jetzt wird im Vorgang nur noch die organisatorische Vollständigkeit geprüft.')
      } else {
        setNotice('Mila hat den Eingang geordnet und den nächsten Schritt angelegt.')
      }

      await load(result.caseId)
    } catch (cause: any) {
      setError(cause?.message || 'Der Eingang konnte nicht verarbeitet werden.')
    } finally {
      setSaving(false)
    }
  }

  const current = cases.find((item) => item.id === selected) || null
  const currentTasks = tasks.filter((item) => item.case_id === selected)
  const currentUpdates = updates.filter((item) => item.case_id === selected)
  const filteredCases = cases.filter((item) => {
    const needle = query.trim().toLowerCase()
    if (!needle) return true
    return [item.subject, item.summary, item.caller_name, item.company, item.phone, item.email]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(needle)
  })

  async function invalidateHandoff(caseId: string, status = 'in_progress') {
    await supabase
      .from('mila_intake_cases')
      .update({ status, handoff_ready: false, handoff_summary: null })
      .eq('id', caseId)
  }

  async function addUpdate(kind: Update['kind']) {
    if (!current || !timelineText.trim()) return
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return

    const { error: insertError } = await supabase.from('mila_case_updates').insert({
      user_id: auth.user.id,
      case_id: current.id,
      kind,
      content: timelineText.trim(),
      status: kind === 'question' ? 'waiting' : 'done',
    })

    if (insertError) {
      setError('Eintrag konnte nicht gespeichert werden.')
      return
    }

    await invalidateHandoff(current.id, kind === 'question' ? 'needs_info' : 'in_progress')
    setTimelineText('')
    await load(current.id)
  }

  async function closeQuestion(update: Update) {
    if (!current) return
    const { error: updateError } = await supabase.from('mila_case_updates').update({ status: 'done' }).eq('id', update.id)
    if (updateError) {
      setError('Rückfrage konnte nicht geschlossen werden.')
      return
    }
    await invalidateHandoff(current.id)
    await load(current.id)
  }

  async function closeTask(task: Task) {
    if (!current) return
    const { error: taskError } = await supabase.from('mila_coordination_tasks').update({ status: 'done' }).eq('id', task.id)
    if (taskError) {
      setError('Arbeitsschritt konnte nicht abgeschlossen werden.')
      return
    }
    await invalidateHandoff(current.id)
    await load(current.id)
  }

  async function runMilaAgain() {
    if (!current) return
    setProcessing(true)
    setError('')
    setNotice('')

    try {
      const answers = currentUpdates
        .filter((item) => item.kind === 'answer' || item.kind === 'note')
        .map((item) => item.content)
        .join('\n')

      const result = await callMilaCore({
        caseId: current.id,
        source: current.source,
        subject: current.subject,
        text: `${current.summary}${answers ? `\n\nErgänzungen:\n${answers}` : ''}`,
        fields: {
          caller_name: current.caller_name,
          company: current.company,
          phone: current.phone,
          email: current.email,
          urgency: current.urgency,
          category: current.category,
          assigned_to: current.assigned_to,
        },
      })

      if (result.workspace?.question) {
        setNotice(`Mila braucht noch genau diese Information: ${result.workspace.question}`)
      } else if (result.workspace?.interpretationReady) {
        setNotice('Mila versteht den Sachverhalt. Die Übergabe wird erst nach der gemeinsamen Vollständigkeitsprüfung freigegeben.')
      } else {
        setNotice('Mila hat den Vorgang neu geprüft und den Arbeitsstand aktualisiert.')
      }

      await load(current.id)
    } catch (cause: any) {
      setError(cause?.message || 'Mila konnte den Vorgang nicht erneut prüfen.')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#faf9fc] px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
      <div className="mx-auto w-full max-w-[1220px]">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-500">Kanzlei-Arbeitsplatz</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Eingang</h1>
            <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-slate-500">
              Telefon, Mail, Upload oder Notiz kommen hier rein. Mila ordnet den Inhalt, hält Rückfragen offen und gibt den Vorgang erst weiter, wenn die organisatorische Vorbereitung steht.
            </p>
          </div>
          <button
            onClick={() => setShowCreate((value) => !value)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-black text-white shadow-sm"
          >
            <Plus className="h-4 w-4" /> Neuer Eingang
          </button>
        </header>

        {notice && <p className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{notice}</p>}
        {error && <p className="mt-4 rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>}

        {showCreate && (
          <section className="mt-5 rounded-2xl border border-violet-100 bg-white p-4 shadow-sm lg:p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Sparkles className="h-5 w-5" /></span>
              <div>
                <h2 className="text-base font-black">Was ist hereingekommen?</h2>
                <p className="text-xs text-slate-500">Du erfasst den Sachverhalt. Mila übernimmt die Ordnung darunter.</p>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <select value={draft.source} onChange={(e) => patch('source', e.target.value)} className="rounded-xl border p-3 text-sm font-semibold">
                <option value="phone">Telefon</option><option value="email">E-Mail</option><option value="upload">Upload</option><option value="manual">Manuell</option>
              </select>
              <select value={draft.category} onChange={(e) => patch('category', e.target.value)} className="rounded-xl border p-3 text-sm font-semibold">
                <option>Bestandsmandant / Kunde</option><option>Neukunde / Interessent</option><option>Behörde / Rückfrage</option><option>Unterlagen / Nachreichung</option><option>Sonstiges</option>
              </select>
              <select value={draft.urgency} onChange={(e) => patch('urgency', e.target.value)} className="rounded-xl border p-3 text-sm font-semibold">
                <option value="low">Niedrig</option><option value="normal">Normal</option><option value="high">Dringend</option><option value="critical">Kritisch</option>
              </select>
              <input value={draft.assigned_to} onChange={(e) => patch('assigned_to', e.target.value)} placeholder="Zuständig / Team" className="rounded-xl border p-3 text-sm" />
              <input value={draft.caller_name} onChange={(e) => patch('caller_name', e.target.value)} placeholder="Name" className="rounded-xl border p-3 text-sm" />
              <input value={draft.company} onChange={(e) => patch('company', e.target.value)} placeholder="Firma / Mandant" className="rounded-xl border p-3 text-sm" />
              <input value={draft.phone} onChange={(e) => patch('phone', e.target.value)} placeholder="Telefon" className="rounded-xl border p-3 text-sm" />
              <input value={draft.email} onChange={(e) => patch('email', e.target.value)} placeholder="E-Mail" className="rounded-xl border p-3 text-sm" />
            </div>

            <input value={draft.subject} onChange={(e) => patch('subject', e.target.value)} placeholder="Anliegen in einem Satz" className="mt-2 w-full rounded-xl border p-3 text-sm" />
            <textarea value={draft.summary} onChange={(e) => patch('summary', e.target.value)} placeholder="Was wurde gesagt, geschickt oder angefragt?" className="mt-2 min-h-28 w-full rounded-xl border p-3 text-sm" />
            <input value={draft.next_action} onChange={(e) => patch('next_action', e.target.value)} placeholder="Optional: bereits bekannter nächster Schritt" className="mt-2 w-full rounded-xl border p-3 text-sm" />
            <label className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">
              <input type="checkbox" checked={draft.sensitive} onChange={(e) => patch('sensitive', e.target.checked)} /> Sensibel / muss sicher von einem Menschen geprüft werden
            </label>
            <button onClick={createCase} disabled={saving} className="mt-3 w-full rounded-xl bg-violet-600 py-3 text-sm font-black text-white disabled:opacity-60">
              {saving ? 'Mila verarbeitet…' : 'An Mila übergeben'}
            </button>
          </section>
        )}

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.35fr)]">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black">Eingangsliste</h2>
                <p className="text-[11px] text-slate-500">Nur Vorgänge der aktiven Akte.</p>
              </div>
              <Link href="/jetzt" className="inline-flex items-center gap-1 text-xs font-black text-violet-700">Vorgänge <ArrowRight className="h-3.5 w-3.5" /></Link>
            </div>

            <div className="mt-3 flex items-center gap-2 rounded-xl border px-3 py-2">
              <Search className="h-4 w-4 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name, Firma, Anliegen…" className="w-full bg-transparent text-sm outline-none" />
            </div>

            <div className="mt-3 space-y-2">
              {filteredCases.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">Noch kein Eingang vorhanden.</p>}
              {filteredCases.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelected(item.id)}
                  className={selected === item.id ? 'w-full rounded-xl border border-violet-300 bg-violet-50 p-3 text-left' : 'w-full rounded-xl border border-slate-200 p-3 text-left hover:bg-slate-50'}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wide text-slate-400">
                        {item.source === 'phone' ? <Phone className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                        {item.caller_name || item.company || item.source}
                      </div>
                      <p className="mt-1 truncate text-sm font-black text-slate-950">{item.subject}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{item.summary}</p>
                    </div>
                    <span className="shrink-0 rounded-lg bg-white px-2 py-1 text-[9px] font-black text-violet-700 shadow-sm">{statusLabel[item.status] || item.status}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:p-5">
            {!current ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                <Inbox className="h-8 w-8 text-violet-300" />
                <p className="mt-3 text-sm font-black">Wähle links einen Eingang.</p>
                <p className="mt-1 text-xs text-slate-500">Dann siehst du den kompletten Vorgang statt nur eine Zahl.</p>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-500">Aktiver Vorgang</p>
                    <h2 className="mt-1 text-xl font-black text-slate-950">{current.subject}</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{current.summary}</p>
                  </div>
                  <span className="w-fit rounded-xl bg-violet-50 px-3 py-2 text-xs font-black text-violet-700">{statusLabel[current.status] || current.status}</span>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <Info label="Kontakt" value={current.caller_name || current.company || 'Noch offen'} />
                  <Info label="Telefon / Mail" value={current.phone || current.email || 'Noch offen'} />
                  <Info label="Zuständig" value={current.assigned_to || 'Noch nicht festgelegt'} />
                  <Info label="Kategorie" value={current.category || 'Noch offen'} />
                </div>

                <div className="mt-5 rounded-xl border border-violet-100 bg-violet-50/50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black text-violet-700">Mila Core</p>
                      <p className="mt-1 text-xs leading-5 text-slate-600">
                        Mila prüft hier Organisation und Kontext. Übergabebereit wird der Vorgang ausschließlich nach der gemeinsamen Vollständigkeitsprüfung.
                      </p>
                    </div>
                    <Sparkles className="h-5 w-5 shrink-0 text-violet-500" />
                  </div>
                  <button onClick={runMilaAgain} disabled={processing} className="mt-3 w-full rounded-xl bg-white px-3 py-2.5 text-xs font-black text-violet-700 shadow-sm disabled:opacity-60">
                    {processing ? 'Mila prüft neu…' : 'Mila erneut prüfen'}
                  </button>
                </div>

                <div className="mt-5">
                  <h3 className="text-sm font-black">Nächster Schritt</h3>
                  <div className="mt-2 space-y-2">
                    {currentTasks.length === 0 && <p className="rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-500">Kein Arbeitsschritt vorhanden.</p>}
                    {currentTasks.map((task) => (
                      <div key={task.id} className="flex items-start justify-between gap-3 rounded-xl border p-3">
                        <div>
                          <p className="text-sm font-black">{task.title}</p>
                          {task.next_action && <p className="mt-1 text-xs leading-5 text-slate-500">{task.next_action}</p>}
                        </div>
                        {task.status !== 'done' ? (
                          <button onClick={() => closeTask(task)} className="shrink-0 rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">Erledigt</button>
                        ) : <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5">
                  <h3 className="flex items-center gap-2 text-sm font-black"><MessageCircle className="h-4 w-4 text-violet-500" /> Rückfragen & Verlauf</h3>
                  <div className="mt-2 space-y-2">
                    {currentUpdates.length === 0 && <p className="rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-500">Noch keine Rückfrage nötig.</p>}
                    {currentUpdates.map((update) => (
                      <div key={update.id} className="rounded-xl border p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-wide text-violet-500">{update.kind === 'question' ? 'Rückfrage' : update.kind === 'answer' ? 'Antwort' : update.kind === 'handoff' ? 'Übergabe' : 'Notiz'}</p>
                            <p className="mt-1 whitespace-pre-wrap text-xs font-semibold leading-5 text-slate-700">{update.content}</p>
                          </div>
                          {update.kind === 'question' && update.status !== 'done' && (
                            <button onClick={() => closeQuestion(update)} className="shrink-0 rounded-lg bg-emerald-50 px-2 py-1 text-[9px] font-black text-emerald-700">geklärt</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <textarea value={timelineText} onChange={(e) => setTimelineText(e.target.value)} placeholder="Antwort oder Notiz ergänzen…" className="mt-3 min-h-20 w-full rounded-xl border p-3 text-sm" />
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button onClick={() => addUpdate('answer')} className="rounded-xl bg-emerald-50 p-2.5 text-xs font-black text-emerald-700">Antwort speichern</button>
                    <button onClick={() => addUpdate('note')} className="rounded-xl bg-slate-100 p-2.5 text-xs font-black text-slate-700">Notiz speichern</button>
                  </div>
                </div>

                <Link href={`/jetzt?case=${current.id}`} className="mt-5 flex items-center justify-between rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
                  Vorgang im Arbeitsplatz öffnen <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-xs font-bold text-slate-800">{value}</p>
    </div>
  )
}
