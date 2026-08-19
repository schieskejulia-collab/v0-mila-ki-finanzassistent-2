'use client'

import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileText,
  FolderOpen,
  Inbox,
  MessageCircle,
  Search,
  Sparkles,
  Upload,
} from 'lucide-react'

export function DashboardContent({ model }: { model: any }) {
  const handoff = model?.kanzleiHandoff ?? {}
  const missingReceipts = Number(handoff.missingReceiptCount || 0)
  const openQuestions = Number(handoff.openQuestionCount || 0)
  const openObligations = Number(handoff.openObligationCount || 0)
  const documentCount = Number(handoff.documentCount || 0)
  const readyCount = Math.max(0, documentCount - missingReceipts - openQuestions)
  const waitingCount = Math.max(0, documentCount - readyCount)
  const todayCount = missingReceipts + openQuestions
  const greeting = model?.greeting || 'Guten Morgen'
  const userName = model?.userName || 'Julia'

  return (
    <main className="min-h-screen bg-[#f5f5f7] pb-24 lg:pb-8">
      <div className="mx-auto w-full max-w-[1360px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <header className="mb-5 flex flex-col gap-4 border-b border-slate-200 pb-5 lg:mb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-violet-700">
                Kanzlei-Arbeitsplatz
              </span>
              <span className="text-[11px] font-semibold text-slate-400">Organisation vor der fachlichen Prüfung</span>
            </div>
            <h1 className="text-[28px] font-black tracking-tight text-slate-950 lg:text-[34px]">
              {greeting}, {userName}.
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500 lg:text-base">
              Du entscheidest nur, was Aufmerksamkeit braucht. Mila hält Akte, Eingang und Übergabe im Fluss.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/suche"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-black text-slate-700 shadow-sm transition hover:border-violet-200"
            >
              <Search className="h-4 w-4" /> Suche
            </Link>
            <Link
              href="/eingang"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-violet-700"
            >
              <Inbox className="h-4 w-4" /> Eingang öffnen
            </Link>
          </div>
        </header>

        <section className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <WorkspaceStatus label="Eingang" value={documentCount} helper="Dokumente angekommen" tone="slate" />
          <WorkspaceStatus label="In Klärung" value={openQuestions} helper="Rückfragen offen" tone="amber" />
          <WorkspaceStatus label="Übergabebereit" value={readyCount} helper="vollständig vorbereitet" tone="green" />
          <WorkspaceStatus label="Wiedervorlage" value={openObligations} helper="Vorgänge im Blick" tone="violet" />
        </section>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(330px,.75fr)] xl:gap-5">
          <div className="space-y-4">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-5">
                <SectionTitle icon={<Sparkles className="h-4 w-4" />} title="Heute zuerst" tone="rose" />
                <p className="text-[11px] font-semibold text-slate-400">
                  {todayCount > 0 ? `${todayCount} Punkte brauchen deine Entscheidung` : 'Nichts Dringendes offen'}
                </p>
              </div>

              <div className="space-y-2.5 p-4 lg:p-5">
                <ActionRow
                  href="/buchungen"
                  icon={<FileText className="h-4 w-4" />}
                  title={`${missingReceipts} Beleg${missingReceipts === 1 ? '' : 'e'} brauchen Zuordnung`}
                  text="Eingang prüfen und der richtigen Akte zuordnen."
                  value={missingReceipts}
                  tone="rose"
                />
                <ActionRow
                  href="/dokumente"
                  icon={<MessageCircle className="h-4 w-4" />}
                  title={`${openQuestions} Rückfrage${openQuestions === 1 ? '' : 'n'} offen`}
                  text="Information fehlt oder muss kurz bestätigt werden."
                  value={openQuestions}
                  tone="amber"
                />
                <ActionRow
                  href="/dokumente"
                  icon={<FileCheck2 className="h-4 w-4" />}
                  title={`${readyCount} Unterlagen sind übergabebereit`}
                  text="Vollständig, zugeordnet und bereit für die fachliche Prüfung."
                  value={readyCount}
                  tone="green"
                />
              </div>
            </section>

            <Link
              href="/neue-buchungen"
              className="group flex items-center justify-between gap-3 rounded-2xl border border-dashed border-violet-300 bg-white px-4 py-4 shadow-sm transition hover:border-violet-400 hover:bg-violet-50/40 lg:px-5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                  <Upload className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-950 lg:text-base">Beleg-Stapel hochladen</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-slate-500 lg:text-xs">
                    Mehrere Dateien auf einmal. Mila sortiert vor, hält Originale zusammen und markiert nur echte Klärfälle.
                  </p>
                </div>
              </div>
              <span className="hidden rounded-lg bg-violet-600 px-3 py-2 text-xs font-black text-white transition group-hover:bg-violet-700 sm:inline-flex">
                Dateien wählen
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-violet-500 sm:hidden" />
            </Link>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Aktive Akte</p>
                  <h2 className="mt-1 text-base font-black text-slate-950">Tester A · August 2026</h2>
                </div>
                <Link href="/dokumente" className="text-[11px] font-black text-violet-700">
                  Akte öffnen →
                </Link>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-3">
                <MiniMetric label="Dokumente" value={documentCount} />
                <MiniMetric label="Noch zu klären" value={waitingCount} />
                <MiniMetric label="Bereit" value={readyCount} />
              </div>
            </section>
          </div>

          <div className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:p-5">
              <SectionTitle icon={<Clock3 className="h-4 w-4" />} title="Kann noch warten" tone="violet" />
              <p className="mt-1 text-[11px] text-slate-400">Mila trennt Dringendes von Dingen, die nicht deinen Tag blockieren müssen.</p>
              <div className="mt-3 space-y-2.5">
                <CompactRow href="/dokumente" label={`${waitingCount} Belege warten auf weitere Daten`} value={waitingCount} />
                <CompactRow href="/dokumente" label={`${Math.max(0, openQuestions - 1)} Dokumente nächste Woche prüfen`} value={Math.max(0, openQuestions - 1)} />
                <CompactRow href="/verpflichtungen" label={`${openObligations} Vorgänge in Wiedervorlage`} value={openObligations} />
              </div>
            </section>

            <section className="rounded-2xl border border-violet-100 bg-[#faf8ff] p-4 shadow-sm lg:p-5">
              <p className="text-xs font-black text-violet-800">Mila arbeitet im Hintergrund</p>
              <div className="mt-3 space-y-3 text-[11px] font-semibold text-slate-600 lg:text-xs">
                <BackgroundRow icon={<FolderOpen className="h-4 w-4" />} text="Dokumente vorsortieren und zuordnen" />
                <BackgroundRow icon={<Sparkles className="h-4 w-4" />} text="Vollständigkeit prüfen und Klärfälle markieren" />
                <BackgroundRow icon={<FileText className="h-4 w-4" />} text="Mischbons und zusammengehörige Originale erkennen" />
                <BackgroundRow icon={<CheckCircle2 className="h-4 w-4" />} text="Übergabestatus automatisch aktuell halten" />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Aktivität</p>
                  <h2 className="mt-1 text-sm font-black text-slate-950">Was zuletzt passiert ist</h2>
                </div>
                <Link href="/jetzt" className="text-[10px] font-black text-violet-700">Alle Vorgänge</Link>
              </div>
              <div className="mt-3 space-y-3">
                <ActivityRow icon={<Upload className="h-3.5 w-3.5" />} title={`${documentCount} Dokumente in der aktuellen Mappe`} meta="Akte Tester A" />
                <ActivityRow icon={<MessageCircle className="h-3.5 w-3.5" />} title={`${openQuestions} Rückfragen warten auf Klärung`} meta="Mila hält sie offen" />
                <ActivityRow icon={<CheckCircle2 className="h-3.5 w-3.5" />} title={`${readyCount} Unterlagen übergabebereit`} meta="Bereit für fachliche Prüfung" />
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}

function SectionTitle({ icon, title, tone }: { icon: React.ReactNode; title: string; tone: 'rose' | 'violet' }) {
  const toneClass = tone === 'rose' ? 'bg-rose-50 text-rose-500' : 'bg-violet-50 text-violet-600'
  return (
    <div className="flex items-center gap-2.5">
      <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${toneClass}`}>{icon}</span>
      <h2 className="text-sm font-black text-slate-950 lg:text-base">{title}</h2>
    </div>
  )
}

function ActionRow({ href, icon, title, text, value, tone }: { href: string; icon: React.ReactNode; title: string; text: string; value: number; tone: 'rose' | 'amber' | 'green' }) {
  const toneClass = tone === 'rose'
    ? 'bg-rose-50 text-rose-500'
    : tone === 'amber'
      ? 'bg-amber-50 text-amber-600'
      : 'bg-emerald-50 text-emerald-600'
  const badgeClass = tone === 'rose'
    ? 'bg-rose-50 text-rose-600'
    : tone === 'amber'
      ? 'bg-amber-50 text-amber-600'
      : 'bg-emerald-50 text-emerald-600'

  return (
    <Link href={href} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3 transition hover:border-violet-200 hover:bg-slate-50/70">
      <div className="flex min-w-0 items-center gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${toneClass}`}>{icon}</span>
        <div className="min-w-0">
          <p className="text-xs font-black text-slate-950 lg:text-sm">{title}</p>
          <p className="mt-0.5 text-[10px] leading-4 text-slate-500 lg:text-[11px]">{text}</p>
        </div>
      </div>
      <span className={`shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-black lg:text-xs ${badgeClass}`}>{value}</span>
      <ArrowRight className="hidden h-4 w-4 shrink-0 text-slate-400 lg:block" />
    </Link>
  )
}

function CompactRow({ href, label, value }: { href: string; label: string; value: number }) {
  return (
    <Link href={href} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50">
      <span className="min-w-0 flex-1 leading-4">{label}</span>
      <span className="rounded-lg bg-violet-50 px-2 py-1 text-[10px] font-black text-violet-700">{value}</span>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
    </Link>
  )
}

function BackgroundRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-violet-600">{icon}</span>
      <span>{text}</span>
    </div>
  )
}

function WorkspaceStatus({ label, value, helper, tone }: { label: string; value: number; helper: string; tone: 'slate' | 'amber' | 'green' | 'violet' }) {
  const toneClass = tone === 'amber'
    ? 'bg-amber-50 text-amber-700'
    : tone === 'green'
      ? 'bg-emerald-50 text-emerald-700'
      : tone === 'violet'
        ? 'bg-violet-50 text-violet-700'
        : 'bg-slate-100 text-slate-700'

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black text-slate-700">{label}</p>
        <span className={`rounded-lg px-2 py-1 text-[10px] font-black ${toneClass}`}>{value}</span>
      </div>
      <p className="mt-3 text-2xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-0.5 text-[10px] font-medium text-slate-400">{helper}</p>
    </div>
  )
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-3">
      <p className="text-[10px] font-bold text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
    </div>
  )
}

function ActivityRow({ icon, title, meta }: { icon: React.ReactNode; title: string; meta: string }) {
  return (
    <div className="flex gap-3 border-t border-slate-100 pt-3 first:border-0 first:pt-0">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-bold leading-4 text-slate-700">{title}</p>
        <p className="mt-0.5 text-[10px] text-slate-400">{meta}</p>
      </div>
    </div>
  )
}
