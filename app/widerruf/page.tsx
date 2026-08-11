export default function WiderrufPage() {
  return (
    <main className="min-h-screen bg-[#fbf9ff] px-5 py-8 text-slate-950">
      <section className="mx-auto max-w-md space-y-5 rounded-[2rem] border border-violet-100 bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-600">Widerruf</p>
        <h1 className="text-3xl font-black tracking-tight">Widerrufsbelehrung</h1>

        <div className="space-y-4 text-sm leading-6 text-slate-700">
          <p>
            Verbraucher haben grundsätzlich das Recht, binnen vierzehn Tagen ohne Angabe von Gründen einen Vertrag
            zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab Vertragsschluss.
          </p>
          <p>
            Um das Widerrufsrecht auszuüben, muss eine eindeutige Erklärung per E-Mail an [E-MAIL-ADRESSE]
            gesendet werden. Bitte im Betreff „Widerruf Mila“ angeben.
          </p>
          <p>
            Wenn Nutzer ausdrücklich wünschen, dass die digitale Leistung bereits während der Widerrufsfrist beginnt,
            kann das Widerrufsrecht unter bestimmten Voraussetzungen vorzeitig erlöschen. Dieser Punkt muss im Checkout
            rechtssicher abgebildet werden, bevor digitale Inhalte endgültig verkauft werden.
          </p>
        </div>
      </section>
    </main>
  )
}