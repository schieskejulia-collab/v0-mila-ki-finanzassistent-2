'use client'

import Link from 'next/link'
import { Camera, FileStack, FileText, Upload, ArrowRight } from 'lucide-react'
import { useFinance } from '@/lib/store'
import { checkDocumentQuality } from '@/lib/document-workflow'

function formatEuro(value?: number) {
  const amount = Number(value || 0)
  if (!amount) return ''
  return amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

export default function EingangPage() {
  const { documents } = useFinance()
  const recent = [...documents].slice(0, 8)
  const needsHelp = recent.filter((doc: any) => !checkDocumentQuality(doc).ok).length

  return (
    <main className="mx-auto min-h-screen max-w-md space-y-4 px-4 pb-32 pt-4 text-slate-950">
      <header className="px-1">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Eingang</p>
        <h1 className="mt-1 text-4xl font-black tracking-tight">Unterlagen rein.</h1>
      </header>

      <Link href="/stapel" className="block rounded-[2rem] bg-violet-600 p-5 text-white shadow-lg shadow-violet-100">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-2xl font-black">Hinzufügen</p>
            <p className="mt-1 text-sm font-semibold text-white/80">Foto, PDF oder bis zu 20 Dateien</p>
          </div>
          <FileStack className="h-10 w-10 shrink-0" />
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <MiniAction icon={Camera} label="Foto" />
          <MiniAction icon={FileText} label="PDF" />
          <MiniAction icon={Upload} label="Stapel" />
        </div>
      </Link>

      <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Zuletzt verarbeitet</p>
            <h2 className="mt-1 text-xl font-black">{recent.length} Unterlagen</h2>
          </div>
          {recent.length > 0 && (
            <span className={`rounded-full px-3 py-2 text-xs font-black ${needsHelp > 0 ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}>
              {needsHelp > 0 ? `${needsHelp} prüfen` : 'fertig ✓'}
            </span>
          )}
        </div>

        {recent.length === 0 ? (
          <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-center text-sm font-bold text-slate-500">
            Noch keine Unterlagen.
          </div>
        ) : (
          <div className="mt-5 divide-y divide-slate-100">
            {recent.map((doc: any) => {
              const quality = checkDocumentQuality(doc)
              return (
                <div key={doc.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${quality.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black">{doc.title || 'Dokument'}</p>
                    <p className="truncate text-xs font-semibold text-slate-500">
                      {doc.partner || 'Angabe offen'}{Number(doc.amount || 0) > 0 ? ` · ${formatEuro(doc.amount)}` : ''}
                    </p>
                  </div>
                  <span className={`shrink-0 text-[10px] font-black ${quality.ok ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {quality.ok ? 'FERTIG' : 'PRÜFEN'}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {recent.length > 0 && (
          <Link href="/dokumente?ansicht=dokumente" className="mt-5 flex items-center justify-between rounded-2xl bg-slate-50 p-4 text-sm font-black text-slate-700">
            Alle ansehen <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </section>
    </main>
  )
}

function MiniAction({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center justify-center gap-1.5 rounded-2xl bg-white/15 px-2 py-3 text-xs font-black">
      <Icon className="h-4 w-4" /> {label}
    </div>
  )
}
