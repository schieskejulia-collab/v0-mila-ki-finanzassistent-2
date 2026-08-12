export default function DatenschutzSicherheitPage() {
  return (
    <main className="min-h-screen bg-[#fbf9ff] px-5 py-8 text-slate-950">
      <section className="mx-auto max-w-md space-y-5">
        <div className="rounded-[2rem] border border-violet-100 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-600">Sicherheit</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight">Datenschutz & Sicherheit bei Mila</h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Mila verarbeitet Finanz-, Beleg- und Geschäftsdaten. Deshalb werden Datenzugriffe getrennt,
            Uploads begrenzt und Datenschutzfunktionen direkt im Nutzerkonto bereitgestellt.
          </p>
        </div>

        <SecurityCard title="Mandantentrennung" text="Nutzerbezogene Tabellen werden mit Row Level Security abgesichert. Datensätze sind zusätzlich über Nutzer- und Mandantenzuordnung getrennt." />
        <SecurityCard title="Private Dokumentablage" text="Mandanten-Uploads liegen in einem nicht öffentlichen Storage-Bucket. Erlaubt sind nur PDF, JPG, PNG und WEBP bis maximal 10 MB." />
        <SecurityCard title="Begrenzte Upload-Links" text="Mandanten-Portal-Links sind als widerrufbare Tokens angelegt. Mit der Datenschutz-Hardening-Migration erhalten neu erzeugte Links eine Laufzeit von sieben Tagen." />
        <SecurityCard title="Originaldateien bleiben erhalten" text="Arbeits- und Exportnamen verändern die hochgeladene Originaldatei nicht. Der Audit-Trail dokumentiert nur vorhandene Zeitstempel." />
        <SecurityCard title="Export & Löschung" text="Im Profil können Nutzer eine Datenkopie exportieren, gespeicherte Mila-Daten löschen oder nach zusätzlicher Bestätigung das gesamte Login-Konto entfernen." />
        <SecurityCard title="Sichere HTTP-Grundregeln" text="Mila setzt Schutzheader gegen MIME-Sniffing und Framing, eine restriktive Referrer-Policy sowie No-Store-Header für API-Antworten ein." />
        <SecurityCard title="Datensparsamkeit" text="Mila soll nur Informationen verarbeiten, die für Vorbereitung, Ordnung, Vollständigkeit, Rückfragen und Übergabe benötigt werden." />
        <SecurityCard title="Externe KI" text="Chat-Inhalte können zur Antworterzeugung an den technisch eingebundenen KI-Dienst weitergegeben werden. Deshalb sollten nur Daten verarbeitet werden, deren Übermittlung für den jeweiligen Zweck zulässig und erforderlich ist." />

        <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
          <h2 className="font-black">Wichtig vor echten Mandantendaten</h2>
          <p className="mt-2">
            Technische Schutzmaßnahmen ersetzen keine organisatorischen Pflichten. Auftragsverarbeitungsverträge,
            Verzeichnis der Verarbeitungstätigkeiten, Löschkonzept, Berechtigungskonzept und die konkrete Datenschutzerklärung
            müssen zum tatsächlichen Betrieb und zu den eingesetzten Dienstleistern passen.
          </p>
        </div>
      </section>
    </main>
  )
}

function SecurityCard({ title, text }: { title: string; text: string }) {
  return (
    <section className="rounded-[1.5rem] border border-violet-100 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </section>
  )
}
