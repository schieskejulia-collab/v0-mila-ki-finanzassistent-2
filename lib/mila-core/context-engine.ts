import type { MilaContextQuestion, MilaInterpretation } from "./types"

const QUESTIONS: Record<string, { question: string; reason: string }> = {
  businessPurpose: {
    question: "Wofür wurde dieser Beleg bzw. diese Ausgabe verwendet?",
    reason: "Der geschäftliche Kontext fehlt für eine saubere Übergabe.",
  },
  requestedTime: {
    question: "Für welchen Termin oder Zeitraum soll ich die Anfrage einordnen?",
    reason: "Ohne Zeitangabe kann der Vorgang nicht zuverlässig koordiniert werden.",
  },
  processType: {
    question: "Was soll mit diesem Vorgang am Ende passieren?",
    reason: "Mila konnte den Zielprozess noch nicht eindeutig bestimmen.",
  },
}

export function buildContextQuestions(interpretation: MilaInterpretation): MilaContextQuestion[] {
  const fields = [...interpretation.missingContext, ...interpretation.ambiguities]
  return [...new Set(fields)].map((field, index) => {
    const template = QUESTIONS[field] ?? {
      question: `Welche Information gehört zu „${field}“?`,
      reason: "Diese Information fehlt für den nächsten sicheren Prozessschritt.",
    }
    return {
      id: `${interpretation.caseId ?? "new"}:${field}:${index}`,
      field,
      question: template.question,
      reason: template.reason,
      required: true,
    }
  })
}
