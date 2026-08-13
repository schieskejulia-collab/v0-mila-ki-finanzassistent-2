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
  urgency: string
  category: string
  status: CaseStatus
  assigned_to: string | null
  due_at: string | null
  sensitive: boolean
  requires_human: boolean
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

type IntakeDraft = {
  source: 'phone' | 'email' | 'upload' | 'form' | 'manual'
  urgency: 'low' | 'normal' | 'high' | 'critical'
  caller_name: string
  company: string
  phone: string
  email: string
  subject: string
  details: string
  outcome: string
  category: string
  assigned_to: string
  due_at: string
  sensitive: boolean
  coordination: boolean
  next_action: string
}

const emptyDraft: IntakeDraft = {
  source: 'manual',
  urgency: 'normal',
  caller_name: '',
  company: '',
  phone: '',
  email: '',
  subject: '',
  details: '',
  outcome: '',
  category: 'Allgemein',
  assigned_to: 'Ich / VA',
  due_at: '',
  sensitive: false,
  coordination: true,
  next_action: '',
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

const sourceLabel: Record<string, string> = {
  phone: 'Telefon',
  email: 'E-Mail',
  upload: 'Upload',
  form: 'Formular',
  manual: 'Manuell',
}

export default function EingangPage() {
  const [cases, setCases] = useState<CaseItem[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [updates, setUpdates] = useState<Update[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [draft, setDraft] = useState<IntakeDraft>(emptyDraft)
  const [showIntake, setShowIntake] = useState(true)
  const [text, setText] = useState('')
  const [handoff, setHandoff] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

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

  function patchDraft<K extends keyof IntakeDraft>(key: K, value: IntakeDraft[K]) {
    setDraft((currentDraft) => ({ ...currentDraft, [key]: value }))
  }

  async function createCase() {
    setError('')
    setNotice('')
    if (!draft.subject.trim()) {
      setError('Bitte gib dem Vorgang ein klares Anliegen.')
      return
    }
    if (!draft.details.trim() && !draft.outcome.trim()) {
      setError('Bitte beschreibe kurz, was passiert ist oder was am Ende erreicht werden soll.')
      return
    }

    setSaving(true)
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) {
      setSaving(false)
      setError('Bitte zuerst anmelden.')
      return
    }

    const summaryParts = [
      draft.details.trim() ? `Ausgangslage: ${draft.details.trim()}` : '',
      draft.outcome.trim() ? `Ziel: ${draft.outcome.trim()}` : '',
    ].filter(Boolean)

    const requiresHuman = draft.sensitive || draft.urgency === 'critical' || draft.urgency === 'high'
    const initialStatus: CaseStatus = requiresHuman ? 'human_review' : 'new'

    const { data: created, error: insertError } = await supabase
      .from('mila_intake_cases')
      .insert({
        user_id: auth.user.id,
        source: draft.source,
        caller_name: draft.caller_name.trim() || null,
        company: draft.company.trim() || null,
        phone: draft.phone.trim() || null,
        email: draft.email.trim() || null,
        subject: draft.subject.trim(),
        summary: summaryParts.join('\n'),
        urgency: draft.urgency,
        category: draft.category.trim() || 'Allgemein',
        status: initialStatus,
        assigned_to: draft.assigned_to.trim() || null,
        due_at: draft.due_at ? new Date(draft.due_at).toISOString() : null,
        requires_human: requiresHuman,
        sensitive: draft.sensitive,
      })
      .select('*')
      .single()

    if (insertError || !created) {
      setSaving(false)
      setError('Der Vorgang konnte nicht angelegt werden.')
      return
    }

    if (draft.coordination) {
      await supabase.from('mila_coordination_tasks').insert({
        user_id: auth.user.id,
        case_id: created.id,
        title: `Koordination: ${draft.subject.trim()}`,
        contact_name: draft.caller_name.trim() || draft.company.trim() || null,
        contact_channel: draft.email.trim() || draft.phone.trim() || null,
        goal: draft.outcome.trim() || draft.subject.trim(),
        status: 'open',
        due_at: draft.due_at ? new Date(draft.due_at).toISOString() : null,
        next_action: draft.next_action.trim() || 'Nächsten sinnvollen Schritt klären und bis zur Erledigung nachhalten',
      })
    }

    setDraft(emptyDraft)
    setSelected(created.id)
    setShowIntake(false)
    setSaving(false)
    setNotice('Vorgang angelegt. Mila hält ihn jetzt im Blick, bis er wirklich abgeschlossen ist.')
    await load()
  }

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
      setNotice('Für diesen Vorgang gibt es bereits eine offene Koordinations- oder Nachfass-Aufgabe.')
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
      current.summary || 'Ausgangslage: –',
      `Kontakt: ${current.caller_name || current.company || '–'}`,
      `Zuständig: ${current.assigned_to || 'noch nicht festgelegt'}`,
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
        <p className="text-[11px] font-black uppercase tracking-[.22em] text-violet-500">Mila zentrale Schaltstelle</p>
        <h1 className="mt-1 text-3xl font-black">Rein damit. Mila hält den Faden.</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">Anruf, Mail, Upload oder Zuruf: Mila macht daraus einen klaren Vorgang, hält Rückfragen und nächste Schritte zusammen und lässt ihn erst los, wenn die Übergabe wirklich sauber ist.</p>
      </header>

      <section className="mt-5 rounded-3xl bg-gradient-to-br from-violet-600 to-fuchsia-500 p-5 text-white shadow-lg">
        <p className="text-[10px] font-black uppercase tracking-[.18em] text-violet-100">Rundum-Sorglos-Prinzip</p>
        <h2 className="mt-2 text-2xl font-black">Du gibst Ziel + Kontakte. Mila hält das Chaos zusammen.</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-violet-50">Nicht fünf Dienstleister im Kopf behalten. Ein Vorgang, ein Ziel, klare Zuständigkeit, sichtbare nächste Schritte.</p>
        <button onClick={() => setShowIntake((value) => !value)} className="mt-4 w-full rounded-2xl bg-white px-4 py-3 text-sm font-black text-violet-700">
          {showIntake ? 'Erfassung einklappen' : '+ Neuen Vorgang aufnehmen'}
        </button>
      </section>

      {showIntake && (
        <section className="mt-5 rounded-3xl border border-violet-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-violet-500">Neuer Eingang</p>
              <h2 className="text-xl font-black">Was ist reingekommen?</h2>
            </div>
            <span className="rounded-full bg-violet-50 px-3 py-2 text-[10px] font-black text-violet-700">einmal erfassen</span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="text-xs font-black text-slate-600">Quelle
              <select value={draft.source} onChange={(event) => patchDraft('source', event.target.value as IntakeDraft['source'])} className="mt-1 w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm font-semibold">
                <option value="phone">Telefon</option><option value="email">E-Mail</option><option value="upload">Upload</option><option value="form">Formular</option><option value="manual">Manuell</option>
              </select>
            </label>
            <label className="text-xs font-black text-slate-600">Dringlichkeit
              <select value={draft.urgency} onChange={(event) => patchDraft('urgency', event.target.value as IntakeDraft['urgency'])} className="mt-1 w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm font-semibold">
                <option value="low">Niedrig</option><option value="normal">Normal</option><option value="high">Hoch</option><option value="critical">Kritisch</option>
              </select>
            </label>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <input value={draft.caller_name} onChange={(event) => patchDraft('caller_name', event.target.value)} placeholder="Name / Mandant" className="rounded-2xl border border-slate-200 p-3 text-sm" />
            <input value={draft.company} onChange={(event) => patchDraft('company', event.target.value)} placeholder="Unternehmen" className="rounded-2xl border border-slate-200 p-3 text-sm" />
            <input value={draft.phone} onChange={(event) => patchDraft('phone', event.target.value)} placeholder="Telefon" className="rounded-2xl border border-slate-200 p-3 text-sm" />
            <input value={draft.email} onChange={(event) => patchDraft('email', event.target.value)} placeholder="E-Mail" className="rounded-2xl border border-slate-200 p-3 text-sm" />
          </div>

          <input value={draft.subject} onChange={(event) => patchDraft('subject', event.target.value)} placeholder="Anliegen – z. B. Rückruf, fehlende Unterlagen, Angebot koordinieren" className="mt-3 w-full rounded-2xl border border-slate-200 p-3 text-sm font-semibold" />
          <input value={draft.category} onChange={(event) => patchDraft('category', event.target.value)} placeholder="Kategorie" className="mt-3 w-full rounded-2xl border border-slate-200 p-3 text-sm" />
          <textarea value={draft.details} onChange={(event) => patchDraft('details', event.target.value)} placeholder="Was ist passiert? Was wurde gesagt? Welche Daten, Fristen oder Personen sind wichtig?" className="mt-3 min-h-28 w-full rounded-2xl border border-slate-200 p-3 text-sm" />
          <textarea value={draft.outcome} onChange={(event) => patchDraft('outcome', event.target.value)} placeholder="Was soll am Ende erreicht sein? Genau das ist Milas roter Faden." className="mt-3 min-h-24 w-full rounded-2xl border border-violet-200 bg-violet-50/40 p-3 text-sm" />

          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="text-xs font-black text-slate-600">Zuständigkeit
              <select value={draft.assigned_to} onChange={(event) => patchDraft('assigned_to', event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm font-semibold">
                <option>Ich / VA</option><option>Kanzlei</option><option>Kanzleiinhaber</option><option>Kunde / Mandant</option><option>Externer Partner</option><option>Noch offen</option>
              </select>
            </label>
            <label className="text-xs font-black text-slate-600">Frist / Zieltermin
              <input type="datetime-local" value={draft.due_at} onChange={(event) => patchDraft('due_at', event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 p-3 text-sm" />
            </label>
          </div>

          <input value={draft.next_action} onChange={(event) => patchDraft('next_action', event.target.value)} placeholder="Nächster Schritt – z. B. Designer anrufen, Rückruf einholen, Unterlage nachfordern" className="mt-3 w-full rounded-2xl border border-slate-200 p-3 text-sm" />

          <label className="mt-3 flex items-start gap-3 rounded-2xl bg-violet-50 p-3">
            <input type="checkbox" checked={draft.coordination} onChange={(event) => patchDraft('coordination', event.target.checked)} className="mt-1 h-5 w-5" />
            <span><strong className="block text-sm">Mila soll die Koordination offen halten</strong><span className="text-xs font-semibold text-slate-500">Der Vorgang bleibt mit einer sichtbaren nächsten Aufgabe im Blick, bis wirklich jemand gehandelt hat.</span></span>
          </label>

          <label className="mt-3 flex items-start gap-3 rounded-2xl bg-amber-50 p-3">
            <input type="checkbox" checked={draft.sensitive} onChange={(event) => patchDraft('sensitive', event.target.checked)} className="mt-1 h-5 w-5" />
            <span><strong className="block text-sm text-amber-900">Sensibel / fachlich kritisch – Mensch muss prüfen</strong><span className="text-xs font-semibold text-amber-800">Mila ordnet und dokumentiert, trifft aber keine fachliche Entscheidung.</span></span>
          </label>

          <button onClick={createCase} disabled={saving} className="mt-4 w-full rounded-2xl bg-violet-600 py-4 text-sm font-black text-white disabled:opacity-50">{saving ? 'Mila legt den Vorgang an…' : 'Vorgang übernehmen & roten Faden setzen'}</button>
        </section>
      )}

      <section className="mt-5 grid grid-cols-2 gap-3">
        {[
          ['Offene Vorgänge', stats.open],
          ['Offene Rückfragen', stats.questions],
          ['Nachfassen', stats.follow],
          ['Übergabebereit', stats.ready],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-2xl font-black text-violet-700">{value}</p><p className="text-xs font-black text-slate-500">{label}</p></div>
        ))}
      </section>

      {notice && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{notice}</p>}
      {error && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>}

      <section className="mt-6">
        <div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">Arbeitskorb</p><h2 className="text-xl font-black">Vorgänge</h2></div><button onClick={() => setShowIntake(true)} className="rounded-xl bg-violet-50 px-3 py-2 text-xs font-black text-violet-700">+ Neu</button></div>
        <div className="mt-3 space-y-2">
          {loading ? <p className="rounded-2xl bg-white p-4">Lädt…</p> : cases.length === 0 ? <p className="rounded-2xl bg-white p-4 text-sm font-semibold text-slate-500">Noch kein Vorgang. Oben kannst du den ersten Eingang direkt als echten Vorgang übernehmen.</p> : cases.map((item) => (
            <button key={item.id} onClick={() => { setSelected(item.id); setHandoff(item.handoff_summary || ''); setError(''); setShowIntake(false) }} className={`w-full rounded-2xl border p-4 text-left shadow-sm ${selected === item.id ? 'border-violet-400 bg-violet-50' : 'border-slate-100 bg-white'}`}>
              <div className="flex justify-between gap-2"><div><p className="text-[10px] font-black uppercase text-violet-500">{sourceLabel[item.source] || item.source} · {item.category}</p><p className="font-black">{item.subject}</p><p className="text-xs font-semibold text-slate-500">{item.caller_name || item.company || 'Kontakt nicht angegeben'} · {item.assigned_to || 'Zuständigkeit offen'}</p></div><span className="h-fit rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black">{statusLabel[item.status]}</span></div>
            </button>
          ))}
        </div>
      </section>

      {current && (
        <section className="mt-6 rounded-3xl border border-violet-100 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[.18em] text-violet-500">Aktiver Vorgang · roter Faden</p>
          <h2 className="mt-1 text-xl font-black">{current.subject}</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{current.summary || 'Keine Zusammenfassung.'}</p>
          <div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black">{sourceLabel[current.source] || current.source}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black">Zuständig: {current.assigned_to || 'offen'}</span>{current.due_at && <span className="rounded-full bg-amber-50 px-3 py-1 text-[10px] font-black text-amber-800">Frist: {new Date(current.due_at).toLocaleString('de-DE')}</span>}</div>

          <div className="mt-5"><h3 className="font-black">Rückfragen & Verlauf</h3><div className="mt-2 space-y-2">{currentUpdates.length === 0 ? <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">Noch keine Einträge.</p> : currentUpdates.map((item) => <div key={item.id} className="rounded-xl bg-slate-50 p-3"><div className="flex justify-between gap-2"><span className="text-[10px] font-black uppercase text-violet-600">{item.kind}</span>{item.kind === 'question' && item.status !== 'done' && <button onClick={() => closeQuestion(item)} className="text-xs font-black text-emerald-700">Als geklärt markieren</button>}</div><p className="mt-1 text-sm font-semibold">{item.content}</p></div>)}</div><textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Rückfrage, Antwort oder interne Notiz…" className="mt-3 min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm" /><div className="mt-2 grid grid-cols-3 gap-2"><button onClick={() => addUpdate('question')} className="rounded-xl bg-amber-50 p-2 text-xs font-black text-amber-800">Rückfrage</button><button onClick={() => addUpdate('answer')} className="rounded-xl bg-emerald-50 p-2 text-xs font-black text-emerald-800">Antwort</button><button onClick={() => addUpdate('note')} className="rounded-xl bg-slate-100 p-2 text-xs font-black">Notiz</button></div></div>

          <div className="mt-6"><div className="flex items-center justify-between"><div><h3 className="font-black">Koordination & Nachfassen</h3><p className="text-xs font-semibold text-slate-500">Hier liegt das „Rundum-Sorglos“: nichts verschwindet zwischen Menschen.</p></div><button onClick={followUp} className="rounded-xl bg-violet-50 px-3 py-2 text-xs font-black text-violet-700">Aufgabe anlegen</button></div><div className="mt-2 space-y-2">{currentTasks.length === 0 ? <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">Keine offene Koordinationsaufgabe.</p> : currentTasks.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3"><div><p className="text-sm font-black">{item.title}</p><p className="text-xs text-slate-500">{item.next_action}</p></div>{item.status !== 'done' && <button onClick={() => closeTask(item)} className="text-xs font-black text-emerald-700">Erledigt</button>}</div>)}</div></div>

          <div className="mt-6"><h3 className="font-black">Saubere Übergabe</h3><p className="mt-1 text-xs font-semibold text-slate-500">Mila bündelt Ausgangslage, Ziel, Verlauf und offene Punkte. Fachliche Entscheidungen bleiben beim Menschen.</p><textarea value={handoff} onChange={(event) => setHandoff(event.target.value)} placeholder="Optional eigene Übergabe-Zusammenfassung. Leer lassen = Mila baut sie aus dem Vorgang." className="mt-3 min-h-28 w-full rounded-xl border border-slate-200 p-3 text-sm" /><button onClick={prepareHandoff} className="mt-2 w-full rounded-xl bg-violet-600 py-3 text-sm font-black text-white">Übergabe vorbereiten</button>{current.handoff_ready && current.handoff_summary && <div className="mt-3 whitespace-pre-wrap rounded-xl bg-violet-50 p-3 text-sm font-semibold text-violet-950">{current.handoff_summary}</div>}<button onClick={finish} className="mt-3 w-full rounded-xl bg-emerald-600 py-3 text-sm font-black text-white">Vorgang vollständig erledigen</button></div>
        </section>
      )}
    </main>
  )
}
