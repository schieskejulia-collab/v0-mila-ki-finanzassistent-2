"use client"

import { useState } from "react"
import { buildProcessPlan } from "@/lib/mila-core/process-engine"

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
    handoffReady?: boolean
  }
}

type AnsweredQuestion = { question: string; answer: string }
type ContextSuggestion = { label: string; value: string; hint?: string }

function getContextSuggestions(text: string, field?: string): ContextSuggestion[] {
  const normalized = text.toLowerCase()

  if (field === "businessPurpose") {
    if (normalized.includes("tank") || normalized.includes("shell") || normalized.includes("beleg")) {
      return [
        { label: "Baustelle Müller", value: "Tankfüllung für Transporter 2 auf dem Weg zur Baustelle Müller", hint: "Transporter 2 · betriebliche Fahrt" },
        { label: "Fahrzeug / Betrieb", value: "Tankfüllung für ein betrieblich genutztes Fahrzeug", hint: "ohne Projektzuordnung" },
      ]
    }
    return [
      { label: "Betrieblicher Zweck", value: "Betriebliche Verwendung", hint: "allgemeine Zuordnung" },
      { label: "Projekt / Auftrag", value: "Verwendung für einen Kundenauftrag", hint: "Projektbezug" },
    ]
  }

  if (field === "processType") {
    if (normalized.includes("shell") || normalized.includes("beleg") || normalized.includes("rechnung")) {
      return [
        { label: "Zur Kanzlei", value: "Das ist ein Beleg und soll mit meinen Unterlagen an die Kanzlei.", hint: "Dokument vorbereiten" },
        { label: "Nur ablegen", value: "Das Dokument soll nur sauber abgelegt werden.", hint: "keine Übergabe" },
      ]
    }
    if (normalized.includes("angerufen") || normalized.includes("rückmeldung")) {
      return [
        { label: "Rückmeldung vorbereiten", value: "Die Person soll eine Rückmeldung bekommen.", hint: "Follow-up organisieren" },
        { label: "Als Aufgabe merken", value: "Daraus soll eine Aufgabe für die zuständige Person werden.", hint: "intern weitergeben" },
      ]
    }
    return [
      { label: "Als Aufgabe", value: "Daraus soll eine Aufgabe werden.", hint: "intern bearbeiten" },
      { label: "Weitergeben", value: "Der Vorgang soll an die zuständige Stelle weitergegeben werden.", hint: "kontrollierte Übergabe" },
    ]
  }

  if (field === "requestedTime") {
    return [
      { label: "Heute", value: "Heute" },
      { label: "Morgen", value: "Morgen" },
      { label: "Diese Woche", value: "Diese Woche" },
    ]
  }

  return []
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

  function makeDemoPlan(currentText: string, extraFacts: Record<string, unknown>, currentCaseId?: string): ProcessResponse {
    const demoCaseId = currentCaseId || `demo-${Date.now()}`
    const demoPlan = buildProcessPlan({ caseId: demoCaseId, source: "manual", text: currentText, fields: extraFacts, target: { connectorId: "neutral-export", systemName: "Neutraler Export", capability: "export-json" } })
    return { success: true, caseId: demoCaseId, next: demoPlan.questions[0]?.question ?? (demoPlan.handoffReady ? "human_review" : "needs_interpretation"), data: demoPlan }
  }

  async function runProcess(extraFacts: Record<string, unknown> = facts, textOverride?: string) {
    setLoading(true); setMessage(""); setApproved(false); setShowCustomAnswer(false)
    const currentText = textOverride ?? text
    try {
      if (demoMode) {
        const json = makeDemoPlan(currentText, extraFacts, caseId); setPlan(json); if (json.caseId) setCaseId(json.caseId); return
      }
      const res = await fetch("/api/mila/process", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ caseId, source: "manual", text: currentText, fields: extraFacts, target: { connectorId: "neutral-export", systemName: "Neutraler Export", capability: "export-json" } }) })
      if (res.status === 401) {
        setDemoMode(true); const json = makeDemoPlan(currentText, extraFacts); setPlan(json); setCaseId(json.caseId); setMessage("Preview-Demomodus aktiv: Es werden keine Daten in Supabase gespeichert."); return
      }
      const json = (await res.json()) as ProcessResponse; setPlan(json); if (json.caseId) setCaseId(json.caseId); if (!json.success) setMessage(json.error || "Verarbeitung fehlgeschlagen")
    } catch (error: any) { setMessage(error?.message || "Verarbeitung fehlgeschlagen") } finally { setLoading(false) }
  }

  async function submitAnswer(value?: string) {
    const question = plan?.data?.questions?.[0]
    const cleanedAnswer = (value ?? answer).trim()
    if (!question || !cleanedAnswer) return
    setAnswer(""); setShowCustomAnswer(false)
    setAnswered((current) => [...current, { question: question.question, answer: cleanedAnswer }])
    setMessage("Übernommen ✓ Mila prüft den Vorgang neu …")

    if (question.field === "processType") {
      const clarifiedText = `${text}. ${cleanedAnswer}`; setText(clarifiedText); await runProcess(facts, clarifiedText); return
    }
    const nextFacts = { ...facts, [question.field]: cleanedAnswer }; setFacts(nextFacts); await runProcess(nextFacts)
  }

  async function approveHandoff() {
    if (!caseId) return
    setLoading(true); setMessage("")
    try {
      if (demoMode) { setApproved(true); setMessage("Demo-Freigabe erteilt. Keine Daten wurden gespeichert oder an ein externes System gesendet."); return }
      const res = await fetch("/api/mila/process/approve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ caseId, approved: true, approvedBy: "Julia" }) })
      const json = await res.json(); if (!json.success) { setMessage(json.error || "Freigabe fehlgeschlagen"); return }
      setApproved(true); setMessage("Freigabe erteilt. Connector-Ausführung bleibt im MVP bewusst deaktiviert.")
    } catch (error: any) { setMessage(error?.message || "Freigabe fehlgeschlagen") } finally { setLoading(false) }
  }

  function clearCaseState() { setCaseId(undefined); setPlan(null); setFacts({}); setAnswered([]); setAnswer(""); setApproved(false); setMessage(""); setShowCustomAnswer(false) }
  function reset() { clearCaseState(); setText("Tankbeleg 83,42 €") }
  function handleTextChange(value: string) { if (caseId || plan || Object.keys(facts).length > 0) clearCaseState(); setText(value) }

  const question = plan?.data?.questions?.[0]
  const handoffReady = Boolean(plan?.data?.handoffReady)
  const suggestions = getContextSuggestions(text, question?.field)

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-900"><div className="mx-auto max-w-xl space-y-4">
      <header className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Mila Core</p><h1 className="mt-2 text-2xl font-semibold">Process Bridge Test</h1></div>{demoMode && <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">Preview-Demo</span>}</div><p className="mt-2 text-sm leading-6 text-zinc-600">Mila soll möglichst viel selbst einordnen. Du bestätigst Vorschläge – tippen musst du nur, wenn keiner passt.</p></header>

      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200"><label className="text-sm font-medium">Testvorgang</label><textarea value={text} onChange={(e) => handleTextChange(e.target.value)} className="mt-2 min-h-28 w-full rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-base outline-none focus:border-zinc-400" placeholder="z. B. Tankbeleg 83,42 €"/><div className="mt-3 flex gap-2"><button type="button" onClick={() => runProcess()} disabled={loading || !text.trim()} className="flex-1 rounded-2xl bg-zinc-900 px-4 py-3 font-medium text-white disabled:opacity-50">{loading ? "Mila arbeitet …" : caseId ? "Neu auswerten" : "Vorgang starten"}</button><button type="button" onClick={reset} className="rounded-2xl border border-zinc-200 px-4 py-3 font-medium">Reset</button></div></section>

      {plan?.success && <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold">Mila hat erkannt</h2><span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium">{plan.data?.interpretation?.confidence || "–"}</span></div><dl className="mt-4 space-y-2 text-sm"><div className="flex justify-between gap-4"><dt className="text-zinc-500">Typ</dt><dd className="text-right font-medium">{plan.data?.interpretation?.detectedType || "–"}</dd></div><div className="flex justify-between gap-4"><dt className="text-zinc-500">Prozess</dt><dd className="text-right font-medium">{plan.data?.interpretation?.processType || "noch offen"}</dd></div><div className="flex justify-between gap-4"><dt className="text-zinc-500">Case</dt><dd className="max-w-[65%] truncate text-right font-mono text-xs">{caseId || "–"}</dd></div></dl></section>}

      {answered.length > 0 && <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">Bereits bestätigt</p><div className="mt-3 space-y-3">{answered.map((item, i) => <div key={`${item.question}-${i}`} className="rounded-2xl bg-violet-50 p-3"><p className="text-xs text-zinc-500">{item.question}</p><p className="mt-1 font-medium">✓ {item.answer}</p></div>)}</div></section>}

      {question && <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Mila braucht Bestätigung</p><h2 className="mt-2 text-lg font-semibold">{question.question}</h2><p className="mt-2 text-sm text-zinc-600">{question.reason}</p>
        {suggestions.length > 0 && <div className="mt-4 space-y-2"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">Mila schlägt vor</p>{suggestions.map((suggestion, index) => <button key={`${suggestion.value}-${index}`} type="button" onClick={() => submitAnswer(suggestion.value)} disabled={loading} className="w-full rounded-2xl border border-violet-200 bg-violet-50 p-4 text-left disabled:opacity-50"><div className="flex items-center justify-between gap-3"><span className="font-semibold text-violet-900">{suggestion.label}</span><span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-violet-700">Passt ✓</span></div>{suggestion.hint && <p className="mt-1 text-xs text-zinc-600">{suggestion.hint}</p>}</button>)}</div>}
        {!showCustomAnswer ? <button type="button" onClick={() => setShowCustomAnswer(true)} className="mt-3 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-medium">Andere Zuordnung</button> : <div className="mt-3 flex gap-2"><input autoFocus value={answer} onChange={(e) => setAnswer(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submitAnswer() }} className="min-w-0 flex-1 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-base outline-none focus:border-zinc-400" placeholder="Kurz korrigieren …"/><button type="button" onClick={() => submitAnswer()} disabled={loading || !answer.trim()} className="rounded-2xl bg-zinc-900 px-4 py-3 font-medium text-white disabled:opacity-50">Senden</button></div>}
      </section>}

      {handoffReady && <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Übergabebereit</p><h2 className="mt-2 text-lg font-semibold">Der Vorgang ist vollständig genug.</h2><p className="mt-2 text-sm leading-6 text-zinc-600">Mila hat das Übergabepaket vorbereitet. Es wird noch nichts an ein externes System gesendet.</p><div className="mt-4 rounded-2xl bg-zinc-50 p-3 text-sm"><p className="font-medium">Gesammelter Kontext</p><pre className="mt-2 whitespace-pre-wrap break-words text-xs text-zinc-600">{JSON.stringify(facts, null, 2)}</pre></div><button type="button" onClick={approveHandoff} disabled={loading || approved} className="mt-4 w-full rounded-2xl bg-emerald-700 px-4 py-3 font-medium text-white disabled:opacity-50">{approved ? "Freigegeben ✓" : "Übergabe menschlich freigeben"}</button></section>}
      {message && <section className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">{message}</section>}
    </div></main>
  )
}
