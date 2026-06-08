"use client"

import { useFinance } from "@/lib/store"

// 1. Zentrale Konfiguration der Icons für Mila
const CATEGORY_ICONS: Record<string, string> = {
  "Reisen": "✈️",
  "Weiterbildung": "🎓",
  "Software": "💻",
  "Marketing": "📣",
  "Büro": "📎",
  "Bewirtung": "🍽️",
  "Versicherung": "🛡️",
  "Hardware": "⌨️",
  "Miete": "🏠",
  "Einnahme": "💰",
  "Sonstiges": "📦"
};

export default function BuchungenPage() {
  const { incomes, expenses, deleteIncome, deleteExpense } = useFinance()

  // 2. Daten für die Anzeige aufbereiten und sortieren
  const alleBuchungen = [
    ...incomes.map((i) => ({
      id: i.id,
      title: i.client || "Einnahme",
      amount: i.amount,
      date: i.date,
      category: "Einnahme",
      type: "income",
    })),
    ...expenses.map((e) => ({
      id: e.id,
      title: e.vendor || "Ausgabe",
      amount: e.amount,
      date: e.date,
      category: e.category || "Sonstiges",
      type: "expense",
    })),
  ].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  // 3. Lösch-Logik mit Sicherheitsabfrage
  const handleLöschen = (id: string, type: string, title: string) => {
    if (confirm(`Möchtest du "${title}" wirklich löschen?`)) {
      if (type === "income") {
        deleteIncome(id)
      } else {
        deleteExpense(id)
      }
    }
  }

  return (
    <div className="p-4 space-y-6 pb-24 max-w-2xl mx-auto">
      {/* Header Bereich */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">📒 Buchungen</h1>
          <p className="text-muted-foreground mt-1">Milas Übersicht deiner Finanzen</p>
        </div>
        <div className="bg-secondary/50 px-3 py-1 rounded-full border border-border">
          <span className="text-sm font-bold">{alleBuchungen.length}</span>
        </div>
      </div>

      {/* Die Liste der Buchungen */}
      {alleBuchungen.length === 0 ? (
        <div className="text-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed border-border">
          <p className="text-muted-foreground italic">Noch keine Buchungen vorhanden...</p>
          <p className="text-xs mt-2 text-muted-foreground/60">Scanne einen Beleg, um zu starten!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {alleBuchungen.map((buchung) => {
            // Das passende Icon finden
            const icon = CATEGORY_ICONS[buchung.category] || "📦";

            return (
              <div
                key={buchung.id}
                className="bg-card border border-border rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-transform"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <h3 className="font-bold text-lg leading-none">
                      {buchung.title}
                    </h3>
                    
                    <div className="flex flex-col gap-1.5">
                      {/* Kategorie mit Icon */}
                      <div className="flex items-center text-sm text-muted-foreground">
                        <span className="w-6 text-base">{icon}</span>
                        <span>
                          <span className="font-medium text-foreground/60">Kategorie:</span> {buchung.category}
                        </span>
                      </div>
                      
                      {/* Datum */}
                      <div className="flex items-center text-sm text-muted-foreground">
                        <span className="w-6 text-base">📅</span>
                        <span>
                          {new Date(buchung.date).toLocaleDateString('de-DE', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Betrag und Löschen-Button */}
                  <div className="flex flex-col items-end gap-3">
                    <p
                      className={`text-xl font-black tracking-tight ${
                        buchung.type === "income"
                          ? "text-emerald-600"
                          : "text-rose-600"
                      }`}
                    >
                      {buchung.type === "income" ? "+" : "-"}
                      {buchung.amount.toLocaleString('de-DE', { 
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2 
                      })} €
                    </p>
                    
                    <button
                      onClick={() => handleLöschen(buchung.id, buchung.type, buchung.title)}
                      className="p-2.5 text-muted-foreground/50 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Milas kleiner Wissensbereich */}
      <div className="bg-gradient-to-br from-secondary/40 to-background p-5 rounded-3xl border border-border">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          Milas Kategorien
        </h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(CATEGORY_ICONS).map(([name, icon]) => (
            <div key={name} className="flex items-center gap-1.5 bg-background border border-border px-3 py-1.5 rounded-xl text-xs font-medium shadow-sm">
              <span>{icon}</span>
              <span>{name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
