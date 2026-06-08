"use client"

import { useFinance } from "@/lib/store"

export default function BuchungenPage() {
  const { incomes, expenses } = useFinance()

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

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">
        📒 Buchungen
      </h1>

      {alleBuchungen.map((buchung) => (
        <div
          key={buchung.id}
          className="bg-card border border-border rounded-xl p-4"
        >
          <div className="flex justify-between">
            <div>
              <p className="font-semibold">
                {buchung.title}
              </p>

              <p className="text-sm text-muted-foreground">
                {new Date(buchung.date).toLocaleDateString('de-DE')}
              </p>
            </div>

            <p
              className={
                buchung.type === "income"
                  ? "text-emerald-600 font-bold"
                  : "text-rose-600 font-bold"
              }
            >
              {buchung.type === "income" ? "+" : "-"}
              {buchung.amount} €
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
