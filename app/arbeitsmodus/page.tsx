'use client'

import { useRouter } from 'next/navigation'

const MODE_KEY = 'mila-work-mode-v1'

type Mode = 'va' | 'kanzlei' | 'mandant'

const modes: { id: Mode; eyebrow: string; title: string; text: string; bullets: string[]; href: string }[] = [
  {
    id: 'va',
    eyebrow: 'Mein Arbeitsplatz',
    title: 'VA / Koordination',
    text: 'Du übernimmst das Chaos und hältst den Vorgang bis zum Ziel zusammen.',
    bullets: ['Eingänge bündeln', 'Rückfragen & Nachfassen', 'Dienstleister koordinieren', 'Sauber übergeben'],
    href: '/eingang?mode=va',
  },
  {
    id: 'kanzlei',
    eyebrow: 'Empfang & Mandantenservice',
    title: 'Kanzlei / Unternehmen',
    text: 'Kein Anruf und keine Anfrage soll verloren gehen – auch wenn gerade niemand frei ist.',
    bullets: ['Anrufe & Anfragen erfassen', 'Interessenten erkennen', 'Rückrufbedarf sichern', 'Komplexes ans Team geben'],
    href: '/eingang?mode=kanzlei',
  },
  {
    id: 'mandant',
    eyebrow: 'Einfacher Zugang',
    title: 'Mandant / Kunde',
    text: 'Nur das sehen, was wirklich gebraucht wird: Anliegen, Unterlagen, Rückfragen und Status.',
    bullets: ['Anliegen senden', 'Unterlagen nachreichen', 'Rückfragen beantworten', 'Status verfolgen'],
    href: '/mandanten',
  },
]

export default function ArbeitsmodusPage() {
  const router = useRouter()

  function choose(mode: Mode, href: string) {
    window.localStorage.setItem(MODE_KEY, mode)
    router.push(href)
  }

  return (
    <main className="min-h-screen bg-[#fbf9ff] px-4 pb-32 pt-6 text-slate-950">
      <header>
        <p className="text-[11px] font-black uppercase tracking-[.22em] text-violet-500">Mila Arbeitsmodus</p>
        <h1 className="mt-1 text-3xl font-black">Wer arbeitet gerade mit Mila?</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">Eine Mila, drei klare Perspektiven. Der Vorgang bleibt derselbe – nur Aufgaben, Sprache und Oberfläche passen zur Rolle.</p>
      </header>

      <section className="mt-6 space-y-3">
        {modes.map((mode) => (
          <button key={mode.id} onClick={() => choose(mode.id, mode.href)} className="w-full rounded-3xl border border-violet-100 bg-white p-5 text-left shadow-sm active:scale-[0.99]">
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-violet-500">{mode.eyebrow}</p>
            <div className="mt-1 flex items-start justify-between gap-3"><h2 className="text-xl font-black">{mode.title}</h2><span className="text-xl font-black text-violet-600">›</span></div>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{mode.text}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">{mode.bullets.map((item) => <span key={item} className="rounded-xl bg-violet-50 px-3 py-2 text-xs font-black text-violet-800">{item}</span>)}</div>
          </button>
        ))}
      </section>

      <p className="mt-6 text-center text-[11px] font-semibold leading-relaxed text-slate-400">Der Arbeitsmodus trennt die Oberfläche. Fachliche, steuerliche oder rechtliche Entscheidungen bleiben weiterhin bei der zuständigen Fachperson.</p>
    </main>
  )
}
