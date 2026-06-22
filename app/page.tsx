'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useFinance, CATEGORY_LABELS } from '@/lib/store'

function formatEuro(value: number) {
  return value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

export default function DashboardPage() {
  const {
    userName,
    userStatus,
    industry,
    vatStatus,
    summary,
    expenses,
    incomes,
    addExpense,
    addIncome
  } = useFinance()

  // 1. Automatische Berechnung der empfohlenen Rücklage (z.B. 30% vom Überschuss, falls positiv)
  const recommendedReserve = summary.balance > 0 ? summary.balance * 0.3 : 0

  // 2. Smarte To-Do-Liste & Abo-Warnungen simulieren/generieren aus den echten Buchungen
  const [todos, setTodos] = useState<any[]>([])

  useEffect(() => {
    const list = []

    // A) Suche nach überfälligen oder offenen Einnahmen
    const openIncomes = incomes.filter(i => i.status === 'Offen' || !i.status)
    openIncomes.forEach(i => {
      // Beispielhaft für die Müller GmbH oder Onkel Michael aus deinen Screenshots
      const isOverdue = i.title?.toLowerCase().includes('müller') || i.title?.toLowerCase().includes('schlussrechnung')
      list.push({
        id: `inc-${i.id}`,
        type: isOverdue ? 'overdue' : 'open-income',
        title: isOverdue ? '⚠️ Überfällige Einnahme' : '📋 Offene Einnahme',
        description: `${i.title} von ${i.client || 'Unbekannt'} (${formatEuro(Number(i.amount))}) ist noch offen.`,
        bgClass: isOverdue ? 'bg-red-50 border-red-200 text-red-900' : 'bg-purple-50 border-purple-200 text-purple-900'
      })
    })

    // B) DIE ABO-WARNUNG (Scannt Ausgaben nach wiederholten Begriffen wie Slack oder Hetzner)
    const slackCount = expenses.filter(e => e.vendor?.toLowerCase().includes('slack') || e.title?.toLowerCase().includes('slack')).length
    const hetznerCount = expenses.filter(e => e.vendor?.toLowerCase().includes('hetzner') || e.title?.toLowerCase().includes('hetzner')).length

    if (slackCount >= 2) {
      list.push({
        id: 'abo-slack',
        type: 'abo-warning',
        title: '💡 Wiederkehrende Ausgabe entdeckt',
        description: `Slack Technologies wurde mehrfach gebucht. Möchtest du das als festes Abo markieren?`,
        bgClass: 'bg-gray-50 border-gray-200 text-gray-800',
        hasAction: true,
        actionLabel: 'Als Abo markieren'
      })
    }

    if (hetznerCount >= 2) {
      list.push({
        id: 'abo-hetzner',
        type: 'abo-warning',
        title: '💡 Wiederkehrende Ausgabe entdeckt',
        description: `Hetzner Online wurde mehrfach gebucht. Möchtest du das als festes Abo markieren?`,
        bgClass: 'bg-gray-50 border-gray-200 text-gray-800',
        hasAction: true,
        actionLabel: 'Als Abo markieren'
      })
    }

    // Standard-Tipp falls die Liste komplett leer ist
    if (list.length === 0) {
      list.push({
        id: 'default-tip',
        type: 'tip',
        title: '✨ Alles im grünen Bereich',
        description: 'Mila hat aktuell keine überfälligen Posten oder versteckten Abos gefunden. Gute Arbeit!',
        bgClass: 'bg-green-50 border-green-200 text-green-900'
      })
    }

    setTodos(list)
  }, [expenses, incomes])

  return (
    <div className="min-h-screen bg-[#F8F9FC] pb-24 font-sans antialiased text-slate-900">
      
      {/* Roter Liquiditäts-Check Banner ganz oben */}
      <div className="bg-[#9E2A2B] text-white px-4 py-3 text-center text-sm font-medium shadow-sm flex items-center justify-center gap-2">
        <span>🚨</span>
        <span><strong>Mila Liquiditäts-Check:</strong> Prüfe deinen Cashflow für einen stressfreien Monat.</span>
        <button className="ml-3 bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1 rounded-full transition">
          Check öffnen →
        </button>
      </div>

      <div className="max-w-md mx-auto px-4 pt-6 space-y-6">
        
        {/* Guten Abend Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Guten Abend, {userName} 👋
          </h1>
          <p className="text-sm text-slate-500">Ich schaue mir gerade deine Zahlen an...</p>
        </div>

        {/* 1. DER PERSÖNLICHE MILA-STATUS-KOPF */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-2xl shadow-inner">
              🌸
            </div>
            <div>
              <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
                Mila <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse"></span>
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Status: <span className="font-semibold capitalize">{userStatus}</span> ({industry === 'webdesigner' ? 'Webdesign' : industry})<br />
                Steuerprofil: <span className="font-semibold">{vatStatus === 'kleinunternehmer' ? 'Kleinunternehmer (§19 UStG)' : 'Regelbesteuerung'}</span>
              </p>
            </div>
          </div>
          
          {/* Fortschrittsbalken */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-purple-700">✅ Fast geschafft!</span>
              <span className="text-slate-500">95%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-purple-600 rounded-full transition-all duration-500" style={{ width: '95%' }}></div>
            </div>
            <p className="text-[11px] text-slate-400">Nur noch geschätzten Jahresgewinn im Profil ergänzen.</p>
          </div>
        </div>

        {/* Aktions-Buttons für die Schnelligkeit */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/neu?type=income" className="bg-white hover:bg-slate-50 border border-slate-100 rounded-xl py-3 text-center font-medium text-sm text-emerald-600 shadow-sm flex items-center justify-center gap-2 transition">
            <span>+</span> Einnahme
          </Link>
          <Link href="/neu?type=expense" className="bg-white hover:bg-slate-50 border border-slate-100 rounded-xl py-3 text-center font-medium text-sm text-rose-600 shadow-sm flex items-center justify-center gap-2 transition">
            <span>−</span> Ausgabe
          </Link>
        </div>

        {/* 2. DIE KLAREN 4 FINANZ-KACHELN */}
        <div className="grid grid-cols-2 gap-3">
          {/* Einnahmen */}
          <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Einnahmen</span>
            <div className="mt-2">
              <span className="text-base font-bold text-emerald-600 flex items-center gap-1">
                {formatEuro(summary.totalIncomes)} <span className="text-xs font-normal">↑</span>
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">dieser Monat</span>
            </div>
          </div>

          {/* Ausgaben */}
          <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Ausgaben</span>
            <div className="mt-2">
              <span className="text-base font-bold text-rose-600 flex items-center gap-1">
                {formatEuro(summary.totalExpenses)} <span className="text-xs font-normal">↓</span>
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">dieser Monat</span>
            </div>
          </div>

          {/* Saldo */}
          <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Saldo</span>
            <div className="mt-2">
              <span className="text-base font-bold text-purple-700">
                {formatEuro(summary.balance)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">dieser Monat</span>
            </div>
          </div>

          {/* Rücklage */}
          <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Rücklage 📝</span>
            <div className="mt-2">
              <span className="text-base font-bold text-amber-600">
                {formatEuro(recommendedReserve)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">empfohlen</span>
            </div>
          </div>
        </div>

        {/* 3. DER "ICH HABE ETWAS FÜR DICH GEFUNDEN"-BEREICH */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 px-1">
            <span className="w-2 h-2 rounded-full bg-rose-500 block"></span>
            <h2 className="text-xs uppercase tracking-wider font-bold text-slate-400">
              Ich habe etwas für dich gefunden
            </h2>
          </div>

          <div className="space-y-2.5">
            {todos.map((todo) => (
              <div
                key={todo.id}
                className={`p-4 rounded-xl border text-xs shadow-sm flex flex-col justify-between gap-3 transition-all ${todo.bgClass}`}
              >
                <div>
                  <h4 className="font-bold mb-0.5 flex items-center gap-1.5">
                    {todo.title}
                  </h4>
                  <p className="leading-relaxed opacity-90">{todo.description}</p>
                </div>
                
                {todo.hasAction && (
                  <button className="self-end bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold px-3 py-1 rounded-lg text-[11px] shadow-xs transition active:scale-95">
                    {todo.actionLabel}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
