'use client'

import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  FolderOpen,
  MessageCircle,
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
    <main className="min-h-screen bg-[#faf9fc] pb-24 lg:pb-8">
      <div className="mx-auto w-full max-w-[1220px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <header className="mb-5 lg:mb-6">
          <h1 className="text-[28px] font-black tracking-tight text-slate-950 lg:text-[32px]">
            {greeting}, {userName} 👋
          </h1>
          <p className="mt-1 text-sm text-slate-500 lg:text-base">
            {todayCount > 0
              ? <>Heute zuerst: <strong className="text-rose-500">{missingReceipts} Beleg{missingReceipts === 1 ? '' : 'e'}</strong> zuordnen <span className="px-1 text-slate-300">·</span> <strong className="text-amber-500">{openQuestions} Rückfrage{openQuestions === 1 ? '' : 'n'}</strong> klären</>
              : 'Heute ist nichts Dringendes offen. Mila hält den Rest im Blick.'}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-slate-400 lg:text-xs">
            Aktive Akte: Tester A · August 2026
          </p>
        </header>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(290px,.85fr)] lg:gap-5">
          <div className="space-y-4">
            <section className="rounded-2xl border border-rose-100 bg-white p-4 shadow-sm lg:p-5">
              <SectionTitle
                icon={<Sparkles className="h-4 w-4" />}
                title="Heute zuerst"
                tone="rose"
              />

              <div className="mt-3 space-y-2.5">
                <ActionRow
                  href="/buchungen"
                  icon={<FileText className="h-4 w-4" />}
                  title={`${missingReceipts} Beleg${missingReceipts === 1 ? '' : 'e'} brauchen noch Zuordnung`}
                  text="Diese Eingänge benötigen deine Prüfung."
                  value={missingReceipts}
                  tone="rose"
                />
                <ActionRow
                  href="/dokumente"
                  icon={<MessageCircle className="h-4 w-4" />}
                  title={`${openQuestions} Rückfrage${openQuestions === 1 ? '' : 'n'} offen`}
                  text="Hier warten Informationen oder Bestätigungen."
                  value={openQuestions}
                  tone="amber"
                />
                <ActionRow
                  href="/dokumente"
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  title={`${readyCount} Unterlagen sind bereits sauber abgelegt`}
                  text="Diese Dokumente sind bereit für die Übergabe."
                  value={readyCount}
                  tone="green"
                />
              </div>
            </section>

            <Link
              href="/neue-buchungen"
              className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-violet-300 bg-white px-4 py-4 shadow-sm transition hover:bg-violet-50/40 lg:px-5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                  <Upload className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-950 lg:text-base">Beleg-Stapel hochladen</p>
                  <p className="mt-0.5 text-[11px] text-slate-500 lg:text-xs">Mehrere Belege auswählen oder hier ablegen — Mila übernimmt den Rest.</p>
                </div>
              </div>
              <span className="hidden rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs font-black text-violet-700 sm:inline-flex">
                Belege auswählen
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-violet-500 sm:hidden" />
            </Link>

            <section className="grid grid-cols-4 gap-2.5">
              <StatusCard label="Eingang" value={documentCount} helper="neue Belege" />
              <StatusCard label="In Klärung" value={openQuestions} helper="wartet" />
              <StatusCard label="Übergabebereit" value={readyCount} helper="bereit" />
              <StatusCard label="Archiv / Mappe" value={Math.max(0, readyCount)} helper="sauber" />
            </section>
          </div>

          <div className="space-y-4">
            <section className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm lg:p-5">
              <SectionTitle
                icon={<Clock3 className="h-4 w-4" />}
                title="Kann noch warten"
                tone="violet"
              />
              <div className="mt-3 space-y-2.5">
                <CompactRow href="/dokumente" label={`${waitingCount} Belege warten auf weitere Daten`} value={waitingCount} />
                <CompactRow href="/dokumente" label={`${Math.max(0, openQuestions - 1)} Dokumente prüfen (nächste Woche)`} value={Math.max(0, openQuestions - 1)} />
                <CompactRow href="/verpflichtungen" label={`${openObligations} offene Vorgänge (Wiedervorlage)`} value={openObligations} />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:p-5">
              <p className="text-xs font-black text-violet-700">Mila arbeitet im Hintergrund</p>
              <div className="mt-3 space-y-3 text-[11px] font-semibold text-slate-600 lg:text-xs">
                <BackgroundRow icon={<FolderOpen className="h-4 w-4" />} text="Dokumente vorsortieren & zuordnen" />
                <BackgroundRow icon={<Sparkles className="h-4 w-4" />} text="IST-Einnahmen & IST-Ausgaben ableiten" />
                <BackgroundRow icon={<FileText className="h-4 w-4" />} text="Mischbons erkennen & aufteilen" />
                <BackgroundRow icon={<CheckCircle2 className="h-4 w-4" />} text="Originale verknüpft halten" />
              </div>
              <Link href="/KI" className="mt-4 inline-flex items-center gap-1 text-[11px] font-black text-violet-700 lg:text-xs">
                Mehr über Mila <ArrowRight className="h-3 w-3" />
              </Link>
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
          <p className="truncate text-xs font-black text-slate-950 lg:text-sm">{title}</p>
          <p className="mt-0.5 truncate text-[10px] text-slate-500 lg:text-[11px]">{text}</p>
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

function StatusCard({ label, value, helper }: { label: string; value: number; helper: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white px-2 py-3 shadow-sm lg:px-3">
      <p className="text-[9px] font-bold text-slate-400 lg:text-[10px]">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-950 lg:text-xl">{value}</p>
      <p className="hidden truncate text-[9px] text-slate-400 sm:block">{helper}</p>
    </div>
  )
}
