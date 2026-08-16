import Link from 'next/link'
import {
  demoPilotBusiness,
  demoPilotDocuments,
  demoPilotExpenses,
} from '@/lib/demo-pilot-data'

function formatEuro(value?: number) {
  if (!value) return ''
  return value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

export default function DemoPage() {
  const missingReceipts = demoPilotExpenses.filter((expense: any) =>
    expense?.hasReceipt === false || expense?.has_receipt === false
  )

  const openQuestions = demoPilotDocuments.filter((doc) => {
    const status = String(doc.status || '').toLowerCase()
    const note = String(doc.note || '').toLowerCase()
    return status === 'neu' || note.includes('unklar') || note.includes('rückfrage') || note.includes('rueckfrage')
  })

  const readyDocuments = Math.max(demoPilotDocuments.length - openQuestions.length, 0)

  return (
    <main className="mx-auto min-h-screen max-w-md space-y-5 bg-[#fbf9ff] p-6 pb-16 text-slate-950">
      <header className="overflow-hidden rounded-[2rem] border border-violet-100 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-violet-700 via-violet-600 to-fuchsia-500 p-6 text-white">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70">Mila · Kanzlei-Demo</p>
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black">Beispieldaten</span>
          </div>
          <h1 className="mt-4 text-3xl font-black">Vor der fachlichen Bearbeitung.</h1>
          <p className="mt-3 text-sm font-semibold leading-relaxed text-white/85">
            Mila unterstützt dort, wo Mandantenunterlagen ankommen: sammeln, zuordnen,
            Vollständigkeit sichtbar machen und offene Rückfragen für die Kanzlei vorbereiten.
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Beispielvorgang</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">{demoPilotBusiness.name}</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">Übergabestatus {demoPilotBusiness.handoffCompletion}%</p>
            </div>
            <span className="rounded-full bg-amber-100 px-3 py-2 text-xs font-black text-amber-700">Noch nicht übergabebereit</span>
          </div>
        </div>
      </header>

      <section className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-600">Der Ablauf</p>
        <div className="mt-4 space-y-3">
          <Step number="1" title="Unterlagen kommen an" text="Mandant übermittelt Belege und Informationen." />
          <Step number="2" title="Mila strukturiert vor" text="Dokumente werden dem Vorgang zugeordnet und organisatorisch geprüft." />
          <Step number="3" title="Fehlendes wird sichtbar" text="Fehlende Belege und unklare Angaben werden als Rückfrage vorbereitet." />
          <Step number="4" title="Kanzlei übernimmt" text="Der Vorgang geht mit Kontext und offenen Punkten in die fachliche Bearbeitung." />
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2">
        <Metric label="Vorbereitet" value={readyDocuments} />
        <Metric label="Belege fehlen" value={missingReceipts.length} />
        <Metric label="Rückfragen" value={openQuestions.length} />
      </section>

      <section className="rounded-3xl border border-amber-100 bg-amber-50 p-5">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">Vor Übergabe noch zu klären</p>
        <div className="mt-3 space-y-2 text-sm font-semibold leading-relaxed text-slate-700">
          <p>• {missingReceipts.length} Buchung(en) ohne zugeordneten Beleg</p>
          <p>• {openQuestions.length} Unterlage(n) mit fehlendem oder unklarem Kontext</p>
        </div>
        <p className="mt-3 text-xs font-semibold leading-relaxed text-slate-500">
          Ziel: Die Kanzlei soll offene organisatorische Punkte sehen, bevor die fachliche Arbeit beginnt.
        </p>
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-600">Vorbereitete Unterlagen</p>
          <h2 className="mt-2 text-2xl font-black">Ein Vorgang statt vieler Einzelteile</h2>
        </div>
        {demoPilotDocuments.map((doc) => (
          <article key={doc.id} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex justify-between gap-3">
              <div>
                <p className="font-black">{doc.title}</p>
                <p className="text-sm text-slate-500">{doc.partner}</p>
              </div>
              <span className="text-xs font-black uppercase text-violet-600">{doc.type}</span>
            </div>
            {doc.amount && <p className="mt-3 text-xl font-black">{formatEuro(doc.amount)}</p>}
            {doc.note && <p className="mt-3 rounded-2xl bg-violet-50 p-3 text-sm font-semibold leading-relaxed text-slate-600">{doc.note}</p>}
            {doc.dueDate && <p className="mt-3 text-sm font-bold text-amber-700">Datum im Dokument: {doc.dueDate}</p>}
          </article>
        ))}
      </section>

      <section className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Klare Grenze</p>
        <h2 className="mt-2 text-lg font-black">Vorbereiten statt steuerlich entscheiden.</h2>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
          Mila trifft keine steuerliche Bewertung, gibt keine Steuerberatung und trifft keine finale
          Buchungsentscheidung. Die fachliche Prüfung und Entscheidung bleibt bei der Kanzlei.
        </p>
      </section>

      <section className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-600">Die entscheidende Frage</p>
        <p className="mt-2 text-lg font-black leading-snug">
          Welche Vorarbeit müsste Mila übernehmen, damit dieser Vorgang für Ihre Kanzlei wirklich Zeit spart?
        </p>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
          Die Demo zeigt bewusst einen Arbeitsansatz. Der konkrete Ablauf soll sich an der Praxis der Kanzlei orientieren.
        </p>
      </section>

      <Link href="/" className="block rounded-2xl border border-violet-100 bg-white px-4 py-4 text-center text-sm font-black text-violet-700">
        Mila Arbeitsplatz öffnen
      </Link>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-violet-50 p-3 text-center">
      <p className="text-2xl font-black">{value}</p>
      <p className="mt-1 text-[9px] font-black uppercase leading-tight tracking-wider text-slate-400">{label}</p>
    </div>
  )
}

function Step({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="flex gap-3 rounded-2xl bg-violet-50 p-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-600 text-sm font-black text-white">{number}</div>
      <div>
        <p className="text-sm font-black text-slate-950">{title}</p>
        <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-600">{text}</p>
      </div>
    </div>
  )
}
