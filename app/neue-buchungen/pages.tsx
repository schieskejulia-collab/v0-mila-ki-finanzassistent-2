"use client"

import { useFinance } from "@/lib/store"
import { useState } from "react"
import { useRouter } from "next/navigation"

// Deine Kategorien mit den verständlichen Erklärungen (Deine Nische!)
const CATEGORY_DETAILS: Record<string, { icon: string; label: string; info: string }> = {
  "software": { 
    icon: "💻", 
    label: "Software & Tools", 
    info: "100% absetzbar. Egal ob Adobe, ChatGPT Plus, Hosting oder deine Buchhaltungs-App." 
  },
  "weiterbildung": { 
    icon: "🎓", 
    label: "Kurse & Bücher", 
    info: "100% absetzbar. Coachings, Fachbücher oder Online-Kurse, die dein Business weiterbringen." 
  },
  "bewirtung": { 
    icon: "🍽️", 
    label: "Essen mit Kunden", 
    info: "70% absetzbar. Wichtig: Du brauchst den bewirteten Namen und das Trinkgeld auf dem Beleg!" 
  },
  "reisen": { 
    icon: "✈️", 
    label: "Reisen & Fahrtkosten", 
    info: "100% absetzbar. Bahntickets, Hotelübernachtungen oder 30 Cent pro Kilometer mit dem eigenen Auto." 
  },
  "buerobedarf": { 
    icon: "📎", 
    label: "Bürokram", 
    info: "100% absetzbar. Stifte, Blöcke, Ordner oder auch Briefmarken." 
  },
  "hardware": { 
    icon: "⌨️", 
    label: "Technik & Geräte", 
    info: "100% absetzbar. Laptop, Smartphone oder Monitor kannst du sofort komplett steuerlich geltend machen." 
  },
  "miete": { 
    icon: "🏠", 
    label: "Büromiete / Homeoffice", 
    info: "Miete für dein externes Büro oder die Homeoffice-Pauschale (bis zu 1.260 € im Jahr ohne Nachweis)." 
  },
  "versicherung": { 
    icon: "🛡️", 
    label: "Betriebliche Versicherungen", 
    info: "100% absetzbar. Berufshaftpflicht, Rechtsschutz oder Cyber-Versicherungen für dein Business." 
  },
  "sonstiges": { 
    icon: "📦", 
    label: "Anderes fürs Business", 
    info: "Alles, was oben nicht reinpasst, aber eindeutig für deine Arbeit gekauft wurde." 
  }
}

export default function NeueBuchungPage() {
  const { addIncome, addExpense } = useFinance()
  const router = useRouter()

  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [title, setTitle] = useState("")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [category, setCategory] = useState("sonstiges")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!title || !amount) {
      alert("Bitte trage einen Namen und einen Betrag ein!")
      return
    }

    const neueBuchung = {
      id: `manual-${Date.now()}`,
      title: title,
      amount: parseFloat(amount),
      date: new Date(date).toISOString(),
      category: type === 'income' ? 'einnahme' : category,
    }

    if (type === 'income') {
      // Falls dein Store 'client' statt 'title' erwartet, passen wir das hier ab:
      addIncome({ ...neueBuchung, client: title })
    } else {
      // Falls dein Store 'vendor' statt 'title' erwartet:
      addExpense({ ...neueBuchung, vendor: title })
    }

    // Nach dem Speichern zurück zur Liste
    router.push("/buchungen")
  }

  return (
    <div className="p-4 space-y-6 pb-24 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-xl p-2 bg-muted rounded-xl"> Neuer Beleg </button>
        <h1 className="text-2xl font-extrabold tracking-tight">Eintragen</h1>
      </div>

      {/* Typ-Umschalter */}
      <div className="flex p-1 bg-muted rounded-xl gap-1">
        <button
          type="button"
          onClick={() => setType('expense')}
          className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${
            type === 'expense' ? 'bg-rose-600 text-white shadow-sm' : 'text-muted-foreground'
          }`}
        >
          💸 AUSGABE (Absetzen)
        </button>
        <button
          type="button"
          onClick={() => setType('income')}
          className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${
            type === 'income' ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted-foreground'
          }`}
        >
          💰 EINNAHME
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name / Händler */}
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Wer oder Was?</label>
          <input
            type="text"
            placeholder={type === 'expense' ? "z.B. Adobe, Deutsche Bahn, Starbucks..." : "z.B. Kundenzahlung, Projekt X..."}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 bg-muted/50 rounded-xl border border-border focus:ring-2 focus:ring-primary/20 outline-none"
          />
        </div>

        {/* Betrag & Datum */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Betrag in €</label>
            <input
              type="number"
              step="0.01"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 bg-muted/50 rounded-xl border border-border focus:ring-2 focus:ring-primary/20 outline-none font-bold"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Datum</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 bg-muted/50 rounded-xl border border-border focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
        </div>

        {/* Kategorien-Auswahl mit Steuer-Tipps (Nur bei Ausgaben sichtbar) */}
        {type === 'expense' && (
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Kategorie & Steuer-Check</label>
            <div className="grid grid-cols-1 gap-2">
              {Object.entries(CATEGORY_DETAILS).map(([key, data]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategory(key)}
                  className={`flex flex-col text-left p-4 rounded-xl border transition-all ${
                    category === key 
                      ? 'bg-card border-primary ring-2 ring-primary/10' 
                      : 'bg-muted/30 border-border opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-base">
                    <span>{data.icon}</span>
                    <span>{data.label}</span>
                  </div>
                  {category === key && (
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed bg-muted/50 p-2 rounded-lg">
                      💡 {data.info}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Absenden-Button */}
        <button
          type="submit"
          className="w-full py-4 bg-foreground text-background font-bold rounded-xl shadow-md hover:opacity-90 active:scale-[0.99] transition-all text-base"
        >
          ✨ Eintrag für Mila speichern
        </button>
      </form>
    </div>
  )
}
