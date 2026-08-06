import Link from 'next/link'

function plural(count: number, singular: string, pluralText: string) {
  return count === 1 ? singular : pluralText
}

export function KanzleiHandoffSection({ model }: { model: any }) {
  const handoff = model.kanzleiHandoff

  if (!handoff) {
    return null
  }

  const completionTone =
    handoff.completion >= 80
      ? 'text-emerald-700'
      : handoff.completion >= 55
        ? 'text-amber-700'
        : 'text-rose-700'

  return (
    <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">
            Kanzlei-Übergabe
          </p>

          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
            Monatsmappe vorbereiten
          </h2>
        </div>

        <div className="rounded-2xl bg-violet-50 px-4 py-3 text-center">
          <p className={`text-2xl font-black ${completionTone}`}>
            {handoff.completion}%
          </p>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            bereit
          </p>
        </div>
      </div>

      <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600">
        Mila prüft organisatorisch, ob Belege, offene Angaben und Pflichten
        für die nächste Übergabe vollständig genug sind.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Metric
          label="Dokumente"
          value={handoff.documentCount}
        />
        <Metric
          label="Fehlende Belege"
          value={handoff.missingReceiptCount}
        />
        <Metric
          label="Offene Pflichten"
          value={handoff.openObligationCount}
        />
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 p-4">
        <p className="text-sm font-black text-slate-800">
          {handoff.nextAction.title}
        </p>

        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {handoff.nextAction.message}
        </p>

        <Link
          href={handoff.nextAction.href}
          className="mt-4 inline-flex rounded-2xl bg-violet-600 px-4 py-3 text-sm font-black text-white"
        >
          {handoff.nextAction.cta}
        </Link>
      </div>

      <p className="mt-3 text-xs font-semibold leading-relaxed text-slate-400">
        Hinweis: Mila sortiert und fragt nach. Die steuerliche Prüfung bleibt
        bei Kanzlei oder Steuerberatung.
      </p>
    </section>
  )
}

function Metric({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-center">
      <p className="text-xl font-black text-slate-950">
        {value}
      </p>

      <p className="mt-1 text-[10px] font-black uppercase leading-tight tracking-wider text-slate-400">
        {label}
      </p>
    </div>
  )
}

export function describeHandoffSummary(handoff: any) {
  if (!handoff) {
    return 'Noch keine Übergabe-Daten vorhanden.'
  }

  const issues = []

  if (handoff.missingReceiptCount > 0) {
    issues.push(
      `${handoff.missingReceiptCount} ${plural(
        handoff.missingReceiptCount,
        'Beleg fehlt',
        'Belege fehlen'
      )}`
    )
  }

  if (handoff.openQuestionCount > 0) {
    issues.push(
      `${handoff.openQuestionCount} ${plural(
        handoff.openQuestionCount,
        'Rückfrage offen',
        'Rückfragen offen'
      )}`
    )
  }

  if (handoff.openObligationCount > 0) {
    issues.push(
      `${handoff.openObligationCount} ${plural(
        handoff.openObligationCount,
        'Pflicht offen',
        'Pflichten offen'
      )}`
    )
  }

  return issues.length > 0
    ? issues.join(' · ')
    : 'Monatsmappe wirkt bereit für die Übergabe.'
}
