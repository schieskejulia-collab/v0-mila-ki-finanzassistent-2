"use client"

import { useFinance } from "@/lib/store"

// 1. Robuste Icon-Liste (jetzt auch mit Kleinschreibung)
const CATEGORY_ICONS: Record<string, string> = {
  "reisen": "✈️",
  "weiterbildung": "🎓",
  "software": "💻",
  "marketing": "📣",
  "buerobedarf": "📎",
  "buero": "📎",
  "bewirtung": "🍽️",
  "versicherung": "🛡️",
  "hardware": "⌨️",
  "miete": "🏠",
  "einnahme": "💰",
  "sonstiges": "📦"
};

export default function BuchungenPage() {
  const { incomes, expenses, deleteIncome, deleteExpense } = useFinance()

  const alleBuchungen = [
    ...incomes.map((i) => ({
      id: i.id,
      title: i.client || "Einnahme",
      amount: i.amount,
      date: i.date,
      category: "einnahme",
      type: "income",
    })),
    ...expenses.map((e) => ({
      id: e.id,
      title: e.vendor || "Ausgabe",
      amount: e.amount,
      date: e.date,
      category: e.category || "sonstiges",
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
    <div className="p-4 space-y-6 pb-24 max-w-2xl mx-auto">
      <div className="flex justify-between items-end">
        <h1 className="text-3xl font-extrabold tracking-tight">📒 Buchungen</h1>
        <div className="bg-secondary/50 px-3 py-1 rounded-full border border-border">
          <span className="text-sm font-bold">{alleBuchungen.length}</span>
        </div>
      </div>

      <div className="space-y-4">
        {alleBuchungen.map((buchung) => {
          // Wir wandeln die Kategorie in Kleinschreibung um für die Suche
          const catKey = buchung.category.toLowerCase();
          const icon = CATEGORY_ICONS[catKey] || "📦";
          
          // Wir machen den ersten Buchstaben groß für die schöne Anzeige
          const displayCategory = buchung.category.charAt(0).toUpperCase() + buchung.category.slice(1);

          return (
            <div
              key={buchung.id}
              className="bg-card border border-border rounded-2xl p-5 shadow-sm active:scale-[0.98] transition-transform"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-3">
                  <h3 className="font-bold text-xl text-foreground">
                    {buchung.title}
                  </h3>
                  
                  <div className="space-y-1">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <span className="mr-2 text-lg">{icon}</span>
                      <span className="font-medium">Kategorie: {displayCategory}</span>
                    </div>
                    
                    <div className="flex items-center text-sm text-muted-foreground">
                      <span className="mr-2 text-lg">📅</span>
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

                <div className="flex flex-col items-end gap-4">
                  <p
                    className={`text-xl font-black ${
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
                    className="p-2 text-muted-foreground/40 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}