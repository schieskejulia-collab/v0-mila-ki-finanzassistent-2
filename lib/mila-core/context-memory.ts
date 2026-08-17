import type { MilaContextSuggestion, MilaMemoryContext } from "./types"

const normalize = (value?: string) => (value ?? "").toLowerCase()

function includesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term))
}

function rankSuggestions(suggestions: MilaContextSuggestion[]): MilaContextSuggestion[] {
  const sorted = [...suggestions].sort((a, b) => b.score - a.score)
  return sorted.map((suggestion, index) => ({
    ...suggestion,
    recommended: index === 0 && suggestion.score >= 70,
    autoApply: suggestion.source.includes("confirmed_pattern") && suggestion.score >= 95,
  }))
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

    for (const prior of memory.confirmedPatterns.filter((item) => item.field === field)) {
      const confirmations = prior.confirmations ?? 1
      suggestions.push({
        field,
        label: prior.label,
        value: prior.value,
        hint: confirmations > 1 ? `${confirmations}× zuvor bestätigt` : "zuvor bestätigt",
        confidence: "high",
        source: ["confirmed_pattern"],
        evidenceLabels: prior.evidenceLabels?.length ? prior.evidenceLabels : [prior.label],
        score: 88 + Math.min(confirmations * 4, 12),
      })
    }

    if (looksLikeFuel) {
      const vehicle = memory.vehicles.find((item) => item.active)
      for (const project of memory.projects.filter((item) => item.active).slice(0, 3)) {
        const projectMentioned = includesAny(text, [project.name.toLowerCase(), ...(project.aliases ?? []).map(normalize)])
        const contactMatch = memory.contacts.some((contact) => normalize(project.name).includes(normalize(contact.name).replace("herr ", "").replace("frau ", "")))
        suggestions.push({
          field,
          label: project.name,
          value: vehicle
            ? `Tankfüllung für ${vehicle.name} im Zusammenhang mit ${project.name}`
            : `Tankfüllung im Zusammenhang mit ${project.name}`,
          hint: vehicle ? `${vehicle.name} · aktives Projekt` : "aktives Projekt",
          confidence: projectMentioned || contactMatch ? "high" : "medium",
          source: vehicle ? ["project", "vehicle"] : ["project"],
          evidenceLabels: vehicle ? [project.name, vehicle.name] : [project.name],
          score: 60 + (vehicle ? 8 : 0) + (projectMentioned ? 20 : 0) + (contactMatch ? 8 : 0),
        })
      }

      for (const activeVehicle of memory.vehicles.filter((item) => item.active).slice(0, 2)) {
        suggestions.push({
          field,
          label: `${activeVehicle.name} / Betrieb`,
          value: `Tankfüllung für ${activeVehicle.name} im betrieblichen Zusammenhang`,
          hint: "ohne Projektzuordnung",
          confidence: "medium",
          source: ["vehicle"],
          evidenceLabels: [activeVehicle.name],
          score: 52,
        })
      }
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
        score: 86,
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
        score: 72,
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
        score: 25,
      })
    }
  }

  const deduped = new Map<string, MilaContextSuggestion>()
  for (const suggestion of suggestions) {
    const existing = deduped.get(suggestion.value)
    if (!existing || suggestion.score > existing.score) deduped.set(suggestion.value, suggestion)
  }

  return rankSuggestions([...deduped.values()]).slice(0, 4)
}
