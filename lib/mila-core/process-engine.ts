import { buildContextQuestions } from "./context-engine"
import { buildContextSuggestions } from "./context-memory"
import { getConnector, proposeHandoffAction } from "./connectors"
import { interpretInput, type MilaInterpretInput } from "./interpreter"
import { buildInputProvenance } from "./provenance"
import type { MilaDecision, MilaMemoryContext, MilaProcessPlan, MilaTargetSystem } from "./types"

export interface MilaPlanInput extends MilaInterpretInput {
  target?: MilaTargetSystem
  memory?: MilaMemoryContext
  urgent?: boolean
  sensitive?: boolean
}

function decideNextStep(
  interpretation: ReturnType<typeof interpretInput>,
  questionCount: number,
  target?: MilaTargetSystem,
  urgent = false,
  sensitive = false,
): MilaDecision {
  if (sensitive) {
    return {
      state: "needs_human_review",
      nextStep: "human_review",
      reason: "Der Vorgang enthält sensible Inhalte und wird vor einer weiteren Aktion menschlich geprüft.",
      priority: "high",
      escalation: {
        required: true,
        reason: "sensitive_case",
        message: "Sensibler Vorgang: keine automatische externe Aktion.",
        fallback: "hold_safely",
      },
    }
  }

  if (interpretation.ambiguities.length > 0) {
    return {
      state: "needs_human_review",
      nextStep: "human_review",
      reason: "Der aktuelle Kontext ist widersprüchlich oder mehrdeutig. Mila stoppt vor einer automatischen Aktion.",
      priority: "high",
      escalation: {
        required: true,
        reason: "ambiguous_context",
        message: "Widersprüchlicher Kontext muss durch einen Menschen aufgelöst werden.",
        fallback: "ask_human",
      },
    }
  }

  if (interpretation.confidence === "low") {
    return {
      state: "needs_human_review",
      nextStep: "human_review",
      reason: "Mila ist sich bei der Interpretation nicht sicher genug für einen automatischen nächsten Schritt.",
      priority: "high",
      escalation: {
        required: true,
        reason: "low_confidence",
        message: "Niedrige Confidence: menschliche Prüfung erforderlich.",
        fallback: "ask_human",
      },
    }
  }

  if (questionCount > 0) {
    return {
      state: "needs_context",
      nextStep: "ask_context",
      reason: "Für den nächsten sicheren Prozessschritt fehlen noch erforderliche Angaben.",
      priority: urgent ? "high" : "normal",
      escalation: urgent
        ? {
            required: true,
            reason: "urgent_case",
            message: "Dringender Vorgang mit fehlendem Kontext: Rückfrage priorisieren.",
            fallback: "ask_context",
          }
        : { required: false },
    }
  }

  if (!target) {
    return {
      state: "ready",
      nextStep: "prepare_handoff",
      reason: "Der Vorgang ist ausreichend geklärt. Ein Zielsystem kann ausgewählt werden.",
      priority: urgent ? "high" : "normal",
      escalation: urgent
        ? {
            required: true,
            reason: "urgent_case",
            message: "Dringender Vorgang ist fachlich bereit und sollte bevorzugt weitergegeben werden.",
            fallback: "hold_safely",
          }
        : { required: false },
    }
  }

  const connector = getConnector(target.connectorId)
  const capability = connector?.capabilities.find((item) => item.id === target.capability)

  if (!connector?.enabled || !capability) {
    const neutralExport = getConnector("neutral-export")
    const neutralExportAvailable = Boolean(neutralExport?.enabled)

    return {
      state: neutralExportAvailable ? "ready" : "needs_human_review",
      nextStep: neutralExportAvailable ? "prepare_handoff" : "human_review",
      reason: neutralExportAvailable
        ? "Das gewünschte Ziel ist nicht verfügbar. Mila fällt sicher auf den neutralen Export zurück."
        : "Das gewünschte Ziel ist nicht verfügbar und es steht kein sicherer automatischer Fallback bereit.",
      priority: "high",
      escalation: {
        required: true,
        reason: "connector_unavailable",
        message: `Connector ${target.connectorId} oder Fähigkeit ${target.capability} ist nicht aktiv verfügbar.`,
        fallback: neutralExportAvailable ? "neutral_export" : "hold_safely",
      },
    }
  }

  if (capability.requiresApproval) {
    return {
      state: "awaiting_approval",
      nextStep: "request_approval",
      reason: "Der Vorgang ist bereit, aber die externe oder schreibende Aktion benötigt menschliche Freigabe.",
      priority: urgent ? "high" : "normal",
      escalation: urgent
        ? {
            required: true,
            reason: "urgent_case",
            message: "Dringender Vorgang wartet auf menschliche Freigabe.",
            fallback: "hold_safely",
          }
        : { required: false },
    }
  }

  return {
    state: "ready",
    nextStep: "prepare_handoff",
    reason: "Der Vorgang ist vollständig und kann für den nächsten Prozessschritt vorbereitet werden.",
    priority: urgent ? "high" : "normal",
    escalation: urgent
      ? {
          required: true,
          reason: "urgent_case",
          message: "Dringender Vorgang ist bereit und sollte bevorzugt verarbeitet werden.",
          fallback: "hold_safely",
        }
      : { required: false },
  }
}

export function buildProcessPlan(input: MilaPlanInput): MilaProcessPlan {
  const interpretation = interpretInput(input)
  const questions = buildContextQuestions(interpretation)
  const firstQuestion = questions[0]
  const suggestions = firstQuestion
    ? buildContextSuggestions({ text: input.text ?? input.subject ?? input.fileName, field: firstQuestion.field, memory: input.memory })
    : []

  const decision = decideNextStep(interpretation, questions.length, input.target, input.urgent, input.sensitive)
  const handoffReady = decision.state === "ready" || decision.state === "awaiting_approval"
  const provenance = buildInputProvenance(interpretation)

  const fallbackTarget = decision.escalation.fallback === "neutral_export"
    ? { connectorId: "neutral-export", systemName: "Neutraler Export", capability: "export-json" }
    : undefined
  const effectiveTarget = fallbackTarget ?? input.target

  const actions = handoffReady && effectiveTarget
    ? [proposeHandoffAction(input.caseId, effectiveTarget, {
        processType: interpretation.processType,
        summary: interpretation.summary,
        facts: interpretation.knownFacts,
        provenance,
        escalation: decision.escalation,
      })]
    : []

  return { interpretation, questions, suggestions, actions, handoffReady, decision, provenance }
}
