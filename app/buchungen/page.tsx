"use client"

import { useFinance } from "@/lib/store"
import { useState } from "react"

// 1. Robuste Icon-Liste
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
  
  // NEU: State für den aktuellen Filter
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all')

  // 2. Daten aufbereiten
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

  // NEU: Filter-Logik anwenden
  const gefilterteBuchungen = alleBuchungen.filter(b => {
    if (filter === 'all') return true;
    return b.type === filter;
  });

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
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-extrabold tracking-tight">📒 Buchungen</h1>
        <div className="bg-secondary/50 px-3 py-1 rounded-full border border-border">
          <span className="text-sm font-bold">{gefilterteBuchungen.length}</span>
        </div>
      </div>

      {/* NEU: Filter-Leiste (Tabs) */}
      <div className="flex p-1 bg-muted rounded-xl gap-1">
        <button
          onClick={() => setFilter('all')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
            filter === 'all' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
          }`}
        >
          Alle
        </button>
        <button
          onClick={() => setFilter('income')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
            filter === 'income' ? 'bg-background shadow-sm text-emerald-600' : 'text-muted-foreground'
          }`}
        >
          Einnahmen
        </button>
        <button
          onClick={() => setFilter('expense')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
            filter === 'expense' ? 'bg-background shadow-sm text-rose-600' : 'text-muted-foreground'
          }`}
        >
          Ausgaben
        </button>
      </div>

      {/* Die Liste der gefilterten Buchungen */}
      {gefilterteBuchungen.length === 0 ? (
        <div className="text-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed border-border">
          <p className="text-muted-foreground italic">Keine Einträge in dieser Ansicht...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {gefilterteBuchungen.map((buchung) => {
            const catKey = buchung.category.toLowerCase();
            const icon = CATEGORY_ICONS[catKey] || "📦";
            const displayCategory = buchung.category.charAt(0).toUpperCase() + buchung.category.slice(1);

            return (
              <div
                key={buchung.id}
                className="bg-card border border-border rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-transform"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <h3 className="font-bold text-lg leading-none">{buchung.title}</h3>
                    
                    <div className="space-y-1">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <span className="w-6 text-base">{icon}</span>
                        <span>{displayCategory}</span>
                      </div>
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

                  <div className="flex flex-col items-end gap-3">
                    <p className={`text-xl font-black ${
                      buchung.type === "income" ? "text-emerald-600" : "text-rose-600"
                    }`}>
                      {buchung.type === "income" ? "+" : "-"}
                      {buchung.amount.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                    </p>
                    
                    <button
                      onClick={() => handleLöschen(buchung.id, buchung.type, buchung.title)}
                      className="p-2 text-muted-foreground/30 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
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
    </div>
  )
}