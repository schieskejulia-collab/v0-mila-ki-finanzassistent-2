'use client'

import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle2,
  FileStack,
  FolderCheck,
  ListTodo,
  ReceiptText,
  Sparkles,
} from 'lucide-react'
import { checkDocumentQuality } from '@/lib/document-workflow'

export function DashboardContent({ model }: { model: any }) {
  const documents = Array.isArray(model?.documents) ? model.documents : []
  const expenses = Array.isArray(model?.expenses) ? model.expenses : []
  const incomes = Array.isArray(model?.incomes) ? model.incomes : []

  const clarificationDocs = documents.filter((doc: any) => !checkDocumentQuality(doc).ok)
  const sortedDocs = Math.max(0, documents.length - clarificationDocs.length)
  const missingReceipts = expenses.filter(
    (expense: any) => expense?.hasReceipt === false || expense?.has_receipt === false,
  )
  const needsYou = clarificationDocs.length + missingReceipts.length
  const cashflowItems = expenses.length + incomes.length

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 pb-32 pt-5 text-slate-950">
      <header className="px-1">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Mila</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">Guten Morgen 🌸</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
          Rein damit. Mila sortiert im Hintergrund und holt dich nur dazu, wenn wirklich Kontext fehlt.
        </p>
      </header>

      <section className="rounded-[2rem] border border-violet-100 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-600">Heute braucht Mila dich</p>
            <p className="mt-2 text-4xl font-black">{needsYou}</p>
          </div>
          <div className={`rounded-2xl px-3 py-2 text-xs font-black ${needsYou > 0 ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}>
            {needsYou > 0 ? 'Ausnahmen prüfen' : 'Alles ruhig ✓'}
          </div>
        </div>

        {needsYou > 0 ? (
          <div className="mt-5 space-y-2">
            {clarificationDocs.length > 0 && (
              <Link href="/dokumente?ansicht=klaerung" className="flex items-center justify-between rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100">
                <div>
                  <p className="text-sm font-black">{clarificationDocs.length} Unterlagen brauchen eine Entscheidung</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">Mila zeigt nur die fehlende Angabe.</p>
                </div>
                <ArrowRight className="h-5 w-5 text-amber-700" />
              </Link>
            )}
            {missingReceipts.length > 0 && (
              <Link href="/dokumente?ansicht=belege" className="flex items-center justify-between rounded-2xl bg-violet-50 p-4 ring-1 ring-violet-100">
                <div>
                  <p className="text-sm font-black">{missingReceipts.length} vorhandene Zahlungen ohne Nachweis</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">Nur Ausnahmefälle, nicht der normale Scan-Weg.</p>
                </div>
                <ArrowRight className="h-5 w-5 text-violet-700" />
              </Link>
            )}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
            Du musst gerade nichts durchsuchen. Mila hat keinen ungeklärten Dokumentfall gefunden.
          </div>
        )}
      </section>

      <Link href="/stapel" className="flex items-center justify-between rounded-[2rem] bg-violet-600 p-5 text-white shadow-lg shadow-violet-100">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-white/70">Hauptaktion</p>
          <p className="mt-1 text-2xl font-black">Unterlagen rein</p>
          <p className="mt-1 text-sm font-semibold text-white/80">Ein Foto oder zwanzig Dateien – derselbe Ablauf.</p>
        </div>
        <FileStack className="h-9 w-9 shrink-0" />
      </Link>

      <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-600" />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-600">Was Mila gerade übernimmt</p>
            <h2 className="mt-1 text-xl font-black">Die Arbeit hinter der Oberfläche</h2>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <Capability
            icon={FolderCheck}
            title="Dokumente verstehen & vorsortieren"
            detail={`${sortedDocs} von ${documents.length} vorhandenen Unterlagen ohne offene Klärung`}
          />
          <Capability
            icon={ReceiptText}
            title="IST-Einnahmen & IST-Ausgaben aus Nachweisen ableiten"
            detail={`${cashflowItems} belegte Finanzvorgänge im aktuellen Bestand`}
          />
          <Capability
            icon={FileStack}
            title="Mischbons bis auf Positionsebene prüfen"
            detail="Mila übernimmt Eindeutiges und fragt nur bei unsicherem Zweck nach."
          />
          <Capability
            icon={CheckCircle2}
            title="Originale sauber für die Übergabe halten"
            detail={`${documents.length} Dokumente bleiben mit ihrem Original verknüpft`}
          />
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/eingang" className="rounded-3xl bg-slate-950 p-4 text-white">
          <FileStack className="h-6 w-6 text-violet-300" />
          <p className="mt-5 text-base font-black">Eingang ansehen</p>
        </Link>
        <Link href="/jetzt" className="rounded-3xl bg-white p-4 ring-1 ring-slate-100">
          <ListTodo className="h-6 w-6 text-violet-600" />
          <p className="mt-5 text-base font-black">Vorgänge</p>
        </Link>
      </div>
    </main>
  )
}

function Capability({ icon: Icon, title, detail }: { icon: any; title: string; detail: string }) {
  return (
    <div className="flex gap-3 rounded-2xl bg-slate-50 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-violet-600 shadow-sm">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-black text-slate-900">{title}</p>
        <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{detail}</p>
      </div>
    </div>
  )
}
