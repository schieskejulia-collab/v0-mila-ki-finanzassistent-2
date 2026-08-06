'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type PilotMode = 'demo' | 'own'

const ownActions = [
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

const demoStats = [
  {
    label: 'Belege',
    value: '18',
  },
  {
    label: 'Rückfragen',
    value: '2',
  },
  {
    label: 'Bereit',
    value: '88%',
  },
]

const demoSteps = [
  {
    title: 'Belegchaos wird sichtbar',
    text: 'Mila erkennt fehlende Zahlungsnachweise und unklare Ausgaben.',
  },
  {
    title: 'Rückfragen vor der Kanzlei',
    text: 'Der Betrieb ergänzt Zweck, Projekt oder fehlenden Kontext direkt in Mila.',
  },
  {
    title: 'Monatsmappe entsteht',
    text: 'Alles liegt sortiert bereit, ohne steuerliche Entscheidungen vorwegzunehmen.',
  },
]

export function PilotStartSection({ model }: { model: any }) {
  const handoff = model.kanzleiHandoff
  const [mode, setMode] = useState<PilotMode>('demo')

  useEffect(() => {
    const savedMode = window.localStorage.getItem('mila-pilot-mode')

    if (savedMode === 'demo' || savedMode === 'own') {
      setMode(savedMode)
    }
  }, [])

  function chooseMode(nextMode: PilotMode) {
    setMode(nextMode)
    window.localStorage.setItem('mila-pilot-mode', nextMode)
  }

  return (
    <section className="overflow-hidden rounded-[2rem] border border-violet-100 bg-white shadow-sm">
      <div className="bg-gradient-to-br from-violet-700 via-violet-600 to-fuchsia-500 p-6 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70">
              Mila Pilotmodus
            </p>

            <h1 className="mt-3 text-3xl font-black tracking-tight">
              {mode === 'demo'
                ? 'Mila als Software zeigen'
                : 'Eigenen Betrieb starten'}
            </h1>
          </div>

          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black text-white/80">
            Kanzlei-ready
          </span>
        </div>

        <p className="mt-4 max-w-lg text-sm font-semibold leading-relaxed text-white/85">
          {mode === 'demo'
            ? 'Zeig Mila im Termin mit Beispielbetrieb, fertiger Mappe und klarer Übergabe-Logik. Danach kann ein echter Betrieb direkt starten.'
            : getMilaLine(handoff)}
        </p>

        <p className="mt-3 text-xs font-semibold leading-relaxed text-white/65">
          Ich sortiere, erinnere und frage nach. Die finale steuerliche Prüfung
          bleibt bewusst bei der Kanzlei.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 bg-violet-50 p-2">
        <button
          type="button"
          onClick={() => chooseMode('demo')}
          className={
            mode === 'demo'
              ? 'rounded-2xl bg-white px-4 py-3 text-sm font-black text-violet-700 shadow-sm'
              : 'rounded-2xl px-4 py-3 text-sm font-black text-slate-500'
          }
        >
          Demo ansehen
        </button>

        <button
          type="button"
          onClick={() => chooseMode('own')}
          className={
            mode === 'own'
              ? 'rounded-2xl bg-white px-4 py-3 text-sm font-black text-violet-700 shadow-sm'
              : 'rounded-2xl px-4 py-3 text-sm font-black text-slate-500'
          }
        >
          Eigenen Betrieb starten
        </button>
      </div>

      {mode === 'demo' ? (
        <DemoMode onStartOwn={() => chooseMode('own')} />
      ) : (
        <OwnMode />
      )}
    </section>
  )
}

function DemoMode({ onStartOwn }: { onStartOwn: () => void }) {
  return (
    <div className="space-y-4 p-4">
      <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">
              Beispielbetrieb
            </p>

            <h2 className="mt-2 text-xl font-black text-slate-950">
              Malerbetrieb Schneider
            </h2>

            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
              Monatsunterlagen für Juli: Belege, Rückfragen und Pflichten sind
              als Demo vorbereitet.
            </p>
          </div>

          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-violet-700 shadow-sm">
            Demo
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {demoStats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl bg-white p-3 text-center shadow-sm"
            >
              <p className="text-xl font-black text-slate-950">
                {stat.value}
              </p>

              <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {demoSteps.map((step, index) => (
          <div
            key={step.title}
            className="rounded-2xl border border-slate-100 bg-white p-4"
          >
            <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-500">
              Schritt {index + 1}
            </p>

            <p className="mt-2 font-black text-slate-900">
              {step.title}
            </p>

            <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-600">
              {step.text}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/dokumente?demo=1"
          className="rounded-2xl bg-violet-600 px-4 py-4 text-center text-sm font-black text-white shadow-lg shadow-violet-100"
        >
          Demo-Mappe ansehen
        </Link>

        <button
          type="button"
          onClick={onStartOwn}
          className="rounded-2xl border border-violet-100 bg-white px-4 py-4 text-sm font-black text-violet-700"
        >
          Echten Betrieb starten
        </button>
      </div>
    </div>
  )
}

function OwnMode() {
  return (
    <div className="grid gap-3 p-4 sm:grid-cols-2">
      {ownActions.map((action) => (
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
