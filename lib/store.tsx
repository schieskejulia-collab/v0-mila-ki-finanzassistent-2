'use client'

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react'

import type { Expense, Income, Goal, Budget, CategoryId } from './types'
import { CATEGORIES } from './types'
import { demoExpenses, demoIncomes, demoGoals, demoBudgets } from './demo-data'
import {
  monthSummary,
  categoryBreakdown,
  budgetStatuses,
  savingTips,
  type MonthSummary,
} from './calculations'

// --- USER STATUS ---
export type UserStatus =
  | 'angestellt'
  | 'selbstständig'
  | 'kleinunternehmer'
  | 'freelancer'
  | 'minijob'

// --- AUTOMATISCHE STEUERLOGIK ---
function autoTaxRateForStatus(status: UserStatus): number {
  switch (status) {
    case 'angestellt': return 20
    case 'selbstständig': return 30
    case 'freelancer': return 28
    case 'kleinunternehmer': return 25
    case 'minijob': return 0
    default: return 30
  }
}

// --- STEUER TIPPS ---
export interface SteuerTipp {
  id: CategoryId;
  titel: string;
  status_info: string;
  nische: string;
}

export const STEUER_TIPPS: SteuerTipp[] = [
  { id: 'miete', titel: "Homeoffice-Pauschale", status_info: "Voll absetzbar", nische: "6€ pro Tag – sicher." },
  { id: 'software', titel: "Apps & Abos", status_info: "Voll absetzbar", nische: "Alles, was dein Business smarter macht." },
  { id: 'marketing', titel: "Sichtbarkeit", status_info: "Voll absetzbar", nische: "Alles, was dich bekannter macht." },
  { id: 'buerobedarf', titel: "Arbeitsmittel", status_info: "Sofortabzug", nische: "Tech unter 800€ netto sofort absetzbar." },
  { id: 'reisen', titel: "Mila on Tour", status_info: "Pauschale", nische: "0,30€/km Auto – 0,20€/km Rad." },
  { id: 'weiterbildung', titel: "Wissen", status_info: "Voll absetzbar", nische: "Kurse, Coachings, Bücher." },
  { id: 'sonstiges', titel: "Kleinkram", status_info: "Check", nische: "Ich prüfe individuell." },
]

export function getMilaTipForUser(catId: CategoryId): string {
  const tipp = STEUER_TIPPS.find(t => t.id === catId)
  return tipp ? tipp.nische : "Alles klar – ich hab das kategorisiert."
}

// --- STORE ---
interface FinanceContextValue {
  expenses: Expense[]
  incomes: Income[]
  goals: Goal[]
  budgets: Budget[]
  categories: string[]

  summary: MonthSummary
  prevSummary: MonthSummary
  breakdown: any
  budgetStatus: any
  tips: any

  milaFeedback: string
  triggerMilaFeedback: (category: CategoryId) => void

  morningBriefing: string
  refreshMorningBriefing: () => void

  addExpense: (e: Omit<Expense, 'id'>) => void
  deleteExpense: (id: string) => void

  addIncome: (i: Omit<Income, 'id'>) => void
  deleteIncome: (id: string) => void

  markInvoicePaid: (id: string) => void
  contributeToGoal: (id: string, amount: number) => void

  resetToDemo: () => void
  clearAllData: () => void

  chatOpen: boolean
  setChatOpen: (open: boolean) => void

  pendingPrompt: string | null
  askMila: (prompt: string) => void
  clearPending: () => void

  userName: string
  setUserName: (name: string) => void

  userStatus: UserStatus
  setUserStatus: (status: UserStatus) => void

  taxRate: number
  setTaxRate: (rate: number) => void
}

const FinanceContext = createContext<FinanceContextValue | null>(null)

let uid = Date.now()
const newId = (p: string) => `${p}-${++uid}`

export function FinanceProvider({ children }: { children: ReactNode }) {

  // --- DATA ---
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    if (typeof window === 'undefined') return demoExpenses
    try {
      return JSON.parse(localStorage.getItem('mila_expenses') || 'null') || demoExpenses
    } catch { return demoExpenses }
  })

  const [incomes, setIn
