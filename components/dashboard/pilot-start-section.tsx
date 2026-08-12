'use client'

import Link from 'next/link'

function getStatusLabel(handoff: any) {
  const documentCount = Number(handoff?.documentCount || 0)
  const missingReceiptCount = Number(handoff?.missingReceiptCount || 0)
  const openQuestionCount = Number(handoff?.openQuestionCount || 0)
  const openObligationCount = Number(handoff?.openObligationCount || 0)

  const openCount =
    missingReceiptCount +
    openQuestionCount +
    openObligationCount

  if (documentCount === 0 && openCount === 0) {
    return {
      label: 'Noch nicht gestartet',
      text: 'Erfasse den ersten Beleg oder öffne die Mandantenmappe.',
      tone: 'bg-slate-100 text-slate-600',
    }
  }

  if (openCount === 0) {
    return {
      label: 'Bereit zur Übergabe',
      text: 'Aktuell sind keine organisatorischen Punkte offen.',
      tone: 'bg-emerald-100 text-emerald-700',
    }
  }

  return {
    label: 'In Bearbeitung',
    text: `${openCount} offene Punkte brauchen noch Aufmerksamkeit.`,
    tone: 'bg-amber-100 text-amber-700',
  }
}

const actions = [
  {
    href: '/neue-buchungen',
    title: 'Beleg erfassen',
    text: 'Foto, PDF oder Rechnung einlesen.',
    icon: '＋',
  },
  {
    href: '/dokumente',
    title: 'Mappe öffnen',
    text: 'Unterlagen und fehlende Belege prüfen.',
    icon: '📂',
  },
  {
    href: '/verpflichtungen',
    title: 'Offene Punkte',
    text: 'Fristen und offene Vorgänge ansehen.',
    icon: '◷',
  },
]

export function PilotStartSection({ model }: { model: any }) {
  const handoff = model?.kanzleiHandoff || {}
  const status = getStatusLabel(handoff)

  return (
    <section className="space-y-4">
      <header className="overflow-hidden rounded-[2rem] border border-violet-100 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-violet-700 via-violet-600 to-fuchsia-500 p-5 text-white">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
            Mila Arbeitsplatz
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight">
            Vorbereiten. Klären. Übergeben.
          </h1>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-white/85">
            Organisatorische Vorbereitung für den aktuell ausgewählten Mandanten.
          </p>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                Arbeitsstand
              </p>
              <p className="mt-1 text-lg font-black text-slate-950">
                {status.label}
              </p>
            </div>
            <span className={`rounded-full px-3 py-2 text-xs font-black ${status.tone}`}>
              {Number(handoff?.documentCount || 0)} Dokumente
            </span>
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-600">
            {status.text}
          </p>
        </div>
      </header>

      <section className="grid gap-3">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex items-center gap-4 rounded-2xl border border-violet-100 bg-white p-4 shadow-sm active:scale-[0.99]"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-xl font-black text-violet-700">
              {action.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-base font-black text-slate-950">{action.title}</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-500">{action.text}</p>
            </div>
            <span className="shrink-0 text-lg font-black text-violet-600">›</span>
          </Link>
        ))}
      </section>

      <Link
        href="/demo"
        className="block rounded-2xl border border-dashed border-violet-200 bg-violet-50 px-4 py-3 text-center text-sm font-black text-violet-700"
      >
        Demo für einen Termin öffnen
      </Link>

      <p className="px-2 text-center text-[11px] font-semibold leading-relaxed text-slate-400">
        Mila organisiert und bereitet vor. Steuerliche und rechtliche Entscheidungen bleiben bei der zuständigen Fachstelle.
      </p>
    </section>
  )
}
