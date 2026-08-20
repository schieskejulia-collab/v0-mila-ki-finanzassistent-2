'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Archive, CheckCircle2, Clock3, FileText, Inbox, Loader2, Mail, Phone, Plus, Search, Sparkles } from 'lucide-react'
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
  handoff_ready: boolean
  created_at: string
  completed_at: string | null
}

type Task = { id: string; case_id: string | null; title: string; status: string; next_action: string | null }
type Update = { id: string; case_id: string; kind: string; content: string; status: string }

const EMPTY_DRAFT = {
  source: 'phone', caller_name: '', company: '', phone: '', email: '', subject: '', summary: '',
  urgency: 'normal', category: 'Bestandsmandant / Kunde', assigned_to: '', next_action: '', sensitive: false,
}

const STATUS_LABEL: Record<string, string> = {
  new: 'Neu', needs_info: 'Rückfrage', standard: 'Standard', human_review: 'Prüfung',
  in_progress: 'In Bearbeitung', waiting: 'Wartet', done: 'Erledigt',
}

function sourceIcon(source: string) {
  if (source === 'phone') return <Phone className="h-3.5 w-3.5" />
  if (source === 'email') return <Mail className="h-3.5 w-3.5" />
  return <FileText className="h-3.5 w-3.5" />
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export function MilaIntakeWorkspace() {
  const [clientName, setClientName] = useState('Aktive Akte')
  const [cases, setCases] = useState<CaseItem[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [updates, setUpdates] = useState<Update[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<any>(EMPTY_DRAFT)
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  useEffect(() => { void load() }, [])

  async function load(selectId?: string) {
    setLoading(true); setError('')
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) { setError('Bitte zuerst anmelden.'); setLoading(false); return }
    const clientId = getActiveClientId()
    if (!clientId) { setError('Bitte zuerst eine aktive Akte auswählen.'); setCases([]); setSelected(null); setLoading(false); return }

    const [clientResult, caseResult] = await Promise.all([
      supabase.from('clients').select('id,name').eq('id', clientId).maybeSingle(),
      supabase.from('mila_intake_cases').select('*').eq('client_id', clientId).order('created_at', { ascending: false }).limit(150),
    ])
    if (clientResult.data?.name) setClientName(String(clientResult.data.name))
    if (caseResult.error) { setError('Mila konnte den Eingang dieser Akte nicht laden.'); setLoading(false); return }

    const all = (caseResult.data || []) as CaseItem[]
    const active = all.filter(item => item.status !== 'done')
    const ids = active.map(item => item.id)
    let nextTasks: Task[] = []
    let nextUpdates: Update[] = []
    if (ids.length) {
      const [taskResult, updateResult] = await Promise.all([
        supabase.from('mila_coordination_tasks').select('id,case_id,title,status,next_action').in('case_id', ids).limit(500),
        supabase.from('mila_case_updates').select('id,case_id,kind,content,status').in('case_id', ids).limit(800),
      ])
      if (taskResult.error || updateResult.error) setError('Mila konnte den Eingang nicht vollständig laden.')
      nextTasks = (taskResult.data || []) as Task[]
      nextUpdates = (updateResult.data || []) as Update[]
    }

    setCases(all); setTasks(nextTasks); setUpdates(nextUpdates)
    setSelected(current => {
      if (selectId && active.some(item => item.id === selectId)) return selectId
      if (current && active.some(item => item.id === current)) return current
      return active[0]?.id || null
    })
    setLoading(false)
  }

  async function callMilaCore(payload: Record<string, unknown>) {
    const { data: session } = await supabase.auth.getSession()
    const token = session.session?.access_token
    const clientId = getActiveClientId()
    if (!token) throw new Error('Bitte neu anmelden.')
    if (!clientId) throw new Error('Bitte zuerst eine aktive Akte auswählen.')
    const response = await fetch('/api/mila/process', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...payload, clientId }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok || !data?.success) throw new Error(data?.error || 'Mila konnte den Eingang nicht verarbeiten.')
    return data
  }

  async function createCase() {
    setError(''); setNotice('')
    if (!draft.subject.trim() || !draft.summary.trim()) { setError('Bitte Anliegen und kurze Zusammenfassung ausfüllen.'); return }
    setSaving(true)
    try {
      const result = await callMilaCore({
        source: draft.source, subject: draft.subject, text: draft.summary,
        fields: {
          caller_name: draft.caller_name, company: draft.company, phone: draft.phone, email: draft.email,
          urgency: draft.urgency, category: draft.category, assigned_to: draft.assigned_to,
          next_action: draft.next_action, sensitive: draft.sensitive,
        },
      })
      setDraft(EMPTY_DRAFT); setShowCreate(false)
      setNotice(result.workspace?.question ? `Eingang erfasst. Mila hat eine Rückfrage markiert: ${result.workspace.question}` : 'Eingang erfasst und als Vorgang angelegt.')
      await load(result.caseId)
    } catch (cause: any) {
      setError(cause?.message || 'Der Eingang konnte nicht verarbeitet werden.')
    } finally { setSaving(false) }
  }

  const activeCases = useMemo(() => cases.filter(item => item.status !== 'done'), [cases])
  const doneCases = useMemo(() => cases.filter(item => item.status === 'done'), [cases])
  const current = activeCases.find(item => item.id === selected) || null
  const currentTasks = tasks.filter(item => item.case_id === selected && item.status !== 'done')
  const currentQuestions = updates.filter(item => item.case_id === selected && item.kind === 'question' && item.status !== 'done')
  const filtered = activeCases.filter(item => {
    const needle = query.trim().toLowerCase()
    if (!needle) return true
    return `${item.subject} ${item.summary} ${item.caller_name || ''} ${item.company || ''} ${item.phone || ''} ${item.email || ''}`.toLowerCase().includes(needle)
  })
  const waitingCount = activeCases.filter(item => item.status === 'waiting' || item.status === 'needs_info').length

  return <main className="min-h-screen bg-[#faf9fc] px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
    <div className="mx-auto w-full max-w-[1220px]">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.18em] text-violet-500">Aktive Akte · {clientName}</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">Eingang</h1>
          <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-slate-500">Hier kommt Neues rein. Bearbeitung, Klärung und Abschluss laufen danach im Vorgang – erledigte Fälle verschwinden aus dem aktiven Eingang.</p>
        </div>
        <button onClick={() => setShowCreate(value => !value)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-black text-white"><Plus className="h-4 w-4" /> Neuer Eingang</button>
      </header>

      {notice && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{notice}</p>}
      {error && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>}

      <section className="mt-5 grid grid-cols-3 gap-3">
        <Kpi label="Aktiv im Eingang" value={activeCases.length} icon={<Inbox className="h-4 w-4" />} />
        <Kpi label="Warten auf Info" value={waitingCount} icon={<Clock3 className="h-4 w-4" />} />
        <Kpi label="Im Archiv" value={doneCases.length} icon={<Archive className="h-4 w-4" />} />
      </section>

      {showCreate && <section className="mt-5 rounded-2xl border border-violet-100 bg-white p-4 shadow-sm lg:p-5">
        <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Sparkles className="h-5 w-5" /></span><div><h2 className="font-black">Was ist hereingekommen?</h2><p className="text-xs text-slate-500">Sachverhalt erfassen – Mila legt darunter genau einen Vorgang an.</p></div></div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <select value={draft.source} onChange={e => setDraft((d:any)=>({...d,source:e.target.value}))} className="rounded-xl border p-3 text-sm font-semibold"><option value="phone">Telefon</option><option value="email">E-Mail</option><option value="upload">Upload</option><option value="manual">Manuell</option></select>
          <select value={draft.category} onChange={e => setDraft((d:any)=>({...d,category:e.target.value}))} className="rounded-xl border p-3 text-sm font-semibold"><option>Bestandsmandant / Kunde</option><option>Neukunde / Interessent</option><option>Behörde / Rückfrage</option><option>Unterlagen / Nachreichung</option><option>Sonstiges</option></select>
          <select value={draft.urgency} onChange={e => setDraft((d:any)=>({...d,urgency:e.target.value}))} className="rounded-xl border p-3 text-sm font-semibold"><option value="low">Niedrig</option><option value="normal">Normal</option><option value="high">Dringend</option><option value="critical">Kritisch</option></select>
          <input value={draft.assigned_to} onChange={e => setDraft((d:any)=>({...d,assigned_to:e.target.value}))} placeholder="Zuständig / Team" className="rounded-xl border p-3 text-sm" />
          <input value={draft.caller_name} onChange={e => setDraft((d:any)=>({...d,caller_name:e.target.value}))} placeholder="Name" className="rounded-xl border p-3 text-sm" />
          <input value={draft.company} onChange={e => setDraft((d:any)=>({...d,company:e.target.value}))} placeholder="Firma / Mandant" className="rounded-xl border p-3 text-sm" />
          <input value={draft.phone} onChange={e => setDraft((d:any)=>({...d,phone:e.target.value}))} placeholder="Telefon" className="rounded-xl border p-3 text-sm" />
          <input value={draft.email} onChange={e => setDraft((d:any)=>({...d,email:e.target.value}))} placeholder="E-Mail" className="rounded-xl border p-3 text-sm" />
        </div>
        <input value={draft.subject} onChange={e => setDraft((d:any)=>({...d,subject:e.target.value}))} placeholder="Anliegen in einem Satz" className="mt-2 w-full rounded-xl border p-3 text-sm" />
        <textarea value={draft.summary} onChange={e => setDraft((d:any)=>({...d,summary:e.target.value}))} placeholder="Was wurde gesagt, geschickt oder angefragt?" className="mt-2 min-h-28 w-full rounded-xl border p-3 text-sm" />
        <input value={draft.next_action} onChange={e => setDraft((d:any)=>({...d,next_action:e.target.value}))} placeholder="Optional: bereits bekannter nächster Schritt" className="mt-2 w-full rounded-xl border p-3 text-sm" />
        <label className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900"><input type="checkbox" checked={draft.sensitive} onChange={e => setDraft((d:any)=>({...d,sensitive:e.target.checked}))} /> Sensibel / sicher von einem Menschen prüfen</label>
        <button onClick={() => void createCase()} disabled={saving} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-black text-white disabled:opacity-60">{saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Mila verarbeitet…</> : 'An Mila übergeben'}</button>
      </section>}

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.35fr)]">
        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3"><div><h2 className="font-black">Aktiver Eingang</h2><p className="text-[11px] text-slate-500">Erledigte Vorgänge sind hier bewusst ausgeblendet.</p></div><Link href="/uebergaben" className="text-xs font-black text-violet-700">Archiv →</Link></div>
          <div className="mt-3 flex items-center gap-2 rounded-xl border px-3 py-2"><Search className="h-4 w-4 text-slate-400" /><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Name, Firma, Anliegen…" className="w-full bg-transparent text-sm outline-none" /></div>
          <div className="mt-3 space-y-2">{loading ? <p className="py-8 text-center text-sm font-semibold text-slate-400">Eingang wird geladen …</p> : filtered.length === 0 ? <div className="rounded-xl border border-dashed p-6 text-center"><CheckCircle2 className="mx-auto h-7 w-7 text-emerald-500" /><p className="mt-2 text-sm font-black">Kein aktiver Eingang.</p></div> : filtered.map(item => <button key={item.id} onClick={()=>setSelected(item.id)} className={selected===item.id?'w-full rounded-xl border border-violet-300 bg-violet-50 p-3 text-left':'w-full rounded-xl border p-3 text-left hover:bg-slate-50'}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wide text-slate-400">{sourceIcon(item.source)} {item.caller_name||item.company||item.source} · {formatDate(item.created_at)}</div><p className="mt-1 truncate text-sm font-black">{item.subject}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{item.summary}</p></div><span className="shrink-0 rounded-lg bg-white px-2 py-1 text-[9px] font-black text-violet-700">{STATUS_LABEL[item.status]||item.status}</span></div></button>)}</div>
        </section>

        <section className="rounded-2xl border bg-white p-4 shadow-sm lg:p-5">{!current ? <div className="flex min-h-[360px] flex-col items-center justify-center text-center"><Inbox className="h-8 w-8 text-violet-300" /><p className="mt-3 text-sm font-black">Wähle einen aktiven Eingang.</p></div> : <>
          <div className="border-b pb-4"><p className="text-[10px] font-black uppercase tracking-[.16em] text-violet-500">Eingang → Vorgang</p><h2 className="mt-1 text-xl font-black">{current.subject}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{current.summary}</p></div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2"><Info label="Kontakt" value={current.caller_name||current.company||'Noch offen'} /><Info label="Telefon / Mail" value={current.phone||current.email||'Noch offen'} /><Info label="Zuständig" value={current.assigned_to||'Noch offen'} /><Info label="Kategorie" value={current.category||'Noch offen'} /></div>
          <div className="mt-5 rounded-xl bg-slate-50 p-4"><p className="text-xs font-black">Arbeitsstand</p><p className="mt-2 text-xs font-semibold text-slate-600">{currentQuestions.length} offene Rückfrage{currentQuestions.length===1?'':'n'} · {currentTasks.length} offene Arbeitsschritt{currentTasks.length===1?'':'e'}</p><p className="mt-1 text-xs text-slate-500">Ab hier wird nichts doppelt im Eingang bearbeitet. Der vollständige Verlauf lebt im Vorgang.</p></div>
          <div className="mt-5 grid gap-2 sm:grid-cols-3"><Link href={`/jetzt?case=${current.id}`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-3 text-xs font-black text-white">Vorgang öffnen <ArrowRight className="h-3.5 w-3.5" /></Link><Link href={`/dokumente?case=${current.id}`} className="rounded-xl bg-violet-50 px-3 py-3 text-center text-xs font-black text-violet-700">Mappe</Link><Link href="/neue-buchungen" className="rounded-xl border px-3 py-3 text-center text-xs font-black">Unterlage ergänzen</Link></div>
        </>}</section>
      </div>
    </div>
  </main>
}

function Kpi({label,value,icon}:{label:string;value:number;icon:React.ReactNode}) { return <div className="rounded-2xl border bg-white p-4 shadow-sm"><div className="text-violet-600">{icon}</div><p className="mt-3 text-2xl font-black">{value}</p><p className="mt-1 text-[10px] font-black uppercase tracking-[.12em] text-slate-500">{label}</p></div> }
function Info({label,value}:{label:string;value:string}) { return <div className="rounded-xl bg-slate-50 p-3"><p className="text-[9px] font-black uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-xs font-bold text-slate-700">{value}</p></div> }
