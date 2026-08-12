'use client'

import { useMemo } from 'react'
import { useFinance } from '@/lib/store'
import {
  checkDocumentQuality,
  findPossibleDuplicates,
  findRecurringPatterns,
} from '@/lib/document-workflow'

export default function DokumenteLayout({ children }: { children: React.ReactNode }) {
  const { documents, expenses } = useFinance()

  const quality = useMemo(() => {
    const incomplete = documents.filter((doc: any) => !checkDocumentQuality(doc).ok)
    const duplicates = findPossibleDuplicates(documents)
    const patterns = findRecurringPatterns(documents)
    const expectedMissing = patterns.filter((pattern) => pattern.expectedThisMonth)
    const missingReceipts = expenses.filter((expense: any) =>
      expense?.hasReceipt === false || expense?.has_receipt === false
    )

    return {
      incomplete,
      duplicates,
      patterns,
      expectedMissing,
      missingReceipts,
    }
  }, [documents, expenses])

  const hasSignals =
    quality.incomplete.length > 0 ||
    quality.duplicates.length > 0 ||
    quality.expectedMissing.length > 0 ||
    quality.missingReceipts.length > 0

  return (
    <>
      <div className="mx-auto max-w-md px-5 pt-5">
        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-600">Qualitätscheck</p>
              <h2 className="mt-2 text-xl font-black text-slate-950">Vor Übergabe prüfen</h2>
            </div>
            <span className={`rounded-full px-3 py-2 text-xs font-black ${hasSignals ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'}`}>
              {hasSignals ? 'Prüfen' : 'Unauffällig'}
            </span>
          </div>

          <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600">
            Mila prüft hier nur organisatorische Auffälligkeiten. Keine steuerliche Bewertung und keine automatische Löschung.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <QualityMetric label="Ohne Beleg" value={quality.missingReceipts.length} />
            <QualityMetric label="Unvollständig" value={quality.incomplete.length} />
            <QualityMetric label="Mögliche Duplikate" value={quality.duplicates.length} />
            <QualityMetric label="Muster" value={quality.patterns.length} />
          </div>

          {quality.duplicates.length > 0 && (
            <div className="mt-4 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-800">Mögliche Duplikate</p>
              <div className="mt-2 space-y-2">
                {quality.duplicates.slice(0, 3).map((item) => (
                  <p key={`${item.documentId}-${item.duplicateOfId}`} className="text-xs font-semibold leading-relaxed text-slate-700">
                    ⚠ {item.reason}
                  </p>
                ))}
              </div>
            </div>
          )}

          {quality.expectedMissing.length > 0 && (
            <div className="mt-4 rounded-2xl bg-violet-50 p-4 ring-1 ring-violet-100">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-700">Wiederkehrendes Muster erkannt</p>
              <div className="mt-2 space-y-3">
                {quality.expectedMissing.slice(0, 4).map((pattern) => (
                  <div key={pattern.key}>
                    <p className="text-sm font-black text-slate-800">
                      {pattern.partner}{pattern.amount ? ` · ${pattern.amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}` : ''}
                    </p>
                    <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-600">{pattern.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {quality.patterns.length > 0 && quality.expectedMissing.length === 0 && (
            <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-xs font-semibold leading-relaxed text-slate-600">
              ✓ {quality.patterns.length} wiederkehrende {quality.patterns.length === 1 ? 'Struktur' : 'Strukturen'} erkannt. Aktuell ergibt sich daraus kein fehlender Beleg-Hinweis.
            </p>
          )}
        </section>
      </div>
      {children}
    </>
  )
}

function QualityMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
    </div>
  )
}
