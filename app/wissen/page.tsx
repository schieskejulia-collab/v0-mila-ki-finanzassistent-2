'use client'

import { useState } from 'react'

type LifeArea = {
  id: string
  icon: string
  title: string
  description: string
  milaFocus: string[]
}

const LIFE_AREAS: LifeArea[] = [
  {
    id: 'montage',
    icon: '👷',
    title: 'Montage / Auswärtstätigkeit',
    description:
      'Du bist beruflich unterwegs, arbeitest an wechselnden Orten oder bist mehrere Tage weg.',
    milaFocus: [
      'Einsatzorte und Zeiträume merken',
      'Hotel, Fahrten, Parken und Tickets sammeln',
      'Arbeitskleidung und Werkzeug markieren',
      'Erstattungen vom Arbeitgeber unterscheiden',
    ],
  },
  {
    id: 'nebenjob',
    icon: '💼',
    title: 'Angestellt + Nebenjob',
    description:
      'Du hast einen Hauptjob und zusätzlich einen Minijob, zweiten Job oder Nebenverdienst.',
    milaFocus: [
      'Einnahmen getrennt halten',
      'Arbeitsmittel und Fahrten sammeln',
      'wichtige Unterlagen fürs Jahr vorbereiten',
      'nichts vergessen, was später geprüft werden sollte',
    ],
  },
  {
    id: 'homeoffice',
    icon: '🏠',
    title: 'Homeoffice / Arbeiten von zuhause',
    description:
      'Du arbeitest ganz oder teilweise zuhause und möchtest relevante Unterlagen sammeln.',
    milaFocus: [
      'Arbeitsmittel markieren',
      'Technik, Internet und Bürobedarf sammeln',
      'berufliche Nutzung notieren',
      'keine festen Versprechen, sondern sauber vorbereiten',
    ],
  },
  {
    id: 'weiterbildung',
    icon: '🎓',
    title: 'Weiterbildung',
    description:
      'Du machst Kurse, Schulungen, Seminare oder kaufst Fachmaterial.',
    milaFocus: [
      'Kurse und Fachbücher sammeln',
      'beruflichen Zusammenhang notieren',
      'Belege im Jahresordner behalten',
      'später schneller wiederfinden',
    ],
  },
  {
    id: 'arbeitsmittel',
    icon: '🛠️',
    title: 'Arbeitsmittel',
    description:
      'Du kaufst Dinge selbst, die du für Arbeit, Nebenjob oder Selbstständigkeit nutzt.',
    milaFocus: [
      'Technik, Werkzeug und Ausstattung erkennen',
      'private und berufliche Nutzung trennen',
      'Belege speichern',
      'bei Unsicherheit nachfragen',
    ],
  },
  {
    id: 'fristen',
    icon: '🧾',
    title: 'Rechnungen & Fristen',
    description:
      'Du möchtest Rechnungen, Raten, Verträge oder wichtige Termine nicht vergessen.',
    milaFocus: [
      'Fälligkeiten speichern',
      '14 Tage vorher erinnern',
      '3 Tage vorher erinnern',
      'bei Engpässen Nachricht für Aufschub vorbereiten',
    ],
  },
]

export default function WissenPage() {
  const [selected, setSelected] = useState<string[]>([])

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    )
  }

  return (
    <main className="min-h-screen bg-[#fbf9ff] p-4 pb-40 text-slate-950">
      <section className="rounded-[2rem] bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-500">
          Mila Lebensprofil
        </p>

        <h1 className="mt-3 text-3xl font-black tracking-tight">
          Sag Mila, worauf sie achten soll
        </h1>

        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
          Mila soll kein Steuerlexikon sein. Sie hilft dir, wichtige Unterlagen,
          Fristen und mögliche Themen nicht zu vergessen.
        </p>
      </section>

      <section className="mt-5 space-y-4">
        {LIFE_AREAS.map((area) => {
          const active = selected.includes(area.id)

          return (
            <button
              key={area.id}
              type="button"
              onClick={() => toggle(area.id)}
              className={`w-full rounded-[2rem] border p-5 text-left shadow-sm transition ${
                active
                  ? 'border-violet-300 bg-violet-50'
                  : 'border-white bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl">{area.icon}</span>

                <div className="flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-black text-slate-950">
                      {area.title}
                    </h2>

                    <span className="text-xl">
                      {active ? '✅' : '○'}
                    </span>
                  </div>

                  <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-500">
                    {area.description}
                  </p>

                  {active && (
                    <div className="mt-4 rounded-2xl bg-white p-4">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-700">
                        Mila achtet dann auf
                      </p>

                      <ul className="mt-2 space-y-1 text-sm font-semibold text-slate-700">
                        {area.milaFocus.map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </section>

      <section className="mt-5 rounded-[2rem] bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-500">
          Wichtig
        </p>

        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
          Mila gibt keine Steuerberatung. Sie sammelt Hinweise, Belege und
          Fristen, damit du später besser vorbereitet bist und weniger vergisst.
        </p>
      </section>
    </main>
  )
}