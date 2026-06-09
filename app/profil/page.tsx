"use client"

import { useFinance } from "@/lib/store"
import { useState } from "react"

// Die verständlichen Erklärungen für den Status (Deine Nische!)
const STATUS_DETAILS: Record<string, { label: string; info: string }> = {
  "freelancer": {
    label: "Freelancer / Freiberufler",
    info: "Du arbeitest kreativ, beratend oder wissenschaftlich (z.B. IT, Design, Text). Keine Gewerbesteuer!"
  },
  "kleinunternehmer": {
    label: "Kleinunternehmer",
    info: "Du bist selbstständig, zahlst aber keine Umsatzsteuer, weil dein Umsatz unter der Grenze bleibt. Weniger Papierkram!"
  },
  "selbststaendig": {
    label: "Gewerblich Selbstständig",
    info: "Du hast ein echtes Gewerbe angemeldet. Du schreibst Rechnungen mit Umsatzsteuer und musst diese ans Finanzamt abführen."
  },
  "angestellt": {
    label: "Angestellter",
    info: "Du arbeitest fest in einer Firma. Du kannst deine Kosten über die Steuererklärung am Jahresende absetzen."
  },
  "minijob": {
    label: "Minijobber",
    info: "Du verdienst steuerfrei nebenbei. Perfekt für einen kleinen Zusatzverdienst ohne große Steuerabzüge."
  }
}

export default function ProfilPage() {
  // Achtung: Wenn dein Store eine Funktion wie "updateUserStatus" hat, kannst du sie hier eintragen.
  // Falls nicht, nutzen wir zusätzlich einen lokalen Zustand, damit der Nutzer wählen kann.
  const { userName, userStatus, logout, setStatus } = useFinance() as any
  const [selectedStatus, setSelectedStatus] = useState(userStatus || "freelancer")

  const handleStatusChange = (newStatus: string) => {
    setSelectedStatus(newStatus)
    // Wenn dein Store das Speichern unterstützt, rufen wir es hier auf:
    if (typeof setStatus === "function") {
      setStatus(newStatus)
    }
  }

  return (
    <div className="p-4 space-y-6 pb-24 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-extrabold tracking-tight">👤 Mein Profil</h1>
      </div>

      {/* Profil-Karte */}
      <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-6">
        {/* Nutzername */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Nutzername
          </label>
          <p className="text-lg font-bold text-foreground">
            {userName || "Finanz-Nutzer"}
          </p>
        </div>

        {/* Projekt-Fokus */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Projekt-Fokus
          </label>
          <p className="text-lg font-bold text-rose-500">
            Mila Finance
          </p>
        </div>

        {/* Beruflicher Status Auswahl */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Beruflicher Status ändern
          </label>
          
          <div className="grid grid-cols-1 gap-2">
            {Object.entries(STATUS_DETAILS).map(([key, data]) => {
              const isSelected = selectedStatus === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleStatusChange(key)}
                  className={`flex flex-col text-left p-4 rounded-xl border transition-all ${
                    isSelected 
                      ? 'bg-card border-primary ring-2 ring-primary/10' 
                      : 'bg-muted/30 border-border opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <span className={isSelected ? "text-primary" : "text-muted-foreground"}>
                      {isSelected ? "🔘" : "⚪"}
                    </span>
                    <span>{data.label}</span>
                  </div>
                  {isSelected && (
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed bg-muted/50 p-2 rounded-lg w-full">
                      💡 {data.info}
                    </p>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Trennlinie & Abmelden */}
        <div className="border-t border-border pt-4">
          <button
            onClick={() => {
              if (confirm("Möchtest du dich wirklich abmelden? Alle lokalen Daten werden zurückgesetzt.")) {
                logout()
              }
            }}
            className="w-full py-3 bg-destructive/10 hover:bg-destructive/20 text-destructive font-bold rounded-2xl text-sm transition-colors"
          >
            Abmelden & Daten löschen
          </button>
        </div>
      </div>
    </div>
  )
}
