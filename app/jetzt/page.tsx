'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, FileQuestion, Plus, Trash2 } from 'lucide-react'
import { useFinance } from '@/lib/store'
import { checkDocumentQuality } from '@/lib/document-workflow'

type Item = {
  id: string
  text: string
  dueAt: string
  status: 'offen' | 'erledigt'
  createdAt: string
}

const STORAGE_KEY = 'mila-jetzt-v2'

function inferDueAt(text: string) {
  const lower = text.toLowerCase()
  const now = new Date()
  if (lower.includes('heute')) {
    const d = new Date(now); d.setHours(18, 0, 0, 0); return d.toISOString()
  }
  if (lower.includes('morgen')) {
    const d = new Date(now); d.setDate(d.getDate() + 1); d.setHours(12, 0, 0, 0); return d.toISOString()
  }
  return ''
}

function formatDue(value: string) {
  if (!value) return ''
  const date = new Date(value)
  return date.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function VorgaengePage() {
  const { documents } = useFinance()
  const [items, setItems] = useState<Item[]>([])
  const [text, setText] = useState('')

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) || window.localStorage.getItem('mila-jetzt-v1')
      if (!saved) return
      const parsed = JSON.parse(saved)
      if (!Array.isArray(parsed)) return
      const normalized: Item[] = parsed
        .map((item: any): Item => ({
          id: String(item.id || crypto.randomUUID()),
          text: String(item.text || item.what || item.raw || ''),
          dueAt: String(item.dueAt || ''),
          status: item.status === 'erledigt' ? 'erledigt' : 'offen',
          createdAt: String(item.createdAt || new Date().toISOString()),
        }))
        .filter((item) => Boolean(item.text))
      setItems(normalized)
    } catch {}
  }, [])

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items)) } catch {}
  }, [items])

  const openItems = useMemo(() => items.filter((item) => item.status === 'offen'), [items])
  const documentIssues = documents.filter((doc: any) => !checkDocumentQuality(doc).ok)
  const totalOpen = openItems.length + documentIssues.length

  function add(event: FormEvent) {
    event.preventDefault()
    const clean = text.trim()
    if (!clean) return
    setItems((current) => [{ id: crypto.randomUUID(), text: clean, dueAt: inferDueAt(clean), status: 'offen', createdAt: new Date().toISOString() }, ...current])
    setText('')
  }

  function complete(id: string) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, status: 'erledigt' } : item))
  }

  function remove(id: string) {
    setItems((current) => current.filter((item) => item.id !== id))
  }

  return (
    <main className="mx-auto min-h-screen max-w-md space-y-4 px-4 pb-32 pt-4 text-slate-950">
      <header className="px-1">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Vorgänge</p>
        <div className="mt-1 flex items-end justify-between gap-4">
          <h1 className="text-4xl font-black tracking-tight">{totalOpen} offen</h1>
          {totalOpen === 0 && <span className="pb-1 text-sm font-black text-emerald-700">alles ruhig ✓</span>}
        </div>
      </header>

      {documentIssues.length > 0 && (
        <Link href="/dokumente?ansicht=klaerung" className="flex items-center justify-between rounded-[2rem] bg-amber-50 p-5 ring-1 ring-amber-100">
          <div>
            <p className="text-lg font-black">{documentIssues.length} {documentIssues.length === 1 ? 'Unterlage braucht' : 'Unterlagen brauchen'} eine Angabe</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">Jetzt klären</p>
          </div>
          <FileQuestion className="h-7 w-7 text-amber-700" />
        </Link>
      )}

      {openItems.length > 0 && (
        <section className="space-y-3">
          {openItems.map((item) => (
            <article key={item.id} className="rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <p className="text-sm font-black leading-6">{item.text}</p>
              {item.dueAt && <p className="mt-1 text-xs font-semibold text-slate-500">{formatDue(item.dueAt)}</p>}
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => complete(item.id)} className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-emerald-100 px-3 py-2.5 text-xs font-black text-emerald-800">
                  <CheckCircle2 className="h-4 w-4" /> Erledigt
                </button>
                <button type="button" onClick={() => remove(item.id)} className="rounded-xl bg-white px-3 py-2.5 text-rose-500 ring-1 ring-rose-100">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      {totalOpen === 0 && (
        <div className="rounded-[2rem] bg-emerald-50 p-5 text-sm font-bold text-emerald-800">
          Nichts offen.
        </div>
      )}

      <form onSubmit={add} className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Etwas festhalten …"
          className="min-h-20 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-base font-semibold outline-none focus:border-violet-400"
        />
        <button type="submit" className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 py-3.5 font-black text-white">
          <Plus className="h-5 w-5" /> Vorgang hinzufügen
        </button>
      </form>
    </main>
  )
}
