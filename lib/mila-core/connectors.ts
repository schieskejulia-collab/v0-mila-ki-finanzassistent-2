import type { MilaConnectorDefinition, MilaProposedAction, MilaTargetSystem } from "./types"

export const milaConnectors: MilaConnectorDefinition[] = [
  {
    id: "neutral-export",
    name: "Neutraler Export",
    kind: "file",
    enabled: true,
    capabilities: [
      { id: "prepare-json", description: "Strukturiertes JSON vorbereiten", risk: "read", requiresApproval: false },
      { id: "export-json", description: "Freigegebenes Übergabepaket exportieren", risk: "write", requiresApproval: true },
    ],
  },
  {
    id: "datev-placeholder",
    name: "DATEV",
    kind: "business_system",
    enabled: false,
    capabilities: [
      { id: "handoff", description: "Vorgang an DATEV-Dienst übergeben", risk: "sensitive_write", requiresApproval: true },
    ],
  },
]

export function getConnector(id: string) {
  return milaConnectors.find((connector) => connector.id === id)
}

export function proposeHandoffAction(caseId: string | undefined, target: MilaTargetSystem, payload: Record<string, unknown>): MilaProposedAction {
  const connector = getConnector(target.connectorId)
  const capability = connector?.capabilities.find((item) => item.id === target.capability)
  const requiresHumanApproval = capability?.requiresApproval ?? true

  return {
    id: `${caseId ?? "new"}:handoff:${target.connectorId}`,
    caseId,
    actionType: "handoff",
    description: `Übergabe an ${target.systemName} vorbereiten`,
    target,
    payload,
    approvalStatus: requiresHumanApproval ? "proposed" : "approved",
    requiresHumanApproval,
    reason: requiresHumanApproval
      ? "Schreibende oder sensible Aktionen werden erst nach menschlicher Freigabe ausgeführt."
      : "Diese Aktion benötigt keine externe Schreiboperation.",
  }
}
