'use client'

import { useFinance } from "@/lib/store"

export default function ProfilPage() {
  const { userName, userStatus, logout } = useFinance()

  return (
    <div className="p-4 space-y-6 pb-24 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-extrabold tracking-tight">👤 Mein Profil</h1>
      </div>

      {/* Profil-Karte */}
      <div className="bg-card border border-border rounded-3xl p-6 shadow-xs space-y-6">
        <div className="space-y-1">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Nutzername
          </label>
          <p className="text-lg font-bold text-foreground">
            {userName || "Finanz-Nutzer"}
          </p>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Beruflicher Status
          </label>
          <p className="text-sm font-semibold px-3 py-1.5 bg-primary/10 text-primary rounded-xl inline-block capitalize">
            {userStatus || "Selbstständig"}
          </p>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Projekt-Fokus
          </label>
          <p className="text-lg font-bold text-rose-500">
            Mila Finance
          </p>
        </div>

        {/* Trennlinie */}
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
