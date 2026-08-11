import Link from 'next/link'
import {
  demoPilotBusiness,
  demoPilotDocuments,
  demoPilotExpenses,
  demoPilotObligations,
} from '@/lib/demo-pilot-data'

function formatEuro(value?: number) {
  if (!value) return ''

  return value.toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  })
}

export default function DemoPage() {
  const missingReceipts = demoPilotExpenses.filter((expense: any) => {
    return expense?.hasReceipt === false || expense?.has_receipt === false
  })

  const openQuestions = demoPilotDocuments.filter((doc) => {
    const status = String(doc.status || '').toLowerCase()
    const note = String(doc.note || '').toLowerCase()

    return (
      status === 'neu' ||
      note.includes('unklar') ||
      note.includes('rückfrage') ||
      note.includes('rueckfrage')
    )
  })

  const openObligations = demoPilotObligations.filter((item: any) => {
    const status = String(item.status || '').toLowerCase()
    return !['erledigt', 'bezahlt', 'archiviert'].includes(status)
  })

  return (
    <main className="mx-auto min-h-screen max-w-md space-y-5 bg-[#fbf9ff] p-6 pb-16 text-slate-950">
      <header className="overflow-hidden rounded-[2rem] border border-violet-100 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-violet-700 via-violet-600 to-fuchsia-500 p-6 text-white">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70">
              Mila Demo
            </p>

            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black">
              Keine echten Daten
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-black">
            {demoPilotBusiness.name}
          </h1>

          <p className="mt-3 text-sm font-semibold leading-relaxed text-white/85">
            Beispielbetrieb für die Vorführung der organisatorischen
            Kanzlei-Vorbereitung.
          </p>
        </div>

        <div className="p-5">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            Übergabestatus
          </p>

          <div className="mt-2 flex items-end justify-between gap-3">
            <h2 className="text-3xl font-black">
              {demoPilotBusiness.handoffCompletion}%
            </h2>

            <span className="rounded-full bg-amber-100 px-3 py-2 text-xs font-black text-amber-700">
              In Bearbeitung
            </span>
          </div>

          <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600">
            Einige Unterlagen sind bereits vorbereitet. Fehlende Belege,
            Rückfragen und offene Punkte bleiben sichtbar, bevor die Mappe
            übergeben wird.
          </p>
        </div>
      </header>

      <section className="grid grid-cols-3 gap-2">
        <Metric
          label="Dokumente"
          value={demoPilotDocuments.length}
        />
        <Metric
          label="Fehlende Belege"
          value={missingReceipts.length}
        />
        <Metric
          label="Rückfragen"
          value={openQuestions.length}
        />
      </section>

      <section className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-600">
          Was Mila sichtbar macht
        </p>

        <div className="mt-4 space-y-3">
          <DemoPoint
            title="Fehlende Belege"
            text={`${missingReceipts.length} Buchung(en) haben noch keinen zugeordneten Beleg.`}
          />
          <DemoPoint
            title="Rückfragen"
            text={`${openQuestions.length} Unterlage(n) brauchen noch zusätzlichen Kontext.`}
          />
          <DemoPoint
            title="Offene Punkte"
            text={`${openObligations.length} Zahlung(en), Bescheid(e) oder Frist(en) sind noch offen.`}
          />
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-600">
            Beispielunterlagen
          </p>

          <h2 className="mt-2 text-2xl font-black">
            So sieht die vorbereitete Mappe aus
          </h2>
        </div>

        {demoPilotDocuments.map((doc) => (
          <article
            key={doc.id}
            className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"
          >
            <div className="flex justify-between gap-3">
              <div>
                <p className="font-black">
                  {doc.title}
                </p>

                <p className="text-sm text-slate-500">
                  {doc.partner}
                </p>
              </div>

              <span className="text-xs font-black uppercase text-violet-600">
                {doc.type}
              </span>
            </div>

            {doc.amount && (
              <p className="mt-3 text-xl font-black">
                {formatEuro(doc.amount)}
              </p>
            )}

            {doc.note && (
              <p className="mt-3 rounded-2xl bg-violet-50 p-3 text-sm font-semibold leading-relaxed text-slate-600">
                {doc.note}
              </p>
            )}

            {doc.dueDate && (
              <p className="mt-3 text-sm font-bold text-amber-700">
                Fällig: {doc.dueDate}
              </p>
            )}
          </article>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
          Was hier bewusst nicht passiert
        </p>

        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
          Mila trifft keine steuerliche Bewertung und keine finale
          Buchungsentscheidung. Sie bereitet Unterlagen organisatorisch vor
          und macht fehlende Angaben sichtbar.
        </p>
      </section>

      <div className="grid gap-3">
        <Link
          href="/"
          className="rounded-2xl bg-violet-600 px-4 py-4 text-center text-sm font-black text-white"
        >
          Zum Mila Arbeitsplatz
        </Link>

        <Link
          href="/angebot"
          className="rounded-2xl border border-violet-100 bg-white px-4 py-4 text-center text-sm font-black text-violet-700"
        >
          Angebot ansehen
        </Link>
      </div>
    </main>
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
    <div className="rounded-2xl bg-violet-50 p-3 text-center">
      <p className="text-2xl font-black">
        {value}
      </p>

      <p className="mt-1 text-[9px] font-black uppercase leading-tight tracking-wider text-slate-400">
        {label}
      </p>
    </div>
  )
}

function DemoPoint({
  title,
  text,
}: {
  title: string
  text: string
}) {
  return (
    <div className="rounded-2xl bg-violet-50 p-4">
      <p className="text-sm font-black text-slate-950">
        {title}
      </p>

      <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-600">
        {text}
      </p>
    </div>
  )
}