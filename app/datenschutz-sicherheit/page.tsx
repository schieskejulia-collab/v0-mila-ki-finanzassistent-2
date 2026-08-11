export default function DatenschutzSicherheitPage() {
  return (
    <main className="min-h-screen bg-[#fbf9ff] px-5 py-8 text-slate-950">
      <section className="mx-auto max-w-md space-y-5">
        <div className="rounded-[2rem] border border-violet-100 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-600">Sicherheit</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight">Datenschutz & Sicherheit bei Mila</h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Mila verarbeitet Finanz-, Beleg- und Geschäftsdaten. Deshalb gilt: lieber weniger Daten,
            klare Trennung, saubere Löschung und keine unnötige Auswertung.
          </p>
        </div>

        <SecurityCard title="Datensparsamkeit" text="Mila soll nur Daten erfassen, die für Vorbereitung, Ordnung, Vollständigkeit und Rückfragen wirklich gebraucht werden." />
        <SecurityCard title="Getrennte Nutzerkonten" text="Jeder Nutzer arbeitet in seinem eigenen Konto. Daten dürfen nicht zwischen Konten sichtbar werden." />
        <SecurityCard title="RLS in Supabase" text="Row Level Security muss für alle nutzerbezogenen Tabellen aktiv sein. Nutzer dürfen nur eigene Datensätze lesen, ändern oder löschen." />
        <SecurityCard title="Kein unnötiges Tracking" text="Für die sichere Startversion werden Analyse- und Marketingtools entfernt oder nur nach Einwilligung geladen." />
        <SecurityCard title="Export & Löschung" text="Nutzer sollen ihre Daten exportieren und Löschung verlangen oder auslösen können. Das ist ein wichtiger Vertrauenspunkt." />
        <SecurityCard title="Keine Steuerberatung" text="Mila unterstützt Vorbereitung und Struktur, trifft aber keine verbindlichen steuerlichen Entscheidungen." />

        <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
          <h2 className="font-black">Sicherheitsversprechen</h2>
          <p className="mt-2">
            Mila wird so gebaut, dass Vertrauen wichtiger ist als schnelles Wachstum: keine versteckten Datenwege,
            keine unnötige Sammlung und keine Vermischung fremder Nutzerinformationen.
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