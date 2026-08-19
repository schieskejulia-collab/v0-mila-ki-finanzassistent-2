'use client'

import Link from 'next/link'
import { ArrowRight, FileStack, FolderCheck, ReceiptText } from 'lucide-react'
import { checkDocumentQuality } from '@/lib/document-workflow'

function greeting() {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Guten Morgen 🌸'
  if (hour >= 12 && hour < 18) return 'Guten Tag 🌸'
  if (hour >= 18 && hour < 23) return 'Guten Abend 🌸'
  return 'Hallo 🌙'
}

export function DashboardContent({ model }: { model: any }) {
  const documents = Array.isArray(model?.documents) ? model.documents : []
  const expenses = Array.isArray(model?.expenses) ? model.expenses : []
  const incomes = Array.isArray(model?.incomes) ? model.incomes : []

  const clarificationDocs = documents.filter((doc: any) => !checkDocumentQuality(doc).ok)
  const missingReceipts = expenses.filter(
    (expense: any) => expense?.hasReceipt === false || expense?.has_receipt === false,
  )
  const sortedDocs = Math.max(0, documents.length - clarificationDocs.length)
  const cashflowItems = expenses.length + incomes.length
  const needsYou = clarificationDocs.length + missingReceipts.length
  const handoffReady = documents.length > 0 && needsYou === 0

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-32 pt-4 text-slate-950">
      <header className="px-1 pt-1">
        <h1 className="text-4xl font-black tracking-tight">{greeting()}</h1>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          {needsYou > 0
            ? `${needsYou} ${needsYou === 1 ? 'Sache braucht' : 'Dinge brauchen'} noch deine Entscheidung.`
            : documents.length > 0
              ? 'Der aktuelle Bestand ist ohne offene Dokumentfrage.'
              : 'Wirf die ersten Unterlagen rein. Mila übernimmt den Rest.'}
        </p>
      </header>

      <section className={`rounded-[2rem] p-5 shadow-sm ring-1 ${needsYou > 0 ? 'bg-amber-50 ring-amber-100' : 'bg-emerald-50 ring-emerald-100'}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={`text-xs font-black uppercase tracking-[0.16em] ${needsYou > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
              {needsYou > 0 ? 'Braucht dich' : 'Alles geklärt'}
            </p>
            <p className="mt-2 text-5xl font-black">{needsYou}</p>
          </div>
          <div className="rounded-2xl bg-white/80 px-3 py-2 text-xs font-black text-slate-600">
            {handoffReady ? 'Übergabe bereit ✓' : 'Mila arbeitet'}
          </div>
        </div>

        {needsYou > 0 ? (
          <div className="mt-5 space-y-2">
            {clarificationDocs.length > 0 && (
              <Link href="/dokumente?ansicht=klaerung" className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm">
                <div>
                  <p className="text-sm font-black">{clarificationDocs.length} {clarificationDocs.length === 1 ? 'Unterlage' : 'Unterlagen'} klären</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">Eine konkrete Angabe fehlt.</p>
                </div>
                <ArrowRight className="h-5 w-5 text-amber-700" />
              </Link>
            )}
            {missingReceipts.length > 0 && (
              <Link href="/dokumente?ansicht=belege" className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm">
                <div>
                  <p className="text-sm font-black">{missingReceipts.length} {missingReceipts.length === 1 ? 'Nachweis fehlt' : 'Nachweise fehlen'}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">Zu vorhandenen Ausgaben fehlt noch der Beleg.</p>
                </div>
                <ArrowRight className="h-5 w-5 text-violet-700" />
              </Link>
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm font-bold text-emerald-800">Du musst gerade nichts prüfen.</p>
        )}
      </section>

      <Link href="/stapel" className="flex items-center justify-between rounded-[2rem] bg-violet-600 p-5 text-white shadow-lg shadow-violet-100">
        <div>
          <p className="text-2xl font-black">Unterlagen hinzufügen</p>
          <p className="mt-1 text-sm font-semibold text-white/80">Foto, PDF oder ganzer Stapel</p>
        </div>
        <FileStack className="h-9 w-9 shrink-0" />
      </Link>

      <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Aktueller Bestand</p>
            <h2 className="mt-1 text-xl font-black">Schon erledigt</h2>
          </div>
          <Link href="/dokumente" className="text-xs font-black text-violet-700">Mappe →</Link>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <FolderCheck className="h-5 w-5 text-violet-600" />
            <p className="mt-4 text-3xl font-black">{sortedDocs}</p>
            <p className="mt-1 text-xs font-black text-slate-700">Unterlagen sortiert</p>
            <p className="mt-1 text-[11px] font-semibold text-slate-400">von {documents.length}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <ReceiptText className="h-5 w-5 text-violet-600" />
            <p className="mt-4 text-3xl font-black">{cashflowItems}</p>
            <p className="mt-1 text-xs font-black text-slate-700">Einnahmen & Ausgaben</p>
            <p className="mt-1 text-[11px] font-semibold text-slate-400">IST-Bestand</p>
          </div>
        </div>
      </section>
    </main>
  )
}
