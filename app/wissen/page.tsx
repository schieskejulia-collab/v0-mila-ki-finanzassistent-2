'use client'

import { useState } from 'react'

type Tip = {
  titel: string
  kategorie: string
  status_info: string
  beschreibung: string
  hinweis: string
  tags: string[]
}

const STEUER_TIPPS: Tip[] = [
  {
    titel: 'Software & digitale Tools',
    kategorie: 'Software',
    status_info: 'Selbstständig · Freelancer · Kleinunternehmer',
    beschreibung:
      'Software, KI-Tools, Hosting, Domains oder Buchhaltungstools können beruflich relevant sein und oft als Betriebsausgabe berücksichtigt werden.',
    hinweis:
      'Mila prüft solche Kosten besonders auf wiederkehrende Abos und unnötige Doppelbelastungen.',
    tags: ['software', 'tool', 'ki', 'hosting', 'domain', 'abo'],
  },
  {
    titel: 'Bewirtung sauber dokumentieren',
    kategorie: 'Bewirtung',
    status_info: 'Selbstständig · Freelancer · Gewerbe',
    beschreibung:
      'Geschäftliche Bewirtung kann steuerlich relevant sein. Wichtig sind ein ordentlicher Beleg, Anlass und Teilnehmer.',
    hinweis:
      'Mila erinnert dich daran, Namen und Anlass direkt in der Notiz zu speichern.',
    tags: ['bewirtung', 'essen', 'kunden', 'restaurant'],
  },
  {
    titel: 'Reisekosten & Montage',
    kategorie: 'Reisen',
    status_info: 'Angestellte · Montage · Selbstständige',
    beschreibung:
      'Bei beruflichen Fahrten, Auswärtstätigkeit oder Montage können Fahrtkosten, Übernachtungen und Verpflegungspauschalen wichtig sein.',
    hinweis:
      'Mila sollte hier immer nach Spesen, Hotel, Reisetagen und Arbeitgeber-Erstattungen fragen.',
    tags: ['reise', 'montage', 'fahrtkosten', 'hotel', 'spesen'],
  },
  {
    titel: 'Weiterbildung & Fachwissen',
    kategorie: 'Weiterbildung',
    status_info: 'Alle',
    beschreibung:
      'Kurse, Seminare, Fachbücher oder berufliche Coachings können steuerlich relevant sein, wenn ein beruflicher Zusammenhang besteht.',
    hinweis:
      'Mila kann Weiterbildung separat markieren, damit du diese Ausgaben später schneller findest.',
    tags: ['kurs', 'seminar', 'fortbildung', 'buch', 'lernen'],
  },
  {
    titel: 'Arbeitsmittel & Technik',
    kategorie: 'Hardware',
    status_info: 'Alle',
    beschreibung:
      'Laptop, Maus, Tastatur, Kamera, Handy oder Werkzeug können beruflich relevant sein. Je nach Preis und Nutzung kann eine Sofortberücksichtigung oder Abschreibung eine Rolle spielen.',
    hinweis:
      'Mila erkennt Technik und fragt später nach beruflicher Nutzung und Anschaffungspreis.',
    tags: ['hardware', 'technik', 'laptop', 'maus', 'werkzeug'],
  },
  {
    titel: 'Homeoffice & Arbeitszimmer',
    kategorie: 'Homeoffice',
    status_info: 'Angestellte · Selbstständige · Freelancer',
    beschreibung:
      'Arbeit von zu Hause kann steuerlich relevant sein. Welche Regel passt, hängt von Nutzung, Arbeitsplatz und Nachweisen ab.',
    hinweis:
      'Mila sollte hier keine festen Versprechen machen, sondern fehlende Angaben abfragen.',
    tags: ['homeoffice', 'arbeitszimmer', 'remote', 'büro'],
  },
]

export default function WissenPage() {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredTipps = STEUER_TIPPS.filter((tipp) => {
    const text = `${tipp.titel} ${tipp.beschreibung} ${tipp.kategorie} ${tipp.status_info} ${tipp.tags.join(' ')}`.toLowerCase()
    return text.includes(searchTerm.toLowerCase().trim())
  })

  return (
    <main className="min-h-screen bg-[#fbf9ff] p-4 pb-40 text-slate-950">
      <section className="rounded-[2rem] bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-500">
          Mila Wissen
        </p>

        <h1 className="mt-3 text-3xl font-black tracking-tight">
          Steuerwissen ohne Fachchinesisch
        </h1>

        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
          Kurze Orientierung zu typischen Ausgaben. Mila ersetzt keine Steuerberatung,
          hilft dir aber beim Sortieren und Nachfragen.
        </p>
      </section>

      <section className="mt-5 rounded-[2rem] bg-white p-4 shadow-sm">
        <input
          type="text"
          placeholder="🔍 Nach Thema suchen..."
          className="w-full rounded-2xl bg-violet-50 p-4 text-sm font-bold text-slate-700 outline-none placeholder:text-slate-400"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </section>

      <section className="mt-5 space-y-4">
        {filteredTipps.length > 0 ? (
          filteredTipps.map((tipp) => (
            <article
              key={tipp.titel}
              className="rounded-[2rem] bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700">
                  {tipp.kategorie}
                </span>

                <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-500">
                  {tipp.status_info}
                </span>
              </div>

              <h2 className="mt-4 text-xl font-black text-slate-950">
                {tipp.titel}
              </h2>

              <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
                {tipp.beschreibung}
              </p>

              <div className="mt-4 rounded-2xl bg-violet-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-700">
                  Mila merkt sich
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-700">
                  {tipp.hinweis}
                </p>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-[2rem] bg-white p-5 text-sm font-bold text-slate-500 shadow-sm">
            Keine passenden Tipps gefunden.
          </div>
        )}
      </section>
    </main>
  )
}