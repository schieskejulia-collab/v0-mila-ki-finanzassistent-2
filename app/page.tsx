"use client"

import { useFinance } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import { useEffect, useState } from "react"

export default function DashboardPage() {
  const { 
    summary, 
    userStatus, 
    setUserStatus, 
    milaFeedback, 
    expenses, 
    incomes,
    userName,
    budgetStatus
  } = useFinance();

  // Hydration Fix: Warten bis Client-seitig geladen
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="p-4 flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground animate-pulse font-bold">Mila lädt deine Daten...</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 pb-24 max-w-2xl mx-auto">
      {/* Header Bereich */}
      <div className="flex justify-between items-center pt-2">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            Hallo {userName || 'Julia'}! 👋
          </h1>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
            Dein Finanz-Überblick
          </p>
        </div>
        <div className="w-10 h-10 bg-secondary rounded-2xl flex items-center justify-center text-lg border border-border shadow-sm">
          ✨
        </div>
      </div>

      {/* 1. Status-Wähler: Mila's Kontext */}
      <Card className="border-none bg-secondary/30 rounded-[2rem]">
        <CardContent className="p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Steuerlicher Status
            </h2>
            <span className="text-[10px] font-bold text-primary px-2 py-0.5 bg-primary/10 rounded-full">
              Live-Anpassung
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {['angestellt', 'selbstständig', 'freelancer', 'kleinunternehmer'].map((status) => (
              <button
                key={status}
                onClick={() => setUserStatus(status as any)}
                className={`py-2.5 px-2 text-[9px] font-black rounded-xl border transition-all uppercase tracking-tighter ${
                  userStatus === status 
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm' 
                  : 'bg-background border-border text-muted-foreground'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 2. Mila's Soul Bubble */}
      <div className="bg-primary/10 border-l-4 border-primary p-5 rounded-r-3xl space-y-1 shadow-sm">
        <p className="text-[10px] font-black text-primary uppercase tracking-widest">Mila denkt mit ✨</p>
        <p className="text-base font-medium italic text-foreground/90 leading-snug">
          "{milaFeedback || 'Ich bin bereit für deine Belege!'}"
        </p>
      </div>

      {/* 3. Gespaltene Übersicht: Einnahmen vs. Ausgaben */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-none bg-emerald-50/50 rounded-[2rem]">
          <CardContent className="p-5 space-y-1">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Einnahmen</p>
            <p className="text-xl font-black text-emerald-700">
              +{summary?.totalIncomes?.toLocaleString('de-DE', { minimumFractionDigits: 2 }) || "0,00"} €
            </p>
            <p className="text-[9px] text-emerald-600/60 font-medium">{incomes?.length || 0} Buchungen</p>
          </CardContent>
        </Card>

        <Card className="border-none bg-rose-50/50 rounded-[2rem]">
          <CardContent className="p-5 space-y-1">
            <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">Ausgaben</p>
            <p className="text-xl font-black text-rose-700">
              -{summary?.totalExpenses?.toLocaleString('de-DE', { minimumFractionDigits: 2 }) || "0,00"} €
            </p>
            <p className="text-[9px] text-rose-600/60 font-medium">{expenses?.length || 0} Belege</p>
          </CardContent>
        </Card>
      </div>

      {/* 4. Budget-Fortschritt */}
      <Card className="border-border bg-card rounded-[2rem] shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">
            Budget-Check
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {budgetStatus?.map((budget) => (
            <div key={budget.category} className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span>{budget.category}</span>
                <span className={(budget?.remaining ?? 0) < 0 ? "text-rose-600" : "text-emerald-600"}>
                  {(budget?.remaining ?? 0).toLocaleString('de-DE')} € übrig
                </span>
              </div>
              <Progress value={budget?.percent ?? 0} className="h-2 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/buchungen" className="flex items-center justify-center gap-2 p-4 bg-secondary/40 rounded-2xl font-bold text-xs hover:bg-secondary transition-all">
          <span>📒</span> Buchungen
        </Link>
        <Link href="/wissen" className="flex items-center justify-center gap-2 p-4 bg-secondary/40 rounded-2xl font-bold text-xs hover:bg-secondary transition-all">
          <span>💡</span> Mila Wissen
        </Link>
      </div>
    </div>
  )
}