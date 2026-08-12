'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useFinance } from '@/lib/store'
import { appendAuditEvent } from '@/lib/audit-trail'

const ACTIVE_CLIENT_KEY = 'mila-active-client-v1'
const TAKEOVER_KEY = 'mila-client-takeovers-v1'
const CLIENTS_KEY = 'mila-clients-v1'

type Takeover = {
  period?: string
  handoffRhythm?: 'kanzlei' | 'monthly' | 'quarterly' | 'halfyear' | 'yearly' | 'individual'
}

function monthLabel(value?: string) {
  if (!value) return 'aktueller Zeitraum'
  const [year, month] = value.split('-').map(Number)
  if (!year || !month) return value
  return new Date(year, month - 1, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
}

function periodLabel(takeover: Takeover | null) {
  const base = takeover?.period || new Date().toISOString().slice(0, 7)
  const [year, month] = base.split('-').map(Number)
  if (!year || !month) return base
  if (takeover?.handoffRhythm === 'quarterly') return `Q${Math.ceil(month / 3)} ${year}`
  if (takeover?.handoffRhythm === 'halfyear') return `${month <= 6 ? '1.' : '2.'} Halbjahr ${year}`
  if (takeover?.handoffRhythm === 'yearly') return String(year)
  return monthLabel(base)
}

function rhythmLabel(value?: string) {
  if (value === 'monthly') return 'monatlich'
  if (value === 'quarterly') return 'quartalsweise'
  if (value === 'halfyear') return 'halbjährlich'
  if (value === 'yearly') return 'jährlich'
  if (value === 'individual') return 'individuell'
  return 'laut Kanzlei'
}

function safeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9äöüÄÖÜß._-]+/g, '_').replace(/^_+|_+$/g, '') || 'Mila_Uebergabe'
}

export function HandoffPackageSection() {
  const finance = useFinance()
  const [takeover, setTakeover] = useState<Takeover | null>(null)
  const [clientName, setClientName] = useState('Mandant')
  const [clientId, setClientId] = useState('')

  useEffect(() => {
    try {
      const activeClientId = window.localStorage.getItem(ACTIVE_CLIENT_KEY) || ''
      setClientId(activeClientId)
      if (!activeClientId) return
      const takeoversRaw = window.localStorage.getItem(TAKEOVER_KEY)
      const takeovers = takeoversRaw ? JSON.parse(takeoversRaw) : {}
      setTakeover(takeovers?.[activeClientId] || null)
      const clientsRaw = window.localStorage.getItem(CLIENTS_KEY)
      const clients = clientsRaw ? JSON.parse(clientsRaw) : []
      const client = Array.isArray(clients) ? clients.find((item: any) => item?.id === activeClientId) : null
      if (client?.name) setClientName(String(client.name))
    } catch {
      setTakeover(null)
    }
  }, [])

  const data = useMemo(() => {
    const documents = finance.documents || []
    const missingReceipts = (finance.expenses || []).filter((item: any) => item?.hasReceipt === false || item?.has_receipt === false)
    const openQuestions = documents.filter((doc: any) => {
      const status = String(doc?.status || '').toLowerCase()
      const note = String(doc?.note || '').toLowerCase()
      return status === 'neu' || note.includes('unklar') || note.includes('rückfrage') || note.includes('rueckfrage') || note.includes('prüfen') || note.includes('pruefen')
    })
    const openObligations = (finance.obligations || []).filter((item: any) => {
      const status = String(item?.status || '').toLowerCase()
      return !['erledigt', 'bezahlt', 'archiviert'].includes(status)
    })
    const openCount = missingReceipts.length + openQuestions.length + openObligations.length
    return { documents, missingReceipts, openQuestions, openObligations, openCount, ready: documents.length > 0 && openCount === 0 }
  }, [finance.documents, finance.expenses, finance.obligations])

  function downloadManifest() {
    const createdAt = new Date()
    const currentPeriod = periodLabel(takeover)
    const lines = [
      'MILA – ORGANISATORISCHE ÜBERGABEÜBERSICHT',
      '',
      `Mandant: ${clientName}`,
      `Zeitraum: ${currentPeriod}`,
      `Übergaberhythmus: ${rhythmLabel(takeover?.handoffRhythm)}`,
      `Erstellt am: ${createdAt.toLocaleString('de-DE')}`,
      '',
      `Dokumente: ${data.documents.length}`,
      `Fehlende Belege: ${data.missingReceipts.length}`,
      `Offene Rückfragen / Prüfhinweise: ${data.openQuestions.length}`,
      `Offene Vorgänge: ${data.openObligations.length}`,
      `Status: ${data.ready ? 'organisatorisch übergabebereit' : 'noch in Bearbeitung'}`,
      '',
      'DOKUMENTENLISTE',
      ...data.documents.map((doc: any, index: number) => {
        const name = doc?.fileName || doc?.file_name || doc?.title || `Dokument ${index + 1}`
        const type = doc?.type || 'sonstiges'
        const date = doc?.documentDate || doc?.createdAt || ''
        return `${index + 1}. ${name} | ${type} | ${date ? String(date).slice(0, 10) : 'Datum offen'}`
      }),
      '',
      'Hinweis: Diese Übersicht dokumentiert ausschließlich die organisatorische Vorbereitung. Steuerliche und rechtliche Prüfung erfolgt durch die zuständige Fachstelle.',
    ]

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${safeFileName(`Mila_Uebergabe_${clientName}_${currentPeriod}`)}.txt`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)

    if (clientId) {
      appendAuditEvent({
        clientId,
        type: 'handoff_created',
        title: 'Übergabeübersicht erstellt',
        detail: `${currentPeriod} · ${data.documents.length} Dokumente`,
        createdAt: createdAt.toISOString(),
      })
    }
  }

  return (
    <section className={`rounded-3xl border p-5 shadow-sm ${data.ready ? 'border-emerald-100 bg-white' : 'border-amber-100 bg-white'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-xs font-black uppercase tracking-[0.18em] ${data.ready ? 'text-emerald-700' : 'text-amber-700'}`}>Kanzlei-Übergabe</p>
          <h2 className="mt-1 text-xl font-black">Übergabepaket vorbereiten</h2>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-2 text-xs font-black ${data.ready ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
          {data.ready ? 'Bereit' : 'In Arbeit'}
        </span>
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 p-4">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Sammelzeitraum</p>
        <p className="mt-1 text-lg font-black text-slate-900">{periodLabel(takeover)}</p>
        <p className="mt-1 text-sm font-semibold text-slate-500">Übergabe {rhythmLabel(takeover?.handoffRhythm)}</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Metric label="Dokumente" value={data.documents.length} />
        <Metric label="Ohne Beleg" value={data.missingReceipts.length} warn={data.missingReceipts.length > 0} />
        <Metric label="Rückfragen" value={data.openQuestions.length} warn={data.openQuestions.length > 0} />
        <Metric label="Offene Vorgänge" value={data.openObligations.length} warn={data.openObligations.length > 0} />
      </div>

      {data.ready ? (
        <div className="mt-4 rounded-2xl bg-emerald-50 p-4">
          <p className="text-sm font-black text-emerald-800">✓ Organisatorisch bereit zur Übergabe</p>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">Für die aktuell erfassten Daten sind keine organisatorischen Punkte mehr offen. Du kannst jetzt die Übergabeübersicht erzeugen.</p>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl bg-amber-50 p-4">
          <p className="text-sm font-black text-amber-800">Noch nicht freigeben</p>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">{data.openCount > 0 ? `${data.openCount} organisatorische Punkte müssen vorher geklärt werden.` : 'Es sind noch keine Dokumente für die Übergabe vorhanden.'}</p>
          <Link href="/dokumente" className="mt-3 inline-flex rounded-xl bg-white px-3 py-2 text-sm font-black text-violet-700 ring-1 ring-violet-100">Offene Punkte prüfen →</Link>
        </div>
      )}

      <button type="button" onClick={downloadManifest} disabled={!data.ready} className={`mt-4 w-full rounded-2xl px-4 py-3.5 text-sm font-black ${data.ready ? 'bg-violet-600 text-white active:scale-[0.99]' : 'cursor-not-allowed bg-slate-100 text-slate-400'}`}>
        Übergabeübersicht erstellen
      </button>

      <p className="mt-3 text-[11px] font-semibold leading-relaxed text-slate-400">Die Übersicht enthält den Arbeitsstand und eine Dokumentenliste. Sie ersetzt keine DATEV-Übergabe und keine steuerliche oder rechtliche Prüfung.</p>
    </section>
  )
}

function Metric({ label, value, warn = false }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className={`rounded-2xl p-3 ${warn ? 'bg-amber-50' : 'bg-slate-50'}`}>
      <p className={`text-xl font-black ${warn ? 'text-amber-800' : 'text-slate-900'}`}>{value}</p>
      <p className="mt-1 text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</p>
    </div>
  )
}
