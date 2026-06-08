"use client"

import { useFinance } from "@/lib/store"

export default function BuchungenPage() {
  const { incomes, expenses, deleteIncome, deleteExpense } = useFinance()

  // Kombinieren und Sortieren der Buchungen
  const alleBuchungen = [
    ...incomes.map((i) => ({
      id: i.id,
      title: i.client,
      amount: i.amount,
      date: i.date,
      category: "Einnahme", // Einnahmen haben oft keine Unterkategorie im einfachen Modell
      type: "income",
    })),
    ...expenses.map((e) => ({
      id: e.id,
      title: e.vendor,
      amount: e.amount,
      date: e.date,
      category: e.category || "Sonstiges",
      type: "expense",
    })),
  ].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

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
    <div className="p-4 space-y-6 pb-24">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">📒 Buchungen</h1>
        <p className="text-sm text-muted-foreground bg-secondary px-2 py-1 rounded-md">
          {alleBuchungen.length} Einträge
        </p>
      </div>

      {alleBuchungen.length === 0 ? (
        <div className="text-center py-20 bg-muted/30 rounded-3xl border-2 border-dashed border-border">
          <p className="text-muted-foreground">Noch keine Buchungen vorhanden.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {alleBuchungen.map((buchung) => (
            <div
              key={buchung.id}
              className="bg-card border border-border rounded-2xl p-4 shadow-sm relative group"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="font-bold text-lg leading-tight">
                    {buchung.title}
                  </h3>
                  
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground/70">Kategorie:</span> {buchung.category}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(buchung.date).toLocaleDateString('de-DE', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <p
                    className={`text-lg font-black ${
                      buchung.type === "income"
                        ? "text-emerald-600"
                        : "text-rose-600"
                    }`}
                  >
                    {buchung.type === "income" ? "+" : "-"}
                    {buchung.amount.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                  </p>
                  
                  <button
                    onClick={() => handleLöschen(buchung.id, buchung.type, buchung.title)}
                    className="p-2 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info-Sektion für Kategorien (optional, zur Übersicht) */}
      <div className="mt-8 p-4 bg-secondary/50 rounded-2xl">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
          Wichtige Kategorien für Mila
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {["Software", "Reisen", "Marketing", "Büro", "Hardware", "Versicherung", "Bewirtung", "Weiterbildung"].map((cat) => (
            <div key={cat} className="text-xs bg-background border border-border px-2 py-1.5 rounded-lg">
              {cat}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
