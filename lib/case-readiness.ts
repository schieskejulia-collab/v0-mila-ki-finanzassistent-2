import { checkDocumentQuality } from './document-workflow'

export type ReadinessBlocker = {
  code: 'case_done' | 'missing_documents' | 'open_questions' | 'open_tasks' | 'document_context'
  label: string
  count: number
}

export type CaseReadiness = {
  ready: boolean
  blockers: ReadinessBlocker[]
  documentCount: number
  documentIssueCount: number
  openQuestionCount: number
  openTaskCount: number
}

export function assessCaseReadiness({
  status,
  documents,
  tasks,
  updates,
}: {
  status?: string | null
  documents: any[]
  tasks: any[]
  updates: any[]
}): CaseReadiness {
  const openQuestions = updates.filter((item) => item?.kind === 'question' && item?.status !== 'done')
  const openTasks = tasks.filter((item) => item?.status !== 'done')
  const documentIssues = documents.filter((item) => !checkDocumentQuality(item).ok)
  const blockers: ReadinessBlocker[] = []

  if (status === 'done') blockers.push({ code: 'case_done', label: 'Vorgang ist bereits abgeschlossen', count: 1 })
  if (documents.length === 0) blockers.push({ code: 'missing_documents', label: 'keine Unterlage im Vorgang', count: 0 })
  if (openQuestions.length > 0) blockers.push({ code: 'open_questions', label: `${openQuestions.length} offene Rückfrage${openQuestions.length === 1 ? '' : 'n'}`, count: openQuestions.length })
  if (openTasks.length > 0) blockers.push({ code: 'open_tasks', label: `${openTasks.length} offene${openTasks.length === 1 ? 'r' : ''} Arbeitsschritt${openTasks.length === 1 ? '' : 'e'}`, count: openTasks.length })
  if (documentIssues.length > 0) blockers.push({ code: 'document_context', label: `${documentIssues.length} Unterlage${documentIssues.length === 1 ? '' : 'n'} mit fehlendem Kontext`, count: documentIssues.length })

  return {
    ready: blockers.length === 0,
    blockers,
    documentCount: documents.length,
    documentIssueCount: documentIssues.length,
    openQuestionCount: openQuestions.length,
    openTaskCount: openTasks.length,
  }
}
