"use client"

import { useState } from "react"
import { buildProcessPlan } from "@/lib/mila-core/process-engine"

type ProcessResponse = {
  success: boolean
  caseId?: string
  next?: string
  error?: string
  demoMode?: boolean
  data?: {
    interpretation?: {
      detectedType?: string
      processType?: string
      confidence?: string
      summary?: string
      knownFacts?: Record<string, unknown>
    }
    questions?: Array<{ field: string; question: string; reason: string }>
    handoffReady?: boolean
  }
}

export default function MilaCorePage() {
  const [text, setText] = useState("Tankbeleg 83,42 €")
  const [caseId, setCaseId] = useState<string | undefined>()
  const [plan, setPlan] = useState<ProcessResponse | null>(null)
  const [answer, setAnswer] = useState("")
  const [facts, setFacts] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(false)
  const [approved, setApproved] = useState(false)
  const [message, setMessage] = useState("")
  const [demoMode, setDemoMode] = useState(false)

  function runLocalDemo(extraFacts: Record<string, unknown>) {
    const localCaseId = caseId || `demo-${Date.now()}`
    const localPlan = buildProcessPlan({
      caseId: localCaseId,
      source: "manual",
      text,
      fields: extraFacts,
      target: {
        connectorId: "neutral-export",
        systemName: "Neutraler Export",
        capability: "export-json",
      },
    })

    setCaseId(localCaseId)
    setDemoMode(true)
    setPlan({
      success: true,
      caseId: localCaseId,
      demoMode: true,
      data: localPlan,
      next: localPlan.questions[0]?.question ?? (localPlan.handoffReady ? "human_review" : "needs_interpretation"),
    })
    setMessage("Preview-Demomodus aktiv: Es werden keine Daten in Supabase gespeichert.")
  }

  async function runProcess(extraFacts: Record<string, unknown> = facts) {
    setLoading(true)
    setMessage("")
    setApproved(false)
    try {
      if (demoMode) {
        runLocalDemo(extraFacts)
        return
      }

      const res = await fetch("/api/mila/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId,
          source: "manual",
          text,
          fields: extraFacts,
          target: {
            connectorId: "neutral-export",
            systemName: "Neutraler Export",
            capability: "export-json",
          },
        }),
      })
      const json = (await res.json()) as ProcessResponse

      if (res.status === 401) {
        runLocalDemo(extraFacts)
        return
      }

      setPlan(json)
      if (json.caseId) setCaseId(json.caseId)
      if (!json.success) setMessage(json.error || "Verarbeitung fehlgeschlagen")
    } catch {
      runLocalDemo(extraFacts)
    } finally {
      setLoading(false)
    }
  }

  async function submitAnswer() {
    const question = plan?.data?.questions?.[0]
    if (!question || !answer.trim()) return
    const nextFacts = { ...facts, [question.field]: answer.trim() }
    setFacts(nextFacts)
    setAnswer("")
    await runProcess(nextFacts)
  }

  async function approveHandoff() {
    if (!caseId) return
    setLoading(true)
    setMessage("")
    try {
      if (demoMode) {
        setApproved(true)
        setMessage("Demo-Freigabe erteilt. Keine Daten wurden gespeichert oder an ein externes System gesendet.")
        return
      }

      const res = await fetch("/api/mila/process/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, approved: true, approvedBy: "Julia" }),
      })
      const json = await res.json()
      if (!json.success) {
        setMessage(json.error || "Freigabe fehlgeschlagen")
        return
      }
      setApproved(true)
      setMessage("Freigabe erteilt. Connector-Ausführung bleibt im MVP bewusst deaktiviert.")
    } catch (error: any) {
      setMessage(error?.message || "Freigabe fehlgeschlagen")
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setCaseId(undefined)
    setPlan(null)
    setFacts({})
    setAnswer("")
    setApproved(false)
    setMessage("")
    setDemoMode(false)
    setText("Tankbeleg 83,42 €")
  }

  const question = plan?.data?.questions?.[0]
  const handoffReady = Boolean(plan?.data?.handoffReady)

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-900">
      <div className="mx-auto max-w-xl space-y-4">
        <header className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Mila Core</p>
            {demoMode && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">Preview-Demo</span>
            )}
          </div>
          <h1 className="mt-2 text-2xl font-semibold">Process Bridge Test</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Ein Vorgang kommt rein, Mila erkennt den Kontext, fragt fehlende Informationen ab und bereitet eine kontrollierte Übergabe vor.
          </p>
        </header>

        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          <label className="text-sm font-medium">Testvorgang</label>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            className="mt-2 min-h-28 w-full rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-base outline-none focus:border-zinc-400"
            placeholder="z. B. Tankbeleg 83,42 €"
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => runProcess()}
              disabled={loading || !text.trim()}
              className="flex-1 rounded-2xl bg-zinc-900 px-4 py-3 font-medium text-white disabled:opacity-50"
            >
              {loading ? "Mila arbeitet …" : caseId ? "Neu auswerten" : "Vorgang starten"}
            </button>
            <button type="button" onClick={reset} className="rounded-2xl border border-zinc-200 px-4 py-3 font-medium">
              Reset
            </button>
          </div>
        </section>

        {plan?.success && (
          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">Mila hat erkannt</h2>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium">
                {plan.data?.interpretation?.confidence || "–"}
              </span>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-zinc-500">Typ</dt><dd className="text-right font-medium">{plan.data?.interpretation?.detectedType || "–"}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-zinc-500">Prozess</dt><dd className="text-right font-medium">{plan.data?.interpretation?.processType || "noch offen"}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-zinc-500">Case</dt><dd className="max-w-[65%] truncate text-right font-mono text-xs">{caseId || "–"}</dd></div>
            </dl>
          </section>
        )}

        {question && (
          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Kontext fehlt</p>
            <h2 className="mt-2 text-lg font-semibold">{question.question}</h2>
            <p className="mt-2 text-sm text-zinc-600">{question.reason}</p>
            <input
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") submitAnswer() }}
              className="mt-4 w-full rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-base outline-none focus:border-zinc-400"
              placeholder="Antwort eingeben"
            />
            <button
              type="button"
              onClick={submitAnswer}
              disabled={loading || !answer.trim()}
              className="mt-3 w-full rounded-2xl bg-zinc-900 px-4 py-3 font-medium text-white disabled:opacity-50"
            >
              Antwort an Mila geben
            </button>
          </section>
        )}

        {handoffReady && (
          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Übergabebereit</p>
            <h2 className="mt-2 text-lg font-semibold">Der Vorgang ist vollständig genug.</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Mila hat das Übergabepaket vorbereitet. Es wird noch nichts an ein externes System gesendet.
            </p>
            <div className="mt-4 rounded-2xl bg-zinc-50 p-3 text-sm">
              <p className="font-medium">Gesammelter Kontext</p>
              <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-zinc-600">{JSON.stringify(facts, null, 2)}</pre>
            </div>
            <button
              type="button"
              onClick={approveHandoff}
              disabled={loading || approved}
              className="mt-4 w-full rounded-2xl bg-emerald-700 px-4 py-3 font-medium text-white disabled:opacity-50"
            >
              {approved ? "Freigegeben ✓" : "Übergabe menschlich freigeben"}
            </button>
          </section>
        )}

        {message && (
          <section className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
            {message}
          </section>
        )}
      </div>
    </main>
  )
}
