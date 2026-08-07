import Link from 'next/link'

const paths = [
  {
    eyebrow: 'Kanzlei-Kooperation',
    title: 'Weniger Rückfragen bei kleinen Betrieben',
    text: 'Mila unterstützt die Vorbereitung von Mandantenunterlagen, bevor sie in der Kanzlei landen: Belege, fehlende Nachweise, Rückfragen und Fristen werden sichtbar sortiert.',
  },
  {
    eyebrow: 'VA-Service',
    title: 'Unterlagen vorbereiten lassen',
    text: 'Julia kann Mila intern nutzen, um Belege, Fahrtenbuch, Stunden, Sonderfälle und Monatsmappen für Betriebe vorzubereiten, ohne dass der Betrieb sofort ein neues System lernen muss.',
  },
]

const steps = [
  'Belege, Rechnungen und Nachweise sammeln',
  'Fehlende Angaben und Rückfragen sichtbar machen',
  'Fahrten, Stunden und Sonderfälle bei Bedarf ergänzen',
  'Monatsmappe für Mandant oder Kanzlei vorbereiten',
]

const limits = [
  'keine Steuerberatung',
  'keine finale Buchungsentscheidung',
  'keine verbindliche Rechts- oder Fristauskunft',
]

export default function AngebotPage() {
  return (
    <main className="min-h-screen bg-[#fbf9ff] px-4 py-6 text-slate-950">
      <section className="mx-auto flex w-full max-w-md flex-col gap-5">
        <div className="rounded-[2rem] bg-violet-600 p-6 text-white shadow-lg shadow-violet-100">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-white/70">
            Mila Kanzlei-Vorbereitung
          </p>

          <h1 className="mt-4 text-4xl font-black tracking-tight">
            Ordnung vor der Buchhaltung
          </h1>

          <p className="mt-4 text-sm font-semibold leading-relaxed text-white/85">
            Für Steuerkanzleien und kleine Betriebe: Mila hilft, Unterlagen
            vorzubereiten, Rückfragen früher zu klären und Monatsmappen
            verständlich zu übergeben.
          </p>

          <div className="mt-6 grid gap-3">
            <Link
              href="/login"
              className="rounded-2xl bg-white px-4 py-4 text-center text-sm font-black text-violet-700"
            >
              Mila öffnen
            </Link>

            <Link
              href="/kontakt"
              className="rounded-2xl border border-white/25 px-4 py-4 text-center text-sm font-black text-white"
            >
              Pilot anfragen
            </Link>
          </div>
        </div>

        <div className="grid gap-3">
          {paths.map((path) => (
            <section
              key={path.title}
              className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm"
            >
              <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">
                {path.eyebrow}
              </p>

              <h2 className="mt-2 text-2xl font-black">
                {path.title}
              </h2>

              <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600">
                {path.text}
              </p>
            </section>
          ))}
        </div>

        <section className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">
            Ablauf
          </p>

          <h2 className="mt-2 text-2xl font-black">
            So arbeitet Mila vor
          </h2>

          <div className="mt-4 space-y-3">
            {steps.map((step, index) => (
              <div
                key={step}
                className="flex gap-3 rounded-2xl bg-violet-50 p-4"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-600 text-xs font-black text-white">
                  {index + 1}
                </span>

                <p className="text-sm font-bold leading-relaxed text-slate-700">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
            Bewusste Grenze
          </p>

          <h2 className="mt-2 text-xl font-black">
            Mila ersetzt keine Kanzlei
          </h2>

          <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600">
            Mila bereitet organisatorisch vor. Die fachliche Bewertung und
            finale Buchung bleiben bei der Kanzlei.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {limits.map((limit) => (
              <span
                key={limit}
                className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black uppercase tracking-wider text-slate-500"
              >
                {limit}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-violet-50 p-5">
          <h2 className="text-xl font-black">
            Für den Termin vorbereitet
          </h2>

          <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600">
            Im Login liegt die Demo mit Beispielbetrieb bereit. Danach kann
            Julia erklären, ob es als Kanzlei-Kooperation oder als VA-Service
            für einen Betrieb startet.
          </p>

          <Link
            href="/kontakt"
            className="mt-4 inline-flex rounded-2xl bg-violet-600 px-4 py-3 text-sm font-black text-white"
          >
            Pilot anfragen
          </Link>
        </section>
      </section>
    </main>
  )
}
