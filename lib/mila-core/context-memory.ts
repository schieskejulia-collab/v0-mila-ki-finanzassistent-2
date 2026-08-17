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
    autoApply:
      (suggestion.source.includes("confirmed_pattern") && suggestion.score >= 92) ||
      (suggestion.source.includes("input") && suggestion.source.includes("project") && suggestion.score >= 92),
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
    const explicitlyMentionedProjects = memory.projects.filter((project) => {
      if (!project.active) return false
      const aliases = (project.aliases ?? []).map(normalize)
      return includesAny(text, [normalize(project.name), ...aliases])
    })

    for (const prior of memory.confirmedPatterns.filter((item) => item.field === field)) {
      const confirmations = prior.confirmations ?? 1
      const alignsWithExplicitProject =
        explicitlyMentionedProjects.length === 0 ||
        explicitlyMentionedProjects.some((project) => {
          const projectName = normalize(project.name)
          return (
            normalize(prior.value).includes(projectName) ||
            (prior.evidenceLabels ?? []).some((label) => normalize(label).includes(projectName))
          )
        })

      const learnedScore = 88 + Math.min(confirmations * 4, 12)
      const score = alignsWithExplicitProject ? learnedScore : 45

      suggestions.push({
        field,
        label: prior.label,
        value: prior.value,
        hint: alignsWithExplicitProject
          ? confirmations > 1
            ? `${confirmations}× zuvor bestätigt`
            : "zuvor bestätigt"
          : "gelerntes Muster – aktueller Text nennt ein anderes Projekt",
        confidence: alignsWithExplicitProject ? "high" : "low",
        source: ["confirmed_pattern"],
        evidenceLabels: prior.evidenceLabels?.length ? prior.evidenceLabels : [prior.label],
        score,
      })
    }

    if (looksLikeFuel) {
      const vehicle = memory.vehicles.find((item) => item.active)
      for (const project of memory.projects.filter((item) => item.active).slice(0, 3)) {
        const aliases = (project.aliases ?? []).map(normalize)
        const projectMentioned = includesAny(text, [normalize(project.name), ...aliases])
        const contactMatch = memory.contacts.some((contact) => {
          const surname = normalize(contact.name).replace("herr ", "").replace("frau ", "")
          return surname.length > 2 && normalize(project.name).includes(surname)
        })

        suggestions.push({
          field,
          label: project.name,
          value: vehicle
            ? `Tankfüllung für ${vehicle.name} im Zusammenhang mit ${project.name}`
            : `Tankfüllung im Zusammenhang mit ${project.name}`,
          hint: projectMentioned
            ? vehicle
              ? `${vehicle.name} · im aktuellen Text genannt`
              : "im aktuellen Text genannt"
            : vehicle
              ? `${vehicle.name} · aktives Projekt`
              : "aktives Projekt",
          confidence: projectMentioned || contactMatch ? "high" : "medium",
          source: projectMentioned
            ? vehicle
              ? ["input", "project", "vehicle"]
              : ["input", "project"]
            : vehicle
              ? ["project", "vehicle"]
              : ["project"],
          evidenceLabels: vehicle ? [project.name, vehicle.name] : [project.name],
          score: 60 + (vehicle ? 8 : 0) + (projectMentioned ? 28 : 0) + (contactMatch ? 8 : 0),
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
