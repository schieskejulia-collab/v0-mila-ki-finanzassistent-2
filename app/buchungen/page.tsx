'use client'

import { useState, useMemo } from 'react'
import { useFinance } from '@/lib/store'
import Link from 'next/link'
import {
  downloadReportCsv,
  downloadReportPdf,
  type ReportData,
  type ReportPeriod,
} from '@/lib/report-export'

function formatEuro(value: number) {
  return value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

function formatDate(dateString: string) {
  if (!dateString) return 'Kein Datum'
  const d = new Date(dateString)
  if (isNaN(d.getTime())) return dateString
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function BuchungenPage() {
  const { expenses, incomes, updateIncomeStatus, deleteExpense, deleteIncome } = useFinance()

  // --- STATES FÜR FILTER ---
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<'alle' | 'einnahme' | 'ausgabe'>('alle')
  const [statusFilter, setStatusFilter] = useState<'alle' | 'offen' | 'bezahlt' | 'ueberfaellig'>('alle')
  
  // FIX: Standardmäßig auf 'alle' gesetzt, damit nichts fälschlicherweise weggefiltert wird!
  const [selectedYear, setSelectedYear] = useState<string>('alle')
  const [selectedMonth, setSelectedMonth] = useState<string>('alle')
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('month')

  // State für offene Gruppen/Karten
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({})
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

  // 1. Daten matchen & vereinheitlichen
  const alleTransaktionen = useMemo(() => {
    const exps = (expenses || []).map((e, index) => ({
      id: `exp-${e.id || e.created_at || index}-${e.title}-${e.amount}`,
      rawId: e.id || {
        title: e.title,
        amount: e.amount,
        date: e.date,
        created_at: e.created_at,
      },
      title: e.title || 'Ausgabe ohne Titel',
      party: e.vendor || '',
      amount: Number(e.amount || 0),
      date: e.date || e.created_at || new Date().toISOString(),
      category: e.category || 'Ausgabe',
      note: e.note || '',
      typ: 'ausgabe' as const,
      status: e.status || 'bezahlt',
    }))

    const incs = (incomes || []).map((i, index) => {
      const currentStatus = (i.status || 'Offen').toLowerCase()
      let mappedStatus = 'offen'
      if (currentStatus === 'bezahlt') mappedStatus = 'bezahlt'
      if (currentStatus === 'überfällig' || currentStatus === 'ueberfaellig') mappedStatus = 'ueberfaellig'

      return {
        id: `inc-${i.id || index}`,
        rawId: i.id,
        title: i.title || 'Einnahme ohne Titel',
        party: i.client || '',
        amount: Number(i.amount || 0),
        date: i.date || i.created_at || new Date().toISOString(),
        category: 'Einnahme',
        note: i.note || '',
        typ: 'einnahme' as const,
        status: mappedStatus,
      }
    })

    return [...exps, ...incs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [expenses, incomes])

  // 2. Filter anwenden
  const gefilterteTransaktionen = useMemo(() => {
    return alleTransaktionen.filter((t) => {
      const matchSearch =
        t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.party.toLowerCase().includes(searchTerm.toLowerCase())

      if (!matchSearch) return false
      if (typeFilter === 'einnahme' && t.typ !== 'einnahme') return false
      if (typeFilter === 'ausgabe' && t.typ !== 'ausgabe') return false
      if (statusFilter !== 'alle' && t.status !== statusFilter) return false

      if (t.date) {
        const d = new Date(t.date)
        if (!isNaN(d.getTime())) {
          if (selectedYear !== 'alle' && d.getFullYear().toString() !== selectedYear) return false
          if (selectedMonth !== 'alle' && d.getMonth().toString() !== selectedMonth) return false
        }
      }
      return true
    })
  }, [alleTransaktionen, searchTerm, typeFilter, statusFilter, selectedYear, selectedMonth])

  // 3. Nach Monaten gruppieren
  const gruppierteTransaktionen = useMemo(() => {
    const groups: Record<string, typeof gefilterteTransaktionen> = {}
    gefilterteTransaktionen.forEach((t) => {
      const d = t.date ? new Date(t.date) : new Date()
      const monatsName = !isNaN(d.getTime()) 
        ? d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
        : 'Ohne Datum'
        
      if (!groups[monatsName]) groups[monatsName] = []
      groups[monatsName].push(t)
    })
    return groups
  }, [gefilterteTransaktionen])

  const exportReport = useMemo<ReportData>(() => {
    const now = new Date()
    const year =
      selectedYear === 'alle'
        ? now.getFullYear()
        : Number(selectedYear)

    const selectedMonthNumber =
      selectedMonth === 'alle'
        ? now.getMonth()
        : Number(selectedMonth)

    const quarter = Math.floor(selectedMonthNumber / 3)
    const quarterStart = quarter * 3
    const quarterEnd = quarterStart + 2

    const transactions = alleTransaktionen.filter((item) => {
      if (!item.date) return false

      const date = new Date(item.date)

      if (Number.isNaN(date.getTime())) return false
      if (selectedYear !== 'alle' && date.getFullYear() !== year) return false

      if (reportPeriod === 'year') return true

      const month = date.getMonth()

      if (reportPeriod === 'quarter') {
        return month >= quarterStart && month <= quarterEnd
      }

      return selectedMonth === 'alle' ? true : month === selectedMonthNumber
    })

    const monthName = new Date(year, selectedMonthNumber, 1).toLocaleDateString(
      'de-DE',
      { month: 'long', year: 'numeric' }
    )

    const title =
      reportPeriod === 'year'
        ? `Jahresbericht ${year}`
        : reportPeriod === 'quarter'
          ? `Quartalsbericht Q${quarter + 1} ${year}`
          : `Monatsbericht ${monthName}`

    const filenameBase = `mila-${title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')}`

    return {
      title,
      filenameBase,
      transactions,
    }
  }, [alleTransaktionen, reportPeriod, selectedMonth, selectedYear])

  // --- ACTIONS ---
  const handleWhatsAppReminder = (t: any) => {
    const text = `Hallo ${t.party}, ich wollte kurz an die offene Rechnung für "${t.title}" über ${formatEuro(t.amount)} erinnern. Viele Grüße!`
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
      
      {/* Header Controls */}
      <div className="p-4 space-y-4 max-w-md mx-auto">
        
        {/* Datums-Dropdowns */}
        <div className="grid grid-cols-2 gap-3">
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-white border border-slate-100 shadow-sm p-3 rounded-2xl font-bold text-xs text-slate-800 focus:outline-none appearance-none">
            <option value="alle">Alle Jahre</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-white border border-slate-100 shadow-sm p-3 rounded-2xl font-bold text-xs text-slate-800 focus:outline-none appearance-none">
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

        {/* Suchfeld */}
        <div className="relative">
          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 text-xs">🔍</span>
          <input
            type="text"
            placeholder="Suche nach Händler, Kunde, Kategorie..."
            className="w-full pl-9 pr-4 py-3 bg-white border border-slate-100 shadow-sm rounded-2xl text-xs font-medium focus:outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filter Pill Box */}
        <div className="flex flex-wrap gap-2 text-xs">
          <button onClick={() => { setTypeFilter('alle'); setStatusFilter('alle'); }} className={`px-4 py-2 rounded-full font-bold shadow-sm border transition ${typeFilter === 'alle' && statusFilter === 'alle' ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white border-slate-100 text-purple-600'}`}>
            Alle
          </button>
          <button onClick={() => { setTypeFilter('einnahme'); setStatusFilter('alle'); }} className={`px-4 py-2 rounded-full font-bold shadow-sm border transition ${typeFilter === 'einnahme' && statusFilter === 'alle' ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white border-slate-100 text-purple-600'}`}>
            Einnahmen
          </button>
          <button onClick={() => { setTypeFilter('ausgabe'); setStatusFilter('alle'); }} className={`px-4 py-2 rounded-full font-bold shadow-sm border transition ${typeFilter === 'ausgabe' ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white border-slate-100 text-purple-600'}`}>
            Ausgaben
          </button>
          <button onClick={() => { setTypeFilter('einnahme'); setStatusFilter('offen'); }} className={`px-4 py-2 rounded-full font-bold shadow-sm border transition ${statusFilter === 'offen' ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white border-slate-100 text-slate-700'}`}>
            ⏳ Offen
          </button>
          <button onClick={() => { setTypeFilter('einnahme'); setStatusFilter('bezahlt'); }} className={`px-4 py-2 rounded-full font-bold shadow-sm border transition ${statusFilter === 'bezahlt' ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white border-slate-100 text-slate-700'}`}>
            ✅ Bezahlt
          </button>
          <button onClick={() => { setTypeFilter('einnahme'); setStatusFilter('ueberfaellig'); }} className={`px-4 py-2 rounded-full font-bold shadow-sm border transition ${statusFilter === 'ueberfaellig' ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white border-slate-100 text-slate-700'}`}>
            🚨 Überfällig
          </button>
        </div>

        {/* Sektions-Titel */}
        <p className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 pt-2">
          Gefundene Buchungen ({gefilterteTransaktionen.length})
        </p>

        {/* Quick Navigation Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/buchungen" className="rounded-3xl bg-white p-4 shadow-sm border border-slate-100">
            <p className="text-2xl">📒</p>
            <p className="mt-2 font-black text-slate-900">Buchungen</p>
            <p className="mt-1 text-xs text-slate-500">Einnahmen und Ausgaben</p>
          </Link>

          <Link href="/rechnungen" className="rounded-3xl bg-white p-4 shadow-sm border border-slate-100">
            <p className="text-2xl">📄</p>
            <p className="mt-2 font-black text-slate-900">Rechnungen</p>
            <p className="mt-1 text-xs text-slate-500">Offen, bezahlt & überfällig</p>
          </Link>

          <Link href="/verpflichtungen" className="rounded-3xl bg-white p-4 shadow-sm border border-slate-100">
            <p className="text-2xl">🧾</p>
            <p className="mt-2 font-black text-slate-900">Fristen</p>
            <p className="mt-1 text-xs text-slate-500">Rechnungen & Termine</p>
          </Link>

          <Link href="/dokumente" className="rounded-3xl bg-white p-4 shadow-sm border border-slate-100">
            <p className="text-2xl">📂</p>
            <p className="mt-2 font-black text-slate-900">Dokumente</p>
            <p className="mt-1 text-xs text-slate-500">Belege & Nachweise</p>
          </Link>
        </div>

        {/* Export-Sektion */}
        <section className="rounded-3xl border border-violet-100 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.15em] text-violet-500">
            Berichte exportieren
          </p>

          <p className="mt-2 text-sm font-bold text-slate-900">
            {exportReport.title}
          </p>

          <p className="mt-1 text-xs font-semibold text-slate-500">
            {exportReport.transactions.length} Buchungen im Bericht
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {([
              ['month', 'Monat'],
              ['quarter', 'Quartal'],
              ['year', 'Jahr'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setReportPeriod(value)}
                className={
                  reportPeriod === value
                    ? 'rounded-2xl bg-violet-600 py-3 text-xs font-black text-white'
                    : 'rounded-2xl bg-violet-50 py-3 text-xs font-black text-violet-700'
                }
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => downloadReportCsv(exportReport)}
              className="rounded-2xl bg-emerald-600 py-3 text-xs font-black text-white"
            >
              CSV laden
            </button>

            <button
              type="button"
              onClick={() => downloadReportPdf(exportReport)}
              className="rounded-2xl bg-slate-900 py-3 text-xs font-black text-white"
            >
              PDF laden
            </button>
          </div>
        </section>

        {/* --- BUCHUNGSLISTE --- */}
        <div className="space-y-6">
          {Object.keys(gruppierteTransaktionen).length === 0 ? (
            <div className="bg-white rounded-[2rem] p-8 text-center border border-slate-100 shadow-sm">
              <p className="text-3xl">📭</p>
              <p className="mt-2 font-black text-slate-800">Keine Buchungen gefunden</p>
              <p className="mt-1 text-xs text-slate-400">
                Prüfe deine Filterkriterien oder erstelle eine neue Einnahme bzw. Ausgabe.
              </p>
            </div>
          ) : (
            Object.entries(gruppierteTransaktionen).map(([monat, liste]) => {
              const isCollapsed = collapsedGroups[monat] || false

              return (
                <div key={monat} className="space-y-3">
                  {/* Monatsgruppe Header */}
                  <div className="flex items-center justify-between px-1">
                    <div>
                      <h2 className="text-xl font-black text-slate-950">{monat}</h2>
                      <p className="text-[11px] font-bold text-slate-400 mt-0.5">{liste.length} Buchungen</p>
                    </div>
                    <button
                      onClick={() => setCollapsedGroups(p => ({ ...p, [monat]: !isCollapsed }))}
                      className="text-purple-600 text-xs font-black flex items-center gap-1"
                    >
                      {isCollapsed ? '🔼 AUFKLAPPEN' : '🔽 ZUKLAPPEN'}
                    </button>
                  </div>

                  {/* Buchungskarten */}
                  {!isCollapsed && (
                    <div className="space-y-3">
                      {liste.map((t) => {
                        const isExpanded = expandedCards[t.id] || false

                        return (
                          <div key={t.id} className="bg-white rounded-[2rem] p-5 border border-slate-50 shadow-sm space-y-4">
                            {/* Klickbarer Header-Bereich */}
                            <div onClick={() => setExpandedCards(p => ({ ...p, [t.id]: !isExpanded }))} className="flex items-start justify-between gap-2 cursor-pointer select-none">
                              <div className="space-y-2">
                                <h3 className="font-black text-sm text-slate-950 flex items-center gap-1.5">
                                  {t.typ === 'ausgabe' ? '💸' : '💰'} {t.title}
                                </h3>
                                <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                  t.status === 'bezahlt' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                  t.status === 'ueberfaellig' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                                  'bg-amber-50 text-amber-600 border border-amber-100'
                                }`}>
                                  {t.status === 'bezahlt' ? '🟢 Bezahlt' : t.status === 'ueberfaellig' ? '🔴 Überfällig' : '🟡 Offen'}
                                </span>
                                
                                {!isExpanded && (
                                  <p className="text-[11px] text-slate-400 font-medium">
                                    {t.party ? `${t.party} · ` : ''}{formatDate(t.date)}
                                  </p>
                                )}
                              </div>

                              <div className="text-right shrink-0">
                                <p className={`text-base font-black ${t.typ === 'ausgabe' ? 'text-rose-600' : 'text-emerald-600'}`}>
                                  {t.typ === 'ausgabe' ? '-' : '+'}{formatEuro(t.amount)}
                                </p>
                                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{formatDate(t.date)}</p>
                              </div>
                            </div>

                            {/* Aufgeklappte Details */}
                            {isExpanded && (
                              <div className="pt-2 border-t border-slate-100 space-y-4 text-xs animate-fadeIn">
                                <div className="space-y-2 text-slate-600 font-medium">
                                  <p><strong className="text-slate-800 font-bold">Partner/Kunde:</strong> {t.party || 'Keine Angabe'}</p>
                                  <p><strong className="text-slate-800 font-bold">Kategorie:</strong> {t.category}</p>
                                  <p><strong className="text-slate-800 font-bold">Buchungsdatum:</strong> {formatDate(t.date)}</p>
                                  {t.note && <p><strong className="text-slate-800 font-bold">Notiz:</strong> <span className="italic">{t.note}</span></p>}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col gap-2 pt-1">
                                  {t.typ === 'einnahme' && (
                                    <div className="grid grid-cols-3 gap-2">
                                      <button
                                        onClick={() => updateIncomeStatus(t.rawId, 'bezahlt')}
                                        className="rounded-xl bg-emerald-500 py-3 text-[11px] font-bold text-white transition active:scale-[0.98]"
                                      >
                                        ✅ Bezahlt
                                      </button>

                                      <button
                                        onClick={() => updateIncomeStatus(t.rawId, 'offen')}
                                        className="rounded-xl bg-amber-400 py-3 text-[11px] font-bold text-white transition active:scale-[0.98]"
                                      >
                                        🟡 Offen
                                      </button>

                                      <button
                                        onClick={() => updateIncomeStatus(t.rawId, 'ueberfaellig')}
                                        className="rounded-xl bg-rose-500 py-3 text-[11px] font-bold text-white transition active:scale-[0.98]"
                                      >
                                        🚨 Überfällig
                                      </button>
                                    </div>
                                  )}

                                  <div className="grid grid-cols-2 gap-2">
                                    {t.typ === 'einnahme' && t.status !== 'bezahlt' ? (
                                      <button
                                        onClick={() => handleWhatsAppReminder(t)}
                                        className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
                                      >
                                        🔔 Erinnern
                                      </button>
                                    ) : (
                                      <div />
                                    )}

                                    <button
                                      onClick={() => handleDelete(t)}
                                      className="bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold py-3 rounded-xl flex items-center justify-center gap-1.5 transition active:scale-[0.98] ml-auto w-full"
                                    >
                                      Löschen
                                    </button>
                                  </div>
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
    </div>
  )
}
