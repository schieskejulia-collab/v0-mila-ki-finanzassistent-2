"use client"

import { useState } from "react"
import { STEUER_TIPPS } from "@/lib/mila-knowledge"

export default function WissenPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredTipps = STEUER_TIPPS.filter(tipp => 
    tipp.titel.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tipp.kategorie.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 space-y-6 pb-24 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">💡 Milas Wissen</h1>
        <p className="text-muted-foreground mt-1">Was du absetzen kannst – und Milas Geheimtipps.</p>
      </div>

      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2">🔍</span>
        <input
          type="text"
          placeholder="Suche nach Tipps (z.B. Homeoffice)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-muted/50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="grid gap-4">
        {filteredTipps.map((tipp, index) => (
          <div key={index} className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-1 rounded-md">
                {tipp.status}
              </span>
              <span className="text-sm font-medium text-muted-foreground">{tipp.kategorie}</span>
            </div>
            
            <h3 className="text-xl font-bold">{tipp.titel}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{tipp.beschreibung}</p>
            
            <div className="bg-secondary/30 p-4 rounded-xl border-l-4 border-primary">
              <p className="text-xs font-bold text-primary uppercase mb-1">Milas Nischen-Tipp ✨</p>
              <p className="text-sm italic text-foreground/80">{tipp.nische}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
