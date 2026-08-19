import { buildContextQuestions } from "./context-engine"
import { buildContextSuggestions } from "./context-memory"
import { proposeHandoffAction } from "./connectors"
import { interpretInput, type MilaInterpretInput } from "./interpreter"
import type { MilaMemoryContext, MilaProcessPlan, MilaTargetSystem } from "./types"

export interface MilaPlanInput extends MilaInterpretInput {
  target?: MilaTargetSystem
  memory?: MilaMemoryContext
}

export function buildProcessPlan(input: MilaPlanInput): MilaProcessPlan {
  const interpretation = interpretInput(input)

  // A pure document upload is an observation, not a conversation.
  // Mila keeps the original attached to the case first and only asks a human
  // when later processing finds a concrete missing fact. This prevents generic
  // questions such as "Was soll am Ende passieren?" from being created merely
  // because a file arrived.
  const isDocumentUpload = input.source === "upload"
  const questions = isDocumentUpload ? [] : buildContextQuestions(interpretation)
  const firstQuestion = questions[0]
  const suggestions = firstQuestion
    ? buildContextSuggestions({ text: input.text ?? input.subject ?? input.fileName, field: firstQuestion.field, memory: input.memory })
    : []

  // Upload alone never makes a case handoff-ready. The document must first be
  // visible in its case and its organisational context must be checked.
  const handoffReady = !isDocumentUpload && questions.length === 0 && interpretation.confidence !== "low"

  const actions = handoffReady && input.target
    ? [proposeHandoffAction(input.caseId, input.target, {
        processType: interpretation.processType,
        summary: interpretation.summary,
        facts: interpretation.knownFacts,
      })]
    : []

  return { interpretation, questions, suggestions, actions, handoffReady }
}
