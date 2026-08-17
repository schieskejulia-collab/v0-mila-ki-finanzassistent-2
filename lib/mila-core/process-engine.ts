import { buildContextQuestions } from "./context-engine"
import { proposeHandoffAction } from "./connectors"
import { interpretInput, type MilaInterpretInput } from "./interpreter"
import type { MilaProcessPlan, MilaTargetSystem } from "./types"

export interface MilaPlanInput extends MilaInterpretInput {
  target?: MilaTargetSystem
}

export function buildProcessPlan(input: MilaPlanInput): MilaProcessPlan {
  const interpretation = interpretInput(input)
  const questions = buildContextQuestions(interpretation)
  const handoffReady = questions.length === 0 && interpretation.confidence !== "low"

  const actions = handoffReady && input.target
    ? [proposeHandoffAction(input.caseId, input.target, {
        processType: interpretation.processType,
        summary: interpretation.summary,
        facts: interpretation.knownFacts,
      })]
    : []

  return { interpretation, questions, actions, handoffReady }
}
