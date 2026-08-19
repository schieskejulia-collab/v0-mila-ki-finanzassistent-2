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

  return (
    <main className="min-h-screen bg-[#f7f4fa] pb-28">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-7 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-violet-600">Mila</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              {greeting}, {userName} 👋
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {todayCount > 0
                ? `Heute zuerst: ${missingReceipts} Beleg${missingReceipts === 1 ? '' : 'e'} zuordnen · ${openQuestions} Rückfrage${openQuestions === 1 ? '' : 'n'} klären`
                : 'Heute ist nichts Dringendes offen. Mila hält den Rest im Blick.'}
            </p>
          </div>

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70">
            <Sparkles className="h-5 w-5 text-violet-600" />
          </div>
        </header>

        <section className="mb-6 rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                Aktive Vorbereitung
              </p>
              <p className="mt-1 text-lg font-black text-slate-900">
                Monatsmappe · aktueller Stand
              </p>
            </div>
            <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700">
              {Number(handoff.completion || 0)} % vorbereitet
            </span>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-violet-500 transition-all"
              style={{ width: `${Math.max(0, Math.min(100, Number(handoff.completion || 0)))}%` }}
            />
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
          <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50">
                <Sparkles className="h-4 w-4 text-violet-600" />
              </span>
              <h2 className="text-base font-black text-slate-900">Heute zuerst</h2>
            </div>

            <div className="space-y-3">
              <PriorityCard
                href="/buchungen"
                icon={<FileText className="h-5 w-5" />}
                title="Belege brauchen noch Zuordnung"
                text={
                  missingReceipts > 0
                    ? `${missingReceipts} Buchung${missingReceipts === 1 ? '' : 'en'} wartet${missingReceipts === 1 ? '' : 'en'} noch auf einen Beleg.`
                    : 'Alle erkannten Buchungen haben aktuell einen Beleg.'
                }
                badge={missingReceipts > 0 ? `${missingReceipts} offen` : 'erledigt'}
                done={missingReceipts === 0}
              />

              <PriorityCard
                href="/dokumente"
                icon={<MessageCircle className="h-5 w-5" />}
                title="Rückfragen klären"
                text={
                  openQuestions > 0
                    ? `${openQuestions} Dokument${openQuestions === 1 ? '' : 'e'} braucht${openQuestions === 1 ? '' : 'en'} noch Kontext.`
                    : 'Im Moment wartet keine offene Rückfrage auf dich.'
                }
                badge={openQuestions > 0 ? `${openQuestions} offen` : 'erledigt'}
                done={openQuestions === 0}
              />
            </div>

            <Link
              href="/neue-buchungen"
              className="mt-5 flex items-center justify-between rounded-2xl border border-dashed border-violet-300 bg-violet-50/70 p-4 transition hover:bg-violet-50"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-violet-600 shadow-sm">
                  <Upload className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-black text-slate-900">Beleg-Stapel hochladen</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Rein damit. Mila sortiert im Hintergrund vor.
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-violet-500" />
            </Link>
          </section>

          <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100">
                <Clock3 className="h-4 w-4 text-slate-500" />
              </span>
              <h2 className="text-base font-black text-slate-900">Kann noch warten</h2>
            </div>

            <div className="space-y-3">
              <SmallStatus
                label="Offene Pflichten"
                value={openObligations}
                href="/verpflichtungen"
              />
              <SmallStatus
                label="Übergabebereite Dokumente"
                value={readyCount}
                href="/dokumente"
              />
            </div>

            <div className="mt-5 rounded-2xl bg-emerald-50 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <div>
                  <p className="font-black text-emerald-950">Mila arbeitet im Hintergrund</p>
                  <p className="mt-1 text-xs leading-5 text-emerald-800/80">
                    Mila hält offene Punkte sichtbar, sortiert Vorhandenes vor und zeigt dir nur, was wirklich deine Entscheidung braucht.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatusTile label="Eingang" value={Number(handoff.documentCount || 0)} />
          <StatusTile label="In Klärung" value={openQuestions} />
          <StatusTile label="Fehlende Belege" value={missingReceipts} />
          <StatusTile label="Übergabebereit" value={readyCount} />
        </section>

        {handoff.nextAction && (
          <section className="mt-5 rounded-[2rem] bg-slate-900 p-5 text-white shadow-sm sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
              Mila empfiehlt als Nächstes
            </p>
            <h2 className="mt-2 text-lg font-black">{handoff.nextAction.title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              {handoff.nextAction.message}
            </p>
            <Link
              href={handoff.nextAction.href || '/dokumente'}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-slate-900"
            >
              {handoff.nextAction.cta || 'Öffnen'}
              <ArrowRight className="h-4 w-4" />
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
      className="group flex items-start justify-between gap-4 rounded-2xl border border-slate-200 p-4 transition hover:border-violet-200 hover:bg-violet-50/40"
    >
      <div className="flex min-w-0 gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            done ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
          }`}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="font-black text-slate-900">{title}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{text}</p>
        </div>
      </div>
      <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${
          done
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-amber-50 text-amber-700'
        }`}
      >
        {badge}
      </span>
    </Link>
  )
}

function SmallStatus({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3.5 transition hover:bg-slate-100"
    >
      <span className="text-sm font-semibold text-slate-600">{label}</span>
      <span className="text-sm font-black text-slate-900">{value}</span>
    </Link>
  )
}

function StatusTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
      <p className="text-2xl font-black text-slate-900">{value}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500">{label}</p>
    </div>
  )
}
