'use client'

import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  MessageCircle,
  Sparkles,
  Upload,
} from 'lucide-react'

export function DashboardContent({ model }: { model: any }) {
  const handoff = model?.kanzleiHandoff ?? {}
  const missingReceipts = Number(handoff.missingReceiptCount || 0)
  const openQuestions = Number(handoff.openQuestionCount || 0)
  const openObligations = Number(handoff.openObligationCount || 0)
  const readyCount = Math.max(
    0,
    Number(handoff.documentCount || 0) - missingReceipts - openQuestions
  )

  const todayCount = missingReceipts + openQuestions
  const greeting = model?.greeting || 'Guten Morgen'
  const userName = model?.userName || 'Julia'
  const completion = Math.max(0, Math.min(100, Number(handoff.completion || 0)))

  return (
    <main className="min-h-screen bg-[#faf9fc] pb-24">
      <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-violet-600">Mila</p>
            <h1 className="mt-0.5 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              {greeting}, {userName} 👋
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              {todayCount > 0
                ? `Heute zuerst: ${missingReceipts} Beleg${missingReceipts === 1 ? '' : 'e'} zuordnen · ${openQuestions} Rückfrage${openQuestions === 1 ? '' : 'n'} klären`
                : 'Heute ist nichts Dringendes offen. Mila hält den Rest im Blick.'}
            </p>
          </div>

          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <Sparkles className="h-4 w-4" />
          </span>
        </header>

        <section className="mb-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Monatsmappe</p>
              <p className="truncate text-sm font-black text-slate-900">Aktueller Stand</p>
            </div>
            <span className="shrink-0 text-xs font-black text-violet-700">{completion} % vorbereitet</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-violet-500" style={{ width: `${completion}%` }} />
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50">
                <Sparkles className="h-3.5 w-3.5 text-violet-600" />
              </span>
              <h2 className="text-sm font-black text-slate-900">Heute zuerst</h2>
            </div>

            <div className="space-y-2">
              <PriorityCard
                href="/buchungen"
                icon={<FileText className="h-4 w-4" />}
                title="Belege zuordnen"
                text={missingReceipts > 0 ? `${missingReceipts} Buchung${missingReceipts === 1 ? '' : 'en'} ohne Beleg` : 'Alles zugeordnet'}
                badge={missingReceipts > 0 ? `${missingReceipts} offen` : 'fertig'}
                done={missingReceipts === 0}
              />

              <PriorityCard
                href="/dokumente"
                icon={<MessageCircle className="h-4 w-4" />}
                title="Rückfragen klären"
                text={openQuestions > 0 ? `${openQuestions} Dokument${openQuestions === 1 ? '' : 'e'} brauchen Kontext` : 'Keine Rückfrage offen'}
                badge={openQuestions > 0 ? `${openQuestions} offen` : 'fertig'}
                done={openQuestions === 0}
              />
            </div>

            <Link
              href="/neue-buchungen"
              className="mt-3 flex items-center justify-between rounded-xl border border-dashed border-violet-300 bg-violet-50/60 px-3 py-3 transition hover:bg-violet-50"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-violet-600 shadow-sm">
                  <Upload className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-900">Beleg-Stapel hochladen</p>
                  <p className="truncate text-[11px] text-slate-500">Mila sortiert im Hintergrund vor.</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-violet-500" />
            </Link>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100">
                <Clock3 className="h-3.5 w-3.5 text-slate-500" />
              </span>
              <h2 className="text-sm font-black text-slate-900">Kann noch warten</h2>
            </div>

            <div className="space-y-2">
              <SmallStatus label="Offene Pflichten" value={openObligations} href="/verpflichtungen" />
              <SmallStatus label="Übergabebereit" value={readyCount} href="/dokumente" />
            </div>

            <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-3">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <div>
                  <p className="text-sm font-black text-emerald-950">Mila arbeitet im Hintergrund</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-emerald-800/80">Sie sortiert vor und zeigt dir nur, was deine Entscheidung braucht.</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="mt-4 grid grid-cols-4 gap-2">
          <StatusTile label="Eingang" value={Number(handoff.documentCount || 0)} />
          <StatusTile label="Klärung" value={openQuestions} />
          <StatusTile label="Fehlend" value={missingReceipts} />
          <StatusTile label="Bereit" value={readyCount} />
        </section>

        {handoff.nextAction && (
          <section className="mt-4 flex flex-col gap-3 rounded-2xl border border-violet-100 bg-violet-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-violet-500">Mila empfiehlt als Nächstes</p>
              <h2 className="mt-1 text-sm font-black text-slate-950">{handoff.nextAction.title}</h2>
              <p className="mt-1 text-xs leading-5 text-slate-600">{handoff.nextAction.message}</p>
            </div>
            <Link
              href={handoff.nextAction.href || '/dokumente'}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-black text-violet-700 shadow-sm ring-1 ring-violet-100"
            >
              {handoff.nextAction.cta || 'Öffnen'}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </section>
        )}
      </div>
    </main>
  )
}

function PriorityCard({
  href,
  icon,
  title,
  text,
  badge,
  done,
}: {
  href: string
  icon: React.ReactNode
  title: string
  text: string
  badge: string
  done: boolean
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3 transition hover:border-violet-200 hover:bg-violet-50/30"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${done ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
          {icon}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-900">{title}</p>
          <p className="truncate text-[11px] text-slate-500">{text}</p>
        </div>
      </div>
      <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${done ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
        {badge}
      </span>
    </Link>
  )
}

function SmallStatus({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 transition hover:bg-slate-100">
      <span className="text-xs font-semibold text-slate-600">{label}</span>
      <span className="text-xs font-black text-slate-900">{value}</span>
    </Link>
  )
}

function StatusTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-center shadow-sm">
      <p className="text-lg font-black text-slate-950">{value}</p>
      <p className="truncate text-[9px] font-bold text-slate-500">{label}</p>
    </div>
  )
}
