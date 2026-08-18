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
  const questions = buildContextQuestions(interpretation)
  const firstQuestion = questions[0]
  const suggestions = firstQuestion
    ? buildContextSuggestions({ text: input.text ?? input.subject ?? input.fileName, field: firstQuestion.field, memory: input.memory })
    : []
  const handoffReady = questions.length === 0 && interpretation.confidence !== "low"

  const actions = handoffReady && input.target
    ? [proposeHandoffAction(input.caseId, input.target, {
        processType: interpretation.processType,
        summary: interpretation.summary,
        facts: interpretation.knownFacts,
      })]
    : []

  return { interpretation, questions, suggestions, actions, handoffReady }
}
