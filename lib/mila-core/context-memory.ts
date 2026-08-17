import type { MilaContextSuggestion, MilaMemoryContext } from "./types"

const normalize = (value?: string) => (value ?? "").toLowerCase()

function includesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term))
}

export function buildContextSuggestions(params: {
  text?: string
  field?: string
  memory?: MilaMemoryContext
}): MilaContextSuggestion[] {
  const { field, memory } = params
  if (!field || !memory) return []

  const text = normalize(params.text)
  const suggestions: MilaContextSuggestion[] = []

  if (field === "businessPurpose") {
    const looksLikeFuel = includesAny(text, ["tank", "shell", "aral", "esso", "kraftstoff", "diesel", "benzin", "beleg"])

    if (looksLikeFuel) {
      for (const project of memory.projects.filter((item) => item.active).slice(0, 3)) {
        const vehicle = memory.vehicles.find((item) => item.active)
        suggestions.push({
          field,
          label: project.name,
          value: vehicle
            ? `Tankfüllung für ${vehicle.name} im Zusammenhang mit ${project.name}`
            : `Tankfüllung im Zusammenhang mit ${project.name}`,
          hint: vehicle ? `${vehicle.name} · aktives Projekt` : "aktives Projekt",
          confidence: vehicle ? "high" : "medium",
          source: vehicle ? ["project", "vehicle"] : ["project"],
          evidenceLabels: vehicle ? [project.name, vehicle.name] : [project.name],
        })
      }

      for (const vehicle of memory.vehicles.filter((item) => item.active).slice(0, 2)) {
        suggestions.push({
          field,
          label: `${vehicle.name} / Betrieb`,
          value: `Tankfüllung für ${vehicle.name} im betrieblichen Zusammenhang`,
          hint: "ohne Projektzuordnung",
          confidence: "medium",
          source: ["vehicle"],
          evidenceLabels: [vehicle.name],
        })
      }
    }

    for (const prior of memory.confirmedPatterns.filter((item) => item.field === field).slice(0, 2)) {
      suggestions.push({
        field,
        label: prior.label,
        value: prior.value,
        hint: "aus früher bestätigter Zuordnung",
        confidence: prior.confidence,
        source: ["confirmed_pattern"],
        evidenceLabels: [prior.label],
      })
    }
  }

  if (field === "processType") {
    if (includesAny(text, ["beleg", "rechnung", "invoice", "shell", "tank"])) {
      suggestions.push({
        field,
        label: "Zur Kanzlei vorbereiten",
        value: "Das ist ein Beleg und soll mit meinen Unterlagen an die Kanzlei.",
        hint: "Dokumentübergabe vorbereiten",
        confidence: "high",
        source: ["input"],
        evidenceLabels: ["Beleg-/Rechnungsbezug im Eingang"],
      })
    }

    if (includesAny(text, ["angerufen", "rückmeldung", "antwort", "zurückrufen"])) {
      suggestions.push({
        field,
        label: "Rückmeldung vorbereiten",
        value: "Die Person soll eine Rückmeldung bekommen.",
        hint: "Follow-up organisieren",
        confidence: "medium",
        source: ["input"],
        evidenceLabels: ["Rückmeldebezug im Eingang"],
      })
    }
  }

  if (field === "requestedTime") {
    for (const value of ["Heute", "Morgen", "Diese Woche"]) {
      suggestions.push({
        field,
        label: value,
        value,
        confidence: "low",
        source: ["default_option"],
        evidenceLabels: [],
      })
    }
  }

  const deduped = new Map<string, MilaContextSuggestion>()
  for (const suggestion of suggestions) {
    if (!deduped.has(suggestion.value)) deduped.set(suggestion.value, suggestion)
  }

  return [...deduped.values()].slice(0, 4)
}
