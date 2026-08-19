'use client'

import Link from 'next/link'
import {
  ArrowRight,
  FileText,
  FolderOpen,
  Inbox,
  MessageCircle,
  Search,
  Upload,
} from 'lucide-react'

export function DashboardContent({ model }: { model: any }) {
  const handoff = model?.kanzleiHandoff ?? {}
  const missingReceipts = Number(handoff.missingReceiptCount || 0)
  const openQuestions = Number(handoff.openQuestionCount || 0)
  const greeting = model?.greeting || 'Guten Abend'
  const userName = model?.userName || 'Julia'
  const hasWork = missingReceipts > 0 || openQuestions > 0

  return (
    <main className="min-h-screen bg-[#f7f7f8] pb-24 lg:pb-10">
      <div className="mx-auto w-full max-w-[1180px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <header className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-violet-600">Mila Arbeitsplatz</p>
            <h1 className="mt-1 text-[30px] font-black tracking-[-0.04em] text-slate-950 sm:text-4xl">{greeting}, {userName}.</h1>
            <p className="mt-1.5 text-sm font-medium text-slate-500">Eine Akte. Ein Vorgang. Alles bleibt zusammen.</p>
          </div>
          <Link href="/suche" aria-label="Suche" className="hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 sm:flex">
            <Search className="h-4.5 w-4.5" />
          </Link>
        </header>

        <section className="mt-5 overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,.05)]">
          <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-5 sm:px-6">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">Aktive Akte</p>
              <h2 className="mt-1 truncate text-2xl font-black tracking-tight text-slate-950">Tester A</h2>
              <p className="mt-1 text-xs font-semibold text-slate-400">Alles zu diesem Mandanten bleibt in einem Zusammenhang.</p>
            </div>
            <Link href="/dokumente" className="shrink-0 rounded-xl bg-slate-950 px-3 py-2 text-[10px] font-black text-white">Öffnen</Link>
          </div>

          <div className="grid grid-cols-3 border-t border-slate-100">
            <FlowStep href="/eingang" icon={<Inbox className="h-4 w-4" />} title="Eingang" text="kommt rein" />
            <FlowStep href="/jetzt" icon={<MessageCircle className="h-4 w-4" />} title="Vorgang" text="wird geklärt" />
            <FlowStep href="/dokumente" icon={<FolderOpen className="h-4 w-4" />} title="Mappe" text="geht weiter" />
          </div>
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,.75fr)]">
          <div className="space-y-4">
            <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,.04)] sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-rose-500">Heute zuerst</p>
                  <h2 className="mt-1 text-lg font-black tracking-tight text-slate-950">Nur was deine Entscheidung braucht.</h2>
                </div>
                <Link href="/jetzt" className="text-[10px] font-black text-violet-700">Alle →</Link>
              </div>

              <div className="mt-3 divide-y divide-slate-100">
                {missingReceipts > 0 && (
                  <WorkRow href="/dokumente" icon={<FileText className="h-4 w-4" />} title="Belege zuordnen" text={`${missingReceipts} Stelle${missingReceipts === 1 ? '' : 'n'} brauchen noch Kontext`} />
                )}
                {openQuestions > 0 && (
                  <WorkRow href="/jetzt" icon={<MessageCircle className="h-4 w-4" />} title="Rückfragen beantworten" text={`${openQuestions} Antwort${openQuestions === 1 ? '' : 'en'} fehlen noch`} />
                )}
                {!hasWork && (
                  <div className="py-4 text-sm font-semibold text-slate-400">Gerade braucht nichts deine Entscheidung.</div>
                )}
              </div>
            </section>

            <Link href="/neue-buchungen" className="group flex items-center justify-between gap-4 rounded-[1.4rem] bg-violet-600 px-4 py-4 text-white shadow-[0_10px_28px_rgba(124,58,237,.18)] sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15"><Upload className="h-5 w-5" /></span>
                <div className="min-w-0">
                  <p className="text-sm font-black">Beleg-Stapel hochladen</p>
                  <p className="mt-0.5 truncate text-[11px] font-medium text-violet-100">Dateien rein. Mila ordnet und fragt nur nach, wenn etwas fehlt.</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 transition group-hover:translate-x-0.5" />
            </Link>
          </div>

          <aside className="rounded-[1.5rem] border border-slate-200 bg-[#111217] p-5 text-white shadow-[0_8px_24px_rgba(15,23,42,.08)]">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-300">Mila darunter</p>
            <h2 className="mt-2 text-lg font-black tracking-tight">Sie hält den Vorgang zusammen.</h2>
            <div className="mt-4 space-y-3 text-xs font-semibold leading-5 text-slate-300">
              <p>• Eingang verstehen und zuordnen</p>
              <p>• Fehlenden Kontext als Rückfrage markieren</p>
              <p>• Antworten und Unterlagen wieder am selben Vorgang halten</p>
              <p>• Übergabe erst freigeben, wenn organisatorisch vollständig</p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}

function FlowStep({ icon, title, text, href }: { icon: React.ReactNode; title: string; text: string; href: string }) {
  return (
    <Link href={href} className="group border-r border-slate-100 px-3 py-3.5 last:border-r-0 sm:px-5">
      <span className="text-violet-600">{icon}</span>
      <p className="mt-2 text-xs font-black text-slate-950">{title}</p>
      <p className="mt-0.5 text-[10px] font-semibold text-slate-400">{text}</p>
    </Link>
  )
}

function WorkRow({ href, icon, title, text }: { href: string; icon: React.ReactNode; title: string; text: string }) {
  return (
    <Link href={href} className="flex items-center justify-between gap-3 py-3.5 first:pt-1 transition hover:opacity-80">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-500">{icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-950">{title}</p>
          <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-400">{text}</p>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
    </Link>
  )
}
