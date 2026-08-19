'use client'

import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileQuestion,
  FileStack,
  FolderOpen,
  Inbox,
  ReceiptText,
  Upload,
} from 'lucide-react'
import { checkDocumentQuality } from '@/lib/document-workflow'
import { getDaysUntilObligation, isObligationOpen } from '@/lib/mila-obligations'

function formatDate(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
}

function dayLabel(days: number | null) {
  if (days === null) return 'ohne feste Frist'
  if (days < 0) return `${Math.abs(days)} Tag${Math.abs(days) === 1 ? '' : 'e'} überfällig`
  if (days === 0) return 'heute'
  if (days === 1) return 'morgen'
  return `in ${days} Tagen`
}

export function DashboardContent({ model }: { model: any }) {
  const documents = Array.isArray(model?.documents) ? model.documents : []
  const expenses = Array.isArray(model?.expenses) ? model.expenses : []
  const obligations = Array.isArray(model?.obligations) ? model.obligations : []
  const userName = String(model?.userName || 'Julia').trim() || 'Julia'

  const clarificationDocs = documents.filter((doc: any) => !checkDocumentQuality(doc).ok)
  const readyDocs = documents.filter((doc: any) => checkDocumentQuality(doc).ok)
  const missingReceipts = expenses.filter(
    (expense: any) => expense?.hasReceipt === false || expense?.has_receipt === false,
  )

  const openObligations = obligations.filter((item: any) => isObligationOpen(item))
  const urgentObligations = openObligations
    .map((item: any) => ({ item, days: getDaysUntilObligation(item) }))
    .filter(({ days }: any) => days !== null && days <= 3)
    .sort((a: any, b: any) => Number(a.days) - Number(b.days))

  const laterObligations = openObligations
    .map((item: any) => ({ item, days: getDaysUntilObligation(item) }))
    .filter(({ days }: any) => days !== null && days > 3)
    .sort((a: any, b: any) => Number(a.days) - Number(b.days))

  const urgentDocuments = documents
    .filter((doc: any) => doc?.dueDate)
    .map((doc: any) => {
      const due = new Date(doc.dueDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      due.setHours(0, 0, 0, 0)
      const days = Number.isNaN(due.getTime()) ? null : Math.ceil((due.getTime() - today.getTime()) / 86400000)
      return { doc, days }
    })
    .filter(({ days }: any) => days !== null && days <= 3)

  const laterDocuments = documents
    .filter((doc: any) => doc?.dueDate)
    .map((doc: any) => {
      const due = new Date(doc.dueDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      due.setHours(0, 0, 0, 0)
      const days = Number.isNaN(due.getTime()) ? null : Math.ceil((due.getTime() - today.getTime()) / 86400000)
      return { doc, days }
    })
    .filter(({ days }: any) => days !== null && days > 3)
    .sort((a: any, b: any) => Number(a.days) - Number(b.days))

  const priorityCount = clarificationDocs.length + missingReceipts.length + urgentObligations.length + urgentDocuments.length
  const newDocuments = documents.filter((doc: any) => doc?.status === 'neu').length

  const recentDocuments = [...documents]
    .sort((a: any, b: any) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime())
    .slice(0, 4)

  const priorityLine = priorityCount > 0
    ? [
        clarificationDocs.length > 0 ? `${clarificationDocs.length} Klärung${clarificationDocs.length === 1 ? '' : 'en'}` : '',
        missingReceipts.length > 0 ? `${missingReceipts.length} Beleg${missingReceipts.length === 1 ? '' : 'e'} zuordnen` : '',
        urgentObligations.length + urgentDocuments.length > 0 ? `${urgentObligations.length + urgentDocuments.length} Fristsache${urgentObligations.length + urgentDocuments.length === 1 ? '' : 'n'}` : '',
      ].filter(Boolean).join(' · ')
    : 'Heute ist nichts dringend.'

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-28 pt-6 text-slate-950 sm:px-6 md:pb-10 lg:px-8">
      <header className="mb-6">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Guten Morgen, {userName} 👋</h1>
        <p className="mt-2 text-sm font-bold text-slate-500">{priorityLine}</p>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.9fr)]">
        <section className="rounded-[1.75rem] border border-rose-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-100 text-rose-600">★</div>
            <h2 className="text-lg font-black">Heute zuerst</h2>
          </div>

          <div className="space-y-2.5">
            {urgentObligations.slice(0, 2).map(({ item, days }: any) => (
              <PriorityRow
                key={`obl-${item.id}`}
                href="/jetzt"
                icon={Clock3}
                tone="orange"
                title={item.title || 'Fristsache'}
                detail={`${item.partner || 'Vorgang'} · ${dayLabel(days)}`}
              />
            ))}

            {urgentDocuments.slice(0, 2).map(({ doc, days }: any) => (
              <PriorityRow
                key={`due-doc-${doc.id}`}
                href="/dokumente?ansicht=klaerung"
                icon={FileQuestion}
                tone="orange"
                title={doc.title || 'Unterlage mit Frist'}
                detail={`Frist ${dayLabel(days)}`}
              />
            ))}

            {clarificationDocs.length > 0 && (
              <PriorityRow
                href="/dokumente?ansicht=klaerung"
                icon={FileQuestion}
                tone="pink"
                title={`${clarificationDocs.length} Unterlage${clarificationDocs.length === 1 ? '' : 'n'} brauchen eine Entscheidung`}
                detail="Nur die fehlende Angabe klären."
                count={clarificationDocs.length}
              />
            )}

            {missingReceipts.length > 0 && (
              <PriorityRow
                href="/dokumente?ansicht=belege"
                icon={ReceiptText}
                tone="pink"
                title={`${missingReceipts.length} Zahlung${missingReceipts.length === 1 ? '' : 'en'} ohne zugeordneten Beleg`}
                detail="Nur dort nachreichen, wo die Zahlung schon existiert."
                count={missingReceipts.length}
              />
            )}

            {priorityCount === 0 && (
              <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
                Heute ist nichts dringend.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-violet-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-violet-700">
              <Clock3 className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-black">Kann noch warten</h2>
          </div>

          <div className="space-y-2.5">
            {laterObligations.slice(0, 3).map(({ item, days }: any) => (
              <LaterRow key={`later-${item.id}`} title={item.title || 'Vorgang'} detail={dayLabel(days)} href="/jetzt" />
            ))}
            {laterDocuments.slice(0, Math.max(0, 3 - laterObligations.length)).map(({ doc, days }: any) => (
              <LaterRow key={`later-doc-${doc.id}`} title={doc.title || 'Unterlage'} detail={dayLabel(days)} href="/dokumente?ansicht=dokumente" />
            ))}
            {laterObligations.length === 0 && laterDocuments.length === 0 && (
              <div className="rounded-2xl bg-violet-50/60 p-4 text-sm font-bold text-violet-800">
                Nichts mit späterer Frist vorgemerkt.
              </div>
            )}
          </div>
        </section>
      </div>

      <Link
        href="/stapel"
        className="mt-5 flex items-center justify-between gap-4 rounded-[1.75rem] border-2 border-dashed border-violet-200 bg-white p-5 shadow-sm transition hover:border-violet-300"
      >
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-100 to-violet-100 text-violet-700">
            <Upload className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-black">Beleg-Stapel hochladen</p>
            <p className="mt-1 text-sm font-semibold text-slate-500">Ein Beleg oder bis zu 20 Dateien.</p>
          </div>
        </div>
        <span className="hidden shrink-0 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-black text-white sm:inline-flex">Belege auswählen</span>
      </Link>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Inbox} label="Eingang" value={newDocuments} detail="neu" tone="blue" />
        <StatCard icon={FileQuestion} label="In Klärung" value={clarificationDocs.length + missingReceipts.length} detail="brauchen dich" tone="orange" />
        <StatCard icon={CheckCircle2} label="Übergabebereit" value={readyDocs.length} detail="sauber vorbereitet" tone="green" />
        <StatCard icon={FolderOpen} label="Mappe" value={documents.length} detail="Unterlagen" tone="purple" />
      </div>

      <section className="mt-5 rounded-[1.75rem] border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-black">Letzte Aktivitäten</h2>
          <Link href="/dokumente?ansicht=dokumente" className="text-xs font-black text-violet-700">Alle ansehen</Link>
        </div>

        {recentDocuments.length === 0 ? (
          <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">Noch keine Unterlagen vorhanden.</div>
        ) : (
          <div className="mt-3 divide-y divide-slate-100">
            {recentDocuments.map((doc: any) => {
              const quality = checkDocumentQuality(doc)
              return (
                <div key={doc.id} className="flex items-center gap-3 py-3 first:pt-1">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${quality.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {quality.ok ? <CheckCircle2 className="h-4 w-4" /> : <FileQuestion className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black">{doc.title || 'Unterlage'}</p>
                    <p className="truncate text-xs font-semibold text-slate-500">
                      {quality.ok ? 'einsortiert' : 'Klärung nötig'}{doc.documentDate ? ` · ${formatDate(doc.documentDate)}` : ''}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
                </div>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}

function PriorityRow({ href, icon: Icon, tone, title, detail, count }: any) {
  const toneClass = tone === 'orange'
    ? 'bg-orange-50 text-orange-600'
    : 'bg-rose-50 text-rose-600'

  return (
    <Link href={href} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5 transition hover:bg-slate-50">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black leading-5">{title}</p>
        <p className="mt-0.5 text-xs font-semibold leading-5 text-slate-500">{detail}</p>
      </div>
      {typeof count === 'number' && <span className="rounded-xl bg-white px-2.5 py-1.5 text-xs font-black text-violet-700 shadow-sm">{count}</span>}
      <ArrowRight className="h-4 w-4 shrink-0 text-violet-600" />
    </Link>
  )
}

function LaterRow({ title, detail, href }: { title: string; detail: string; href: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-2xl border border-violet-50 bg-violet-50/40 p-3.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-violet-600 shadow-sm">
        <Clock3 className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black">{title}</p>
        <p className="mt-0.5 text-xs font-semibold text-slate-500">{detail}</p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-violet-400" />
    </Link>
  )
}

function StatCard({ icon: Icon, label, value, detail, tone }: any) {
  const toneClass = tone === 'blue'
    ? 'bg-sky-50 text-sky-700'
    : tone === 'orange'
      ? 'bg-orange-50 text-orange-700'
      : tone === 'green'
        ? 'bg-emerald-50 text-emerald-700'
        : 'bg-violet-50 text-violet-700'

  return (
    <div className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm">
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneClass}`}><Icon className="h-4 w-4" /></div>
      <p className="mt-4 text-xs font-black uppercase tracking-[0.08em] text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500">{detail}</p>
    </div>
  )
}
