'use client'

import { useState, useMemo } from 'react'
import { useFinance } from '@/lib/store'
import Link from 'next/link'

// --- HELFER-FUNKTIONEN ---
function formatEuro(value: number) {
  return value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

function formatDate(dateString: string) {
  if (!dateString) return ''
  const d = new Date(dateString)
  if (isNaN(d.getTime())) return dateString
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function BuchungenPage() {
  const { expenses, incomes, summary, deleteExpense, deleteIncome } = useFinance()

  // --- STATES FÜR SUCHE & FILTER ---
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<'alle' | 'einnahme' | 'ausgabe'>('alle')
  const [statusFilter, setStatusFilter] = useState<'alle' | 'offen' | 'bezahlt' | 'ueberfaellig'>('alle')
  const [selectedYear, setSelectedYear] = useState<string>('alle')
  const [selectedMonth, setSelectedMonth] = useState<string>('alle')

  // State für aufklappbare Karten (IDs der geöffneten Karten)
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({})
  // State für das Auf-/Zuklappen ganzer Monatsgruppen
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

  // 1. Alle Transaktionen zusammenführen und vereinheitlichen
  const alleTransaktionen = useMemo(() => {
    const exps = (expenses || []).map((e) => ({
      id: `exp-${e.id}`,
      rawId: e.id,
      title: e.title || '',
      party: e.vendor || '', // Händler
      amount: Number(e.amount || 0),
      date: e.date,
      category: e.category || 'sonstiges',
      note: e.note || '',
      typ: 'ausgabe',
      status: 'bezahlt', // Ausgaben sind direkt bezahlt
    }))

    const incs = (incomes || []).map((i) => {
      // Bestimme Status (Fallbacks für deine Felder)
      const currentStatus = (i.status || 'Offen').toLowerCase()
      
      return {
        id: `inc-${i.id}`,
        rawId: i.id,
        title: i.title || '',
        party: i.client || '', // Kunde
        amount: Number(i.amount || 0),
        date: i.date,
        category: 'Einnahme',
        note: i.note || '',
        typ: 'einnahme',
        status: currentStatus === 'bezahlt' ? 'bezahlt' : currentStatus === 'überfällig' || currentStatus === 'ueberfaellig' ? 'ueberfaellig' : 'offen',
        dueDate: i.dueDate || i.due_date || '',
      }
    })

    return [...exps, ...incs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [expenses, incomes])

  // 2. Filter & Suche anwenden
  const gefilterteTransaktionen = useMemo(() => {
    return alleTransaktionen.filter((t) => {
      // Suchfeld (Händler, Kunde, Kategorie, Titel)
      const matchSearch =
        t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.party.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase())

      if (!matchSearch) return false

      // Typ-Filter (Alle, Einnahmen, Ausgaben)
      if (typeFilter === 'einnahme' && t.typ !== 'einnahme') return false
      if (typeFilter === 'ausgabe' && t.typ !== 'ausgabe') return false

      // Status-Filter (Offen, Bezahlt, Überfällig)
      if (statusFilter !== 'alle' && t.status !== statusFilter) return false

      // Datums-Filter (Jahr / Monat)
      if (t.date) {
        const d = new Date(t.date)
        const j = d.getFullYear().toString()
        const m = d.getMonth().toString() // 0 = Jan, 11 = Dez

        if (selectedYear !== 'alle' && j !== selectedYear) return false
        if (selectedMonth !== 'alle' && m !== selectedMonth) return false
      }

      return true
    })
  }, [alleTransaktionen, searchTerm, typeFilter, statusFilter, selectedYear, selectedMonth])

  // 3. Nach Monaten gruppieren (z.B. "Juni 2026")
  const gruppierteTransaktionen = useMemo(() => {
    const groups: Record<string, typeof gefilterteTransaktionen> = {}
    
    gefilterteTransaktionen.forEach((t) => {
      if (!t.date) return
      const d = new Date(t.date)
      const monatsName = d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
      
      if (!groups[monatsName]) groups[monatsName] = []
      groups[monatsName].push(t)
    })
    
    return groups
  }, [gefilterteTransaktionen])

  // --- LOGIK-FUNKTIONEN ---
  const toggleCard = (id: string) => {
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const toggleGroup = (groupName: string) => {
    setCollapsedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }))
  }

  const handleWhatsAppReminder = (t: any) => {
    const text = `Hallo ${t.party}, ich wollte kurz an die offene Rechnung für "${t.title}" über ${formatEuro(t.amount)} erinnern. Liebe Grüße!`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const handleDelete = async (t: any) => {
    if (!confirm(`Möchtest du "${t.title}" wirklich löschen?`)) return
    if (t.typ === 'ausgabe') {
      await deleteExpense(t.rawId)
    } else {
      await deleteIncome(t.rawId)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FC] pb-24 font-sans antialiased text-slate-900">
      
      {/* Sticky Header */}
      <div className="bg-white border-b border-slate-100 p-4 sticky top-0 z-10 shadow-sm space-y-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-950">Deine Buchungen</h1>
            <p className="text-xs text-slate-500 mt-0.5">Filterbare Finanzübersicht</p>
          </div>
          <Link href="/neue-buchungen" className="bg-purple-600 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-sm hover:bg-purple-700">
            + Neu
          </Link>
        </div>

        {/* --- SUCHFELD --- */}
        <div className="max-w-md mx-auto">
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">🔍</span>
            <input
              type="text"
              placeholder="Suche nach Händler, Kunde, Kategorie..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-purple-500 focus:bg-white transition"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* --- FILTER LEISTE (Horizontal Scroll) --- */}
        <div className="max-w-md mx-auto overflow-x-auto no-scrollbar flex gap-2 pb-1 text-[11px]">
          {/* Typ-Filter */}
          <button onClick={() => { setTypeFilter('alle'); setStatusFilter('alle'); }} className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap border transition ${typeFilter === 'alle' && statusFilter === 'alle' ? 'bg-purple-600 border-purple-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
            Alle
          </button>
          <button onClick={() => { setTypeFilter('einnahme'); setStatusFilter('alle'); }} className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap border transition ${typeFilter === 'einnahme' && statusFilter === 'alle' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
            Einnahmen
          </button>
          <button onClick={() => { setTypeFilter('ausgabe'); setStatusFilter('alle'); }} className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap border transition ${typeFilter === 'ausgabe' ? 'bg-rose-600 border-rose-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
            Ausgaben
          </button>

          {/* Status-Filter */}
          <button onClick={() => { setTypeFilter('einnahme'); setStatusFilter('offen'); }} className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap border transition ${statusFilter === 'offen' ? 'bg-amber-500 border-amber-500 text-white' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
            🟡 Offen
          </button>
          <button onClick={() => { setTypeFilter('einnahme'); setStatusFilter('ueberfaellig'); }} className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap border transition ${statusFilter === 'ueberfaellig' ? 'bg-red-600 border-red-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
            🔴 Überfällig
          </button>
        </div>

        {/* Datumsfilter Grid */}
        <div className="max-w-md mx-auto grid grid-cols-2 gap-2 text-xs">
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-slate-50 border border-slate-200 p-2 rounded-xl font-medium focus:outline-none text-slate-700">
            <option value="alle">Alle Jahre</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-slate-50 border border-slate-200 p-2 rounded-xl font-medium focus:outline-none text-slate-700">
            <option value="alle">Alle Monate</option>
            <option value="0">Januar</option>
            <option value="1">Februar</option>
            <option value="2">März</option>
            <option value="3">April</option>
            <option value="4">Mai</option>
            <option value="5">Juni</option>
            <option value="6">Juli</option>
            <option value="7">August</option>
            <option value="8">September</option>
            <option value="9">Oktober</option>
            <option value="10">November</option>
            <option value="11">Dezember</option>
          </select>
        </div>
      </div>

      {/* --- INHALT / TRANSAKTIONSLISTE --- */}
      <div className="max-w-md mx-auto px-4 mt-4 space-y-6">
        
        {Object.keys(gruppierteTransaktionen).length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-sm space-y-2">
            <span className="text-3xl">📒</span>
            <p className="text-xs font-medium text-slate-500">Keine Buchungen für die gewählten Filter gefunden.</p>
          </div>
        ) : (
          Object.entries(gruppierteTransaktionen).map(([monat, liste]) => {
            const isCollapsed = collapsedGroups[monat] || false

            return (
              <div key={monat} className="space-y-2">
                {/* Monatsgruppe Header mit Toggle-Funktion */}
                <button
                  onClick={() => toggleGroup(monat)}
                  className="w-full flex items-center justify-between px-2 py-1 text-xs font-black uppercase tracking-wider text-slate-400 hover:text-slate-600 transition"
                >
                  <span>📅 {monat} ({liste.length})</span>
                  <span>{isCollapsed ? '🔼 Aufklappen' : '🔽 Zuklappen'}</span>
                </button>

                {/* Wenn die Gruppe nicht zugeklappt ist, zeige die Karten */}
                {!isCollapsed && (
                  <div className="space-y-2.5">
                    {liste.map((t) => {
                      const isExpanded = expandedCards[t.id] || false

                      return (
                        <div
                          key={t.id}
                          className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition"
                        >
                          {/* Hauptkarte (Klickbar zum Aufklappen) */}
                          <div
                            onClick={() => toggleCard(t.id)}
                            className="p-4 flex items-center justify-between gap-3 cursor-pointer active:bg-slate-50/80 transition select-none"
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-xs text-slate-950 truncate">{t.title}</p>
                                {/* Status-Badge für Einnahmen */}
                                {t.typ === 'einnahme' && (
                                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wide ${
                                    t.status === 'bezahlt' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                    t.status === 'ueberfaellig' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                                    'bg-amber-50 text-amber-700 border border-amber-200'
                                  }`}>
                                    {t.status === 'bezahlt' ? '🟢 Bezahlt' : t.status === 'ueberfaellig' ? '🔴 Überfällig' : '🟡 Offen'}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 truncate">
                                {t.party ? `${t.typ === 'einnahme' ? 'Kunde' : 'Händler'}: ${t.party}` : 'Keine Angabe'}
                              </p>
                            </div>

                            {/* Rechter Part: Betrag (Farbcodiert) */}
                            <div className="text-right shrink-0">
                              <p className={`font-black text-sm ${t.typ === 'ausgabe' ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {t.typ === 'ausgabe' ? '-' : '+'}{formatEuro(t.amount)}
                              </p>
                              <p className="text-[9px] text-slate-400 font-medium">{formatDate(t.date)}</p>
                            </div>
                          </div>

                          {/* Aufklappbarer Detailbereich */}
                          {isExpanded && (
                            <div className="bg-slate-50/50 border-t border-slate-100 p-4 text-[11px] space-y-3 animate-fadeIn">
                              <div className="grid grid-cols-2 gap-3 text-slate-600">
                                <div>
                                  <span className="font-bold block text-[9px] uppercase text-slate-400">Kategorie</span>
                                  <span className="font-semibold text-slate-800 capitalize">{t.category}</span>
                                </div>
                                {t.dueDate && (
                                  <div>
                                    <span className="font-bold block text-[9px] uppercase text-slate-400">Fälligkeitsdatum</span>
                                    <span className="font-semibold text-rose-700">{formatDate(t.dueDate)}</span>
                                  </div>
                                )}
                                <div className="col-span-2">
                                  <span className="font-bold block text-[9px] uppercase text-slate-400">Notiz / Details</span>
                                  <p className="text-slate-700 font-medium mt-0.5 bg-white border border-slate-100 p-2 rounded-lg italic">
                                    {t.note || 'Keine Notiz hinterlegt.'}
                                  </p>
                                </div>
                              </div>

                              {/* Aktions-Buttons */}
                              <div className="flex gap-2 pt-1.5 justify-end">
                                {/* WhatsApp Erinnerungs-Button (Nur für offene Einnahmen) */}
                                {t.typ === 'einnahme' && t.status !== 'bezahlt' && (
                                  <button
                                    onClick={() => handleWhatsAppReminder(t)}
                                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition active:scale-95"
                                  >
                                    💬 Erinnern
                                  </button>
                                )}
                                {/* Löschen Button */}
                                <button
                                  onClick={() => handleDelete(t)}
                                  className="bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 font-bold px-3 py-2 rounded-xl transition active:scale-95"
                                >
                                  🗑️ Löschen
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
