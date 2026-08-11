'use client'

import Link from 'next/link'

function getStatusLabel(handoff: any) {
  const documentCount = Number(handoff?.documentCount || 0)
  const missingReceiptCount = Number(handoff?.missingReceiptCount || 0)
  const openQuestionCount = Number(handoff?.openQuestionCount || 0)
  const openObligationCount = Number(handoff?.openObligationCount || 0)

  if (documentCount === 0) {
    return {
      label: 'Noch nicht gestartet',
      text: 'Sobald die ersten Unterlagen erfasst sind, zeigt Mila hier den Bearbeitungsstand.',
      tone: 'bg-slate-100 text-slate-600',
    }
  }

  const openCount =
    missingReceiptCount +
    openQuestionCount +
    openObligationCount

  if (openCount === 0) {
    return {
      label: 'Bereit zur Übergabe',
      text: 'Die aktuell erfassten Unterlagen haben keine offenen organisatorischen Punkte.',
      tone: 'bg-emerald-100 text-emerald-700',
    }
  }

  return {
    label: 'In Bearbeitung',
    text: `${openCount} offene Punkte sollten vor der Übergabe noch geklärt werden.`,
    tone: 'bg-amber-100 text-amber-700',
  }
}

const workAreas = [
  {
    href: '/dokumente',
    eyebrow: 'Arbeitsmappe',
    title: 'Mandantenmappe',
    text: 'Unterlagen, fehlende Belege, Rückfragen und Übergabestatus an einem Ort.',
    cta: 'Mappe öffnen',
  },
  {
    href: '/neue-buchungen',
    eyebrow: 'Eingang',
    title: 'Beleg erfassen',
    text: 'Foto, PDF oder Rechnung einlesen und strukturiert weiterverarbeiten.',
    cta: 'Beleg erfassen',
  },
  {
    href: '/verpflichtungen',
    eyebrow: 'Offene Punkte',
    title: 'Pflichten & Fristen',
    text: 'Offene Zahlungen, Bescheide und wichtige Termine organisatorisch im Blick behalten.',
    cta: 'Offene Punkte prüfen',
  },
  {
    href: '/demo',
    eyebrow: 'Vorführung',
    title: 'Demo öffnen',
    text: 'Beispielbetrieb öffnen, um den Ablauf ohne echte Mandantendaten zu zeigen.',
    cta: 'Demo starten',
  },
]

export function PilotStartSection({ model }: { model: any }) {
  const handoff = model?.kanzleiHandoff || {}
  const status = getStatusLabel(handoff)

  return (
    <section className="space-y-5">
      <header className="overflow-hidden rounded-[2rem] border border-violet-100 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-violet-700 via-violet-600 to-fuchsia-500 p-6 text-white">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70">
            Mila Arbeitsplatz
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight">
            Unterlagen vorbereiten. Offene Punkte klären. Sauber übergeben.
          </h1>

          <p className="mt-4 max-w-xl text-sm font-semibold leading-relaxed text-white/85">
            Mila unterstützt die organisatorische Vorbereitung von Unterlagen.
            Steuerliche Bewertung und finale Buchungsentscheidungen bleiben bei
            der zuständigen Kanzlei.
          </p>
        </div>

        <div className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                Aktueller Arbeitsstand
              </p>
              <p className="mt-2 text-xl font-black text-slate-950">
                {status.label}
              </p>
            </div>

            <span className={`rounded-full px-3 py-2 text-xs font-black ${status.tone}`}>
              {Number(handoff?.documentCount || 0)} Dokumente
            </span>
          </div>

          <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600">
            {status.text}
          </p>
        </div>
      </header>

      <section>
        <div className="mb-3">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">
            Was möchtest du bearbeiten?
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {workAreas.map((area) => (
            <Link
              key={area.title}
              href={area.href}
              className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm transition active:scale-[0.99]"
            >
              <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-500">
                {area.eyebrow}
              </p>

              <h2 className="mt-2 text-xl font-black text-slate-950">
                {area.title}
              </h2>

              <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
                {area.text}
              </p>

              <p className="mt-4 text-sm font-black text-violet-700">
                {area.cta} →
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
          Klare Grenze
        </p>

        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
          Mila ordnet, sammelt und macht fehlende Angaben sichtbar. Sie ersetzt
          keine steuerliche oder rechtliche Fachentscheidung.
        </p>
      </section>
    </section>
  )
}