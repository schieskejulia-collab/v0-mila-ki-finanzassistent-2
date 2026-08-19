'use client'

import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileQuestion,
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

  const dueDocuments = documents
    .filter((doc: any) => doc?.dueDate)
    .map((doc: any) => {
      const due = new Date(doc.dueDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      due.setHours(0, 0, 0, 0)
      const days = Number.isNaN(due.getTime()) ? null : Math.ceil((due.getTime() - today.getTime()) / 86400000)
      return { doc, days }
    })

  const urgentDocuments = dueDocuments.filter(({ days }: any) => days !== null && days <= 3)
  const laterDocuments = dueDocuments
    .filter(({ days }: any) => days !== null && days > 3)
    .sort((a: any, b: any) => Number(a.days) - Number(b.days))

  const priorityCount = clarificationDocs.length + missingReceipts.length + urgentObligations.length + urgentDocuments.length
  const newDocuments = documents.filter((doc: any) => doc?.status === 'neu').length

  const recentDocuments = [...documents]
    .sort((a: any, b: any) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime())
    .slice(0, 3)

  const laterCount = laterObligations.length + laterDocuments.length
  const priorityLine = priorityCount > 0
    ? [
        clarificationDocs.length > 0 ? `${clarificationDocs.length} Klärung${clarificationDocs.length === 1 ? '' : 'en'}` : '',
        missingReceipts.length > 0 ? `${missingReceipts.length} Beleg${missingReceipts.length === 1 ? '' : 'e'} zuordnen` : '',
        urgentObligations.length + urgentDocuments.length > 0 ? `${urgentObligations.length + urgentDocuments.length} Fristsache${urgentObligations.length + urgentDocuments.length === 1 ? '' : 'n'}` : '',
      ].filter(Boolean).join(' · ')
    : 'Heute ist nichts dringend.'

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-28 pt-5 text-slate-950 sm:px-6 md:pb-10 lg:px-8">
      <header className="mb-4 sm:mb-6">
        <h1 className="text-[2rem] font-black leading-tight tracking-tight sm:text-4xl">Guten Morgen, {userName} 👋</h1>
        <p className="mt-1.5 text-sm font-bold text-slate-500">{priorityLine}</p>
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.9fr)]">
        <section className="overflow-hidden rounded-3xl border border-rose-100 bg-white shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-rose-50 px-4 py-3.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-sm text-rose-600">★</div>
            <h2 className="text-base font-black">Heute zuerst</h2>
          </div>

          <div className="divide-y divide-slate-100">
            {urgentObligations.slice(0, 2).map(({ item, days }: any) => (
              <PriorityRow key={`obl-${item.id}`} href="/jetzt" icon={Clock3} tone="orange" title={item.title || 'Fristsache'} detail={`${item.partner || 'Vorgang'} · ${dayLabel(days)}`} />
            ))}

            {urgentDocuments.slice(0, 2).map(({ doc, days }: any) => (
              <PriorityRow key={`due-doc-${doc.id}`} href="/dokumente?ansicht=klaerung" icon={FileQuestion} tone="orange" title={doc.title || 'Unterlage mit Frist'} detail={`Frist ${dayLabel(days)}`} />
            ))}

            {clarificationDocs.length > 0 && (
              <PriorityRow
                href="/dokumente?ansicht=klaerung"
                icon={FileQuestion}
                tone="pink"
                title={`${clarificationDocs.length} Unterlage${clarificationDocs.length === 1 ? '' : 'n'} klären`}
                detail="Eine Angabe fehlt."
                count={clarificationDocs.length}
              />
            )}

            {missingReceipts.length > 0 && (
              <PriorityRow
                href="/dokumente?ansicht=belege"
                icon={ReceiptText}
                tone="pink"
                title={`${missingReceipts.length} Beleg${missingReceipts.length === 1 ? '' : 'e'} zuordnen`}
                detail="Zahlung ist schon erfasst."
                count={missingReceipts.length}
              />
            )}

            {priorityCount === 0 && (
              <div className="px-4 py-4 text-sm font-bold text-emerald-700">Heute ist nichts dringend.</div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-violet-100 bg-white shadow-sm">
          <details className="group" open={laterCount > 0}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-violet-700"><Clock3 className="h-4 w-4" /></div>
                <div>
                  <h2 className="text-base font-black">Kann warten</h2>
                  <p className="text-[11px] font-bold text-slate-400">{laterCount ? `${laterCount} später` : 'nichts vorgemerkt'}</p>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-violet-500 transition group-open:rotate-180" />
            </summary>
            {laterCount > 0 && (
              <div className="divide-y divide-violet-50 border-t border-violet-50">
                {laterObligations.slice(0, 3).map(({ item, days }: any) => (
                  <LaterRow key={`later-${item.id}`} title={item.title || 'Vorgang'} detail={dayLabel(days)} href="/jetzt" />
                ))}
                {laterDocuments.slice(0, Math.max(0, 3 - laterObligations.length)).map(({ doc, days }: any) => (
                  <LaterRow key={`later-doc-${doc.id}`} title={doc.title || 'Unterlage'} detail={dayLabel(days)} href="/dokumente?ansicht=dokumente" />
                ))}
              </div>
            )}
          </details>
        </section>
      </div>

      <Link href="/stapel" className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-violet-600 px-4 py-3.5 text-white shadow-sm transition hover:bg-violet-700 sm:mt-5 sm:rounded-3xl sm:px-5 sm:py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15"><Upload className="h-5 w-5" /></div>
          <div className="min-w-0">
            <p className="text-sm font-black sm:text-base">Unterlagen hinzufügen</p>
            <p className="truncate text-[11px] font-semibold text-white/75 sm:text-xs">Foto, PDF oder Stapel</p>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0" />
      </Link>

      <section className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm sm:mt-5 sm:rounded-3xl">
        <div className="grid grid-cols-4 divide-x divide-slate-100">
          <CompactStat icon={Inbox} label="Eingang" value={newDocuments} tone="blue" />
          <CompactStat icon={FileQuestion} label="Klärung" value={clarificationDocs.length + missingReceipts.length} tone="orange" />
          <CompactStat icon={CheckCircle2} label="Bereit" value={readyDocs.length} tone="green" />
          <CompactStat icon={FolderOpen} label="Mappe" value={documents.length} tone="purple" />
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-slate-100 bg-white shadow-sm sm:mt-5 sm:rounded-3xl">
        <div className="flex items-center justify-between gap-4 px-4 py-3.5">
          <h2 className="text-base font-black">Zuletzt</h2>
          <Link href="/dokumente?ansicht=dokumente" className="text-xs font-black text-violet-700">Alle</Link>
        </div>

        {recentDocuments.length === 0 ? (
          <div className="border-t border-slate-100 px-4 py-4 text-sm font-semibold text-slate-500">Noch keine Unterlagen.</div>
        ) : (
          <div className="divide-y divide-slate-100 border-t border-slate-100">
            {recentDocuments.map((doc: any) => {
              const quality = checkDocumentQuality(doc)
              return (
                <div key={doc.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${quality.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {quality.ok ? <CheckCircle2 className="h-4 w-4" /> : <FileQuestion className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black">{doc.title || 'Unterlage'}</p>
                    <p className="truncate text-[11px] font-semibold text-slate-500">
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
  const toneClass = tone === 'orange' ? 'bg-orange-50 text-orange-600' : 'bg-rose-50 text-rose-600'
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50/70">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${toneClass}`}><Icon className="h-4 w-4" /></div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black leading-5">{title}</p>
        <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">{detail}</p>
      </div>
      {typeof count === 'number' && <span className="min-w-7 rounded-lg bg-violet-50 px-2 py-1 text-center text-xs font-black text-violet-700">{count}</span>}
      <ArrowRight className="h-4 w-4 shrink-0 text-violet-500" />
    </Link>
  )
}

function LaterRow({ title, detail, href }: { title: string; detail: string; href: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3">
      <Clock3 className="h-4 w-4 shrink-0 text-violet-500" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black">{title}</p>
        <p className="text-[11px] font-semibold text-slate-500">{detail}</p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-violet-300" />
    </Link>
  )
}

function CompactStat({ icon: Icon, label, value, tone }: any) {
  const toneClass = tone === 'blue'
    ? 'text-sky-700'
    : tone === 'orange'
      ? 'text-orange-700'
      : tone === 'green'
        ? 'text-emerald-700'
        : 'text-violet-700'

  return (
    <div className="min-w-0 px-2 py-3 text-center sm:px-4 sm:py-4">
      <Icon className={`mx-auto h-4 w-4 ${toneClass}`} />
      <p className="mt-1.5 text-lg font-black leading-none sm:text-xl">{value}</p>
      <p className="mt-1 truncate text-[9px] font-black uppercase tracking-[0.04em] text-slate-400 sm:text-[10px]">{label}</p>
    </div>
  )
}
