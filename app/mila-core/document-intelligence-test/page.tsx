"use client"

import { useMemo, useState } from "react"

type ScanPreset = {
  label: string
  scan: Record<string, unknown>
}

type TargetKey = "neutral" | "datev" | "none"

const presets: Record<string, ScanPreset> = {
  rechnung: {
    label: "Rechnung",
    scan: {
      title: "Rechnung Telekom",
      vendor: "Telekom",
      amount: 49.99,
      documentType: "rechnung",
      invoiceNumber: "RE-2026-0818",
      category: "Telefon & Internet",
      suggestedCategory: "Telefon & Internet",
      businessPurpose: "Betriebliche Telekommunikation",
      confidence: 0.94,
      fileName: "telekom-rechnung.pdf",
    },
  },
  mahnung: {
    label: "Mahnung",
    scan: {
      title: "Mahnung Vodafone",
      vendor: "Vodafone",
      amount: 78.4,
      dueDate: "2026-08-25",
      documentType: "mahnung",
      isObligation: true,
      caseNumber: "MA-48211",
      category: "Telefon & Internet",
      confidence: 0.92,
      fileName: "mahnung-vodafone.pdf",
    },
  },
  inkasso: {
    label: "Inkasso",
    scan: {
      title: "Inkassoforderung Klarna",
      vendor: "Inkasso GmbH",
      amount: 214.8,
      dueDate: "2026-08-29",
      documentType: "inkasso",
      isObligation: true,
      originalCreditor: "Klarna",
      caseNumber: "AZ-99182",
      category: "inkasso",
      confidence: 0.97,
      fileName: "inkasso-klarna.pdf",
    },
  },
  gutschrift: {
    label: "Gutschrift",
    scan: {
      title: "Gutschrift Lieferant Müller",
      vendor: "Müller Baustoffe",
      amount: 36.5,
      documentType: "gutschrift",
      invoiceNumber: "GS-1142",
      project: "Baustelle Müller",
      businessPurpose: "Materialkorrektur Baustelle Müller",
      confidence: 0.95,
      fileName: "gutschrift-mueller.pdf",
    },
  },
  kassenbon: {
    label: "Kassenbon – unklarer Zweck",
    scan: {
      title: "Kassenbon MediaMarkt",
      vendor: "MediaMarkt",
      amount: 89.99,
      documentType: "kassenbon",
      suggestedCategory: "Arbeitsmittel",
      category: "Unklar",
      needsConfirmation: true,
      confidence: 0.61,
      fileName: "kassenbon-mediamarkt.jpg",
    },
  },
  bescheid: {
    label: "Bescheid",
    scan: {
      title: "Bescheid Behörde",
      vendor: "Behörde",
      documentType: "bescheid",
      dueDate: "2026-09-10",
      caseNumber: "B-2026-778",
      isObligation: true,
      confidence: 0.9,
      fileName: "bescheid.pdf",
    },
  },
}

function targetFor(key: TargetKey) {
  if (key === "neutral") {
    return { connectorId: "neutral-export", systemName: "Neutraler Export", capability: "export-json" }
  }
  if (key === "datev") {
    return { connectorId: "datev", systemName: "DATEV", capability: "export_package" }
  }
  return undefined
}

export default function DocumentIntelligenceTestPage() {
  const [presetKey, setPresetKey] = useState("rechnung")
  const [scan, setScan] = useState<Record<string, unknown>>(presets.rechnung.scan)
  const [urgent, setUrgent] = useState(false)
  const [sensitive, setSensitive] = useState(false)
  const [targetKey, setTargetKey] = useState<TargetKey>("neutral")
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const prettyScan = useMemo(() => JSON.stringify(scan, null, 2), [scan])

  function choosePreset(key: string) {
    setPresetKey(key)
    setScan({ ...presets[key].scan })
    setResult(null)
    setError("")
  }

  function updateField(field: string, value: string) {
    setScan((current) => ({ ...current, [field]: value }))
  }

  async function run() {
    setLoading(true)
    setError("")
    setResult(null)

    try {
      const response = await fetch("/api/mila/document-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: `document-test-${Date.now()}`,
          scan,
          urgent,
          sensitive,
          target: targetFor(targetKey),
        }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Dokumenttest fehlgeschlagen.")
      }
      setResult(data.data)
    } catch (err: any) {
      setError(err?.message || "Dokumenttest fehlgeschlagen.")
    } finally {
      setLoading(false)
    }
  }

  const plan = result?.plan
  const decision = plan?.decision
  const effectiveTarget = plan?.actions?.[0]?.target
  const normalizedFields = result?.normalizedInput?.fields ?? {}

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-900">
      <div className="mx-auto max-w-xl space-y-4">
        <header className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-700">Mila Core</p>
          <h1 className="mt-2 text-2xl font-semibold">Document Intelligence Test</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600">Hier prüfen wir die neue Brücke: bestehendes Scannergebnis → allgemeine Dokumentdaten → Mila Core → sichere Entscheidung.</p>
        </header>

        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          <label className="text-sm font-semibold">Dokument-Beispiel</label>
          <select value={presetKey} onChange={(e) => choosePreset(e.target.value)} className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white p-3">
            {Object.entries(presets).map(([key, preset]) => <option key={key} value={key}>{preset.label}</option>)}
          </select>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-zinc-600">Titel<input value={String(scan.title ?? "")} onChange={(e) => updateField("title", e.target.value)} className="mt-1 w-full rounded-xl border border-zinc-200 p-3 text-sm text-zinc-900" /></label>
            <label className="text-xs font-semibold text-zinc-600">Anbieter<input value={String(scan.vendor ?? "")} onChange={(e) => updateField("vendor", e.target.value)} className="mt-1 w-full rounded-xl border border-zinc-200 p-3 text-sm text-zinc-900" /></label>
            <label className="text-xs font-semibold text-zinc-600">Dokumenttyp<input value={String(scan.documentType ?? "")} onChange={(e) => updateField("documentType", e.target.value)} className="mt-1 w-full rounded-xl border border-zinc-200 p-3 text-sm text-zinc-900" /></label>
            <label className="text-xs font-semibold text-zinc-600">Betrag<input value={String(scan.amount ?? "")} onChange={(e) => updateField("amount", e.target.value)} className="mt-1 w-full rounded-xl border border-zinc-200 p-3 text-sm text-zinc-900" /></label>
          </div>

          <label className="mt-3 block text-xs font-semibold text-zinc-600">Geschäftszweck<input value={String(scan.businessPurpose ?? "")} onChange={(e) => updateField("businessPurpose", e.target.value)} placeholder="Leer lassen, um Rückfrage zu testen" className="mt-1 w-full rounded-xl border border-zinc-200 p-3 text-sm text-zinc-900" /></label>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button onClick={() => setUrgent((v) => !v)} className={`rounded-2xl border p-4 text-left ${urgent ? "border-amber-400 bg-amber-50" : "border-zinc-200"}`}><span className="font-semibold">Dringend</span><span className="mt-1 block text-xs">{urgent ? "AN · priorisieren" : "AUS"}</span></button>
            <button onClick={() => setSensitive((v) => !v)} className={`rounded-2xl border p-4 text-left ${sensitive ? "border-rose-400 bg-rose-50" : "border-zinc-200"}`}><span className="font-semibold">Sensibel</span><span className="mt-1 block text-xs">{sensitive ? "AN · Mensch prüft" : "AUS"}</span></button>
          </div>

          <label className="mt-4 block text-sm font-semibold">Zielsystem</label>
          <select value={targetKey} onChange={(e) => setTargetKey(e.target.value as TargetKey)} className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white p-3">
            <option value="neutral">Neutraler Export</option>
            <option value="datev">DATEV – absichtlich nicht aktiv</option>
            <option value="none">Noch kein Zielsystem</option>
          </select>

          <button onClick={run} disabled={loading} className="mt-4 w-full rounded-2xl bg-zinc-900 px-4 py-3 font-semibold text-white disabled:opacity-50">{loading ? "Mila prüft …" : "Dokument durch Mila Core schicken"}</button>
          {error && <p className="mt-3 rounded-2xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        </section>

        {result && (
          <>
            <section className="rounded-3xl bg-violet-50 p-5 ring-1 ring-violet-200">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">Scanner → Core</p>
              <dl className="mt-3 grid grid-cols-[120px_1fr] gap-2 text-sm">
                <dt className="text-zinc-500">Scanner Confidence</dt><dd className="font-semibold">{result.scannerConfidence}</dd>
                <dt className="text-zinc-500">Typ</dt><dd>{normalizedFields.documentType || "—"}</dd>
                <dt className="text-zinc-500">Anbieter</dt><dd>{normalizedFields.vendor || "—"}</dd>
                <dt className="text-zinc-500">Betrag</dt><dd>{normalizedFields.amount ?? "—"}</dd>
                <dt className="text-zinc-500">Geschäftszweck</dt><dd>{normalizedFields.businessPurpose || "nicht sicher erkannt"}</dd>
              </dl>
            </section>

            {decision && <section className={`rounded-3xl p-5 shadow-sm ring-1 ${decision.escalation.required ? "bg-amber-50 ring-amber-200" : "bg-white ring-zinc-200"}`}>
              <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">Mila-Entscheidung</p><h2 className="mt-1 text-xl font-semibold">{decision.state}</h2></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${decision.priority === "high" ? "bg-amber-200" : "bg-zinc-100"}`}>{decision.priority === "high" ? "HOCH" : "NORMAL"}</span></div>
              <dl className="mt-4 grid grid-cols-[110px_1fr] gap-2 text-sm"><dt className="text-zinc-500">Nächster Schritt</dt><dd className="font-medium">{decision.nextStep}</dd><dt className="text-zinc-500">Grund</dt><dd>{decision.reason}</dd><dt className="text-zinc-500">Eskalation</dt><dd>{decision.escalation.required ? `JA · ${decision.escalation.reason}` : "Nein"}</dd><dt className="text-zinc-500">Fallback</dt><dd>{decision.escalation.fallback || "Keiner"}</dd></dl>
            </section>}

            <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Core-Ergebnis</p>
              <dl className="mt-3 grid grid-cols-[110px_1fr] gap-2 text-sm"><dt className="text-zinc-500">Erkannter Typ</dt><dd>{plan?.interpretation?.detectedType}</dd><dt className="text-zinc-500">Prozess</dt><dd>{plan?.interpretation?.processType || "offen"}</dd><dt className="text-zinc-500">Confidence</dt><dd>{plan?.interpretation?.confidence}</dd><dt className="text-zinc-500">Handoff ready</dt><dd>{plan?.handoffReady ? "Ja" : "Nein"}</dd><dt className="text-zinc-500">Effektives Ziel</dt><dd>{effectiveTarget ? `${effectiveTarget.systemName} · ${effectiveTarget.connectorId}` : "Keins"}</dd></dl>
            </section>

            <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Provenance</p><h2 className="mt-1 font-semibold">Woher Mila die Werte hat</h2><div className="mt-3 space-y-2">{plan?.provenance?.length ? plan.provenance.map((item: any, i: number) => <div key={`${item.field}-${i}`} className="rounded-2xl bg-zinc-50 p-3 text-sm"><p className="font-semibold">{item.field}: {String(item.value)}</p><p className="mt-1 text-xs text-zinc-600">Quelle: {item.sourceLabel} · {item.transformation} · Confidence: {item.confidence} · Mensch bestätigt: {item.humanConfirmed ? "ja" : "nein"}</p></div>) : <p className="text-sm text-zinc-500">Keine Provenance vorhanden.</p>}</div>
            </section>

            <details className="rounded-3xl bg-white p-5 text-sm shadow-sm ring-1 ring-zinc-200"><summary className="cursor-pointer font-semibold">Technische Scanner-Daten ansehen</summary><pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-2xl bg-zinc-950 p-3 text-xs text-zinc-100">{prettyScan}</pre></details>
          </>
        )}
      </div>
    </main>
  )
}
