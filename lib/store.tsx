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

  const [incomes, setIncomes] = useState<Income[]>(() => {
    if (typeof window === 'undefined') return demoIncomes
    try {
      return JSON.parse(localStorage.getItem('mila_incomes') || 'null') || demoIncomes
    } catch { return demoIncomes }
  })

  const [userName, setUserName] = useState(() => {
    if (typeof window === 'undefined') return 'Julia'
    return localStorage.getItem('mila_name') || 'Julia'
  })

  const [userStatus, _setUserStatus] = useState<UserStatus>(() => {
    if (typeof window === 'undefined') return 'selbstständig'
    const saved = localStorage.getItem('mila_status') as UserStatus
    const valid = ['angestellt', 'selbstständig', 'kleinunternehmer', 'freelancer', 'minijob']
    return valid.includes(saved) ? saved : 'selbstständig'
  })

  const [milaFeedback, setMilaFeedback] = useState(`Hi ${userName}, ich bin Mila!`)
  const [goals, setGoals] = useState<Goal[]>(demoGoals)
  const [budgets] = useState<Budget[]>(demoBudgets)
  const [chatOpen, setChatOpen] = useState(false)
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null)

  const [taxRate, setTaxRate] = useState(() => {
    if (typeof window === 'undefined') return 30
    return Number(localStorage.getItem('mila_tax')) || autoTaxRateForStatus('selbstständig')
  })

  // --- MORNING BRIEFING ---
  const [morningBriefing, setMorningBriefing] = useState("")

  function generateMorningBriefing(userName: string, summary: MonthSummary, incomes: Income[]) {
    const offene = incomes.filter(i => i.status === "offen").length
    const gewinn = summary.income - summary.expenses

    let stimmung = ""
    if (gewinn > 2000) stimmung = "Du bist richtig gut unterwegs."
    else if (gewinn > 0) stimmung = "Alles stabil, du machst das gut."
    else stimmung = "Ich halte dich. Wir schauen das gemeinsam an."

    return `
Guten Morgen ${userName} ☀️

• Dein aktueller Monatsgewinn liegt bei ${gewinn.toFixed(2)}€.
• Du hast ${offene} offene Rechnungen.
• ${stimmung}

Atme kurz. Ich begleite dich heute durch alles, was ansteht.
`
  }

  const refreshMorningBriefing = () => {
    const text = generateMorningBriefing(userName, summary, incomes)
    setMorningBriefing(text)
  }

  // --- LOCALSTORAGE SYNC ---
  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem('mila_name', userName)
    localStorage.setItem('mila_status', userStatus)
    localStorage.setItem('mila_tax', String(taxRate))
    localStorage.setItem('mila_expenses', JSON.stringify(expenses))
    localStorage.setItem('mila_incomes', JSON.stringify(incomes))
  }, [userName, userStatus, taxRate, expenses, incomes])

  // --- FEEDBACK ---
  const triggerMilaFeedback = useCallback((category: CategoryId) => {
    const tip = getMilaTipForUser(category)
    setMilaFeedback(`Hey ${userName}, pass auf: ${tip}`)
  }, [userName])

  // --- EXPENSES ---
  const addExpense = useCallback((e: Omit<Expense, 'id'>) => {
    setExpenses(prev => [{ ...e, id: newId('e') }, ...prev])
    if (e.category) triggerMilaFeedback(e.category)
  }, [triggerMilaFeedback])

  const deleteExpense = useCallback((id: string) =>
    setExpenses(prev => prev.filter(e => e.id !== id)), [])

  // --- INCOME ---
  const addIncome = useCallback((i: Omit<Income, 'id'>) => {
    setIncomes(prev => [{ ...i, id: newId('i') }, ...prev])
    setMilaFeedback(`💰 Yay ${userName}, Zahltag!`)
  }, [userName])

  const deleteIncome = useCallback((id: string) =>
    setIncomes(prev => prev.filter(i => i.id !== id)), [])

  // --- GOALS ---
  const markInvoicePaid = useCallback((id: string) =>
    setIncomes(prev => prev.map(i => i.id === id ? { ...i, status: 'bezahlt' } : i)), [])

  const contributeToGoal = useCallback((id: string, amount: number) =>
    setGoals(prev => prev.map(g =>
      g.id === id ? { ...g, saved: Math.min(g.target, g.saved + amount) } : g
    )), [])

  // --- CHAT ---
  const askMila = useCallback((prompt: string) => {
    setPendingPrompt(prompt)
    setChatOpen(true)
  }, [])

  const clearPending = useCallback(() => setPendingPrompt(null), [])

  // --- SUMMARY ---
  const summary = useMemo(() => monthSummary(expenses, incomes, 0), [expenses, incomes])
  const prevSummary = useMemo(() => monthSummary(expenses, incomes, -1), [expenses, incomes])
  const breakdown = useMemo(() => categoryBreakdown(expenses), [expenses])
  const budgetStatus = useMemo(() => budgetStatuses(budgets, expenses), [budgets, expenses])
  const tips = useMemo(() => savingTips(expenses), [expenses])

  // --- USER STATUS ---
  const setUserStatus = (status: UserStatus) => {
    _setUserStatus(status)
    setTaxRate(autoTaxRateForStatus(status))
  }

  const value: FinanceContextValue = {
    expenses, incomes, goals, budgets, categories: Object.keys(CATEGORIES),
    summary, prevSummary, breakdown, budgetStatus, tips,

    milaFeedback, triggerMilaFeedback,

    morningBriefing,
    refreshMorningBriefing,

    addExpense, deleteExpense,
    addIncome, deleteIncome,
    markInvoicePaid, contributeToGoal,

    resetToDemo: () => { setExpenses(demoExpenses); setIncomes(demoIncomes) },
    clearAllData: () => { setExpenses([]); setIncomes([]) },

    chatOpen, setChatOpen,
    pendingPrompt, askMila, clearPending,

    userName, setUserName,
    userStatus, setUserStatus,

    taxRate, setTaxRate,
  }

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

export function useFinance() {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider')
  return ctx
}
