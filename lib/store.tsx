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
import type { Expense, Income, Goal, Budget } from './types'
import { demoExpenses, demoIncomes, demoGoals, demoBudgets } from './demo-data'
import {
  monthSummary,
  categoryBreakdown,
  budgetStatuses,
  savingTips,
  type MonthSummary,
} from './calculations'

interface FinanceContextValue {
  expenses: Expense[]
  incomes: Income[]
  goals: Goal[]
  budgets: Budget[]
  summary: MonthSummary
  prevSummary: MonthSummary
  breakdown: ReturnType<typeof categoryBreakdown>
  budgetStatus: ReturnType<typeof budgetStatuses>
  tips: ReturnType<typeof savingTips>
  addExpense: (e: Omit<Expense, 'id'>) => void
  addIncome: (i: Omit<Income, 'id'>) => void
  markInvoicePaid: (id: string) => void
  contributeToGoal: (id: string, amount: number) => void
  // Mila chat control
  chatOpen: boolean
  setChatOpen: (open: boolean) => void
  pendingPrompt: string | null
  askMila: (prompt: string) => void
  clearPending: () => void
userName: string
setUserName: (name: string) => void

userStatus: 'angestellt' | 'selbstständig'
setUserStatus: (status: 'angestellt' | 'selbstständig') => void

taxRate: number
setTaxRate: (rate: number) => void
}

const FinanceContext = createContext<FinanceContextValue | null>(null)

let uid = 1000
const newId = (p: string) => `${p}-${++uid}`

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>(demoExpenses)
  const [incomes, setIncomes] = useState<Income[]>(demoIncomes)
  const [goals, setGoals] = useState<Goal[]>(demoGoals)
  const [budgets] = useState<Budget[]>(demoBudgets)
  const [chatOpen, setChatOpen] = useState(false)
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null)
const [userName, setUserName] = useState(() => {
  if (typeof window === 'undefined') return 'Julia'
  return localStorage.getItem('mila_name') || 'Julia'
})

const [userStatus, setUserStatus] = useState<'angestellt' | 'selbstständig'>(() => {
  if (typeof window === 'undefined') return 'selbstständig'

  const saved = localStorage.getItem('mila_status')

  return saved === 'angestellt'
    ? 'angestellt'
    : 'selbstständig'
})

const [taxRate, setTaxRate] = useState(() => {
  if (typeof window === 'undefined') return 30

  const saved = localStorage.getItem('mila_tax')

  return saved ? Number(saved) : 30
})

useEffect(() => {
  localStorage.setItem('mila_name', userName)
}, [userName])

useEffect(() => {
  localStorage.setItem('mila_status', userStatus)
}, [userStatus])

useEffect(() => {
  localStorage.setItem('mila_tax', String(taxRate))
}, [taxRate])
  const addExpense = useCallback((e: Omit<Expense, 'id'>) => {
    setExpenses((prev) => [{ ...e, id: newId('e') }, ...prev])
  }, [])

  const addIncome = useCallback((i: Omit<Income, 'id'>) => {
    setIncomes((prev) => [{ ...i, id: newId('i') }, ...prev])
  }, [])

  const markInvoicePaid = useCallback((id: string) => {
    setIncomes((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: 'bezahlt' } : i)),
    )
  }, [])

  const contributeToGoal = useCallback((id: string, amount: number) => {
    setGoals((prev) =>
      prev.map((g) =>
        g.id === id ? { ...g, saved: Math.min(g.target, g.saved + amount) } : g,
      ),
    )
  }, [])

  const askMila = useCallback((prompt: string) => {
    setPendingPrompt(prompt)
    setChatOpen(true)
  }, [])

  const clearPending = useCallback(() => setPendingPrompt(null), [])

  const summary = useMemo(
    () => monthSummary(expenses, incomes, 0),
    [expenses, incomes],
  )
  const prevSummary = useMemo(
    () => monthSummary(expenses, incomes, -1),
    [expenses, incomes],
  )
  const breakdown = useMemo(() => categoryBreakdown(expenses), [expenses])
  const budgetStatus = useMemo(
    () => budgetStatuses(budgets, expenses),
    [budgets, expenses],
  )
  const tips = useMemo(() => savingTips(expenses), [expenses])

  const value: FinanceContextValue = {
    expenses,
    incomes,
    goals,
    budgets,
    summary,
    prevSummary,
    breakdown,
    budgetStatus,
    tips,
    addExpense,
    addIncome,
    markInvoicePaid,
    contributeToGoal,
    chatOpen,
    setChatOpen,
    pendingPrompt,
    askMila,
    clearPending,
userName,
setUserName,

userStatus,
setUserStatus,

taxRate,
setTaxRate,
  }

  return (
    <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
  )
}

export function useFinance() {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider')
  return ctx
}
