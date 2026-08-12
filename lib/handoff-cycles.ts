'use client'

export type HandoffRhythm = 'kanzlei' | 'monthly' | 'quarterly' | 'halfyear' | 'yearly' | 'individual'

export type CompletedHandoff = {
  id: string
  clientId: string
  period: string
  periodLabel: string
  rhythm: HandoffRhythm
  documentCount: number
  completedAt: string
}

type ClientCycleState = {
  activePeriod?: string
  completed: CompletedHandoff[]
}

const HANDOFF_CYCLES_KEY = 'mila-client-handoff-cycles-v1'

function readAll(): Record<string, ClientCycleState> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(HANDOFF_CYCLES_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function readHandoffCycle(clientId: string): ClientCycleState {
  const state = readAll()?.[clientId]
  return {
    activePeriod: state?.activePeriod,
    completed: Array.isArray(state?.completed) ? state.completed : [],
  }
}

export function periodLabel(period: string, rhythm: HandoffRhythm) {
  const [year, month] = period.split('-').map(Number)
  if (!year || !month) return period
  if (rhythm === 'quarterly') return `Q${Math.ceil(month / 3)} ${year}`
  if (rhythm === 'halfyear') return `${month <= 6 ? '1.' : '2.'} Halbjahr ${year}`
  if (rhythm === 'yearly') return `Jahr ${year}`
  return new Date(year, month - 1, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
}

export function advancePeriod(period: string, rhythm: HandoffRhythm) {
  const [year, month] = period.split('-').map(Number)
  if (!year || !month) return undefined
  const step = rhythm === 'monthly' ? 1 : rhythm === 'quarterly' ? 3 : rhythm === 'halfyear' ? 6 : rhythm === 'yearly' ? 12 : 0
  if (!step) return undefined
  const next = new Date(year, month - 1 + step, 1)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
}

export function completeHandoff(input: Omit<CompletedHandoff, 'id' | 'completedAt' | 'periodLabel'>) {
  if (typeof window === 'undefined' || !input.clientId) return null
  const all = readAll()
  const current = readHandoffCycle(input.clientId)
  const completedAt = new Date().toISOString()
  const record: CompletedHandoff = {
    ...input,
    id: globalThis.crypto?.randomUUID?.() || `handoff-${Date.now()}`,
    periodLabel: periodLabel(input.period, input.rhythm),
    completedAt,
  }
  const nextPeriod = advancePeriod(input.period, input.rhythm)
  const nextState: ClientCycleState = {
    activePeriod: nextPeriod,
    completed: [record, ...current.completed].slice(0, 60),
  }
  window.localStorage.setItem(HANDOFF_CYCLES_KEY, JSON.stringify({ ...all, [input.clientId]: nextState }))
  window.dispatchEvent(new CustomEvent('mila-handoff-cycle-updated', { detail: { clientId: input.clientId } }))
  return { record, nextPeriod }
}
