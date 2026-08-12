'use client'

import { useEffect, useMemo, useState } from 'react'
import { useFinance } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import { readAuditEvents, type MilaAuditEvent } from '@/lib/audit-trail'

const ACTIVE_CLIENT_KEY = 'mila-active-client-v1'
const TAKEOVER_KEY = 'mila-client-takeovers-v1'

type TimelineItem = {
  id: string
  title: string
  detail?: string
  createdAt: string
  kind: 'document' | 'question' | 'takeover' | 'handoff'
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })
}

export function AuditTrailSection() {
  const finance = useFinance()
  const [activeClientId, setActiveClientId] = useState('')
  const [takeoverEvent, setTakeoverEvent] = useState<TimelineItem | null>(null)
  const [localEvents, setLocalEvents] = useState<MilaAuditEvent[]>([])
  const [questionEvents, setQuestionEvents] = useState<TimelineItem[]>([])

  useEffect(() => {
    let cancelled = false

    async function load() {
      const clientId = window.localStorage.getItem(ACTIVE_CLIENT_KEY) || ''
      if (cancelled) return
      setActiveClientId(clientId)
      if (!clientId) return

      try {
        const raw = window.localStorage.getItem(TAKEOVER_KEY)
        const parsed = raw ? JSON.parse(raw) : {}
        const takeover = parsed?.[clientId]
        if (takeover?.recordedAt) {
          setTakeoverEvent({
            id: `takeover-${clientId}`,
            title: 'Übernahmebestand dokumentiert',
            detail: takeover.period ? `Startzeitraum ${takeover.period}` : undefined,
            createdAt: takeover.recordedAt,
            kind: 'takeover',
          })
        }
      } catch {
        setTakeoverEvent(null)
      }

      setLocalEvents(readAuditEvents(clientId))

      const { data } = await supabase
        .from('client_questions')
        .select('id,question,status,created_at,answered_at,completed_at')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      if (cancelled || !Array.isArray(data)) return

      const events: TimelineItem[] = []
      for (const row of data) {
        if (row.created_at) {
          events.push({
            id: `${row.id}-created`,
            title: 'Rückfrage erstellt',
            detail: row.question || undefined,
            createdAt: row.created_at,
            kind: 'question',
          })
        }
        if (row.answered_at) {
          events.push({
            id: `${row.id}-answered`,
            title: 'Rückfrage beantwortet',
            detail: row.question || undefined,
            createdAt: row.answered_at,
            kind: 'question',
          })
        }
        if (row.completed_at) {
          events.push({
            id: `${row.id}-completed`,
            title: 'Rückfrage abgeschlossen',
            detail: row.question || undefined,
            createdAt: row.completed_at,
            kind: 'question',
          })
        }
      }
      setQuestionEvents(events)
    }

    void load()

    function refreshAudit(event: Event) {
      const custom = event as CustomEvent<{ clientId?: string }>
      if (!custom.detail?.clientId || custom.detail.clientId === activeClientId) {
        const clientId = window.localStorage.getItem(ACTIVE_CLIENT_KEY) || ''
        if (clientId) setLocalEvents(readAuditEvents(clientId))
      }
    }

    window.addEventListener('mila-audit-updated', refreshAudit)
    return () => {
      cancelled = true
      window.removeEventListener('mila-audit-updated', refreshAudit)
    }
  }, [activeClientId])

  const timeline = useMemo(() => {
    const documentEvents: TimelineItem[] = (finance.documents || [])
      .filter((doc: any) => !activeClientId || !doc?.clientId || doc.clientId === activeClientId)
      .map((doc: any, index: number) => ({
        id: `doc-${doc?.id || index}`,
        title: 'Dokument eingegangen',
        detail: doc?.fileName || doc?.file_name || doc?.title || 'Dokument',
        createdAt: doc?.createdAt || new Date(0).toISOString(),
        kind: 'document' as const,
      }))

    const manualEvents: TimelineItem[] = localEvents.map((event) => ({
      id: event.id,
      title: event.title,
      detail: event.detail,
      createdAt: event.createdAt,
      kind: event.type === 'handoff_created' ? 'handoff' : 'handoff',
    }))

    return [
      ...documentEvents,
      ...questionEvents,
      ...manualEvents,
      ...(takeoverEvent ? [takeoverEvent] : []),
    ]
      .filter((item) => item.createdAt && item.createdAt !== new Date(0).toISOString())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 12)
  }, [finance.documents, activeClientId, localEvents, questionEvents, takeoverEvent])

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Nachvollziehbarkeit</p>
          <h2 className="mt-1 text-xl font-black">Audit-Trail</h2>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">{timeline.length} Einträge</span>
      </div>

      <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600">
        Mila hält sichtbare Zeitpunkte aus Übernahme, Dokumenteingang, Rückfragen und Übergabe fest. Originaldateien werden dadurch nicht verändert.
      </p>

      {timeline.length === 0 ? (
        <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">Noch keine nachvollziehbaren Ereignisse für diesen Mandanten.</div>
      ) : (
        <div className="mt-4 space-y-3">
          {timeline.map((item) => (
            <article key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-900">{item.title}</p>
                  {item.detail && <p className="mt-1 truncate text-xs font-semibold text-slate-500">{item.detail}</p>}
                </div>
                <span className="shrink-0 text-[10px] font-black text-slate-400">{formatDate(item.createdAt)}</span>
              </div>
            </article>
          ))}
        </div>
      )}

      <p className="mt-4 text-[11px] font-semibold leading-relaxed text-slate-400">
        Dieser Verlauf dokumentiert nur tatsächlich vorhandene Zeitstempel. Wo Mila keinen Änderungszeitpunkt gespeichert hat, wird keiner erfunden.
      </p>
    </section>
  )
}
