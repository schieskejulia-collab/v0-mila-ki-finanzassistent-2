"use client"

import { useState } from "react"
import { buildProcessPlan } from "@/lib/mila-core/process-engine"
import type { MilaContextSuggestion, MilaMemoryContext } from "@/lib/mila-core/types"

type ProcessResponse = {
  success: boolean
  caseId?: string
  next?: string
  error?: string
  data?: {
    interpretation?: {
      detectedType?: string
      processType?: string
      confidence?: string
      summary?: string
      knownFacts?: Record<string, unknown>
    }
    questions?: Array<{ field: string; question: string; reason: string }>
    suggestions?: MilaContextSuggestion[]
    handoffReady?: boolean
  }
}

type AnsweredQuestion = {
  question: string
  answer: string
  automatic?: boolean
  automaticLabel?: string
}

const INITIAL_DEMO_MEMORY: MilaMemoryContext = {
  client: { id: "demo-client", name: "Musterbetrieb" },
  projects: [
    { id: "project-mueller", name: "Baustelle Müller", active: true },
    { id: "project-schmidt", name: "Auftrag Schmidt", active: true },
  ],
  vehicles: [
    { id: "vehicle-2", name: "Transporter 2", active: true },
    { id: "vehicle-1", name: "Transporter 1", active: false },
  ],
  contacts: [{ id: "contact-mueller", name: "Herr Müller", active: true }],
  confirmedPatterns: [],
}

export default function MilaCorePage() {
  const [text, setText] = useState("Tankbeleg 83,42 €")
  const [caseId, setCaseId] = useState<string | undefined>()
  const [plan, setPlan] = useState<ProcessResponse | null>(null)
  const [answer, setAnswer] = useState("")
  const [facts, setFacts] = useState<Record<string, unknown>>({})
  const [answered, setAnswered] = useState<AnsweredQuestion[]>([])
  const [loading, setLoading] = useState(false)
  const [approved, setApproved] = useState(false)
  const [message, setMessage] = useState("")
  const [demoMode, setDemoMode] = useState(false)
  const [showCustomAnswer, setShowCustomAnswer] = useState(false)
  const [memory, setMemory] = useState<MilaMemoryContext>(INITIAL_DEMO_MEMORY)

  function makeDemoPlan(
    currentText: string,
    extraFacts: Record<string, unknown>,
    currentCaseId?: string,
    memoryOverride?: MilaMemoryContext,
  ): ProcessResponse {
    const demoCaseId = currentCaseId || `demo-${Date.now()}`
    const demoPlan = buildProcessPlan({
      caseId: demoCaseId,
      source: "manual",
      text: currentText,
      fields: extraFacts,
      memory: memoryOverride ?? memory,
      target: {
        connectorId: "neutral-export",
        systemName: "Neutraler Export",
        capability: "export-json",
      },
    })
    return {
      success: true,
      caseId: demoCaseId,
      next:
        demoPlan.questions[0]?.question ??
        (demoPlan.handoffReady ? "human_review" : "needs_interpretation"),
      data: demoPlan,
    }
  }

  function learnSuggestion(
    question: { field: string; question: string },
    suggestion?: MilaContextSuggestion,
  ) {
    if (!suggestion || suggestion.source.includes("default_option")) return

    setMemory((current) => {
      const existing = current.confirmedPatterns.find(
        (item) => item.field === question.field && item.value === suggestion.value,
      )

      if (existing) {
        return {
          ...current,
          confirmedPatterns: current.confirmedPatterns.map((item) =>
            item.id === existing.id
              ? {
                  ...item,
                  confirmations: (item.confirmations ?? 1) + 1,
                  confidence: "high",
                  lastConfirmedAt: new Date().toISOString(),
                  evidenceLabels: suggestion.evidenceLabels,
                }
              : item,
          ),
        }
      }

      return {
        ...current,
        confirmedPatterns: [
          {
            id: `learned-${Date.now()}`,
            field: question.field,
            label: suggestion.label,
            value: suggestion.value,
            confidence: "high",
            confirmations: 1,
            evidenceLabels: suggestion.evidenceLabels,
            lastConfirmedAt: new Date().toISOString(),
          },
          ...current.confirmedPatterns,
        ],
      }
    })
  }

  async function runProcess(
    extraFacts: Record<string, unknown> = facts,
    textOverride?: string,
  ) {
    setLoading(true)
    setMessage("")
    setApproved(false)
    setShowCustomAnswer(false)
    const currentText = textOverride ?? text

    try {
      if (demoMode) {
        let json = makeDemoPlan(currentText, extraFacts, caseId)
        const question = json.data?.questions?.[0]
        const trusted = json.data?.suggestions?.find((item) => item.autoApply)

        if (question && trusted && question.field !== "processType") {
          const nextFacts = { ...extraFacts, [question.field]: trusted.value }
          const fromCurrentInput = trusted.source.includes("input")
          const automaticLabel = fromCurrentInput
            ? "Aus aktuellem Kontext erkannt"
            : "Automatisch aus gelerntem Muster"
          setFacts(nextFacts)
          setAnswered((current) => [
            ...current,
            {
              question: question.question,
              answer: trusted.value,
              automatic: true,
              automaticLabel,
            },
          ])
          setMessage(
            fromCurrentInput
              ? "Automatisch übernommen ✓ Mila hat die Zuordnung eindeutig im aktuellen Vorgang erkannt."
              : "Automatisch übernommen ✓ Mila kennt diese Zuordnung aus deiner bisherigen Bestätigung.",
          )
          json = makeDemoPlan(currentText, nextFacts, caseId)
        }

        setPlan(json)
        if (json.caseId) setCaseId(json.caseId)
        return
      }

      const res = await fetch("/api/mila/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId,
          source: "manual",
          text: currentText,
          fields: extraFacts,
          target: {
            connectorId: "neutral-export",
            systemName: "Neutraler Export",
            capability: "export-json",
          },
        }),
      })

      if (res.status === 401) {
        setDemoMode(true)
        const json = makeDemoPlan(currentText, extraFacts)
        setPlan(json)
        setCaseId(json.caseId)
        setMessage(
          "Preview-Demomodus aktiv: Vorschläge stammen aus einem sichtbaren Demo-Kontext. Es werden keine Daten in Supabase gespeichert.",
        )
        return
      }

      const json = (await res.json()) as ProcessResponse
      setPlan(json)
      if (json.caseId) setCaseId(json.caseId)
      if (!json.success) setMessage(json.error || "Verarbeitung fehlgeschlagen")
    } catch (error: any) {
      setMessage(error?.message || "Verarbeitung fehlgeschlagen")
    } finally {
      setLoading(false)
    }
  }

  async function submitAnswer(value?: string, suggestion?: MilaContextSuggestion) {
    const question = plan?.data?.questions?.[0]
    const cleanedAnswer = (value ?? answer).trim()
    if (!question || !cleanedAnswer) return

    setAnswer("")
    setShowCustomAnswer(false)
    setAnswered((current) => [
      ...current,
      { question: question.question, answer: cleanedAnswer },
    ])
    setMessage("Übernommen ✓ Mila merkt sich die bestätigte Zuordnung und prüft neu …")
    learnSuggestion(question, suggestion)

    if (question.field === "processType") {
      const clarifiedText = `${text}. ${cleanedAnswer}`
      setText(clarifiedText)
      await runProcess(facts, clarifiedText)
      return
    }

    const nextFacts = { ...facts, [question.field]: cleanedAnswer }
    setFacts(nextFacts)
    await runProcess(nextFacts)
  }

  async function approveHandoff() {
    if (!caseId) return
    setLoading(true)
    setMessage("")
    try {
      if (demoMode) {
        setApproved(true)
        setMessage(
          "Demo-Freigabe erteilt. Keine Daten wurden gespeichert oder an ein externes System gesendet.",
        )
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

  function clearCaseState() {
    setCaseId(undefined)
    setPlan(null)
    setFacts({})
    setAnswered([])
    setAnswer("")
    setApproved(false)
    setMessage("")
    setShowCustomAnswer(false)
  }

  function reset() {
    clearCaseState()
    setText("Tankbeleg 83,42 €")
  }

  function resetLearning() {
    clearCaseState()
    setMemory(INITIAL_DEMO_MEMORY)
    setText("Tankbeleg 83,42 €")
    setMessage("Gelerntes Demo-Muster wurde zurückgesetzt.")
  }

  function handleTextChange(value: string) {
    if (caseId || plan || Object.keys(facts).length > 0) clearCaseState()
    setText(value)
  }

  const question = plan?.data?.questions?.[0]
  const handoffReady = Boolean(plan?.data?.handoffReady)
  const suggestions = plan?.data?.suggestions ?? []
  const learnedCount = memory.confirmedPatterns.length

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-900">
      <div className="mx-auto max-w-xl space-y-4">
        <header className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Mila Core
              </p>
              <h1 className="mt-2 text-2xl font-semibold">Context Memory Test</h1>
            </div>
            {demoMode && (
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
                Preview-Demo
              </span>
            )}
          </div>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Mila rankt vorhandenen Kontext, merkt sich bestätigte Zuordnungen und darf ein stark
            gelerntes Muster beim nächsten ähnlichen Vorgang selbst übernehmen.
          </p>
        </header>

        {demoMode && (
          <section className="rounded-3xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-950">
            <p className="font-semibold">Demo-Kontext, den Mila wirklich kennt</p>
            <p className="mt-2">
              Aktive Projekte: Baustelle Müller, Auftrag Schmidt · Fahrzeug: Transporter 2 ·
              Kontakt: Herr Müller
            </p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-xs font-semibold">Gelernte Zuordnungen: {learnedCount}</span>
              {learnedCount > 0 && (
                <button
                  type="button"
                  onClick={resetLearning}
                  className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-violet-700"
                >
                  Lernen zurücksetzen
                </button>
              )}
            </div>
          </section>
        )}

        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          <label className="text-sm font-medium">Testvorgang</label>
          <textarea
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
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
            <button
              type="button"
              onClick={reset}
              className="rounded-2xl border border-zinc-200 px-4 py-3 font-medium"
            >
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
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Typ</dt>
                <dd className="text-right font-medium">
                  {plan.data?.interpretation?.detectedType || "–"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Prozess</dt>
                <dd className="text-right font-medium">
                  {plan.data?.interpretation?.processType || "noch offen"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Case</dt>
                <dd className="max-w-[65%] truncate text-right font-mono text-xs">
                  {caseId || "–"}
                </dd>
              </div>
            </dl>
          </section>
        )}

        {answered.length > 0 && (
          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">
              Bereits bestätigt
            </p>
            <div className="mt-3 space-y-3">
              {answered.map((item, i) => (
                <div
                  key={`${item.question}-${i}`}
                  className="rounded-2xl bg-violet-50 p-3"
                >
                  <p className="text-xs text-zinc-500">
                    {item.automatic
                      ? item.automaticLabel ?? "Automatisch aus gelerntem Muster"
                      : item.question}
                  </p>
                  <p className="mt-1 font-medium">✓ {item.answer}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {question && (
          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
              Mila braucht Bestätigung
            </p>
            <h2 className="mt-2 text-lg font-semibold">{question.question}</h2>
            <p className="mt-2 text-sm text-zinc-600">{question.reason}</p>

            {suggestions.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">
                  Mila schlägt vor
                </p>
                {suggestions.map((suggestion, index) => (
                  <button
                    key={`${suggestion.value}-${index}`}
                    type="button"
                    onClick={() => submitAnswer(suggestion.value, suggestion)}
                    disabled={loading}
                    className={`w-full rounded-2xl border p-4 text-left disabled:opacity-50 ${
                      suggestion.recommended
                        ? "border-violet-400 bg-violet-100"
                        : "border-violet-200 bg-violet-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        {suggestion.recommended && (
                          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-violet-700">
                            Empfohlen
                          </p>
                        )}
                        <span className="font-semibold text-violet-900">{suggestion.label}</span>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-violet-700">
                        {suggestion.score} · Passt ✓
                      </span>
                    </div>
                    {suggestion.hint && (
                      <p className="mt-1 text-xs text-zinc-600">{suggestion.hint}</p>
                    )}
                    {suggestion.evidenceLabels.length > 0 && (
                      <p className="mt-2 text-xs text-zinc-500">
                        Quelle: {suggestion.evidenceLabels.join(" + ")}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}

            {!showCustomAnswer ? (
              <button
                type="button"
                onClick={() => setShowCustomAnswer(true)}
                className="mt-3 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-medium"
              >
                Andere Zuordnung
              </button>
            ) : (
              <div className="mt-3 flex gap-2">
                <input
                  autoFocus
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitAnswer()
                  }}
                  className="min-w-0 flex-1 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-base outline-none focus:border-zinc-400"
                  placeholder="Kurz korrigieren …"
                />
                <button
                  type="button"
                  onClick={() => submitAnswer()}
                  disabled={loading || !answer.trim()}
                  className="rounded-2xl bg-zinc-900 px-4 py-3 font-medium text-white disabled:opacity-50"
                >
                  Senden
                </button>
              </div>
            )}
          </section>
        )}

        {handoffReady && (
          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Übergabebereit
            </p>
            <h2 className="mt-2 text-lg font-semibold">Der Vorgang ist vollständig genug.</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Mila hat das Übergabepaket vorbereitet. Es wird noch nichts an ein externes System
              gesendet.
            </p>
            <div className="mt-4 rounded-2xl bg-zinc-50 p-3 text-sm">
              <p className="font-medium">Gesammelter Kontext</p>
              <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-zinc-600">
                {JSON.stringify(facts, null, 2)}
              </pre>
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
