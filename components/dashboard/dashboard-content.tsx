'use client'

import Link from 'next/link'
import {
  ArrowRight,
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
  const documentCount = Number(handoff.documentCount || 0)
  const greeting = model?.greeting || 'Guten Abend'
  const userName = model?.userName || 'Julia'

  return (
    <main className="min-h-screen bg-[#f6f6f8] pb-24 lg:pb-8">
      <div className="mx-auto w-full max-w-[1360px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <header className="border-b border-slate-200 pb-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-violet-700">Kanzlei-Arbeitsplatz</span>
                <span className="text-[11px] font-semibold text-slate-400">Organisation vor der fachlichen Prüfung</span>
              </div>
              <h1 className="mt-4 text-[34px] font-black tracking-tight text-slate-950 lg:text-[42px]">{greeting}, {userName}.</h1>
              <p className="mt-2 max-w-2xl text-base font-medium leading-7 text-slate-500 lg:text-lg">
                Du arbeitest am Vorgang. Mila hält Eingang, Rückfragen, Unterlagen und Übergabe im Zusammenhang.
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/suche" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm"><Search className="h-4 w-4" /> Suche</Link>
              <Link href="/eingang" className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-sm"><Inbox className="h-4 w-4" /> Eingang öffnen</Link>
            </div>
          </div>
        </header>

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,.7fr)]">
          <div className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Aktive Akte</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">Tester A · August 2026</h2>
                  <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-slate-500">
                    Alles, was zu diesem Mandanten gehört, bleibt an einer Stelle verbunden: Eingang, Vorgang, Dokumente, Rückfragen und Übergabe.
                  </p>
                </div>
                <Link href="/dokumente" className="inline-flex shrink-0 items-center gap-1 text-xs font-black text-violet-700">Akte öffnen <ArrowRight className="h-3.5 w-3.5" /></Link>
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                <FlowStep icon={<Inbox className="h-4 w-4" />} title="Eingang" text="Was neu hereinkommt" href="/eingang" />
                <FlowStep icon={<MessageCircle className="h-4 w-4" />} title="Vorgang" text="Was noch geklärt wird" href="/jetzt" />
                <FlowStep icon={<FolderOpen className="h-4 w-4" />} title="Mappe" text="Was sauber übergeben wird" href="/dokumente" />
              </div>
            </section>

            <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm lg:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-500">Heute zuerst</p>
                  <h2 className="mt-1 text-lg font-black text-slate-950">Nur Dinge, bei denen du wirklich gebraucht wirst.</h2>
                </div>
                <Link href="/jetzt" className="text-xs font-black text-violet-700">Alle Vorgänge →</Link>
              </div>

              <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
                {missingReceipts > 0 && (
                  <WorkRow href="/dokumente" icon={<FileText className="h-4 w-4" />} title="Belege brauchen Zuordnung" text="Mila hat die Stellen markiert, an denen noch Kontext fehlt." />
                )}
                {openQuestions > 0 && (
                  <WorkRow href="/jetzt" icon={<MessageCircle className="h-4 w-4" />} title="Rückfragen beantworten" text="Antwort rein, Mila prüft den Vorgang danach erneut." />
                )}
                {missingReceipts === 0 && openQuestions === 0 && (
                  <div className="p-4 text-sm font-semibold text-slate-500">Im Moment liegt nichts vor, das deine Entscheidung braucht.</div>
                )}
              </div>
            </section>

            <Link href="/neue-buchungen" className="flex items-center justify-between gap-4 rounded-2xl border border-dashed border-violet-300 bg-white p-5 shadow-sm transition hover:bg-violet-50/40 lg:p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Upload className="h-5 w-5" /></span>
                <div>
                  <p className="text-base font-black text-slate-950">Beleg-Stapel hochladen</p>
                  <p className="mt-1 text-xs font-medium leading-5 text-slate-500">Dateien rein. Mila liest, ordnet, hält Originale zusammen und fragt nur nach, wenn wirklich etwas fehlt.</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-violet-500" />
            </Link>
          </div>

          <div className="space-y-5">
            <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm lg:p-6">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Sparkles className="h-4 w-4" /></span>
                <div>
                  <p className="text-sm font-black text-violet-700">Mila arbeitet darunter</p>
                  <p className="text-[11px] text-slate-500">Nicht als zweite Oberfläche, sondern als Verarbeitungsschicht.</p>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                <BackgroundRow icon={<Inbox className="h-4 w-4" />} text="Eingänge verstehen und einem Vorgang zuordnen" />
                <BackgroundRow icon={<MessageCircle className="h-4 w-4" />} text="Fehlenden Kontext als konkrete Rückfrage markieren" />
                <BackgroundRow icon={<FileCheck2 className="h-4 w-4" />} text="Vollständigkeit organisatorisch prüfen" />
                <BackgroundRow icon={<FolderOpen className="h-4 w-4" />} text="Übergabe für die fachliche Prüfung vorbereiten" />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Arbeitsprinzip</p>
              <h2 className="mt-2 text-lg font-black text-slate-950">Ein Sachverhalt bleibt ein Vorgang.</h2>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                Kein Wechsel zwischen fünf getrennten Mini-Apps. Was im Eingang beginnt, bleibt mit seinen Antworten, Dokumenten und der späteren Mappe verbunden.
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}

function FlowStep({ icon, title, text, href }: { icon: React.ReactNode; title: string; text: string; href: string }) {
  return (
    <Link href={href} className="group rounded-xl border border-slate-200 p-4 transition hover:border-violet-200 hover:bg-violet-50/30">
      <span className="text-violet-600">{icon}</span>
      <p className="mt-3 text-sm font-black text-slate-950">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{text}</p>
    </Link>
  )
}

function WorkRow({ href, icon, title, text }: { href: string; icon: React.ReactNode; title: string; text: string }) {
  return (
    <Link href={href} className="flex items-center justify-between gap-3 p-4 transition hover:bg-slate-50">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-500">{icon}</span>
        <div>
          <p className="text-sm font-black text-slate-950">{title}</p>
          <p className="mt-0.5 text-xs leading-5 text-slate-500">{text}</p>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
    </Link>
  )
}

function BackgroundRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2.5 text-xs font-semibold leading-5 text-slate-600">
      <span className="text-violet-600">{icon}</span>
      <span>{text}</span>
    </div>
  )
}
