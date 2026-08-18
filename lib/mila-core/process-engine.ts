import { buildContextQuestions } from "./context-engine"
import { proposeHandoffAction } from "./connectors"
import { interpretInput, type MilaInterpretInput } from "./interpreter"
import { validateDocumentInterpretation } from "./document-validator"
import type { MilaProcessPlan, MilaTargetSystem } from "./types"

export interface MilaPlanInput extends MilaInterpretInput {
  target?: MilaTargetSystem
}

export function buildProcessPlan(input: MilaPlanInput): MilaProcessPlan {
  const interpretation = interpretInput(input)
  const validation = validateDocumentInterpretation(interpretation)

  for (const issue of validation.issues) {
    if (issue.type === "missing") {
      if (!interpretation.missingContext.includes(issue.field)) {
        interpretation.missingContext.push(issue.field)
      }
    } else if (!interpretation.ambiguities.includes(issue.field)) {
      interpretation.ambiguities.push(issue.field)
    }
  }

  if (validation.conflicts) {
    interpretation.confidence = "low"
  } else if (!validation.complete && interpretation.confidence === "high") {
    interpretation.confidence = "medium"
  }

  const questions = buildContextQuestions(interpretation)
  const handoffReady =
    validation.complete &&
    !validation.conflicts &&
    questions.length === 0 &&
    interpretation.confidence !== "low"

  const actions = handoffReady && input.target
    ? [
        proposeHandoffAction(input.caseId, input.target, {
          processType: interpretation.processType,
          summary: interpretation.summary,
          facts: interpretation.knownFacts,
        }),
      ]
    : []

  return { interpretation, questions, actions, handoffReady }
}
