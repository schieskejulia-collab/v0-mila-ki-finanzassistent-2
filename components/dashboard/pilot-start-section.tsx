'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type PilotMode = 'demo' | 'kanzlei' | 'mandant'

const modeTabs: Array<{
  mode: PilotMode
  label: string
}> = [
  {
    mode: 'demo',
    label: 'Demo',
  },
  {
    mode: 'kanzlei',
    label: 'Kanzlei',
  },
  {
    mode: 'mandant',
    label: 'Mandant',
  },
]

const offerPaths = [
  {
    title: 'Kanzlei-Kooperation',
    text: 'Für Steuerberater: Mandantenunterlagen kommen vorsortiert, vollständiger und mit klaren Rückfragen an.',
    label: 'B2B',
  },
  {
    title: 'VA-Service für Betriebe',
    text: 'Für kleine Betriebe: Julia bereitet Belege, Fahrten, Stunden und Nachweise mit Mila für die Kanzlei vor.',
    label: 'Service',
  },
]

const mandantActions = [
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

const mandantModules = [
  {
    href: '/dokumente',
    title: 'Kanzlei-Mappe',
    text: 'Belege, Nachweise und Rückfragen fuer die Übergabe bündeln.',
    label: 'aktiv',
  },
  {
    href: '/fahrtenbuch',
    title: 'Fahrtenbuch',
    text: 'Fahrten, Belegfoto und Zweck dokumentieren, wenn der Mandant es braucht.',
    label: 'aktiv',
  },
  {
    href: '/business/handwerk',
    title: 'Stunden & Mitarbeiter',
    text: 'Zeiten, Mitarbeiterkosten und Baustellenkontext als Pilotmodul vorbereiten.',
    label: 'pilot',
  },
  {
    href: '/dokumente',
    title: 'Sonderfälle & Nachweise',
    text: 'Krankheit, Pflege, Behinderung, Ausland, Firmenwagen oder besondere Verträge nur als Kontext markieren.',
    label: 'kontext',
  },
]

const kanzleiActions = [
  {
    href: '/dokumente?demo=1',
    title: 'Mandantenmappe prüfen',
    text: 'Vorsortierte Belege, Rückfragen und fehlende Nachweise ansehen.',
    label: 'Prüfen',
  },
  {
    href: '/chat',
    title: 'Rückfragen formulieren',
    text: 'Aus offenen Punkten einfache Nachfragen für den Mandanten machen.',
    label: 'Klären',
  },
  {
    href: '/verpflichtungen',
    title: 'Fristen überblicken',
    text: 'Bescheide und Zahltermine organisatorisch sichtbar halten.',
    label: 'Fristen',
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
    title: 'System und Service werden sichtbar',
    text: 'Die Demo zeigt nicht nur Software, sondern wie die Kanzlei-Vorbereitung praktisch abläuft.',
  },
  {
    title: 'Rückfragen vor der Kanzlei',
    text: 'Julia oder der Betrieb ergänzt Zweck, Projekt oder fehlenden Kontext, bevor die Kanzlei nachhaken muss.',
  },
  {
    title: 'Monatsmappe entsteht',
    text: 'Alles liegt sortiert bereit, ohne steuerliche Entscheidungen vorwegzunehmen.',
  },
]

const demoTalkTrack = [
  {
    title: 'Angebot in einem Satz',
    text: 'Ich bereite Unterlagen vor, damit Kanzlei und Betrieb weniger Rückfragen und weniger Sucherei haben.',
  },
  {
    title: 'Demo-Mappe öffnen',
    text: 'Zeige den Beispielbetrieb, die fehlenden Belege, offene Rückfragen und den Übergabe-Stand.',
  },
  {
    title: 'Rolle sauber trennen',
    text: 'Kanzlei bekommt die Prüfansicht. Betrieb oder Julia arbeiten die Unterlagen im Mandantenbereich vor.',
  },
  {
    title: 'Nächsten Schritt anbieten',
    text: 'Pilot mit einem echten Mandanten oder einem kleinen Betrieb starten, ohne direkt die ganze Kanzlei umzustellen.',
  },
]

const pilotAnswers = [
  {
    question: 'Ist Mila eine Software oder dein VA-Service?',
    answer: 'Beides sauber getrennt: Mila ist mein Arbeitssystem, und daraus kann ein Service oder später ein Mandantenportal werden.',
  },
  {
    question: 'Ersetzt Mila die Kanzlei?',
    answer: 'Nein. Mila bereitet nur organisatorisch vor. Bewertung und finale Buchung bleiben bei der Kanzlei.',
  },
  {
    question: 'Muss der Mandant direkt selbst damit arbeiten?',
    answer: 'Nein. Zum Start kann ich die Mappe selbst führen und nur die vorbereitete Übersicht liefern.',
  },
]

export function PilotStartSection({ model }: { model: any }) {
  const handoff = model.kanzleiHandoff
  const [mode, setMode] = useState<PilotMode>('demo')

  useEffect(() => {
    const savedMode = window.localStorage.getItem('mila-pilot-mode')

    if (
      savedMode === 'demo' ||
      savedMode === 'kanzlei' ||
      savedMode === 'mandant'
    ) {
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
              Mila Pilot
            </p>

            <h1 className="mt-3 text-3xl font-black tracking-tight">
              {getHeadline(mode)}
            </h1>
          </div>

          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black text-white/80">
            fokussiert
          </span>
        </div>

        <p className="mt-4 max-w-lg text-sm font-semibold leading-relaxed text-white/85">
          {getIntro(mode, handoff)}
        </p>

        <p className="mt-3 text-xs font-semibold leading-relaxed text-white/65">
          Mila ist System und Werkzeug: nach außen Kanzlei-Vorbereitung, innen
          dein schneller VA-Arbeitsplatz.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 bg-violet-50 p-2">
        {modeTabs.map((item) => (
          <button
            key={item.mode}
            type="button"
            onClick={() => chooseMode(item.mode)}
            className={
              mode === item.mode
                ? 'rounded-2xl bg-white px-3 py-3 text-sm font-black text-violet-700 shadow-sm'
                : 'rounded-2xl px-3 py-3 text-sm font-black text-slate-500'
            }
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid gap-2 border-b border-violet-50 bg-white p-4 sm:grid-cols-2">
        {offerPaths.map((path) => (
          <div
            key={path.title}
            className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-500">
                  {path.label}
                </p>

                <p className="mt-2 font-black text-slate-950">
                  {path.title}
                </p>
              </div>
            </div>

            <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-600">
              {path.text}
            </p>
          </div>
        ))}
      </div>

      {mode === 'demo' && (
        <DemoMode onStartMandant={() => chooseMode('mandant')} />
      )}

      {mode === 'kanzlei' && <KanzleiMode />}

      {mode === 'mandant' && <MandantMode />}
    </section>
  )
}

function DemoMode({
  onStartMandant,
}: {
  onStartMandant: () => void
}) {
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
              Eine vorbereitete Monatsmappe, damit du im Termin direkt zeigen
              kannst, was Kanzlei und Betrieb davon haben.
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

      <section className="rounded-2xl border border-violet-100 bg-white p-4">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">
          Terminleitfaden
        </p>

        <h2 className="mt-2 text-xl font-black text-slate-950">
          So führst du Mila vor
        </h2>

        <div className="mt-4 space-y-3">
          {demoTalkTrack.map((item, index) => (
            <div
              key={item.title}
              className="rounded-2xl bg-violet-50 p-3"
            >
              <p className="text-xs font-black uppercase tracking-wider text-violet-500">
                {index + 1}. {item.title}
              </p>

              <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-600">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
          Wenn Rückfragen kommen
        </p>

        <div className="mt-3 space-y-3">
          {pilotAnswers.map((item) => (
            <div key={item.question}>
              <p className="text-sm font-black text-slate-950">
                {item.question}
              </p>

              <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-600">
                {item.answer}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/dokumente?demo=1"
          className="rounded-2xl bg-violet-600 px-4 py-4 text-center text-sm font-black text-white shadow-lg shadow-violet-100"
        >
          Demo-Mappe ansehen
        </Link>

        <button
          type="button"
          onClick={onStartMandant}
          className="rounded-2xl border border-violet-100 bg-white px-4 py-4 text-sm font-black text-violet-700"
        >
          Mandant starten
        </button>
      </div>
    </div>
  )
}

function KanzleiMode() {
  return (
    <div className="space-y-4 p-4">
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
          Kooperation
        </p>

        <h2 className="mt-2 text-xl font-black text-slate-950">
          Entlastung für Steuerberater
        </h2>

        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
          Mila ist hier kein Ersatz für die Kanzlei, sondern dein
          Vorbereitungs-System: Unterlagen sammeln, fehlende Nachweise finden
          und Rückfragen vor der Buchhaltung klären.
        </p>

        <p className="mt-3 rounded-2xl bg-white/70 p-3 text-xs font-black uppercase tracking-wider text-emerald-700">
          Angebot: Kooperation mit Julia. Die Kanzlei bekommt eine sauberere
          Übergabe, nicht noch ein neues Chaos-Tool.
        </p>
      </div>

      <div className="grid gap-3">
        {kanzleiActions.map((action) => (
          <Link
            key={action.title}
            href={action.href}
            className="rounded-2xl border border-slate-100 bg-white p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-slate-950">
                  {action.title}
                </p>

                <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
                  {action.text}
                </p>
              </div>

              <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700">
                {action.label}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function MandantMode() {
  return (
    <div className="space-y-4 p-4">
      <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">
          VA-Service
        </p>

        <h2 className="mt-2 text-xl font-black text-slate-950">
          Betrieb vorbereiten, Mila intern nutzen
        </h2>

        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
          Für Mandanten kann Julia die Unterlagen als VA vorbereiten und Mila
          als eigenes Arbeitssystem nutzen. Der Betrieb muss nicht sofort eine
          fertige Software bedienen.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {mandantActions.map((action) => (
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

      <div className="rounded-2xl border border-slate-100 bg-white p-4">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
          Bei Bedarf zuschalten
        </p>

        <div className="mt-3 grid gap-2">
          {mandantModules.map((module) => (
            <Link
              key={module.title}
              href={module.href}
              className="rounded-2xl border border-slate-100 p-3 transition active:scale-[0.98]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black text-slate-950">
                    {module.title}
                  </p>

                  <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                    {module.text}
                  </p>
                </div>

                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  {module.label}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <p className="rounded-2xl bg-slate-50 p-4 text-xs font-semibold leading-relaxed text-slate-500">
        Der Mandant kann später selbst in Mila arbeiten. Zum Start reicht aber
        auch: Julia nutzt Mila intern und liefert die vorbereitete Mappe.
      </p>
    </div>
  )
}

function getHeadline(mode: PilotMode) {
  if (mode === 'kanzlei') return 'Kanzlei-Übergabe prüfen'
  if (mode === 'mandant') return 'Mandantenmappe aufbauen'
  return 'Demo für den Termin'
}

function getIntro(mode: PilotMode, handoff: any) {
  if (mode === 'kanzlei') {
    return 'Für Steuerberater zählt: weniger Sucherei, weniger Rückfragen und Mandanten, die vorbereiteter liefern.'
  }

  if (mode === 'mandant') {
    return getMandantLine(handoff)
  }

  return 'Zeig Mila als fokussiertes System: erst Demo-Mappe, dann Kanzlei-Kooperation oder VA-Service erklären.'
}

function getMandantLine(handoff: any) {
  if (!handoff) {
    return 'Der Mandant startet ruhig: Belege sammeln, Rückfragen beantworten und die Mappe vorbereiten.'
  }

  if (handoff.missingReceiptCount > 0) {
    return `Starte mit ${handoff.missingReceiptCount} fehlenden Belegen. Dann wird die Mappe für die Kanzlei ruhiger.`
  }

  if (handoff.openQuestionCount > 0) {
    return `${handoff.openQuestionCount} Rückfragen sind offen. Genau dort entsteht sonst später Kanzlei-Pingpong.`
  }

  if (handoff.openObligationCount > 0) {
    return `Die Beleglage sieht besser aus. Jetzt sind ${handoff.openObligationCount} offene Pflichten dran.`
  }

  return 'Die Mappe wirkt ordentlich. Jetzt kann der letzte Kontext ergänzt und die Übergabe vorbereitet werden.'
}
