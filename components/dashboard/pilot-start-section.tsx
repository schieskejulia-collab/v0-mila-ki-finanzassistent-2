'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useFinance } from '@/lib/store'

const ACTIVE_CLIENT_KEY = 'mila-active-client-v1'
const TAKEOVER_KEY = 'mila-client-takeovers-v1'

function getStatusLabel(handoff: any) {
  const documentCount = Number(handoff?.documentCount || 0)
  const missingReceiptCount = Number(handoff?.missingReceiptCount || 0)
  const openQuestionCount = Number(handoff?.openQuestionCount || 0)
  const openObligationCount = Number(handoff?.openObligationCount || 0)
  const openCount = missingReceiptCount + openQuestionCount + openObligationCount

  if (documentCount === 0 && openCount === 0) {
    return { label: 'Noch nicht gestartet', text: 'Erfasse den ersten Beleg oder öffne die Mandantenmappe.', tone: 'bg-slate-100 text-slate-600' }
  }
  if (openCount === 0) {
    return { label: 'Bereit zur Übergabe', text: 'Aktuell sind keine organisatorischen Punkte offen.', tone: 'bg-emerald-100 text-emerald-700' }
  }
  return { label: 'In Bearbeitung', text: `${openCount} offene Punkte brauchen noch Aufmerksamkeit.`, tone: 'bg-amber-100 text-amber-700' }
}

function dayOnly(value?: string) {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10)
  return parsed.toISOString().slice(0, 10)
}

function handoffLabel(value?: string) {
  if (value === 'monthly') return 'monatlich'
  if (value === 'quarterly') return 'quartalsweise'
  if (value === 'halfyear') return 'halbjährlich'
  if (value === 'yearly') return 'jährlich'
  if (value === 'individual') return 'individuell'
  return 'laut Kanzlei'
}

function completenessLabel(value?: string) {
  if (value === 'yes') return 'Bestand als vollständig angegeben'
  if (value === 'no') return 'Bestand noch unvollständig'
  return 'Bestand noch zu prüfen'
}

const actions = [
  { href: '/neue-buchungen', title: 'Beleg erfassen', text: 'Foto, PDF oder Rechnung einlesen.', icon: '＋' },
  { href: '/dokumente', title: 'Mappe öffnen', text: 'Unterlagen und fehlende Belege prüfen.', icon: '📂' },
  { href: '/verpflichtungen', title: 'Offene Punkte', text: 'Fristen und offene Vorgänge ansehen.', icon: '◷' },
]

export function PilotStartSection({ model }: { model: any }) {
  const handoff = model?.kanzleiHandoff || {}
  const status = getStatusLabel(handoff)
  const finance = useFinance()
  const today = new Date().toISOString().slice(0, 10)
  const [takeover, setTakeover] = useState<any>(null)
  const [hasActiveClient, setHasActiveClient] = useState(false)

  useEffect(() => {
    try {
      const activeClientId = window.localStorage.getItem(ACTIVE_CLIENT_KEY) || ''
      setHasActiveClient(Boolean(activeClientId))
      if (!activeClientId) return
      const raw = window.localStorage.getItem(TAKEOVER_KEY)
      const parsed = raw ? JSON.parse(raw) : {}
      setTakeover(parsed?.[activeClientId] || null)
    } catch {
      setTakeover(null)
    }
  }, [])

  const missingReceipts = (finance.expenses || []).filter((item: any) => item?.hasReceipt === false || item?.has_receipt === false)
  const openQuestions = (finance.documents || []).filter((doc: any) => {
    const docStatus = String(doc.status || '').toLowerCase()
    const note = String(doc.note || '').toLowerCase()
    return docStatus === 'neu' || note.includes('unklar') || note.includes('rückfrage') || note.includes('rueckfrage') || note.includes('prüfen') || note.includes('pruefen')
  })
  const dueItems = (finance.obligations || []).filter((item: any) => {
    const itemStatus = String(item.status || '').toLowerCase()
    if (['erledigt', 'bezahlt', 'archiviert'].includes(itemStatus)) return false
    const due = dayOnly(item.dueDate || item.due_date)
    return Boolean(due && due <= today)
  })
  const overdueItems = dueItems.filter((item: any) => dayOnly(item.dueDate || item.due_date) < today)
  const todayCount = missingReceipts.length + openQuestions.length + dueItems.length

  return (
    <section className="space-y-4">
      <header className="overflow-hidden rounded-[2rem] border border-violet-100 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-violet-700 via-violet-600 to-fuchsia-500 p-5 text-white">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">Mila Arbeitsplatz</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight">Vorbereiten. Klären. Übergeben.</h1>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-white/85">Organisatorische Vorbereitung für den aktuell ausgewählten Mandanten.</p>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Arbeitsstand</p><p className="mt-1 text-lg font-black">{status.label}</p></div>
            <span className={`rounded-full px-3 py-2 text-xs font-black ${status.tone}`}>{Number(handoff?.documentCount || 0)} Dokumente</span>
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-600">{status.text}</p>
        </div>
      </header>

      {hasActiveClient && (
        <Link href="/mandanten" className={`block rounded-3xl border p-4 shadow-sm active:scale-[0.99] ${takeover ? 'border-emerald-100 bg-emerald-50' : 'border-amber-100 bg-amber-50'}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${takeover ? 'text-emerald-700' : 'text-amber-700'}`}>Mandanten-Onboarding</p>
              <h2 className="mt-1 text-lg font-black">{takeover ? 'Übernahme dokumentiert' : 'Übernahme noch festlegen'}</h2>
            </div>
            <span className="shrink-0 text-lg font-black text-violet-700">›</span>
          </div>
          {takeover ? (
            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
              Start {String(takeover.period || '').replace('-', '/')} · {completenessLabel(takeover.completeness)} · Übergabe {handoffLabel(takeover.handoffRhythm)}
            </p>
          ) : (
            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">Bearbeitungsbeginn, übernommenen Bestand und Übergaberhythmus einmal sauber erfassen.</p>
          )}
        </Link>
      )}

      <section className={`rounded-3xl border p-5 shadow-sm ${todayCount > 0 ? 'border-amber-100 bg-amber-50' : 'border-emerald-100 bg-emerald-50'}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={`text-xs font-black uppercase tracking-[0.18em] ${todayCount > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>Heute</p>
            <h2 className="mt-1 text-xl font-black">{todayCount > 0 ? `${todayCount} Dinge stehen an` : 'Für heute nichts Dringendes'}</h2>
          </div>
          <span className="rounded-full bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm">{new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</span>
        </div>

        {todayCount > 0 ? (
          <div className="mt-4 grid grid-cols-3 gap-2">
            <TodayMetric label="Ohne Beleg" value={missingReceipts.length} />
            <TodayMetric label="Rückfragen" value={openQuestions.length} />
            <TodayMetric label={overdueItems.length > 0 ? 'Überfällig' : 'Fällig'} value={dueItems.length} />
          </div>
        ) : (
          <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600">Du kannst direkt den nächsten Beleg erfassen oder die Mappe prüfen.</p>
        )}

        {todayCount > 0 && (
          <Link href={dueItems.length > 0 ? '/verpflichtungen' : '/dokumente'} className="mt-4 flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-black text-violet-700 shadow-sm">Heutige Arbeit öffnen →</Link>
        )}
      </section>

      <section className="grid gap-3">
        {actions.map((action) => (
          <Link key={action.href} href={action.href} className="flex items-center gap-4 rounded-2xl border border-violet-100 bg-white p-4 shadow-sm active:scale-[0.99]">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-xl font-black text-violet-700">{action.icon}</span>
            <div className="min-w-0 flex-1"><p className="text-base font-black">{action.title}</p><p className="mt-0.5 text-sm font-semibold text-slate-500">{action.text}</p></div>
            <span className="shrink-0 text-lg font-black text-violet-600">›</span>
          </Link>
        ))}
      </section>

      <Link href="/demo" className="block rounded-2xl border border-dashed border-violet-200 bg-violet-50 px-4 py-3 text-center text-sm font-black text-violet-700">Demo für einen Termin öffnen</Link>
      <p className="px-2 text-center text-[11px] font-semibold leading-relaxed text-slate-400">Mila organisiert und bereitet vor. Steuerliche und rechtliche Entscheidungen bleiben bei der zuständigen Fachstelle.</p>
    </section>
  )
}

function TodayMetric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl bg-white p-3 text-center shadow-sm"><p className="text-xl font-black">{value}</p><p className="mt-1 text-[10px] font-black uppercase leading-tight tracking-wider text-slate-400">{label}</p></div>
}
