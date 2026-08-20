'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Archive, CheckCircle2, Download, FileCheck2, Home, Loader2, RefreshCw } from 'lucide-react'
import { getActiveClientId, supabase } from '@/lib/supabase'

type CaseItem = {
  id: string
  subject: string
  summary: string
  status: string
  client_id: string | null
  handoff_ready: boolean
  completed_at: string | null
}

type HandoffItem = {
  id: string
  case_id: string
  version: number
  summary: string | null
  snapshot: any
  created_at: string
}

function formatTime(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function safeFilePart(value: string) {
  return value
    .trim()
    .replace(/[^\p{L}\p{N}\-_ ]+/gu, '')
    .replace(/\s+/g, '-')
    .slice(0, 60) || 'vorgang'
}

export default function UebergabenPage() {
  const [cases, setCases] = useState<CaseItem[]>([])
  const [handoffs, setHandoffs] = useState<HandoffItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setLoading(true)
    setError('')

    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) {
      setError('Bitte zuerst anmelden.')
      setLoading(false)
      return
    }

    const clientId = getActiveClientId()
    if (!clientId) {
      setError('Bitte zuerst eine Akte auswählen.')
      setLoading(false)
      return
    }

    const caseResult = await supabase
      .from('mila_intake_cases')
      .select('id,subject,summary,status,client_id,handoff_ready,completed_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    if (caseResult.error) {
      setError('Mila konnte die Vorgänge dieser Akte nicht laden.')
      setLoading(false)
      return
    }

    const nextCases = (caseResult.data || []) as CaseItem[]
    setCases(nextCases)

    if (nextCases.length === 0) {
      setHandoffs([])
      setLoading(false)
      return
    }

    const handoffResult = await supabase
      .from('mila_case_handoffs')
      .select('id,case_id,version,summary,snapshot,created_at')
      .in('case_id', nextCases.map((item) => item.id))
      .order('created_at', { ascending: false })

    if (handoffResult.error) {
      setError('Mila konnte das Übergabearchiv nicht laden.')
      setLoading(false)
      return
    }

    setHandoffs((handoffResult.data || []) as HandoffItem[])
    setLoading(false)
  }

  const caseMap = useMemo(() => new Map(cases.map((item) => [item.id, item])), [cases])
  const archivedCaseIds = useMemo(() => new Set(handoffs.map((item) => item.case_id)), [handoffs])
  const completedCount = useMemo(
    () => cases.filter((item) => item.status === 'done' && archivedCaseIds.has(item.id)).length,
    [cases, archivedCaseIds],
  )

  function exportBridgePackage(handoff: HandoffItem) {
    const linkedCase = caseMap.get(handoff.case_id)
    const payload = {
      format: 'mila-bridge-handoff',
      format_version: 1,
      handoff_id: handoff.id,
      handoff_version: handoff.version,
      captured_at: handoff.created_at,
      case_id: handoff.case_id,
      client_id: linkedCase?.client_id || handoff.snapshot?.case?.client_id || null,
      snapshot: handoff.snapshot,
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `mila-bridge_${safeFilePart(linkedCase?.subject || 'vorgang')}_v${handoff.version}.json`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="min-h-screen bg-[#faf9fc] px-4 pb-32 pt-5 text-slate-950 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
      <div className="mx-auto max-w-[1100px]">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-[10px] font-black uppercase tracking-[.16em] text-violet-700">
              <Archive className="h-3.5 w-3.5" /> Übergabearchiv
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight lg:text-4xl">Was wurde wirklich übergeben?</h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
              Jede vorbereitete Übergabe bleibt als eigener Stand erhalten. Abschluss und spätere Versionen verändern diesen festgehaltenen Zustand nicht.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-3 text-xs font-black"
          >
            <RefreshCw className="h-4 w-4" /> Aktualisieren
          </button>
        </header>

        {!loading && !error && (
          <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Metric label="Übergabestände" value={handoffs.length} />
            <Metric label="Vorgänge im Archiv" value={archivedCaseIds.size} />
            <Metric label="Abgeschlossen" value={completedCount} />
          </section>
        )}

        {error && <p className="mt-5 rounded-xl bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</p>}

        {loading ? (
          <div className="mt-8 flex items-center justify-center gap-2 rounded-2xl border bg-white p-12 text-sm font-bold text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-violet-600" /> Übergabestände werden geladen …
          </div>
        ) : handoffs.length === 0 ? (
          <section className="mt-8 rounded-2xl border border-dashed bg-white p-10 text-center">
            <FileCheck2 className="mx-auto h-8 w-8 text-violet-500" />
            <h2 className="mt-3 text-lg font-black">Noch keine versionierte Übergabe</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm font-semibold leading-6 text-slate-500">
              Sobald ein neuer Vorgang für die fachliche Prüfung vorbereitet wird, legt Mila hier automatisch den vollständigen Übergabestand ab.
            </p>
            <Link href="/jetzt" className="mt-5 inline-flex rounded-xl bg-violet-600 px-4 py-3 text-xs font-black text-white">
              Zu den Vorgängen
            </Link>
          </section>
        ) : (
          <div className="mt-8 space-y-4">
            {handoffs.map((handoff) => {
              const linkedCase = caseMap.get(handoff.case_id)
              const documents = Array.isArray(handoff.snapshot?.documents) ? handoff.snapshot.documents : []
              const updates = Array.isArray(handoff.snapshot?.updates) ? handoff.snapshot.updates : []
              const tasks = Array.isArray(handoff.snapshot?.tasks) ? handoff.snapshot.tasks : []
              const events = Array.isArray(handoff.snapshot?.events) ? handoff.snapshot.events : []
              const completed = linkedCase?.status === 'done'

              return (
                <article key={handoff.id} className="rounded-2xl border bg-white p-4 shadow-sm lg:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[10px] font-black uppercase tracking-[.16em] text-violet-600">
                          Übergabestand v{handoff.version}
                        </p>
                        <span className={completed ? 'rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-emerald-700' : 'rounded-full bg-violet-50 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-violet-700'}>
                          {completed ? 'Abgeschlossen' : 'Festgehalten'}
                        </span>
                      </div>
                      <h2 className="mt-1 text-xl font-black">{linkedCase?.subject || handoff.snapshot?.case?.subject || 'Vorgang'}</h2>
                      <p className="mt-1 text-xs font-semibold text-slate-400">Übergabe festgehalten am {formatTime(handoff.created_at)}</p>
                      {completed && linkedCase?.completed_at && (
                        <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-black text-emerald-700">
                          <CheckCircle2 className="h-4 w-4" /> Vorgang abgeschlossen am {formatTime(linkedCase.completed_at)}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => exportBridgePackage(handoff)}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-xs font-black text-white"
                    >
                      <Download className="h-4 w-4" /> Bridge-Paket exportieren
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Metric label="Originale" value={documents.length} />
                    <Metric label="Verlaufspunkte" value={updates.length} />
                    <Metric label="Arbeitsschritte" value={tasks.length} />
                    <Metric label="Historie" value={events.length} />
                  </div>

                  {handoff.summary && (
                    <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-xs font-semibold leading-5 text-slate-600">
                      {handoff.summary}
                    </pre>
                  )}

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link href={`/jetzt?case=${handoff.case_id}`} className="text-xs font-black text-violet-700">
                      Vorgang ansehen →
                    </Link>
                    <Link href={`/dokumente?case=${handoff.case_id}`} className="text-xs font-black text-violet-700">
                      Originale in Mappe →
                    </Link>
                  </div>
                </article>
              )
            })}

            <Link href="/" className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-black text-slate-700">
              <Home className="h-4 w-4" /> Zurück zum Arbeitsstand
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xl font-black">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-[.12em] text-slate-400">{label}</p>
    </div>
  )
}
