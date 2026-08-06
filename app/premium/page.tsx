'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const PILOT_FEATURES = [
  {
    icon: '🧾',
    title: 'Belege vollständig sammeln',
    text: 'Mandanten laden Belege hoch, Mila ordnet sie organisatorisch und hält offene Unterlagen fest.',
  },
  {
    icon: '🔎',
    title: 'Fehlende Angaben sichtbar machen',
    text: 'Mila fragt nach Daten wie Datum, Betrag, Zahlungsnachweis oder fehlender Notiz, ohne steuerlich zu bewerten.',
  },
  {
    icon: '📦',
    title: 'Monatsmappe vorbereiten',
    text: 'Alle Unterlagen landen sortiert in einer Übergabe, damit die Kanzlei weniger Rückfragen stellen muss.',
  },
  {
    icon: '🤝',
    title: 'Kanzlei bleibt Entscheider',
    text: 'Mila ersetzt keine Steuerberatung. Die finale Prüfung und Bewertung bleibt vollständig bei der Kanzlei.',
  },
]

const REQUEST_TEXT =
  'Hallo Julia, ich interessiere mich für den Mila Pilot-Zugang zur Kanzlei-Übergabe. Bitte melde dich bei mir mit den nächsten Schritten.'

export default function PremiumPage() {
  const router = useRouter()
  const [copied, setCopied] = useState(false)

  const copyPilotRequest = async () => {
    try {
      await navigator.clipboard.writeText(REQUEST_TEXT)
      setCopied(true)
    } catch {
      setCopied(false)
      alert(REQUEST_TEXT)
    }
  }

  return (
    <main className="min-h-screen bg-[#fbf9ff] px-4 pb-16 pt-4 text-slate-950">
      <div className="mx-auto max-w-xl space-y-5">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-slate-600 shadow-sm"
        >
          <span aria-hidden="true">←</span>
          Zurück
        </button>

        <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-violet-700 via-violet-600 to-fuchsia-500 p-6 text-white shadow-xl shadow-violet-200">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-white/70">
            Mila Pilot-Zugang
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight">
            Saubere Übergabe.
            <br />
            Weniger Belegchaos.
          </h1>

          <p className="mt-4 max-w-md text-sm font-semibold leading-relaxed text-white/85">
            Mila hilft kleinen Betrieben, Unterlagen vollständig zu sammeln,
            fehlende Angaben sichtbar zu machen und alles verständlich für die
            Kanzlei vorzubereiten.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-white/12 p-4 backdrop-blur">
              <p className="text-xs font-black uppercase tracking-wider text-white/65">
                Halbjahr
              </p>
              <p className="mt-1 text-3xl font-black">149 €</p>
              <p className="mt-1 text-xs font-semibold text-white/70">
                Pilot-Zugang für 6 Monate
              </p>
            </div>

            <div className="rounded-2xl bg-white/12 p-4 backdrop-blur">
              <p className="text-xs font-black uppercase tracking-wider text-white/65">
                Jahr
              </p>
              <p className="mt-1 text-3xl font-black">299 €</p>
              <p className="mt-1 text-xs font-semibold text-white/70">
                Jahreszugang für Betriebe
              </p>
            </div>
          </div>

          <p className="mt-3 text-xs font-semibold text-white/70">
            Persönliche Einrichtung kann separat gebucht werden.
          </p>
        </section>

        <section className="rounded-[2rem] bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-500">
            Wofür Mila gedacht ist
          </p>

          <div className="mt-4 space-y-3">
            {PILOT_FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="flex gap-4 rounded-2xl bg-violet-50 p-4"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
                  {feature.icon}
                </div>

                <div>
                  <h2 className="font-black text-slate-900">
                    {feature.title}
                  </h2>

                  <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                    {feature.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-violet-100 bg-white p-5 shadow-sm">
          <div className="rounded-2xl bg-emerald-50 p-4">
            <p className="font-black text-emerald-800">
              Pilot statt Spielzeug-Abo
            </p>

            <p className="mt-1 text-xs font-semibold leading-relaxed text-emerald-700">
              Mila wird aktuell als ernstes Vorbereitungs-System getestet. Der
              Zugang wird bewusst persönlich vergeben, damit Einrichtung,
              Datenschutz und Kanzlei-Grenzen sauber bleiben.
            </p>
          </div>

          <button
            type="button"
            onClick={copyPilotRequest}
            className="mt-5 w-full rounded-2xl bg-violet-600 px-5 py-4 text-base font-black text-white shadow-lg shadow-violet-200 transition active:scale-[0.98]"
          >
            {copied ? 'Anfrage kopiert' : 'Pilot-Anfrage kopieren'}
          </button>

          <button
            type="button"
            onClick={() => router.push('/login')}
            className="mt-3 w-full rounded-2xl bg-slate-100 px-5 py-4 text-sm font-black text-slate-600"
          >
            Bereits Zugang? Einloggen
          </button>
        </section>

        <p className="px-4 text-center text-xs font-semibold leading-relaxed text-slate-400">
          Mila sortiert, erinnert und bereitet Unterlagen vor. Sie trifft keine
          steuerlichen Entscheidungen und ersetzt keine Steuerberatung.
        </p>
      </div>
    </main>
  )
}
