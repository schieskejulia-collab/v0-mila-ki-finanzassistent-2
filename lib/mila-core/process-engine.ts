import { buildContextQuestions } from "./context-engine"
import { buildContextSuggestions } from "./context-memory"
import { getConnector, proposeHandoffAction } from "./connectors"
import { interpretInput, type MilaInterpretInput } from "./interpreter"
import type { MilaDecision, MilaMemoryContext, MilaProcessPlan, MilaTargetSystem } from "./types"

export interface MilaPlanInput extends MilaInterpretInput {
  target?: MilaTargetSystem
  memory?: MilaMemoryContext
}

function decideNextStep(
  interpretation: ReturnType<typeof interpretInput>,
  questionCount: number,
  target?: MilaTargetSystem,
): MilaDecision {
  if (interpretation.confidence === "low" || interpretation.ambiguities.length > 0) {
    return {
      state: "needs_human_review",
      nextStep: "human_review",
      reason: "Der Zielprozess oder Kontext ist nicht eindeutig. Mila stoppt vor einer automatischen Aktion.",
      priority: "high",
    }
  }

  if (questionCount > 0) {
    return {
      state: "needs_context",
      nextStep: "ask_context",
      reason: "Für den nächsten sicheren Prozessschritt fehlen noch erforderliche Angaben.",
      priority: "normal",
    }
  }

  if (!target) {
    return {
      state: "ready",
      nextStep: "prepare_handoff",
      reason: "Der Vorgang ist ausreichend geklärt. Ein Zielsystem kann ausgewählt werden.",
      priority: "normal",
    }
  }

  const connector = getConnector(target.connectorId)
  const capability = connector?.capabilities.find((item) => item.id === target.capability)

  if (!connector?.enabled || !capability) {
    return {
      state: "needs_human_review",
      nextStep: "human_review",
      reason: "Das gewünschte Ziel oder die benötigte Connector-Fähigkeit ist nicht aktiv verfügbar.",
      priority: "high",
    }
  }

  if (capability.requiresApproval) {
    return {
      state: "awaiting_approval",
      nextStep: "request_approval",
      reason: "Der Vorgang ist bereit, aber die externe oder schreibende Aktion benötigt menschliche Freigabe.",
      priority: "normal",
    }
  }

  return {
    state: "ready",
    nextStep: "prepare_handoff",
    reason: "Der Vorgang ist vollständig und kann für den nächsten Prozessschritt vorbereitet werden.",
    priority: "normal",
  }
}

export function buildProcessPlan(input: MilaPlanInput): MilaProcessPlan {
  const interpretation = interpretInput(input)
  const questions = buildContextQuestions(interpretation)
  const firstQuestion = questions[0]
  const suggestions = firstQuestion
    ? buildContextSuggestions({ text: input.text ?? input.subject ?? input.fileName, field: firstQuestion.field, memory: input.memory })
    : []

  const decision = decideNextStep(interpretation, questions.length, input.target)
  const handoffReady = decision.state === "ready" || decision.state === "awaiting_approval"

  const actions = handoffReady && input.target
    ? [proposeHandoffAction(input.caseId, input.target, {
        processType: interpretation.processType,
        summary: interpretation.summary,
        facts: interpretation.knownFacts,
      })]
    : []

  return { interpretation, questions, suggestions, actions, handoffReady, decision }
}
