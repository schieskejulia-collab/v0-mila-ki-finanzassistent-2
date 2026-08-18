"use client"

import { useMemo, useState } from "react"
import { buildProcessPlan } from "@/lib/mila-core/process-engine"
import type { MilaTargetSystem } from "@/lib/mila-core/types"

const targets: Record<string, MilaTargetSystem | undefined> = {
  none: undefined,
  neutral: { connectorId: "neutral-export", systemName: "Neutraler Export", capability: "export-json" },
  datev: { connectorId: "datev", systemName: "DATEV", capability: "export_package" },
}

export default function OrchestratorTestPage() {
  const [text, setText] = useState("Tankbeleg 83,42 € für Baustelle Müller mit Transporter 2")
  const [urgent, setUrgent] = useState(false)
  const [sensitive, setSensitive] = useState(false)
  const [targetKey, setTargetKey] = useState("neutral")
  const [runId, setRunId] = useState(0)

  const plan = useMemo(() => {
    if (!runId) return null
    return buildProcessPlan({
      caseId: `orchestrator-test-${runId}`,
      source: "manual",
      text,
      urgent,
      sensitive,
      target: targets[targetKey],
    })
  }, [runId])

  const decision = plan?.decision
  const fallbackTarget = plan?.actions?.[0]?.target

  function run() {
    setRunId(Date.now())
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-900">
      <div className="mx-auto max-w-xl space-y-4">
        <header className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-700">Mila Core</p>
          <h1 className="mt-2 text-2xl font-semibold">Orchestrator-Test</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600">Hier testen wir sichtbar State Machine, Eskalation, Fallback und Provenance – getrennt vom gestrigen Memory-Test.</p>
        </header>

        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          <label className="text-sm font-semibold">Test-Vorgang</label>
          <textarea value={text} onChange={(e) => setText(e.target.value)} className="mt-2 min-h-28 w-full rounded-2xl border border-zinc-200 bg-zinc-50 p-4 outline-none" />

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button onClick={() => setUrgent((v) => !v)} className={`rounded-2xl border p-4 text-left ${urgent ? "border-amber-400 bg-amber-50" : "border-zinc-200"}`}>
              <span className="font-semibold">Dringend</span><span className="mt-1 block text-xs">{urgent ? "AN · priorisieren" : "AUS"}</span>
            </button>
            <button onClick={() => setSensitive((v) => !v)} className={`rounded-2xl border p-4 text-left ${sensitive ? "border-rose-400 bg-rose-50" : "border-zinc-200"}`}>
              <span className="font-semibold">Sensibel</span><span className="mt-1 block text-xs">{sensitive ? "AN · Mensch prüft" : "AUS"}</span>
            </button>
          </div>

          <label className="mt-4 block text-sm font-semibold">Zielsystem</label>
          <select value={targetKey} onChange={(e) => setTargetKey(e.target.value)} className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white p-3">
            <option value="neutral">Neutraler Export</option>
            <option value="datev">DATEV – absichtlich nicht aktiv</option>
            <option value="none">Noch kein Zielsystem</option>
          </select>

          <button onClick={run} disabled={!text.trim()} className="mt-4 w-full rounded-2xl bg-zinc-900 px-4 py-3 font-semibold text-white disabled:opacity-50">Orchestrator prüfen</button>
        </section>

        {plan && decision && (
          <>
            <section className={`rounded-3xl p-5 shadow-sm ring-1 ${decision.escalation.required ? "bg-amber-50 ring-amber-200" : "bg-white ring-zinc-200"}`}>
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">Mila-Entscheidung</p><h2 className="mt-1 text-xl font-semibold">{decision.state}</h2></div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${decision.priority === "high" ? "bg-amber-200 text-amber-950" : "bg-zinc-100"}`}>{decision.priority === "high" ? "HOCH" : "NORMAL"}</span>
              </div>
              <dl className="mt-4 grid grid-cols-[110px_1fr] gap-2 text-sm">
                <dt className="text-zinc-500">Nächster Schritt</dt><dd className="font-medium">{decision.nextStep}</dd>
                <dt className="text-zinc-500">Grund</dt><dd>{decision.reason}</dd>
                <dt className="text-zinc-500">Eskalation</dt><dd className="font-medium">{decision.escalation.required ? `JA · ${decision.escalation.reason}` : "Nein"}</dd>
                <dt className="text-zinc-500">Fallback</dt><dd className="font-medium">{decision.escalation.fallback || "Keiner"}</dd>
              </dl>
              {decision.escalation.message && <p className="mt-4 rounded-2xl bg-white p-3 text-sm font-medium">{decision.escalation.message}</p>}
            </section>

            <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Ergebnis</p>
              <dl className="mt-3 grid grid-cols-[110px_1fr] gap-2 text-sm">
                <dt className="text-zinc-500">Typ</dt><dd>{plan.interpretation.detectedType}</dd>
                <dt className="text-zinc-500">Prozess</dt><dd>{plan.interpretation.processType || "offen"}</dd>
                <dt className="text-zinc-500">Confidence</dt><dd>{plan.interpretation.confidence}</dd>
                <dt className="text-zinc-500">Handoff ready</dt><dd>{plan.handoffReady ? "Ja" : "Nein"}</dd>
                <dt className="text-zinc-500">Effektives Ziel</dt><dd>{fallbackTarget ? `${fallbackTarget.systemName} · ${fallbackTarget.connectorId}` : "Keins"}</dd>
              </dl>
            </section>

            <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Provenance</p>
              <h2 className="mt-1 font-semibold">Woher Mila das weiß</h2>
              <div className="mt-3 space-y-2">{plan.provenance.length ? plan.provenance.map((item, i) => <div key={`${item.field}-${i}`} className="rounded-2xl bg-zinc-50 p-3 text-sm"><p className="font-semibold">{item.field}</p><p className="mt-1 text-xs text-zinc-600">Quelle: {item.sourceLabel} · {item.transformation} · Confidence: {item.confidence} · Mensch bestätigt: {item.humanConfirmed ? "ja" : "nein"}</p></div>) : <p className="text-sm text-zinc-500">Für diesen Test wurden noch keine einzelnen Werte als Provenance erzeugt.</p>}</div>
            </section>
          </>
        )}

        <section className="rounded-3xl bg-violet-50 p-5 text-sm ring-1 ring-violet-200">
          <p className="font-semibold text-violet-950">Schnelltests</p>
          <p className="mt-2 leading-6 text-violet-900">1. Normal + neutraler Export · 2. Dringend AN · 3. Sensibel AN · 4. DATEV wählen. Beim DATEV-Test muss Mila den nicht aktiven Connector erkennen und auf neutralen Export zurückfallen.</p>
        </section>
      </div>
    </main>
  )
}
