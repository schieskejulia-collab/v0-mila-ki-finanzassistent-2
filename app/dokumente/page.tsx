'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  CircleHelp,
  FileText,
  FolderArchive,
  ReceiptText,
  Search,
} from 'lucide-react'
import { useFinance } from '@/lib/store'
import { getActiveClientId, supabase } from '@/lib/supabase'
import { checkDocumentQuality } from '@/lib/document-workflow'

type View = 'uebersicht' | 'dokumente' | 'belege' | 'klaerung' | 'uebergabe'

function formatEuro(value?: number) {
  const amount = Number(value || 0)
  if (!amount) return ''
  return amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

function itemDate(item: any) {
  return String(item?.date || item?.documentDate || item?.document_date || item?.createdAt || item?.created_at || '')
}

function monthLabel(item: any) {
  const raw = itemDate(item)
  const date = raw ? new Date(raw) : null
  if (!date || Number.isNaN(date.getTime())) return 'Ohne Datum'
  return new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(date)
}

export default function DokumentePage() {
  const { documents, expenses, incomes, deleteDocument } = useFinance()
  const [view, setView] = useState<View>('uebersicht')
  const [query, setQuery] = useState('')
  const [openingId, setOpeningId] = useState('')
  const [deletingId, setDeletingId] = useState('')

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get('ansicht')
    if (value === 'dokumente' || value === 'belege' || value === 'klaerung' || value === 'uebergabe') setView(value)
  }, [])

  const clarificationDocs = useMemo(
    () => documents.filter((doc: any) => !checkDocumentQuality(doc).ok),
    [documents],
  )
  const missingReceipts = useMemo(
    () => expenses.filter((expense: any) => expense?.hasReceipt === false || expense?.has_receipt === false),
    [expenses],
  )
  const ready = documents.length > 0 && clarificationDocs.length === 0 && missingReceipts.length === 0

  const filteredDocuments = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return documents
    return documents.filter((doc: any) => `${doc.title || ''} ${doc.partner || ''} ${doc.note || ''} ${doc.file_name || ''}`.toLowerCase().includes(needle))
  }, [documents, query])

  const documentGroups = useMemo(() => {
    const groups = new Map<string, any[]>()
    for (const doc of filteredDocuments) {
      const key = monthLabel(doc)
      groups.set(key, [...(groups.get(key) || []), doc])
    }
    return Array.from(groups.entries())
  }, [filteredDocuments])

  async function openDocument(doc: any) {
    if (!doc?.id || !doc?.file_url) {
      window.alert('Für dieses Dokument ist keine Datei hinterlegt.')
      return
    }
    setOpeningId(String(doc.id))
    const previewWindow = window.open('', '_blank')
    try {
      if (/^https?:\/\//i.test(String(doc.file_url))) {
        if (previewWindow) previewWindow.location.href = String(doc.file_url)
        else window.location.href = String(doc.file_url)
        return
      }
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) throw new Error('Die private Datei kann in dieser Sitzung nicht geöffnet werden.')
      const response = await fetch(`/api/documents/view?id=${encodeURIComponent(String(doc.id))}`, { headers: { Authorization: `Bearer ${token}` } })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload?.url) throw new Error(payload?.error || 'Datei konnte nicht geöffnet werden.')
      if (previewWindow) previewWindow.location.href = payload.url
      else window.location.href = payload.url
    } catch (error: any) {
      previewWindow?.close()
      window.alert(error?.message || 'Datei konnte nicht geöffnet werden.')
    } finally {
      setOpeningId('')
    }
  }

  async function removeDocument(doc: any) {
    if (!window.confirm(`„${doc.title || 'Dokument'}“ wirklich löschen?`)) return
    setDeletingId(String(doc.id))
    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      const clientId = getActiveClientId()
      if (!token || !clientId) {
        await deleteDocument(String(doc.id))
        return
      }
      const response = await fetch(`/api/documents/delete?id=${encodeURIComponent(String(doc.id))}&clientId=${encodeURIComponent(clientId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || 'Dokument konnte nicht gelöscht werden.')
      window.location.reload()
    } catch (error: any) {
      window.alert(error?.message || 'Dokument konnte nicht gelöscht werden.')
    } finally {
      setDeletingId('')
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-md space-y-5 px-4 pb-32 pt-5 text-slate-950">
      <header className="px-1">
        {view !== 'uebersicht' && (
          <button type="button" onClick={() => setView('uebersicht')} className="mb-3 flex items-center gap-1 text-sm font-black text-slate-500">
            <ArrowLeft className="h-4 w-4" /> Mappe
          </button>
        )}
        <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Mappe</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">
          {view === 'uebersicht' ? 'Sauber abgelegt.' : view === 'dokumente' ? 'Dokumente' : view === 'belege' ? 'Einnahmen & Ausgaben' : view === 'klaerung' ? 'Klärung' : 'Übergabe'}
        </h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
          {view === 'uebersicht'
            ? 'Die Mappe zeigt Ergebnisse. Details öffnest du nur, wenn du sie wirklich brauchst.'
            : view === 'dokumente'
              ? 'Originale chronologisch finden – ohne vorher durch Kategorien zu springen.'
              : view === 'belege'
                ? 'Nur tatsächlich erfasste IST-Vorgänge und ihre Nachweise.'
                : view === 'klaerung'
                  ? 'Nur Unterlagen, bei denen Mila eine konkrete Information vermisst.'
                  : 'Ein letzter Blick auf Vollständigkeit, bevor der Bestand weitergegeben wird.'}
        </p>
      </header>

      {view === 'uebersicht' && (
        <>
          <section className="grid grid-cols-2 gap-3">
            <MapCard icon={FileText} label="Dokumente" value={documents.length} detail="Originale & Nachweise" onClick={() => setView('dokumente')} />
            <MapCard icon={ReceiptText} label="Einnahmen & Ausgaben" value={expenses.length + incomes.length} detail="IST-Bestand" onClick={() => setView('belege')} />
            <MapCard icon={CircleHelp} label="Klärung" value={clarificationDocs.length} detail={clarificationDocs.length ? 'braucht dich' : 'nichts offen'} onClick={() => setView('klaerung')} warning={clarificationDocs.length > 0} />
            <MapCard icon={FolderArchive} label="Übergabe" value={ready ? '✓' : '…'} detail={ready ? 'bereit' : 'noch nicht bereit'} onClick={() => setView('uebergabe')} success={ready} />
          </section>

          <Link href="/stapel" className="flex items-center justify-between rounded-[2rem] bg-violet-600 p-5 text-white">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-white/70">Neue Unterlagen</p>
              <p className="mt-1 text-xl font-black">Direkt in den Eingang</p>
            </div>
            <FileText className="h-7 w-7" />
          </Link>
        </>
      )}

      {view === 'dokumente' && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-100">
            <Search className="h-5 w-5 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Dokument, Anbieter oder Notiz" className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" />
          </div>
          {documentGroups.length === 0 ? <Empty text="Keine passenden Dokumente." /> : documentGroups.map(([month, docs]) => (
            <section key={month} className="rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{month}</p>
              <div className="mt-3 divide-y divide-slate-100">
                {docs.map((doc: any) => <DocumentRow key={doc.id} doc={doc} opening={openingId === String(doc.id)} deleting={deletingId === String(doc.id)} onOpen={() => void openDocument(doc)} onDelete={() => void removeDocument(doc)} />)}
              </div>
            </section>
          ))}
        </section>
      )}

      {view === 'belege' && (
        <section className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <Metric label="Einnahmen" value={incomes.length} />
            <Metric label="Ausgaben" value={expenses.length} />
            <Metric label="Ohne Nachweis" value={missingReceipts.length} warning={missingReceipts.length > 0} />
          </div>
          {missingReceipts.length === 0 ? (
            <div className="rounded-[2rem] bg-emerald-50 p-5 text-sm font-bold text-emerald-800">Für alle aktuell erfassten Ausgaben ist ein Nachweis hinterlegt.</div>
          ) : (
            <div className="space-y-3">
              {missingReceipts.map((expense: any) => (
                <article key={expense.id} className="rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-slate-100">
                  <div className="flex justify-between gap-3"><p className="font-black">{expense.title || expense.vendor || 'Ausgabe'}</p><p className="font-black">{formatEuro(expense.amount)}</p></div>
                  <p className="mt-1 text-xs font-semibold text-amber-700">Nachweis fehlt</p>
                  <Link href={`/neue-buchungen?expenseId=${encodeURIComponent(String(expense.id))}`} className="mt-3 inline-flex rounded-xl bg-violet-600 px-3 py-2.5 text-xs font-black text-white">Nachweis zuordnen</Link>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {view === 'klaerung' && (
        <section className="space-y-3">
          {clarificationDocs.length === 0 ? <Empty text="Mila braucht gerade keine Entscheidung von dir." success /> : clarificationDocs.map((doc: any) => {
            const quality = checkDocumentQuality(doc)
            return (
              <article key={doc.id} className="rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-amber-100">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">Mila braucht eine Angabe</p>
                <div className="mt-2 flex justify-between gap-3"><p className="font-black">{doc.title || 'Dokument'}</p><p className="font-black">{formatEuro(doc.amount)}</p></div>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{quality.issues.length ? quality.issues.join(' · ') : 'Kontext ist noch nicht eindeutig.'}</p>
                <div className="mt-3 flex gap-2">
                  <Link href={`/rueckfragen?documentId=${encodeURIComponent(String(doc.id))}&title=${encodeURIComponent(String(doc.title || 'Dokument'))}`} className="flex-1 rounded-xl bg-violet-600 px-3 py-3 text-center text-xs font-black text-white">Klärung öffnen</Link>
                  {doc.file_url && <button type="button" onClick={() => void openDocument(doc)} className="rounded-xl bg-slate-100 px-3 py-3 text-xs font-black">Original</button>}
                </div>
              </article>
            )
          })}
        </section>
      )}

      {view === 'uebergabe' && (
        <section className="space-y-4">
          <div className={`rounded-[2rem] p-5 ${ready ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-950'}`}>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-7 w-7" />
              <div><p className="text-xs font-black uppercase tracking-[0.14em]">Stand</p><p className="mt-1 text-xl font-black">{ready ? 'Bereit zur Übergabe' : 'Noch nicht vollständig'}</p></div>
            </div>
            <p className="mt-4 text-sm font-semibold leading-6">{ready ? 'Alle aktuell erfassten Dokumente sind ohne offene Klärung und die erfassten Ausgaben haben einen Nachweis.' : `${clarificationDocs.length} Dokumente brauchen Klärung · ${missingReceipts.length} Ausgaben haben noch keinen Nachweis.`}</p>
          </div>
          <div className="grid grid-cols-2 gap-3"><Metric label="Originale" value={documents.length} /><Metric label="IST-Vorgänge" value={expenses.length + incomes.length} /></div>
          {!ready && <button type="button" onClick={() => setView(clarificationDocs.length ? 'klaerung' : 'belege')} className="w-full rounded-2xl bg-violet-600 py-4 font-black text-white">Offene Punkte ansehen</button>}
        </section>
      )}
    </main>
  )
}

function MapCard({ icon: Icon, label, value, detail, onClick, warning, success }: any) {
  return (
    <button type="button" onClick={onClick} className={`min-h-40 rounded-[1.75rem] p-4 text-left shadow-sm ring-1 ${warning ? 'bg-amber-50 ring-amber-100' : success ? 'bg-emerald-50 ring-emerald-100' : 'bg-white ring-slate-100'}`}>
      <Icon className={`h-6 w-6 ${warning ? 'text-amber-700' : success ? 'text-emerald-700' : 'text-violet-600'}`} />
      <p className="mt-6 text-3xl font-black">{value}</p>
      <p className="mt-1 text-sm font-black">{label}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500">{detail}</p>
    </button>
  )
}

function Metric({ label, value, warning }: { label: string; value: number; warning?: boolean }) {
  return <div className={`rounded-2xl p-3 text-center ${warning ? 'bg-amber-50' : 'bg-white ring-1 ring-slate-100'}`}><p className="text-2xl font-black">{value}</p><p className="mt-1 text-[9px] font-black uppercase tracking-wider text-slate-500">{label}</p></div>
}

function Empty({ text, success }: { text: string; success?: boolean }) {
  return <div className={`rounded-[2rem] p-5 text-sm font-bold ${success ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-slate-600'}`}>{text}</div>
}

function DocumentRow({ doc, opening, deleting, onOpen, onDelete }: any) {
  const quality = checkDocumentQuality(doc)
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex justify-between gap-3">
        <div className="min-w-0"><p className="truncate text-sm font-black">{doc.title || 'Dokument'}</p><p className="mt-1 truncate text-xs font-semibold text-slate-500">{doc.partner || 'Anbieter offen'}{Number(doc.amount || 0) ? ` · ${formatEuro(doc.amount)}` : ''}</p></div>
        <span className={`shrink-0 text-[9px] font-black ${quality.ok ? 'text-emerald-700' : 'text-amber-700'}`}>{quality.ok ? 'OK' : 'PRÜFEN'}</span>
      </div>
      <div className="mt-2 flex gap-2">
        {doc.file_url && <button type="button" onClick={onOpen} disabled={opening} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black">{opening ? 'Öffne …' : 'Ansehen'}</button>}
        <button type="button" onClick={onDelete} disabled={deleting} className="rounded-lg px-2 py-2 text-xs font-black text-rose-500">{deleting ? 'Lösche …' : 'Löschen'}</button>
      </div>
    </div>
  )
}
