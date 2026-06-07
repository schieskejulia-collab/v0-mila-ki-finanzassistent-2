"use client"

import { useFinance } from "@/lib/store"

export function MorningBriefing() {
  const { summary } = useFinance()

  const hour = new Date().getHours()

  const greeting =
    hour < 12
      ? "Guten Morgen"
      : hour < 18
      ? "Guten Tag"
      : "Guten Abend"

  const items = []

  if (summary.openInvoices > 0) {
    items.push({
      icon: "⚠️",
      text: `Du hast offene Rechnungen über ${summary.openInvoices.toFixed(0)} €.`
    })
  }

  items.push({
    icon: "💡",
    text: `Empfohlene Steuerrücklage: ${summary.taxReserve.toFixed(0)} €.`
  })

  if (summary.profit > 0) {
    items.push({
      icon: "✨",
      text: "Deine Finanzen wirken aktuell stabil."
    })
  } else {
    items.push({
      icon: "⚠️",
      text: "Diesen Monat solltest du deine Ausgaben etwas genauer beobachten."
    })
  }

  return (
    <div className="p-5 bg-gradient-to-br from-purple-50 via-indigo-50 to-white rounded-2xl border border-purple-100 shadow-sm">
      <h2 className="text-xl font-bold text-slate-800">
        {greeting} 🌸
      </h2>

      <p className="text-xs text-slate-500 mb-4">
        Deine finanzielle Übersicht für heute
      </p>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex items-start gap-3 bg-white p-3 rounded-xl border"
          >
            <span>{item.icon}</span>
            <p className="text-sm text-slate-700">
              {item.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}