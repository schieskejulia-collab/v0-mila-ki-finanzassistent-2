import type { MilaDocument } from './mila-documents'
import type { Obligation } from './mila-obligations'
import { getObligationInsights } from './mila-obligation-insights'

export type MilaAssistantFinding = {
  id: string
  title: string
  message: string
  priority: 'low' | 'medium' | 'high'
  action?: 'none' | 'review' | 'remind' | 'ask_delay'
}

export function getMilaAssistantFindings(data: {
  documents?: MilaDocument[]
  obligations?: Obligation[]
}) {
  const documents = data.documents || []
  const obligations = data.obligations || []

  const findings: MilaAssistantFinding[] = []

  const newDocuments = documents.filter((doc) => doc.status === 'neu')
  const deadlineDocuments = documents.filter((doc) => Boolean(doc.dueDate))

  if (newDocuments.length >= 3) {
    findings.push({
      id: 'documents-review',
      title: '📂 Neue Dokumente',
      message: `${newDocuments.length} Dokumente sind noch nicht geprüft. Mila sammelt sie für dich, statt dich bei jedem einzeln zu stören.`,
      priority: 'low',
      action: 'review',
    })
  }

  if (deadlineDocuments.length > 0) {
    findings.push({
      id: 'document-deadlines',
      title: '📅 Dokumente mit Frist',
      message: `${deadlineDocuments.length} Dokument${
        deadlineDocuments.length === 1 ? '' : 'e'
      } haben eine Frist. Mila behält sie im Blick.`,
      priority: 'medium',
      action: 'remind',
    })
  }

  const obligationFindings = getObligationInsights(obligations).map((item) => ({
    id: item.id,
    title: item.title,
    message: item.message,
    priority:
      item.level === 'important'
        ? 'high'
        : item.level === 'reminder'
        ? 'medium'
        : 'low',
    action:
      item.level === 'important'
        ? 'review'
        : item.level === 'reminder'
        ? 'remind'
        : 'none',
  })) as MilaAssistantFinding[]

  findings.push(...obligationFindings)

  if (findings.length === 0) {
    findings.push({
      id: 'quiet-state',
      title: '🟢 Alles ruhig',
      message:
        'Mila sieht gerade keine dringende Frist. Deine Dokumente und Verpflichtungen bleiben trotzdem im Blick.',
      priority: 'low',
      action: 'none',
    })
  }

  return findings.slice(0, 5)
}
