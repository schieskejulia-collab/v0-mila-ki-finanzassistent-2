"use client"

import { useFinance } from "@/lib/store"

export function MorningBriefing() {
  const { summary, userName } = useFinance()

  const hour = new Date().getHours()

  const greeting =
    hour < 12
      ? "Guten Morgen"
      : hour < 18
      ? "Guten Tag"
      : "Guten Abend"

  // Mila-Stimmung basierend auf Gewinn
  let mood = ""
  if (summary.profit > 1500) {
    mood = "Du bist richtig gut unterwegs. Atme einmal stolz durch."
  } else if (summary.profit > 0) {
    mood = "Alles wirkt stabil. Du machst das gut."
  } else {
    mood = "Ich halte dich. Lass uns heute sanft draufschauen."
  }

  const items = []

  if (summary.openInvoices > 0) {
    items.push({
      icon: "📬",
      text: `Du hast noch offene Rechnungen über ${summary.openInvoices.toFixed(0)} €. Vielleicht magst du heute eine davon anstoßen?`
    })
  }

  items.push({
    icon: "💡",
    text: `Empfohlene Steuerrücklage: ${summary.taxReserve.toFixed(0)} €. Ich erinnere dich nur sanft – du entscheidest das Tempo.`
  })

  if (summary.profit > 0) {
    items.push({
      icon: "✨",
      text: "Deine Finanzen wirken aktuell stabil. Du darfst dich sicher fühlen."
    })
  } else {
    items.push({
      icon: "🌱",
      text: "Gerade ist es etwas enger. Kein Stress – wir gehen das gemeinsam an."
    })
  }

  return (
    <div className="p-5 bg-gradient-to-br from-purple-50 via-indigo-50 to-white rounded-2xl border border-purple-100 shadow-sm">
      <h2 className="text-xl font-bold text-slate-800">
        {greeting} {userName} 🌸
      </h2>

      <p className="text-xs text-slate-500 mb-4">
        Ich hab kurz auf deine Zahlen geschaut:
      </p>

      <p className="text-sm text-slate-700 mb-4 leading-relaxed">
        {mood}
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
