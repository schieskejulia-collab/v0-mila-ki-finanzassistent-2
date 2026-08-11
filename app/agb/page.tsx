export default function AgbPage() {
  return (
    <main className="min-h-screen bg-[#fbf9ff] px-5 py-8 text-slate-950">
      <section className="mx-auto max-w-md space-y-5">
        <div className="rounded-[2rem] border border-violet-100 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-600">AGB</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight">Allgemeine Geschäftsbedingungen</h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Diese Bedingungen regeln die Nutzung von Mila. Platzhalter bitte vor Veröffentlichung prüfen und ersetzen.
          </p>
        </div>

        <AgbBlock title="1. Leistungsbeschreibung">
          Mila unterstützt Nutzer bei der digitalen Ordnung, Vorbereitung und Strukturierung von Belegen,
          Buchungen, Rückfragen, Pflichten und Monatsmappen. Mila ersetzt keine Steuerberatung, Rechtsberatung,
          Buchhaltung oder behördliche Prüfung.
        </AgbBlock>

        <AgbBlock title="2. Nutzerpflichten">
          Nutzer sind dafür verantwortlich, dass eingegebene Informationen richtig sind und dass sie zur Verarbeitung
          hochgeladener Daten berechtigt sind. Geschäftliche Entscheidungen bleiben in der Verantwortung des Nutzers.
        </AgbBlock>

        <AgbBlock title="3. Keine verbindliche steuerliche Bewertung">
          Hinweise von Mila dienen der Vorbereitung, Plausibilität und Verständlichkeit. Sie sind nicht verbindlich
          und müssen bei Bedarf durch Steuerberater, Buchhaltung oder zuständige Stellen geprüft werden.
        </AgbBlock>

        <AgbBlock title="4. Verfügbarkeit">
          Mila wird sorgfältig betrieben. Eine jederzeit fehlerfreie oder unterbrechungsfreie Verfügbarkeit kann jedoch
          nicht garantiert werden, insbesondere bei Wartung, Updates oder Störungen externer Dienste.
        </AgbBlock>

        <AgbBlock title="5. Zahlungsfunktionen">
          Kostenpflichtige Funktionen können über externe Zahlungsdienstleister abgewickelt werden. Es gelten zusätzlich
          die Bedingungen des jeweiligen Zahlungsdienstleisters.
        </AgbBlock>

        <AgbBlock title="6. Datenschutz">
          Informationen zur Datenverarbeitung stehen in der Datenschutzerklärung unter /datenschutz.
        </AgbBlock>
      </section>
    </main>
  )
}

function AgbBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[1.5rem] border border-violet-100 bg-white p-5 text-sm leading-6 text-slate-700 shadow-sm">
      <h2 className="mb-2 text-lg font-black text-slate-950">{title}</h2>
      <p>{children}</p>
    </section>
  )
}
