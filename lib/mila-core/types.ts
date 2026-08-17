export type MilaInputSource =
  | "phone"
  | "email"
  | "upload"
  | "form"
  | "manual"
  | "api"
  | "voice"

export type MilaApprovalStatus =
  | "proposed"
  | "needs_context"
  | "needs_human_review"
  | "approved"
  | "executing"
  | "completed"
  | "failed"

export type MilaConfidence = "low" | "medium" | "high"

export interface MilaEvidenceRef {
  type: "document" | "message" | "field" | "case_update" | "external"
  id?: string
  label?: string
}

export interface MilaInterpretation {
  source: MilaInputSource
  caseId?: string
  detectedType: string
  processType?: string
  industry?: string
  confidence: MilaConfidence
  summary: string
  knownFacts: Record<string, unknown>
  missingContext: string[]
  ambiguities: string[]
  evidence: MilaEvidenceRef[]
}

export interface MilaContextQuestion {
  id: string
  field: string
  question: string
  reason: string
  required: boolean
}

export interface MilaTargetSystem {
  connectorId: string
  systemName: string
  capability: string
}

export interface MilaProposedAction {
  id: string
  caseId?: string
  actionType: string
  description: string
  target?: MilaTargetSystem
  payload: Record<string, unknown>
  approvalStatus: MilaApprovalStatus
  requiresHumanApproval: boolean
  reason: string
}

export interface MilaProcessPlan {
  interpretation: MilaInterpretation
  questions: MilaContextQuestion[]
  actions: MilaProposedAction[]
  handoffReady: boolean
}

export interface MilaConnectorCapability {
  id: string
  description: string
  risk: "read" | "write" | "sensitive_write"
  requiresApproval: boolean
}

export interface MilaConnectorDefinition {
  id: string
  name: string
  kind: "file" | "api" | "business_system" | "communication"
  enabled: boolean
  capabilities: MilaConnectorCapability[]
}

export interface MilaHandoffPackage {
  caseId: string
  processType?: string
  summary: string
  facts: Record<string, unknown>
  unresolvedQuestions: string[]
  targetSystem?: MilaTargetSystem
  createdAt: string
  approvedBy?: string
}
