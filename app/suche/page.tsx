'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, FileText, FolderOpen, Inbox } from 'lucide-react'

const entries = [
  { label: 'Eingang durchsuchen', href: '/eingang', icon: Inbox },
  { label: 'Dokumente & Mappe durchsuchen', href: '/dokumente', icon: FolderOpen },
  { label: 'Buchungen durchsuchen', href: '/buchungen', icon: FileText },
]

export default function SuchePage() {
  const [query, setQuery] = useState('')
  const filtered = useMemo(
    () => entries.filter((entry) => entry.label.toLowerCase().includes(query.toLowerCase())),
    [query]
  )

  return (
    <main className="min-h-screen bg-[#faf9fc] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-2xl font-black tracking-tight text-slate-950">Suche</h1>
        <p className="mt-1 text-sm text-slate-500">Finde schnell den Bereich, in dem dein Vorgang liegt.</p>

        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Beleg, Mappe oder Buchung suchen …"
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
          />
        </div>

        <div className="mt-4 space-y-2">
          {filtered.map((entry) => {
            const Icon = entry.icon
            return (
              <Link key={entry.href} href={entry.href} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50">
                <Icon className="h-4 w-4 text-violet-600" />
                {entry.label}
              </Link>
            )
          })}
        </div>
      </div>
    </main>
  )
}
