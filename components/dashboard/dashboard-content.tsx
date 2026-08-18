'use client'

import Link from 'next/link'
import { ArrowRight, CheckCircle2, FileText, Inbox, Plus, Users } from 'lucide-react'

export function DashboardContent({ model }: { model: any }) {
  const openItems = Number(model?.openObligations ?? model?.obligations?.open ?? 0)
  const documents = Number(model?.documents?.length ?? model?.documentCount ?? 0)

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 pb-32 pt-6">
      <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Heute</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Was steht an?</h1>
        <p className="mt-2 text-sm font-medium text-slate-500">
          {openItems > 0 ? `${openItems} offene Punkte warten auf dich.` : 'Aktuell ist nichts Dringendes offen.'}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Link href="/verpflichtungen" className="rounded-3xl bg-amber-50 p-4 ring-1 ring-amber-100">
            <p className="text-3xl font-black text-slate-950">{openItems}</p>
            <p className="mt-1 text-sm font-bold text-slate-700">Offen</p>
          </Link>
          <Link href="/dokumente" className="rounded-3xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
            <p className="text-3xl font-black text-slate-950">{documents}</p>
            <p className="mt-1 text-sm font-bold text-slate-700">Dokumente</p>
          </Link>
        </div>
      </section>

      <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Arbeitsplatz</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">Direkt loslegen</h2>
          </div>
          <CheckCircle2 className="h-7 w-7 text-emerald-500" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <WorkLink href="/dokumente" icon={FileText} title="Dokumente" />
          <WorkLink href="/crm" icon={Users} title="Mandanten" />
          <WorkLink href="/neue-buchungen" icon={Plus} title="Erfassen" />
          <WorkLink href="/jetzt" icon={Inbox} title="Eingang" />
        </div>
      </section>

      <Link href="/jetzt" className="flex items-center justify-between rounded-[2rem] bg-slate-950 p-5 text-white">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-300">Mila</p>
          <p className="mt-1 text-lg font-black">Neuen Vorgang bearbeiten</p>
        </div>
        <ArrowRight className="h-5 w-5" />
      </Link>
    </main>
  )
}

function WorkLink({ href, icon: Icon, title }: { href: string; icon: any; title: string }) {
  return (
    <Link href={href} className="flex min-h-28 flex-col justify-between rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <Icon className="h-6 w-6 text-violet-600" />
      <span className="text-base font-black text-slate-900">{title}</span>
    </Link>
  )
}
