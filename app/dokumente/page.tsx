'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  FolderOpen,
  Loader2,
  MessageCircle,
  Search,
  Upload,
} from 'lucide-react'
import { getActiveClientId, supabase } from '@/lib/supabase'
import { buildDocumentWorkName, checkDocumentQuality } from '@/lib/document-workflow'

type CaseItem = {
  id: string
  client_id: string | null
  subject: string
  summary: string
  status: string
  handoff_ready: boolean
  created_at: string
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

type DocumentItem = {
  id: string
  client_id?: string | null
  case_id?: string | null
  title?: string | null
  partner?: string | null
  note?: string | null
  type?: string | null
  file_name?: string | null
  file_url?: string | null
  status?: string | null
  document_date?: string | null
  created_at?: string | null
}

type View = 'all' | 'issues' | 'ready'

function itemDate(item: DocumentItem) {
  return String(item.document_date || item.created_at || '')
}

function monthKey(item: DocumentItem) {
  const raw = itemDate(item)
  const date = raw ? new Date(raw) : new Date()
  return Number.isNaN(date.getTime())
    ? 'Ohne Datum'
    : new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(date)
}

export default function DokumentePage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [clientId, setClientId] = useState('')
  const [clientName, setClientName] = useState('')
  const [cases, setCases] = useState<CaseItem[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [updates, setUpdates] = useState<Update[]>([])
  const [caseId, setCaseId] = useState('')
  const [view, setView] = useState<View>('all')
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [openingId, setOpeningId] = useState('')

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('case') || ''
    const id = getActiveClientId()
    setClientId(id)
    void load(id, requested)
  }, [])

  async function load(id = clientId, requested = '') {
    setError('')
    if (!id) return

    const [clientResult, caseResult, taskResult, updateResult, documentResult] = await Promise.all([
      supabase.from('clients').select('id,name').eq('id', id).maybeSingle(),
      supabase
        .from('mila_intake_cases')
        .select('id,client_id,subject,summary,status,handoff_ready,created_at')
        .eq('client_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('mila_coordination_tasks')
        .select('id,case_id,title,status,next_action')
        .order('created_at', { ascending: false }),
      supabase
        .from('mila_case_updates')
        .select('id,case_id,kind,content,status')
        .order('created_at', { ascending: true }),
      supabase
        .from('documents')
        .select('id,client_id,case_id,title,partner,note,type,file_name,file_url,status,document_date,created_at')
        .eq('client_id', id)
        .order('created_at', { ascending: false }),
    ])

    if (clientResult.data?.name) setClientName(String(clientResult.data.name))
    if (caseResult.error || taskResult.error || updateResult.error || documentResult.error) {
      setError('Mila konnte die Arbeitsakte nicht vollständig laden.')
    }

    const nextCases = (caseResult.data || []) as CaseItem[]
    setCases(nextCases)
    setTasks((taskResult.data || []) as Task[])
    setUpdates((updateResult.data || []) as Update[])
    setDocuments((documentResult.data || []) as DocumentItem[])

    setCaseId((current) => {
      if (requested && nextCases.some((item) => item.id === requested)) return requested
      if (current && nextCases.some((item) => item.id === current)) return current
      return nextCases.find((item) => item.status !== 'done')?.id || nextCases[0]?.id || ''
    })
  }

  const current = cases.find((item) => item.id === caseId) || null
  const caseDocuments = useMemo(
    () => (caseId ? documents.filter((item) => String(item.case_id || '') === caseId) : []),
    [documents, caseId],
  )
  const unassigned = useMemo(() => documents.filter((item) => !item.case_id), [documents])
  const openTasks = tasks.filter((item) => item.case_id === caseId && item.status !== 'done')
  const openQuestions = updates.filter(
    (item) => item.case_id === caseId && item.kind === 'question' && item.status !== 'done',
  )
  const issues = useMemo(
    () => caseDocuments.filter((item) => !checkDocumentQuality(item as any).ok),
    [caseDocuments],
  )
  const issueIds = useMemo(() => new Set(issues.map((item) => String(item.id))), [issues])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return [...caseDocuments]
      .filter((item) => {
        const bad = issueIds.has(String(item.id))
        const text = `${item.title || ''} ${item.partner || ''} ${item.note || ''} ${item.type || ''} ${item.file_name || ''}`.toLowerCase()
        if (needle && !text.includes(needle)) return false
        if (view === 'issues') return bad
        if (view === 'ready') return !bad
        return true
      })
      .sort((a, b) => new Date(itemDate(b) || 0).getTime() - new Date(itemDate(a) || 0).getTime())
  }, [caseDocuments, issueIds, query, view])

  const groups = useMemo(() => {
    const grouped = new Map<string, DocumentItem[]>()
    for (const item of filtered) {
      const key = monthKey(item)
      grouped.set(key, [...(grouped.get(key) || []), item])
    }
    return Array.from(grouped.entries())
  }, [filtered])

  const blockers = [
    openQuestions.length ? `${openQuestions.length} Rückfrage${openQuestions.length === 1 ? '' : 'n'}` : '',
    openTasks.length ? `${openTasks.length} Arbeitsschritt${openTasks.length === 1 ? '' : 'e'}` : '',
    issues.length ? `${issues.length} Unterlage${issues.length === 1 ? '' : 'n'} mit Klärbedarf` : '',
    caseDocuments.length === 0 ? 'keine Unterlage' : '',
  ].filter(Boolean)

  const canHandoff = Boolean(current) && blockers.length === 0

  async function openOriginal(document: DocumentItem) {
    setOpeningId(document.id)
    setError('')
    try {
      if (!document.file_url) throw new Error('Für dieses Original ist noch kein Speicherpfad hinterlegt.')
      const { data, error: signError } = await supabase.storage
        .from('mila-dokumente')
        .createSignedUrl(document.file_url, 60)
      if (signError || !data?.signedUrl) throw new Error('Original konnte nicht geöffnet werden.')
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } catch (err: any) {
      setError(err?.message || 'Original konnte nicht geöffnet werden.')
    } finally {
      setOpeningId('')
    }
  }

  async function handoff() {
    if (!current) {
      setError('Bitte zuerst einen Vorgang auswählen.')
      return
    }
    if (!canHandoff) {
      setError(`Noch nicht übergabebereit: ${blockers.join(' · ')}.`)
      return
    }

    setSaving(true)
    setError('')
    const summary = `Akte: ${clientName}\nVorgang: ${current.subject}\nUnterlagen: ${caseDocuments.length}\nOrganisatorisch vollständig: ja`
    const { error: updateError } = await supabase
      .from('mila_intake_cases')
      .update({ handoff_ready: true, handoff_summary: summary, status: 'human_review' })
      .eq('id', current.id)

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }

    const { data: auth } = await supabase.auth.getUser()
    if (auth.user) {
      await supabase.from('mila_case_updates').insert({
        user_id: auth.user.id,
        case_id: current.id,
        kind: 'handoff',
        content: summary,
        status: 'open',
      })
    }

    setNotice('Dieser Vorgang ist organisatorisch vollständig und für die fachliche Prüfung vorbereitet.')
    setSaving(false)
    await load(clientId, current.id)
  }

  if (!clientId) {
    return (
      <main className="min-h-screen bg-[#f8f7fb] p-5 pb-28">
        <div className="mx-auto max-w-2xl rounded-3xl border bg-white p-6">
          <h1 className="text-2xl font-black">Bitte zuerst eine Akte wählen.</h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            Mila zeigt Unterlagen nur in eindeutigem Mandantenkontext.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f8f7fb] px-4 pb-32 pt-5 text-slate-950 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
      <div className="mx-auto max-w-[1220px]">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[.18em] text-violet-600">Arbeitsakte</p>
            <h1 className="mt-1 text-3xl font-black lg:text-4xl">{clientName || 'Aktive Akte'}</h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
              Jeder Sachverhalt bleibt mit Originalen, Rückfragen und Arbeitsschritten verbunden.
            </p>
          </div>
          <Link
            href="/neue-buchungen"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white active:scale-[.99]"
          >
            <Upload className="h-4 w-4" /> Unterlagen hinzufügen
          </Link>
        </header>

        {notice && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{notice}</p>}
        {error && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>}

        {unassigned.length > 0 && (
          <section className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-black text-amber-900">
                {unassigned.length} ältere Unterlage{unassigned.length === 1 ? ' ist' : 'n sind'} noch keinem Vorgang zugeordnet.
              </p>
              <p className="mt-1 text-xs font-semibold leading-5 text-amber-800">
                Mila ordnet sie nicht stillschweigend zu. Der ursprüngliche Bestand bleibt sichtbar, bis die Verbindung eindeutig ist.
              </p>
            </div>
          </section>
        )}

        <div className="mt-6 grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <section className="rounded-2xl border bg-white p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">Vorgang in dieser Akte</p>
              <select
                value={caseId}
                onChange={(event) => setCaseId(event.target.value)}
                className="mt-3 w-full rounded-xl border p-3 text-sm font-bold"
              >
                <option value="">Vorgang auswählen</option>
                {cases.map((item) => (
                  <option key={item.id} value={item.id}>{item.subject}</option>
                ))}
              </select>
              {current ? (
                <div className="mt-3 rounded-xl bg-violet-50 p-3">
                  <p className="text-xs font-black text-violet-900">{current.subject}</p>
                  <p className="mt-1 text-[11px] font-semibold leading-5 text-violet-700">
                    {current.summary || 'Keine Zusammenfassung hinterlegt.'}
                  </p>
                  <Link href={`/jetzt?case=${current.id}`} className="mt-3 inline-flex text-xs font-black text-violet-700">
                    Vorgang öffnen →
                  </Link>
                </div>
              ) : (
                <p className="mt-3 text-xs font-semibold text-slate-500">Noch kein Vorgang in dieser Akte.</p>
              )}
            </section>

            <section className="rounded-2xl border bg-white p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">Vollständigkeit dieses Vorgangs</p>
              <div className="mt-3 space-y-3">
                <State ok={openQuestions.length === 0} icon={<MessageCircle className="h-4 w-4" />} text={openQuestions.length ? `${openQuestions.length} Rückfrage(n) offen` : 'Keine Rückfrage offen'} />
                <State ok={openTasks.length === 0} icon={<Clock3 className="h-4 w-4" />} text={openTasks.length ? `${openTasks.length} Arbeitsschritt(e) offen` : 'Kein Arbeitsschritt offen'} />
                <State ok={issues.length === 0 && caseDocuments.length > 0} icon={<FileText className="h-4 w-4" />} text={caseDocuments.length === 0 ? 'Noch keine Unterlagen in diesem Vorgang' : issues.length ? `${issues.length} Unterlage(n) brauchen Klärung` : 'Unterlagen organisatorisch vollständig'} />
              </div>
              <button
                type="button"
                onClick={() => void handoff()}
                disabled={!current || saving}
                className={`mt-4 w-full rounded-xl py-3 text-sm font-black active:scale-[.99] ${canHandoff ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {saving ? 'Mila bereitet vor…' : canHandoff ? 'Für fachliche Prüfung vorbereiten' : blockers.length ? `Noch offen: ${blockers[0]}` : 'Für fachliche Prüfung vorbereiten'}
              </button>
              {!canHandoff && current && (
                <p className="mt-2 text-[10px] font-semibold leading-4 text-slate-500">
                  Antippen zeigt dir alle Blocker – der Button ist nicht mehr stumm.
                </p>
              )}
            </section>
          </aside>

          <section className="space-y-4">
            <section className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex gap-2">
                  <Tab active={view === 'all'} onClick={() => setView('all')} label={`Alle ${caseDocuments.length}`} />
                  <Tab active={view === 'issues'} onClick={() => setView('issues')} label={`Klärung ${issues.length}`} />
                  <Tab active={view === 'ready'} onClick={() => setView('ready')} label={`Bereit ${Math.max(0, caseDocuments.length - issues.length)}`} />
                </div>
                <label className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Unterlagen dieses Vorgangs durchsuchen…"
                    className="w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm outline-none"
                  />
                </label>
              </div>
            </section>

            {openQuestions[0] && current && (
              <Link href={`/jetzt?case=${current.id}`} className="block rounded-2xl border border-amber-100 bg-amber-50 p-4 active:scale-[.995]">
                <p className="text-[10px] font-black uppercase text-amber-600">Mila braucht noch Kontext</p>
                <div className="mt-1 flex items-start justify-between gap-3">
                  <h2 className="text-lg font-black">{openQuestions[0].content}</h2>
                  <span className="shrink-0 text-xs font-black text-violet-700">Antworten →</span>
                </div>
              </Link>
            )}

            {openTasks[0] && current && (
              <Link href={`/jetzt?case=${current.id}`} className="block rounded-2xl border border-violet-100 bg-white p-4 active:scale-[.995]">
                <p className="text-[10px] font-black uppercase text-violet-600">Nächster Schritt</p>
                <h2 className="mt-1 text-lg font-black">{openTasks[0].next_action || openTasks[0].title}</h2>
                <p className="mt-2 text-xs font-black text-violet-700">Im Vorgang bearbeiten →</p>
              </Link>
            )}

            <section className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.16em] text-violet-600">Originale im aktiven Vorgang</p>
                  <h2 className="mt-1 text-lg font-black">{filtered.length} Unterlage{filtered.length === 1 ? '' : 'n'}</h2>
                </div>
                <FolderOpen className="h-5 w-5 text-violet-500" />
              </div>

              {!current ? (
                <p className="mt-5 rounded-xl border border-dashed p-6 text-center text-sm font-semibold text-slate-500">Wähle zuerst einen Vorgang.</p>
              ) : groups.length === 0 ? (
                <p className="mt-5 rounded-xl border border-dashed p-6 text-center text-sm font-semibold text-slate-500">In diesem Vorgang liegen noch keine Unterlagen.</p>
              ) : (
                <div className="mt-4 space-y-5">
                  {groups.map(([month, docs]) => (
                    <div key={month}>
                      <div className="mb-2 flex justify-between">
                        <h3 className="text-sm font-black">{month}</h3>
                        <span className="text-[10px] font-bold text-slate-400">{docs.length} Unterlagen</span>
                      </div>
                      <div className="space-y-2">
                        {docs.map((document) => {
                          const bad = issueIds.has(String(document.id))
                          return (
                            <button
                              key={document.id}
                              type="button"
                              onClick={() => void openOriginal(document)}
                              className="flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition hover:border-violet-200 hover:bg-violet-50/30 active:scale-[.995]"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-black">{buildDocumentWorkName(document as any, document.type || 'Unterlage')}</p>
                                <p className="truncate text-[11px] font-semibold text-slate-400">Original · {document.file_name || document.type || 'Datei'}</p>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <span className={`rounded-lg px-2 py-1 text-[10px] font-black ${bad ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{bad ? 'Klärung' : 'Erfasst'}</span>
                                {openingId === document.id ? <Loader2 className="h-4 w-4 animate-spin text-violet-600" /> : <ExternalLink className="h-4 w-4 text-slate-400" />}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </section>
        </div>
      </div>
    </main>
  )
}

function Tab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-3 py-2 text-xs font-black active:scale-[.98] ${active ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-600'}`}
    >
      {label}
    </button>
  )
}

function State({ ok, icon, text }: { ok: boolean; icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
      <span className={ok ? 'text-emerald-600' : 'text-amber-600'}>
        {ok ? <CheckCircle2 className="h-4 w-4" /> : icon}
      </span>
      {text}
    </div>
  )
}
