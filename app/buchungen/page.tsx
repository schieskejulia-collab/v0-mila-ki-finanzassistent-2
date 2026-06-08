"use client"

import { useFinance } from "@/lib/store"
// Tipp: Falls du Lucide-Icons nutzt (Standard bei shadcn), importiere das Trash-Icon:
// import { Trash2 } from "lucide-react" 

export default function BuchungenPage() {
  // Wir holen uns die Lösch-Funktionen aus deinem Store
  const { incomes, expenses, deleteIncome, deleteExpense } = useFinance()

  const alleBuchungen = [
    ...incomes.map((i) => ({
      id: i.id,
      title: i.client,
      amount: i.amount,
      date: i.date,
      type: "income",
    })),
    ...expenses.map((e) => ({
      id: e.id,
      title: e.vendor,
      amount: e.amount,
      date: e.date,
      type: "expense",
    })),
  ].sort(
    (a, b) =>
      new Date(b.date).getTime() -
      new Date(a.date).getTime()
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
    <div className="p-4 space-y-6 pb-20"> {/* pb-20 damit Mila unten nichts verdeckt */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">📒 Buchungen</h1>
        <p className="text-sm text-muted-foreground">{alleBuchungen.length} Einträge</p>
      </div>

      {alleBuchungen.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <p>Noch keine Buchungen vorhanden.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alleBuchungen.map((buchung) => (
            <div
              key={buchung.id}
              className="bg-card border border-border rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${buchung.type === "income" ? "bg-emerald-500" : "bg-rose-500"}`} />
                    <p className="font-semibold text-lg leading-none">
                      {buchung.title}
                    </p>
                  </div>

                  <p className="text-xs text-muted-foreground mt-1 ml-4">
                    {new Date(buchung.date).toLocaleDateString('de-DE', { 
                      day: '2-digit', 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <p
                    className={
                      buchung.type === "income"
                        ? "text-emerald-600 font-bold text-lg"
                        : "text-rose-600 font-bold text-lg"
                    }
                  >
                    {buchung.type === "income" ? "+" : "-"}
                    {buchung.amount.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                  </p>

                  {/* DER LÖSCH-BUTTON */}
                  <button
                    onClick={() => handleLöschen(buchung.id, buchung.type, buchung.title)}
                    className="p-2 hover:bg-rose-100 hover:text-rose-600 rounded-lg text-muted-foreground transition-colors"
                    title="Löschen"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
