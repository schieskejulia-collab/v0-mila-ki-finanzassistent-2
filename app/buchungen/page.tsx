"use client"

import { useFinance } from "@/lib/store"
import { useState, useMemo } from "react"

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
  
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedMonth, setSelectedMonth] = useState<string>("all")

  // Daten aufbereiten
    // Daten aufbereiten (Abgesichert gegen leere Speicher-Zustände!)
  const alleBuchungen = useMemo(() => {
    const sichereIncomes = incomes || [];
    const sichereExpenses = expenses || [];
    
    return [
      ...sichereIncomes.map((i) => ({
        id: i.id || `i-${Math.random()}`,
        title: i.client || i.title || "Einnahme",
        amount: Number(i.amount) || 0,
        date: i.date || new Date().toISOString(),
        category: "einnahme",
        type: "income",
      })),
      ...sichereExpenses.map((e) => ({
        id: e.id || `e-${Math.random()}`,
        title: e.vendor || e.title || "Ausgabe",
        amount: Number(e.amount) || 0,
        date: e.date || new Date().toISOString(),
        category: e.category || "sonstiges",
        type: "expense",
      })),
    ].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [incomes, expenses]);

  // Verfügbare Monate für den Filter extrahieren
  const verfügbareMonate = useMemo(() => {
    const monate = new Set<string>();
    alleBuchungen.forEach(b => {
      const date = new Date(b.date);
      const label = date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
      monate.add(label);
    });
    return Array.from(monate);
  }, [alleBuchungen]);

  // Filter- und Such-Logik
  const gefilterteBuchungen = useMemo(() => {
    return alleBuchungen.filter(b => {
      // 1. Typ-Filter (Einnahme/Ausgabe)
      if (filter !== 'all' && b.type !== filter) return false;
      
      // 2. Such-Filter
      const searchMatch = b.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          b.category.toLowerCase().includes(searchQuery.toLowerCase());
      if (!searchMatch) return false;

      // 3. Monats-Filter
      if (selectedMonth !== "all") {
        const dateLabel = new Date(b.date).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
        if (dateLabel !== selectedMonth) return false;
      }

      return true;
    });
  }, [alleBuchungen, filter, searchQuery, selectedMonth]);

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
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-extrabold tracking-tight">📒 Buchungen</h1>
        <div className="bg-secondary/50 px-3 py-1 rounded-full border border-border">
          <span className="text-sm font-bold">{gefilterteBuchungen.length}</span>
        </div>
      </div>

      {/* Suchfeld */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">🔍</span>
        <input
          type="text"
          placeholder="Suchen nach Händler, Kategorie..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-muted/50 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 outline-none transition-all"
        />
      </div>

      {/* Filter-Bereich */}
      <div className="space-y-3">
        {/* Typ-Filter */}
        <div className="flex p-1 bg-muted rounded-xl gap-1">
          {['all', 'income', 'expense'].map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t as any)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                filter === t ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
              }`}
            >
              {t === 'all' ? 'ALLE' : t === 'income' ? 'EINNAHMEN' : 'AUSGABEN'}
            </button>
          ))}
        </div>

        {/* Monats-Filter (Scrollbar am Handy) */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          <button
            onClick={() => setSelectedMonth("all")}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${
              selectedMonth === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground"
            }`}
          >
            Alle Monate
          </button>
          {verfügbareMonate.map(m => (
            <button
              key={m}
              onClick={() => setSelectedMonth(m)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${
                selectedMonth === m ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Liste */}
      <div className="space-y-4">
        {gefilterteBuchungen.length === 0 ? (
          <div className="text-center py-20 bg-muted/10 rounded-3xl border-2 border-dashed border-border">
            <p className="text-muted-foreground italic">Keine Treffer gefunden...</p>
          </div>
        ) : (
          gefilterteBuchungen.map((buchung) => {
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
                        <span>{new Date(buchung.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <p className={`text-xl font-black ${buchung.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>
                      {buchung.type === "income" ? "+" : "-"}{buchung.amount.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
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
          })
        )}
      </div>
    </div>
  )
}
