'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useFinance } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import { buildDocumentWorkName, checkDocumentQuality } from '@/lib/document-workflow'

const LEGACY_DISMISSED_KEY = 'mila-dismissed-legacy-expenses'

type FilterKey = 'all' | 'attention' | 'missing' | 'questions' | 'done'
type SortKey = 'newest' | 'oldest' | 'amount-desc' | 'amount-asc' | 'partner'
type CategoryKey = 'all' | 'klaerung' | 'einnahmen' | 'ausgaben' | 'bank-kasse' | 'vertraege' | 'steuer' | 'sonstiges'

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  all: 'Alle',
  klaerung: 'Klärung nötig',
  einnahmen: 'Einnahmen',
  ausgaben: 'Ausgaben',
  'bank-kasse': 'Bank & Kasse',
  vertraege: 'Verträge',
  steuer: 'Steuerunterlagen',
  sonstiges: 'Sonstiges',
}

function formatEuro(value?: number) {
  if (!value) return ''
  return value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

function getOpenQuestions(documents: any[]) {
  return documents.filter((doc) => {
    const note = String(doc.note || '').toLowerCase()
    return note.includes('unklar') || note.includes('rückfrage') || note.includes('rueckfrage') || note.includes('prüfen') || note.includes('pruefen')
  })
}

function getOpenObligations(obligations: any[]) {
  return obligations.filter((item) => !['erledigt', 'bezahlt', 'archiviert'].includes(String(item.status || '').toLowerCase()))
}

function getStatus({ documentCount, missingReceiptCount, openQuestionCount, openObligationCount, qualityIssueCount }: any) {
  if (documentCount === 0 && missingReceiptCount === 0) return { label: 'Noch nicht gestartet', description: 'Sobald die ersten Unterlagen erfasst sind, zeigt Mila hier den Bearbeitungsstand.', badge: 'bg-slate-100 text-slate-600' }
  const openCount = missingReceiptCount + openQuestionCount + openObligationCount + qualityIssueCount
  if (openCount === 0) return { label: 'Bereit zur Übergabe', description: 'Für die aktuell erfassten Unterlagen sind keine organisatorischen Rückfragen mehr offen.', badge: 'bg-emerald-100 text-emerald-700' }
  return { label: 'In Bearbeitung', description: `${openCount} offene Punkte sollten vor der Übergabe noch geklärt werden.`, badge: 'bg-amber-100 text-amber-700' }
}

function expenseTitle(expense: any) {
  return expense?.title || expense?.description || expense?.merchant || expense?.partner || expense?.vendor || 'Nicht zugeordneter Eintrag'
}

function expenseAmount(expense: any) {
  const value = Number(expense?.amount || 0)
  return Number.isFinite(value) ? value : 0
}

function legacyFingerprint(expense: any) {
  return [expenseTitle(expense), expenseAmount(expense), String(expense?.merchant || expense?.partner || ''), String(expense?.createdAt || expense?.created_at || expense?.date || '')].join('|')
}

function loadDismissedLegacyExpenses() {
  if (typeof window === 'undefined') return [] as string[]
  try {
    const raw = window.localStorage.getItem(LEGACY_DISMISSED_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return [] as string[]
  }
}

function itemDate(item: any) {
  return String(item?.date || item?.documentDate || item?.document_date || item?.createdAt || item?.created_at || item?.dueDate || item?.due_date || '')
}

function monthKey(item: any) {
  const raw = itemDate(item)
  const date = raw ? new Date(raw) : new Date()
  if (Number.isNaN(date.getTime())) return 'Ohne Datum'
  return new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(date)
}

function questionHref(doc: any) {
  const params = new URLSearchParams({
    documentId: String(doc.id),
    title: String(doc.title || 'Dokument'),
  })
  return `/rueckfragen?${params.toString()}`
}

function baseCategoryForDocument(doc: any): Exclude<CategoryKey, 'all' | 'klaerung'> {
  const type = String(doc.type || '').toLowerCase()
  const text = `${doc.title || ''} ${doc.partner || ''} ${doc.note || ''} ${doc.file_name || ''}`.toLowerCase()

  if (type === 'vertrag' || /miete|leasing|versicherung|vertrag/.test(text)) return 'vertraege'
  if (type === 'bescheid' || /steuerbescheid|ust|umsatzsteuer|finanzamt|steuerunterlage/.test(text)) return 'steuer'
  if (/kontoauszug|paypal|kreditkarte|bank|kassenbuch|barbeleg|kasse/.test(text)) return 'bank-kasse'
  if (/ausgangsrechnung|zahlungseingang|einnahme|kunde/.test(text)) return 'einnahmen'
  if (type === 'beleg' || /eingangsrechnung|quittung|abo|tank|büro|buero|bewirtung|ausgabe/.test(text)) return 'ausgaben'

  return 'sonstiges'
}

function categoryForDocument(doc: any, attentionIds: Set<string>): CategoryKey {
  if (attentionIds.has(String(doc.id)) || !checkDocumentQuality(doc).ok) return 'klaerung'
  return baseCategoryForDocument(doc)
}

export default function DokumentePage() {
  const { documents, expenses, obligations, deleteDocument, deleteExpense } = useFinance()
  const [dismissedLegacyExpenses, setDismissedLegacyExpenses] = useState<string[]>(loadDismissedLegacyExpenses)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [sort, setSort] = useState<SortKey>('newest')
  const [category, setCategory] = useState<CategoryKey>('all')
  const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({})
  const [openingDocumentId, setOpeningDocumentId] = useState('')

  const missingReceipts = expenses.filter((expense: any) => {
    const isMissing = expense?.hasReceipt === false || expense?.has_receipt === false
    if (!isMissing) return false
    if (!expense?.id) return !dismissedLegacyExpenses.includes(legacyFingerprint(expense))
    return true
  })

  const openQuestions = getOpenQuestions(documents)
  const openObligations = getOpenObligations(obligations)
  const attentionIds = new Set(openQuestions.map((doc: any) => String(doc.id)))
  const qualityIssueCount = documents.filter((doc: any) => !checkDocumentQuality(doc).ok).length
  const status = getStatus({ documentCount: documents.length, missingReceiptCount: missingReceipts.length, openQuestionCount: openQuestions.length, openObligationCount: openObligations.length, qualityIssueCount })

  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryKey, number> = {
      all: documents.length,
      klaerung: 0,
      einnahmen: 0,
      ausgaben: 0,
      'bank-kasse': 0,
      vertraege: 0,
      steuer: 0,
      sonstiges: 0,
    }
    for (const doc of documents) counts[categoryForDocument(doc, attentionIds)] += 1
    return counts
  }, [documents, attentionIds])

  const filteredDocuments = useMemo(() => {
    const needle = query.trim().toLowerCase()
    let list = documents.filter((doc: any) => {
      const baseCategory = baseCategoryForDocument(doc)
      const workName = buildDocumentWorkName(doc, CATEGORY_LABELS[baseCategory])
      const text = `${doc.title || ''} ${doc.partner || ''} ${doc.note || ''} ${doc.type || ''} ${doc.file_name || ''} ${workName}`.toLowerCase()
      if (needle && !text.includes(needle)) return false
      if (category !== 'all' && categoryForDocument(doc, attentionIds) !== category) return false
      if (filter === 'questions' || filter === 'attention') return attentionIds.has(String(doc.id)) || !checkDocumentQuality(doc).ok
      if (filter === 'done') return !attentionIds.has(String(doc.id)) && checkDocumentQuality(doc).ok
      return true
    })

    list = [...list].sort((a: any, b: any) => {
      if (sort === 'amount-desc') return Number(b.amount || 0) - Number(a.amount || 0)
      if (sort === 'amount-asc') return Number(a.amount || 0) - Number(b.amount || 0)
      if (sort === 'partner') return String(a.partner || a.title || '').localeCompare(String(b.partner || b.title || ''), 'de')
      const aTime = new Date(itemDate(a) || 0).getTime() || 0
      const bTime = new Date(itemDate(b) || 0).getTime() || 0
      return sort === 'oldest' ? aTime - bTime : bTime - aTime
    })

    return list
  }, [documents, query, filter, sort, category, attentionIds])

  const groups = useMemo(() => {
    const map = new Map<string, any[]>()
    for (const doc of filteredDocuments) {
      const key = monthKey(doc)
      map.set(key, [...(map.get(key) || []), doc])
    }
    return Array.from(map.entries())
  }, [filteredDocuments])

  async function removeMissingReceipt(expense: any) {
    if (!window.confirm('Diesen offenen Eintrag wirklich löschen? Der zugehörige Ausgaben-Datensatz wird entfernt.')) return
    try {
      if (!expense?.id) {
        const fingerprint = legacyFingerprint(expense)
        const next = Array.from(new Set([...dismissedLegacyExpenses, fingerprint]))
        setDismissedLegacyExpenses(next)
        window.localStorage.setItem(LEGACY_DISMISSED_KEY, JSON.stringify(next))
        return
      }
      await deleteExpense(expense)
    } catch (error: any) {
      window.alert(error?.message || 'Der offene Eintrag konnte nicht gelöscht werden.')
    }
  }

  async function openDocument(doc: any) {
    if (!doc?.id || !doc?.file_url) {
      window.alert('Für dieses Dokument ist keine Datei hinterlegt.')
      return
    }

    const previewWindow = window.open('', '_blank')
    setOpeningDocumentId(String(doc.id))

    try {
      if (String(doc.file_url).startsWith('http://') || String(doc.file_url).startsWith('https://')) {
        if (previewWindow) previewWindow.location.href = String(doc.file_url)
        else window.location.href = String(doc.file_url)
        return
      }

      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token
      if (!accessToken) throw new Error('Bitte neu anmelden, um die Datei zu öffnen.')

      const response = await fetch(`/api/documents/view?id=${encodeURIComponent(String(doc.id))}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data?.url) throw new Error(data?.error || 'Datei konnte nicht geöffnet werden.')

      if (previewWindow) previewWindow.location.href = data.url
      else window.location.href = data.url
    } catch (error: any) {
      previewWindow?.close()
      window.alert(error?.message || 'Datei konnte nicht geöffnet werden.')
    } finally {
      setOpeningDocumentId('')
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-md space-y-5 p-5 pb-40 text-slate-950">
      <header>
        <Link href="/" className="text-sm font-semibold text-slate-500">← Zurück</Link>
        <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-violet-600">Arbeitsmappe</p>
        <h1 className="mt-2 text-3xl font-black">Mandantenmappe</h1>
      </header>

      <section className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Bearbeitungsstand</p><h2 className="mt-2 text-2xl font-black">{status.label}</h2></div>
          <span className={`rounded-full px-3 py-2 text-xs font-black ${status.badge}`}>{documents.length} Dokumente</span>
        </div>
        <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600">{status.description}</p>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <MappeMetric label="Dokumente" value={documents.length} />
          <MappeMetric label="Fehlende" value={missingReceipts.length} />
          <MappeMetric label="Belegcheck" value={qualityIssueCount} />
        </div>
      </section>

      <section className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-600">Arbeitskategorien</p>
            <h2 className="mt-2 text-xl font-black">Schneller statt endlos scrollen</h2>
          </div>
          {category !== 'all' && (
            <button type="button" onClick={() => setCategory('all')} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">Zurücksetzen</button>
          )}
        </div>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">Mila sortiert hier als Arbeitsvorschlag. Die Kanzlei-Struktur bleibt später anpassbar.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {(['klaerung','einnahmen','ausgaben','bank-kasse','vertraege','steuer','sonstiges'] as CategoryKey[]).map((key) => (
            <button key={key} type="button" onClick={() => setCategory(key)} className={`rounded-2xl p-3 text-left ${category === key ? 'bg-violet-600 text-white' : key === 'klaerung' ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-100' : 'bg-violet-50 text-slate-800'}`}>
              <p className="text-lg font-black">{categoryCounts[key]}</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-wider">{CATEGORY_LABELS[key]}</p>
            </button>
          ))}
        </div>
      </section>

      {(missingReceipts.length > 0 || openQuestions.length > 0 || qualityIssueCount > 0) && (
        <section className="rounded-3xl border border-amber-100 bg-amber-50 p-5">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">Aufmerksamkeit zuerst</p>
          <h2 className="mt-2 text-xl font-black">{missingReceipts.length + openQuestions.length + qualityIssueCount} Einträge brauchen dich</h2>
          {missingReceipts.length > 0 && (
            <div className="mt-4 space-y-3">
              {missingReceipts.slice(0, 5).map((expense: any, index: number) => (
                <div key={expense?.id || `missing-${index}`} className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3"><p className="font-black">{expenseTitle(expense)}</p>{expenseAmount(expense) > 0 && <span className="text-sm font-black">{formatEuro(expenseAmount(expense))}</span>}</div>
                  <p className="mt-2 text-xs font-bold text-amber-700">Kein Beleg zugeordnet</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Link href="/neue-buchungen" className="rounded-xl bg-violet-600 px-3 py-3 text-center text-xs font-black text-white">Beleg erfassen</Link>
                    <button type="button" onClick={() => void removeMissingReceipt(expense)} className="rounded-xl bg-white px-3 py-3 text-xs font-black text-red-500 ring-1 ring-red-100">Löschen</button>
                  </div>
                </div>
              ))}
              {missingReceipts.length > 5 && <p className="text-center text-xs font-black text-amber-700">+ {missingReceipts.length - 5} weitere offene Einträge</p>}
            </div>
          )}
        </section>
      )}

      <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="🔎 Beleg, Anbieter, Arbeitsname oder Notiz suchen" className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold outline-none ring-1 ring-slate-100 focus:ring-violet-300" />
        {category !== 'all' && <p className="mt-3 rounded-xl bg-violet-50 px-3 py-2 text-xs font-black text-violet-700">Kategorie: {CATEGORY_LABELS[category]} · {filteredDocuments.length} Treffer</p>}
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>Alle {documents.length}</FilterButton>
          <FilterButton active={filter === 'attention'} onClick={() => setFilter('attention')}>Klärung {categoryCounts.klaerung}</FilterButton>
          <FilterButton active={filter === 'missing'} onClick={() => setFilter('missing')}>Ohne Beleg {missingReceipts.length}</FilterButton>
          <FilterButton active={filter === 'questions'} onClick={() => setFilter('questions')}>Rückfragen {openQuestions.length}</FilterButton>
          <FilterButton active={filter === 'done'} onClick={() => setFilter('done')}>Fertig</FilterButton>
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="mt-3 w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 outline-none ring-1 ring-slate-100">
          <option value="newest">Neueste zuerst</option>
          <option value="oldest">Älteste zuerst</option>
          <option value="amount-desc">Betrag: hoch → niedrig</option>
          <option value="amount-asc">Betrag: niedrig → hoch</option>
          <option value="partner">Anbieter A–Z</option>
        </select>
      </section>

      {filter === 'missing' ? (
        <section className="space-y-3">
          {missingReceipts.map((expense: any, index: number) => (
            <div key={expense?.id || index} className="rounded-2xl bg-white p-4 shadow-sm"><div className="flex justify-between gap-3"><p className="font-black">{expenseTitle(expense)}</p><span className="font-black">{formatEuro(expenseAmount(expense))}</span></div><p className="mt-2 text-xs font-bold text-amber-700">Kein Beleg zugeordnet</p></div>
          ))}
        </section>
      ) : groups.length === 0 ? (
        <section className="rounded-3xl bg-violet-50 p-5"><p className="font-black text-violet-700">Keine passenden Unterlagen</p><p className="mt-2 text-sm font-semibold text-slate-600">Passe Suche, Kategorie oder Filter an – oder erfasse den nächsten Beleg.</p><Link href="/neue-buchungen" className="mt-4 inline-flex rounded-2xl bg-violet-600 px-4 py-3 text-sm font-black text-white">Beleg erfassen</Link></section>
      ) : (
        <div className="space-y-3">
          {groups.map(([month, docs]) => {
            const collapsed = collapsedMonths[month]
            return (
              <section key={month} className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
                <button type="button" onClick={() => setCollapsedMonths((old) => ({ ...old, [month]: !old[month] }))} className="flex w-full items-center justify-between px-5 py-4 text-left">
                  <div><p className="text-sm font-black capitalize">📁 {month}</p><p className="mt-1 text-xs font-semibold text-slate-400">{docs.length} Unterlagen</p></div>
                  <span className="font-black text-violet-700">{collapsed ? '▶' : '▼'}</span>
                </button>
                {!collapsed && (
                  <div className="space-y-2 border-t border-slate-100 p-3">
                    {docs.map((doc: any) => {
                      const baseCategory = baseCategoryForDocument(doc)
                      const quality = checkDocumentQuality(doc)
                      const workName = buildDocumentWorkName(doc, CATEGORY_LABELS[baseCategory])
                      const originalName = String(doc.fileName || doc.file_name || '')

                      return (
                        <article key={doc.id} className="rounded-2xl bg-slate-50 p-4">
                          <div className="flex justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-black">{doc.title}</p>
                              {doc.partner && <p className="truncate text-xs font-semibold text-slate-500">{doc.partner}</p>}
                            </div>
                            {Number(doc.amount || 0) > 0 ? (
                              <span className="shrink-0 text-sm font-black">{formatEuro(Number(doc.amount))}</span>
                            ) : (
                              <span className="shrink-0 text-[10px] font-black uppercase tracking-wide text-slate-400">Betrag offen</span>
                            )}
                          </div>

                          <div className="mt-3 rounded-xl bg-white p-3 ring-1 ring-slate-100">
                            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Arbeits-/Exportname</p>
                            <p className="mt-1 break-all text-xs font-black text-slate-700">{workName}</p>
                            {originalName && <p className="mt-2 break-all text-[10px] font-semibold text-slate-400">Original bleibt erhalten: {originalName}</p>}
                          </div>

                          <div className={`mt-3 rounded-xl p-3 ${quality.ok ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                            <div className="flex items-center justify-between gap-2">
                              <p className={`text-xs font-black ${quality.ok ? 'text-emerald-700' : 'text-amber-700'}`}>{quality.ok ? '✓ Belegcheck vollständig' : '⚠ Klärung nötig'}</p>
                              <span className="text-[10px] font-black text-slate-500">{quality.checks.filter((check) => check.ok).length}/{quality.checks.length}</span>
                            </div>
                            {!quality.ok && <p className="mt-2 text-[11px] font-semibold text-slate-600">Offen: {quality.issues.join(' · ')}</p>}
                          </div>

                          {doc.note && <p className="mt-2 line-clamp-2 text-xs font-semibold text-slate-500">{doc.note}</p>}
                          <div className="mt-3 flex items-center justify-between gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-violet-600">{CATEGORY_LABELS[categoryForDocument(doc, attentionIds)]}</span>
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              {doc.file_url && (
                                <button type="button" onClick={() => void openDocument(doc)} disabled={openingDocumentId === String(doc.id)} className="rounded-lg bg-white px-2.5 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200 disabled:opacity-50">
                                  {openingDocumentId === String(doc.id) ? 'Öffne …' : 'Ansehen'}
                                </button>
                              )}
                              <Link href={questionHref(doc)} className="rounded-lg bg-violet-100 px-2.5 py-2 text-xs font-black text-violet-700">Rückfrage</Link>
                              <button type="button" onClick={() => deleteDocument(doc.id)} className="text-xs font-black text-red-500">Löschen</button>
                            </div>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}

      <Link href="/neue-buchungen" className="flex w-full items-center justify-center rounded-2xl bg-violet-600 px-4 py-4 text-sm font-black text-white shadow-sm">+ Nächsten Beleg erfassen</Link>
    </main>
  )
}

function MappeMetric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl bg-violet-50 p-3 text-center"><p className="text-xl font-black">{value}</p><p className="mt-1 text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p></div>
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`shrink-0 rounded-full px-3 py-2 text-xs font-black ${active ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{children}</button>
}
