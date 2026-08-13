'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Source = 'phone' | 'email' | 'upload' | 'form' | 'manual'
type Urgency = 'low' | 'normal' | 'high' | 'critical'
type CaseStatus = 'new' | 'needs_info' | 'standard' | 'human_review' | 'in_progress' | 'waiting' | 'done'

type IntakeCase = {
  id: string
  source: Source
  caller_name: string | null
  company: string | null
  phone: string | null
  email: string | null
  subject: string
  summary: string
  urgency: Urgency
  category: string
  status: CaseStatus
  requires_human: boolean
  sensitive: boolean
  created_at: string
}

type CoordinationTask = {
  id: string
  case_id: string | null
  title: string
  contact_name: string | null
  contact_channel: string | null
  goal: string | null
  status: 'open' | 'waiting' | 'blocked' | 'done'
  due_at: string | null
  next_action: string | null
}

const initialForm = { source: 'phone' as Source, caller_name: '', company: '', phone: '', email: '', subject: '', summary: '', urgency: 'normal' as Urgency, category: 'Allgemein', sensitive: false }
const statusLabels: Record<CaseStatus, string> = { new: 'Neu', needs_info: 'Infos fehlen', standard: 'Standardfall', human_review: 'Mensch prüfen', in_progress: 'In Arbeit', waiting: 'Wartet', done: 'Erledigt' }
const urgencyLabels: Record<Urgency, string> = { low: 'Niedrig', normal: 'Normal', high: 'Hoch', critical: 'Kritisch' }

function classify(form: typeof initialForm) {
  const text = `${form.subject} ${form.summary}`.toLowerCase()
  const sensitive = form.sensitive || /(finanzamt|mahnung|frist|bescheid|kündigung|klage|datenschutz|beschwerde|steuer|prüfung)/i.test(text)
  const missingInfo = !form.caller_name.trim() || !form.summary.trim()
  if (missingInfo) return { status: 'needs_info' as CaseStatus, requires_human: true, sensitive }
  if (form.urgency === 'critical' || form.urgency === 'high' || sensitive) return { status: 'human_review' as CaseStatus, requires_human: true, sensitive }
  return { status: 'standard' as CaseStatus, requires_human: false, sensitive }
}

export default function EingangPage() {
  const [cases, setCases] = useState<IntakeCase[]>([])
  const [tasks, setTasks] = useState<CoordinationTask[]>([])
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) { setError('Bitte zuerst anmelden.'); setLoading(false); return }
    const [caseResult, taskResult] = await Promise.all([
      supabase.from('mila_intake_cases').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('mila_coordination_tasks').select('*').neq('status', 'done').order('due_at', { ascending: true, nullsFirst: false }).limit(30),
    ])
    if (caseResult.error || taskResult.error) setError('Mila konnte den Eingang nicht laden. Bitte Supabase-Verbindung und Tabellen prüfen.')
    setCases((caseResult.data || []) as IntakeCase[])
    setTasks((taskResult.data || []) as CoordinationTask[])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  async function saveCase() {
    if (!form.subject.trim()) { setError('Bitte ein Anliegen eintragen.'); return }
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) { setError('Bitte zuerst anmelden.'); return }
    setSaving(true); setError(''); setNotice('')
    const triage = classify(form)
    const { error: insertError } = await supabase.from('mila_intake_cases').insert({ user_id: userData.user.id, source: form.source, caller_name: form.caller_name.trim() || null, company: form.company.trim() || null, phone: form.phone.trim() || null, email: form.email.trim() || null, subject: form.subject.trim(), summary: form.summary.trim(), urgency: form.urgency, category: form.category.trim() || 'Allgemein', status: triage.status, requires_human: triage.requires_human, sensitive: triage.sensitive })
    if (insertError) setError('Vorgang konnte nicht gespeichert werden.')
    else { setNotice(triage.requires_human ? 'Vorgang gespeichert und für menschliche Prüfung markiert.' : 'Standardfall gespeichert und vorsortiert.'); setForm(initialForm); await load() }
    setSaving(false)
  }

  async function updateStatus(id: string, status: CaseStatus) {
    const { error: updateError } = await supabase.from('mila_intake_cases').update({ status }).eq('id', id)
    if (updateError) setError('Status konnte nicht geändert werden.')
    else await load()
  }

  async function createTask(item: IntakeCase) {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) { setError('Bitte zuerst anmelden.'); return }
    const { error: taskError } = await supabase.from('mila_coordination_tasks').insert({ user_id: userData.user.id, case_id: item.id, title: `Nachfassen: ${item.subject}`, contact_name: item.caller_name || item.company, contact_channel: item.email || item.phone, goal: item.summary || item.subject, status: 'open', next_action: item.requires_human ? 'Menschliche oder fachliche Prüfung organisieren' : 'Nächsten Schritt koordinieren' })
    if (taskError) setError('Koordinationsaufgabe konnte nicht angelegt werden.')
    else { setNotice('Koordinationsaufgabe angelegt.'); await load() }
  }

  const stats = useMemo(() => ({ open: cases.filter((item) => item.status !== 'done').length, human: cases.filter((item) => item.requires_human && item.status !== 'done').length, critical: cases.filter((item) => item.urgency === 'critical' && item.status !== 'done').length, tasks: tasks.length }), [cases, tasks])

  return (
    <main className="min-h-screen bg-[#fbf9ff] px-4 pb-40 pt-5 text-slate-950">
      <header><p className="text-[11px] font-black uppercase tracking-[0.22em] text-violet-500">Mila Intake · Triage · Koordination</p><h1 className="mt-1 text-3xl font-black tracking-tight">Der zentrale Eingang</h1><p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-slate-500">Anrufe, E-Mails, Uploads und manuelle Anliegen werden strukturiert erfasst, vorsortiert und sauber an Mensch oder nächsten Prozess übergeben.</p></header>
      <section className="mt-5 grid grid-cols-2 gap-3">{[['Offene Vorgänge', stats.open], ['Mensch prüfen', stats.human], ['Kritisch', stats.critical], ['Koordination', stats.tasks]].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><p className="text-2xl font-black text-violet-700">{value}</p><p className="mt-1 text-xs font-black text-slate-500">{label}</p></div>)}</section>
      <section className="mt-5 rounded-3xl border border-violet-100 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-500">Neuer Eingang</p><h2 className="mt-1 text-xl font-black">Anliegen aufnehmen</h2></div><span className="rounded-full bg-violet-50 px-3 py-1 text-[10px] font-black text-violet-700">Voice-ready</span></div>
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3"><select className="rounded-xl border border-slate-200 p-3 text-sm" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value as Source })}><option value="phone">Telefon</option><option value="email">E-Mail</option><option value="upload">Upload</option><option value="form">Formular</option><option value="manual">Manuell</option></select><select className="rounded-xl border border-slate-200 p-3 text-sm" value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value as Urgency })}><option value="low">Niedrig</option><option value="normal">Normal</option><option value="high">Hoch</option><option value="critical">Kritisch</option></select></div>
          <div className="grid grid-cols-2 gap-3"><input className="rounded-xl border border-slate-200 p-3 text-sm" placeholder="Name / Mandant" value={form.caller_name} onChange={(e) => setForm({ ...form, caller_name: e.target.value })} /><input className="rounded-xl border border-slate-200 p-3 text-sm" placeholder="Unternehmen" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3"><input className="rounded-xl border border-slate-200 p-3 text-sm" placeholder="Telefon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /><input className="rounded-xl border border-slate-200 p-3 text-sm" placeholder="E-Mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <input className="w-full rounded-xl border border-slate-200 p-3 text-sm" placeholder="Anliegen, z. B. Schreiben vom Finanzamt erhalten" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          <input className="w-full rounded-xl border border-slate-200 p-3 text-sm" placeholder="Kategorie, z. B. Unterlagen, Rückruf, Frist, Technik" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <textarea className="min-h-28 w-full rounded-xl border border-slate-200 p-3 text-sm" placeholder="Was ist passiert? Was möchte die Person? Welche Daten oder Fristen wurden genannt?" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
          <label className="flex items-center gap-3 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900"><input type="checkbox" checked={form.sensitive} onChange={(e) => setForm({ ...form, sensitive: e.target.checked })} />Sensibler oder fachlich kritischer Vorgang – Mila entscheidet nicht selbst</label>
          <button type="button" onClick={saveCase} disabled={saving} className="w-full rounded-xl bg-violet-600 py-3 font-black text-white disabled:opacity-50">{saving ? 'Wird vorsortiert...' : 'Erfassen & vorsortieren'}</button>
        </div>
      </section>
      {notice && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{notice}</p>}{error && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>}
      <section className="mt-7"><div className="flex items-end justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Triage</p><h2 className="text-xl font-black">Vorgänge</h2></div><span className="text-xs font-bold text-slate-400">{cases.length} geladen</span></div><div className="mt-3 space-y-3">{loading ? <div className="rounded-2xl bg-white p-5 font-bold text-slate-500">Eingang wird geladen...</div> : cases.length === 0 ? <div className="rounded-2xl bg-white p-5 font-bold text-slate-500">Noch keine Vorgänge.</div> : cases.map((item) => <article key={item.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-500">{item.source} · {item.category}</p><h3 className="mt-1 text-base font-black">{item.subject}</h3><p className="mt-1 text-sm font-semibold text-slate-500">{item.caller_name || item.company || 'Unbekannter Kontakt'}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${item.urgency === 'critical' ? 'bg-rose-100 text-rose-700' : item.urgency === 'high' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{urgencyLabels[item.urgency]}</span></div>{item.summary && <p className="mt-3 text-sm leading-6 text-slate-600">{item.summary}</p>}<div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-black text-violet-700">{statusLabels[item.status]}</span>{item.requires_human && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-700">Mensch erforderlich</span>}{item.sensitive && <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-black text-rose-700">Sensibel</span>}</div><div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => createTask(item)} className="rounded-xl bg-violet-50 px-3 py-2 text-xs font-black text-violet-700">Koordinieren</button><button type="button" onClick={() => updateStatus(item.id, 'in_progress')} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">In Arbeit</button><button type="button" onClick={() => updateStatus(item.id, 'waiting')} className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-700">Wartet</button><button type="button" onClick={() => updateStatus(item.id, 'done')} className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">Erledigt</button></div></article>)}</div></section>
      <section className="mt-7 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Schnittstellen-Übernahme</p><h2 className="mt-1 text-xl font-black">Koordination</h2><p className="mt-2 text-sm font-semibold leading-6 text-slate-500">Offene Aufgaben aus Kunden-, Kanzlei- und Partnerkommunikation bleiben hier sichtbar, bis der Vorgang wirklich abgeschlossen ist.</p><div className="mt-4 space-y-3">{tasks.length === 0 ? <p className="rounded-xl bg-slate-50 p-3 text-sm font-bold text-slate-500">Keine offenen Koordinationsaufgaben.</p> : tasks.map((task) => <div key={task.id} className="rounded-2xl border border-slate-100 p-3"><p className="font-black">{task.title}</p>{task.contact_name && <p className="mt-1 text-sm font-semibold text-slate-500">{task.contact_name}</p>}{task.next_action && <p className="mt-2 text-sm text-slate-600">Nächster Schritt: {task.next_action}</p>}</div>)}</div></section>
    </main>
  )
}
