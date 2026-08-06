import Link from 'next/link'

const actions = [
  {
    href: '/neue-buchungen',
    title: 'Beleg reinholen',
    text: 'Foto, PDF oder Rechnung aufnehmen und direkt vorsortieren.',
    label: 'Scannen',
    tone: 'bg-violet-600 text-white shadow-lg shadow-violet-100',
  },
  {
    href: '/dokumente',
    title: 'Mappe prüfen',
    text: 'Fehlende Belege, Rückfragen und Übergabe-Stand ansehen.',
    label: 'Mappe',
    tone: 'bg-white text-slate-900 border border-violet-100',
  },
  {
    href: '/verpflichtungen',
    title: 'Fristen klären',
    text: 'Offene Zahlungen, Bescheide und wichtige Termine prüfen.',
    label: 'Pflichten',
    tone: 'bg-white text-slate-900 border border-violet-100',
  },
  {
    href: '/chat',
    title: 'Mila fragen',
    text: 'Kurz klären, was als Nächstes sinnvoll vorbereitet wird.',
    label: 'Chat',
    tone: 'bg-white text-slate-900 border border-violet-100',
  },
]

export function PilotStartSection({ model }: { model: any }) {
  const handoff = model.kanzleiHandoff
  const milaLine = getMilaLine(handoff)

  return (
    <section className="overflow-hidden rounded-[2rem] border border-violet-100 bg-white shadow-sm">
      <div className="bg-gradient-to-br from-violet-700 via-violet-600 to-fuchsia-500 p-6 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70">
              Mila Pilotmodus
            </p>

            <h1 className="mt-3 text-3xl font-black tracking-tight">
              Was bereiten wir heute vor?
            </h1>
          </div>

          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black text-white/80">
            Kanzlei-ready
          </span>
        </div>

        <p className="mt-4 max-w-lg text-sm font-semibold leading-relaxed text-white/85">
          {milaLine}
        </p>

        <p className="mt-3 text-xs font-semibold leading-relaxed text-white/65">
          Ich sortiere, erinnere und frage nach. Die finale steuerliche Prüfung
          bleibt bewusst bei deiner Kanzlei.
        </p>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-2">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className={`rounded-2xl p-4 transition active:scale-[0.98] ${action.tone}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black">
                  {action.title}
                </p>

                <p className="mt-2 text-xs font-semibold leading-relaxed opacity-75">
                  {action.text}
                </p>
              </div>

              <span className="rounded-full bg-current/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider opacity-80">
                {action.label}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

function getMilaLine(handoff: any) {
  if (!handoff) {
    return 'Wir starten ruhig: Erst Belege sammeln, dann Rückfragen sichtbar machen, dann sauber übergeben.'
  }

  if (handoff.missingReceiptCount > 0) {
    return `Ich würde mit den ${handoff.missingReceiptCount} fehlenden Belegen starten. Dann wird die Mappe spürbar ruhiger.`
  }

  if (handoff.openQuestionCount > 0) {
    return `Es sind noch ${handoff.openQuestionCount} Rückfragen offen. Genau dort entsteht später sonst Kanzlei-Pingpong.`
  }

  if (handoff.openObligationCount > 0) {
    return `Die Beleglage sieht besser aus. Jetzt würde ich die ${handoff.openObligationCount} offenen Pflichten prüfen.`
  }

  return 'Die Mappe wirkt ordentlich. Heute können wir den letzten Kontext ergänzen und die Übergabe vorbereiten.'
}
