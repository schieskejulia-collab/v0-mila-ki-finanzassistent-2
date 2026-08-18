"use client"

import { useMemo, useState } from "react"

type LegacyFormat = "csv" | "json" | "text"
type SchemaColumn = {
  sourceColumn: string
  inferredType: string
  targetField?: string
  confidence: "low" | "medium" | "high"
  examples?: unknown[]
  confirmed?: boolean
}

type LegacyPlanResponse = {
  success: boolean
  error?: string
  data?: {
    schema: SchemaColumn[]
    preview: Record<string, unknown>[]
    mappingConfirmed: boolean
    unresolvedColumns: string[]
    plan: any
  }
}

const demoCsv = `Kunde;Betrag;Rechnungsnummer;Datum;Projekt;Fahrzeug;Verwendungszweck\nMüller GmbH;83,42;RE-2026-0818;18.08.2026;Baustelle Müller;Transporter 2;Tankbeleg Baustelle Müller\nSchmidt Bau;249,90;RE-2026-0819;18.08.2026;Sanierung Markt 4;Transporter 1;Materiallieferung`

const targetOptions = {
  neutral: { connectorId: "neutral-export", systemName: "Neutraler Export", capability: "export-json" },
  datev: { connectorId: "datev", systemName: "DATEV", capability: "export_package" },
  none: undefined,
}

export default function LegacyTestPage() {
  const [format, setFormat] = useState<LegacyFormat>("csv")
  const [content, setContent] = useState(demoCsv)
  const [fileName, setFileName] = useState("legacy-kunden.csv")
  const [targetKey, setTargetKey] = useState<keyof typeof targetOptions>("neutral")
  const [urgent, setUrgent] = useState(false)
  const [sensitive, setSensitive] = useState(false)
  const [schema, setSchema] = useState<SchemaColumn[]>([])
  const [result, setResult] = useState<LegacyPlanResponse["data"]>()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const mappings = useMemo(
    () => schema.map((column) => ({
      sourceColumn: column.sourceColumn,
      targetField: column.targetField,
      confirmed: column.confirmed === true,
    })),
    [schema],
  )

  async function run(useMappings = false) {
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/mila/legacy-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          format,
          fileName,
          mappings: useMappings ? mappings : undefined,
          target: targetOptions[targetKey],
          urgent,
          sensitive,
        }),
      })
      const json = (await response.json()) as LegacyPlanResponse
      if (!json.success || !json.data) throw new Error(json.error || "Legacy-Test fehlgeschlagen")
      setResult(json.data)
      setSchema(json.data.schema.map((column) => ({ ...column, confirmed: useMappings ? column.confirmed : column.confidence === "high" })))
    } catch (err: any) {
      setError(err?.message || "Legacy-Test fehlgeschlagen")
    } finally {
      setLoading(false)
    }
  }

  function updateColumn(sourceColumn: string, patch: Partial<SchemaColumn>) {
    setSchema((current) => current.map((column) => column.sourceColumn === sourceColumn ? { ...column, ...patch } : column))
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-900">
      <div className="mx-auto max-w-2xl space-y-4">
        <header className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">Mila Legacy Bridge</p>
          <h1 className="mt-1 text-2xl font-semibold">Fremddaten-Test</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600">CSV, JSON oder Text → Schema erkennen → Mapping prüfen → Mensch bestätigt → Mila Core entscheidet.</p>
        </header>

        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-semibold">Format
              <select value={format} onChange={(e) => setFormat(e.target.value as LegacyFormat)} className="mt-2 w-full rounded-2xl border border-zinc-200 p-3 font-normal">
                <option value="csv">CSV</option><option value="json">JSON</option><option value="text">Text</option>
              </select>
            </label>
            <label className="text-sm font-semibold">Dateiname
              <input value={fileName} onChange={(e) => setFileName(e.target.value)} className="mt-2 w-full rounded-2xl border border-zinc-200 p-3 font-normal" />
            </label>
          </div>

          <label className="mt-4 block text-sm font-semibold">Fremddaten</label>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} className="mt-2 min-h-52 w-full rounded-2xl border border-zinc-200 bg-zinc-50 p-4 font-mono text-xs outline-none" />

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button onClick={() => setUrgent((v) => !v)} className={`rounded-2xl border p-3 text-left ${urgent ? "border-amber-400 bg-amber-50" : "border-zinc-200"}`}><b>Dringend</b><span className="block text-xs">{urgent ? "AN" : "AUS"}</span></button>
            <button onClick={() => setSensitive((v) => !v)} className={`rounded-2xl border p-3 text-left ${sensitive ? "border-rose-400 bg-rose-50" : "border-zinc-200"}`}><b>Sensibel</b><span className="block text-xs">{sensitive ? "AN" : "AUS"}</span></button>
          </div>

          <label className="mt-4 block text-sm font-semibold">Zielsystem</label>
          <select value={targetKey} onChange={(e) => setTargetKey(e.target.value as keyof typeof targetOptions)} className="mt-2 w-full rounded-2xl border border-zinc-200 p-3">
            <option value="neutral">Neutraler Export</option><option value="datev">DATEV – absichtlich nicht aktiv</option><option value="none">Noch kein Zielsystem</option>
          </select>

          <button onClick={() => run(false)} disabled={loading || !content.trim()} className="mt-4 w-full rounded-2xl bg-zinc-900 px-4 py-3 font-semibold text-white disabled:opacity-50">{loading ? "Mila prüft …" : "Schema erkennen"}</button>
          {error && <p className="mt-3 rounded-2xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        </section>

        {schema.length > 0 && (
          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">Schema Mapper</p>
            <h2 className="mt-1 text-lg font-semibold">Erkannte Spalten bestätigen</h2>
            <div className="mt-4 space-y-3">
              {schema.map((column) => (
                <div key={column.sourceColumn} className="rounded-2xl bg-zinc-50 p-3">
                  <div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{column.sourceColumn}</p><p className="text-xs text-zinc-500">Typ: {column.inferredType} · Confidence: {column.confidence}</p></div><button onClick={() => updateColumn(column.sourceColumn, { confirmed: !column.confirmed })} className={`rounded-full px-3 py-1 text-xs font-semibold ${column.confirmed ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>{column.confirmed ? "Bestätigt" : "Bestätigen"}</button></div>
                  <label className="mt-2 block text-xs text-zinc-500">Mila-Feld</label>
                  <input value={column.targetField || ""} onChange={(e) => updateColumn(column.sourceColumn, { targetField: e.target.value || undefined, confirmed: false })} placeholder="z. B. client, amount, project" className="mt-1 w-full rounded-xl border border-zinc-200 bg-white p-2 text-sm" />
                </div>
              ))}
            </div>
            <button onClick={() => run(true)} disabled={loading} className="mt-4 w-full rounded-2xl bg-violet-700 px-4 py-3 font-semibold text-white disabled:opacity-50">Mapping bestätigen & durch Mila Core schicken</button>
          </section>
        )}

        {result && (
          <>
            <section className={`rounded-3xl p-5 shadow-sm ring-1 ${result.mappingConfirmed ? "bg-emerald-50 ring-emerald-200" : "bg-amber-50 ring-amber-200"}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em]">Mapping</p>
              <p className="mt-2 text-lg font-semibold">{result.mappingConfirmed ? "Mapping vollständig" : "Mapping noch nicht vollständig"}</p>
              {!result.mappingConfirmed && <p className="mt-2 text-sm">Offen: {result.unresolvedColumns.join(", ") || "unbekannt"}</p>}
            </section>

            <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">Mila Core</p>
              <dl className="mt-3 grid grid-cols-[120px_1fr] gap-2 text-sm">
                <dt className="text-zinc-500">Status</dt><dd className="font-semibold">{result.plan?.decision?.state}</dd>
                <dt className="text-zinc-500">Nächster Schritt</dt><dd>{result.plan?.decision?.nextStep}</dd>
                <dt className="text-zinc-500">Confidence</dt><dd>{result.plan?.interpretation?.confidence}</dd>
                <dt className="text-zinc-500">Handoff ready</dt><dd>{result.plan?.handoffReady ? "Ja" : "Nein"}</dd>
                <dt className="text-zinc-500">Eskalation</dt><dd>{result.plan?.decision?.escalation?.required ? result.plan.decision.escalation.reason : "Nein"}</dd>
              </dl>
            </section>

            <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Vorschau</p>
              <pre className="mt-3 overflow-x-auto rounded-2xl bg-zinc-950 p-3 text-xs text-zinc-100">{JSON.stringify(result.preview, null, 2)}</pre>
            </section>

            <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Provenance</p>
              <div className="mt-3 space-y-2">{(result.plan?.provenance || []).map((item: any, index: number) => <div key={`${item.field}-${index}`} className="rounded-2xl bg-zinc-50 p-3 text-sm"><b>{item.field}</b><p className="mt-1 text-xs text-zinc-600">Quelle: {item.sourceLabel} · {item.transformation} · Confidence: {item.confidence} · Mensch bestätigt: {item.humanConfirmed ? "ja" : "nein"}</p></div>)}</div>
            </section>
          </>
        )}
      </div>
    </main>
  )
}
