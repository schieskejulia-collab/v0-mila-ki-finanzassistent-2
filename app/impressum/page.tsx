export default function ImpressumPage() {
  return (
    <main className="min-h-screen bg-[#fbf9ff] px-5 py-8 text-slate-950">
      <section className="mx-auto max-w-md space-y-5 rounded-[2rem] border border-violet-100 bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-600">
          Rechtliches
        </p>

        <h1 className="text-3xl font-black tracking-tight">Impressum</h1>

        <div className="space-y-2 text-sm leading-6 text-slate-700">
          <p>Julia Schieske</p>
          <p>[vollständige ladungsfähige Anschrift ergänzen]</p>
          <p>Deutschland</p>
        </div>

        <div className="space-y-2 text-sm leading-6 text-slate-700">
          <h2 className="font-black text-slate-950">Kontakt</h2>
          <p>
            E-Mail:{' '}
            <a className="font-semibold text-violet-700 underline underline-offset-4" href="mailto:schieskejulia@gmx.de">
              schieskejulia@gmx.de
            </a>
          </p>
        </div>

        <div className="space-y-2 text-sm leading-6 text-slate-700">
          <h2 className="font-black text-slate-950">
            Verantwortlich für den Inhalt
          </h2>
          <p>Julia Schieske, [vollständige ladungsfähige Anschrift ergänzen]</p>
        </div>

        <p className="rounded-2xl bg-slate-50 p-4 text-xs leading-5 text-slate-600">
          Hinweis: Mila ist eine digitale Unterstützung zur Vorbereitung und
          Ordnung von Unterlagen. Mila bietet keine Rechts- oder Steuerberatung.
        </p>
      </section>
    </main>
  )
}
