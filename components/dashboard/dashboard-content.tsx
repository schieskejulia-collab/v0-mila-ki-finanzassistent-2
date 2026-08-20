'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  FolderOpen,
  Inbox,
  MessageCircleQuestion,
  Search,
  Upload,
} from 'lucide-react'
import { getActiveClientId, supabase } from '@/lib/supabase'

type CaseItem = {
  id: string
  client_id?: string | null
  subject: string
  status: string
  urgency?: string | null
  handoff_ready?: boolean | null
  created_at?: string | null
  completed_at?: string | null
}

type Update = {
  id: string
  case_id: string
  kind: string
  status: string
  content: string
  created_at?: string | null
}

type Task = {
  id: string
  case_id: string | null
  status: string
  title: string
  next_action?: string | null
  created_at?: string | null
}

type DocumentItem = {
  id: string
  client_id?: string | null
  case_id?: string | null
  title?: string | null
  partner?: string | null
  note?: string | null
  file_name?: string | null
  created_at?: string | null
}

function needsDocumentContext(doc: DocumentItem) {
  const text = `${doc.note || ''} ${doc.title || ''}`.toLowerCase()
  return (
    !doc.partner ||
    text.includes('unklar') ||
    text.includes('rückfrage') ||
    text.includes('rueckfrage') ||
    text.includes('prüfen') ||
    text.includes('pruefen')
  )
}

export function DashboardContent({ model }: { model: any }) {
  const [clientName, setClientName] = useState('Aktive Akte')
  const [cases, setCases] = useState<CaseItem[]>([])
  const [updates, setUpdates] = useState<Update[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(true)

  const greeting = model?.greeting || 'Guten Abend'
  const userName = model?.userName || 'Julia'

  useEffect(() => {
    void loadWorkspace()
  }, [])

  async function loadWorkspace() {
    setLoading(true)
    const clientId = getActiveClientId()

    const clientPromise = clientId
      ? supabase.from('clients').select('id,name').eq('id', clientId).maybeSingle()
      : Promise.resolve({ data: null, error: null } as any)

    let caseQuery: any = supabase
      .from('mila_intake_cases')
      .select('id,client_id,subject,status,urgency,handoff_ready,created_at,completed_at')
      .order('created_at', { ascending: false })
      .limit(100)

    let documentQuery: any = supabase
      .from('documents')
      .select('id,client_id,case_id,title,partner,note,file_name,created_at')
      .order('created_at', { ascending: false })
      .limit(200)

    if (clientId) {
      caseQuery = caseQuery.eq('client_id', clientId)
      documentQuery = documentQuery.eq('client_id', clientId)
    }

    const [clientResult, caseResult, taskResult, updateResult, documentResult] = await Promise.all([
      clientPromise,
      caseQuery,
      supabase.from('mila_coordination_tasks').select('id,case_id,status,title,next_action,created_at').order('created_at', { ascending: false }).limit(300),
      supabase.from('mila_case_updates').select('id,case_id,kind,status,content,created_at').order('created_at', { ascending: false }).limit(500),
      documentQuery,
    ])

    if (clientResult.data?.name) setClientName(String(clientResult.data.name))
    setCases((caseResult.data || []) as CaseItem[])
    setTasks((taskResult.data || []) as Task[])
    setUpdates((updateResult.data || []) as Update[])
    setDocuments((documentResult.data || []) as DocumentItem[])
    setLoading(false)
  }

  const caseIds = useMemo(() => new Set(cases.map((item) => item.id)), [cases])
  const openCases = cases.filter((item) => item.status !== 'done')
  const openCaseIds = useMemo(() => new Set(openCases.map((item) => item.id)), [openCases])
  const caseLinkedDocuments = useMemo(
    () => documents.filter((item) => item.case_id && caseIds.has(item.case_id)),
    [documents, caseIds],
  )
  const activeCaseDocuments = useMemo(
    () => caseLinkedDocuments.filter((item) => item.case_id && openCaseIds.has(item.case_id)),
    [caseLinkedDocuments, openCaseIds],
  )
  const unassignedDocuments = useMemo(() => documents.filter((item) => !item.case_id), [documents])
  const caseTasks = useMemo(
    () => tasks.filter((item) => item.case_id && openCaseIds.has(item.case_id)),
    [tasks, openCaseIds],
  )
  const caseUpdates = useMemo(
    () => updates.filter((item) => openCaseIds.has(item.case_id)),
    [updates, openCaseIds],
  )

  const openQuestions = caseUpdates.filter((item) => item.kind === 'question' && item.status !== 'done')
  const openTasks = caseTasks.filter((item) => item.status !== 'done')
  const readyCases = openCases.filter((item) => item.handoff_ready)
  const waitingCases = openCases.filter((item) => item.status === 'waiting' || item.status === 'needs_info')
  const documentIssues = activeCaseDocuments.filter(needsDocumentContext)
  const cleanDocuments = activeCaseDocuments.filter((item) => !needsDocumentContext(item))
  const completedCases = cases.filter((item) => item.status === 'done')

  const todayItems = [
    ...(documentIssues.length
      ? [{ kind: 'document', title: `${documentIssues.length} Unterlage${documentIssues.length === 1 ? '' : 'n'} brauchen Klärung`, text: 'Diese offenen Vorgänge benötigen noch Dokumentkontext.', count: documentIssues.length, href: '/dokumente' }]
      : []),
    ...(openQuestions.length
      ? [{ kind: 'question', title: `${openQuestions.length} Rückfrage${openQuestions.length === 1 ? '' : 'n'} offen`, text: 'Hier fehlen Informationen oder Bestätigungen.', count: openQuestions.length, href: '/jetzt' }]
      : []),
    ...(readyCases.length
      ? [{ kind: 'ready', title: `${readyCases.length} Vorgang${readyCases.length === 1 ? '' : 'e'} übergabebereit`, text: 'Organisatorisch vollständig und bereit für die fachliche Prüfung.', count: readyCases.length, href: '/jetzt' }]
      : []),
  ]

  const laterItems = [
    ...waitingCases.slice(0, 1).map(() => ({ title: `${waitingCases.length} Vorgang${waitingCases.length === 1 ? '' : 'e'} wartet auf Rückmeldung`, count: waitingCases.length, href: '/jetzt' })),
    ...(openTasks.length > 0 ? [{ title: `${openTasks.length} Arbeitsschritt${openTasks.length === 1 ? '' : 'e'} noch offen`, count: openTasks.length, href: '/jetzt' }] : []),
    ...(cleanDocuments.length > 0 ? [{ title: `${cleanDocuments.length} Unterlage${cleanDocuments.length === 1 ? '' : 'n'} im offenen Vorgang sauber abgelegt`, count: cleanDocuments.length, href: '/dokumente' }] : []),
    ...(unassignedDocuments.length > 0 ? [{ title: `${unassignedDocuments.length} ältere Unterlage${unassignedDocuments.length === 1 ? '' : 'n'} noch ohne Vorgang`, count: unassignedDocuments.length, href: '/dokumente' }] : []),
  ].slice(0, 3)

  const activities = [
    ...completedCases.slice(0, 1).map((item) => ({ text: `Vorgang abgeschlossen: ${item.subject}`, when: 'Erledigt' })),
    ...caseUpdates.filter((item) => item.status !== 'done' && item.kind !== 'question').slice(0, 1).map((item) => ({ text: item.kind === 'handoff' ? 'Übergabe wurde vorbereitet' : item.content, when: 'Vorgang' })),
    ...caseLinkedDocuments.slice(0, 2).map((doc) => ({ text: doc.title || doc.file_name || 'Unterlage erfasst', when: clientName })),
  ].slice(0, 3)

  return (
    <main className="min-h-screen bg-[#fbfbfd] pb-24 lg:pb-10">
      <div className="mx-auto w-full max-w-[1420px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        <header className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950 lg:text-[34px]">{greeting}, {userName} 👋</h1>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Heute zuerst: <span className="font-black text-rose-500">{documentIssues.length} Unterlagen</span> klären
              <span className="mx-2 text-slate-300">·</span>
              <span className="font-black text-amber-600">{openQuestions.length} Rückfrage{openQuestions.length === 1 ? '' : 'n'}</span> klären
            </p>
            <p className="mt-1 text-[11px] font-semibold text-violet-500">Aktive Akte: {clientName}</p>
          </div>
          <Link href="/suche" className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 shadow-sm lg:inline-flex">
            <Search className="h-4 w-4" /> Suche
          </Link>
        </header>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,.72fr)]">
          <div className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,.75fr)] xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,.8fr)]">
              <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,.04)]">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-500">★</span>
                  <h2 className="text-sm font-black text-slate-950">Heute zuerst</h2>
                </div>
                <div className="space-y-2">
                  {loading ? (
                    <div className="rounded-xl border border-slate-100 p-4 text-sm font-semibold text-slate-400">Mila lädt den Arbeitsstand …</div>
                  ) : todayItems.length === 0 ? (
                    <div className="rounded-xl border border-slate-100 p-4 text-sm font-semibold text-slate-500">Gerade braucht nichts deine Entscheidung.</div>
                  ) : (
                    todayItems.map((item, index) => <PriorityRow key={`${item.kind}-${index}`} item={item} />)
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,.04)]">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-600"><Clock3 className="h-4 w-4" /></span>
                  <h2 className="text-sm font-black text-slate-950">Kann noch warten</h2>
                </div>
                <div className="space-y-2">
                  {laterItems.length === 0 ? (
                    <div className="rounded-xl border border-slate-100 p-4 text-sm font-semibold text-slate-500">Keine späteren Punkte vorgemerkt.</div>
                  ) : laterItems.map((item, index) => (
                    <Link key={index} href={item.href} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-3 text-xs font-bold text-slate-700 transition hover:border-violet-200 hover:bg-violet-50/30">
                      <span>{item.title}</span>
                      <span className="flex items-center gap-2 text-violet-600"><span className="rounded-lg bg-violet-50 px-2 py-1 text-[10px] font-black">{item.count}</span><ArrowRight className="h-3.5 w-3.5" /></span>
                    </Link>
                  ))}
                </div>
              </section>
            </div>

            <Link href="/neue-buchungen" className="flex items-center justify-between gap-4 rounded-2xl border border-dashed border-violet-300 bg-white px-5 py-5 shadow-[0_8px_30px_rgba(15,23,42,.03)] transition hover:bg-violet-50/30">
              <div className="flex min-w-0 items-center gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600"><Upload className="h-6 w-6" /></span>
                <div>
                  <p className="text-base font-black text-slate-950">Unterlagen-Stapel hochladen</p>
                  <p className="mt-1 text-xs font-medium leading-5 text-slate-500">Mehrere Dateien auswählen oder hier ablegen – Mila verbindet sie mit einem Vorgang.</p>
                </div>
              </div>
              <span className="hidden rounded-xl border border-violet-200 px-4 py-2 text-xs font-black text-violet-700 sm:inline-flex">Unterlagen auswählen</span>
            </Link>

            <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatusCard label="Eingang" value={openCases.length} helper="offene Vorgänge" icon={<Inbox className="h-4 w-4" />} tone="blue" />
              <StatusCard label="In Klärung" value={openQuestions.length} helper="warten auf Antwort" icon={<Clock3 className="h-4 w-4" />} tone="amber" />
              <StatusCard label="Übergabebereit" value={readyCases.length} helper="bereit für Prüfung" icon={<CheckCircle2 className="h-4 w-4" />} tone="green" />
              <StatusCard label="Archiv / Mappe" value={caseLinkedDocuments.length} helper="zugeordnete Unterlagen" icon={<FolderOpen className="h-4 w-4" />} tone="violet" />
            </section>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,.04)] xl:self-start">
            <p className="text-sm font-black text-violet-700">Mila arbeitet im Hintergrund</p>
            <div className="mt-5 space-y-4 text-xs font-semibold text-slate-700">
              <BackgroundLine icon={<FolderOpen className="h-4 w-4" />} text="Dokumente vorsortieren & zuordnen" />
              <BackgroundLine icon={<MessageCircleQuestion className="h-4 w-4" />} text="Fehlenden Kontext als Rückfrage markieren" />
              <BackgroundLine icon={<FileText className="h-4 w-4" />} text="Zusammengehörige Unterlagen verknüpft halten" />
              <BackgroundLine icon={<CheckCircle2 className="h-4 w-4" />} text="Übergabestatus automatisch aktuell halten" />
            </div>
            <Link href="/jetzt" className="mt-6 inline-flex items-center gap-1 text-xs font-black text-violet-700">Mehr über Mila <ArrowRight className="h-3.5 w-3.5" /></Link>
          </section>
        </div>

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,.04)] lg:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-black text-slate-950">Letzte Aktivitäten</h2>
            <Link href="/jetzt" className="text-[11px] font-black text-violet-700">Alle anzeigen</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {activities.length === 0 ? (
              <div className="py-4 text-xs font-semibold text-slate-400">Noch keine Aktivität für diese Akte.</div>
            ) : activities.map((item, index) => (
              <div key={index} className="flex items-center justify-between gap-4 py-3 text-xs">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /></span>
                  <span className="truncate font-semibold text-slate-700">{item.text}</span>
                </div>
                <span className="shrink-0 text-[10px] font-semibold text-slate-400">{item.when}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}

function PriorityRow({ item }: { item: any }) {
  const tones: Record<string, string> = {
    document: 'bg-rose-50 text-rose-500',
    question: 'bg-amber-50 text-amber-600',
    ready: 'bg-emerald-50 text-emerald-600',
  }
  return (
    <Link href={item.href} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-3 transition hover:border-violet-200 hover:bg-violet-50/20">
      <div className="flex min-w-0 items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[item.kind] || tones.document}`}><FileText className="h-4 w-4" /></span>
        <div className="min-w-0">
          <p className="truncate text-xs font-black text-slate-900">{item.title}</p>
          <p className="mt-0.5 truncate text-[10px] font-medium text-slate-500">{item.text}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2"><span className="rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-black text-slate-700">{item.count}</span><ArrowRight className="h-4 w-4 text-slate-400" /></div>
    </Link>
  )
}

function StatusCard({ label, value, helper, icon, tone }: { label: string; value: number; helper: string; icon: React.ReactNode; tone: string }) {
  const tones: Record<string, string> = {
    blue: 'bg-sky-50 text-sky-600',
    amber: 'bg-amber-50 text-amber-600',
    green: 'bg-emerald-50 text-emerald-600',
    violet: 'bg-violet-50 text-violet-600',
  }
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,.03)]">
      <div className="flex items-center gap-2"><span className={`flex h-8 w-8 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</span><span className="text-[10px] font-bold text-slate-500">{label}</span></div>
      <p className="mt-3 text-2xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-[10px] font-medium text-slate-400">{helper}</p>
    </div>
  )
}

function BackgroundLine({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="flex items-center gap-3"><span className="text-violet-600">{icon}</span><span>{text}</span></div>
}
