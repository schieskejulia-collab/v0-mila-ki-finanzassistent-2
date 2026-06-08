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

// --- MILAS WISSENS-DATENBANK ---
function getMilaTip(category: string, status: string) {
  const cat = category.toLowerCase();
  if (cat.includes("software")) return "💻 Voll absetzbar! Da Software meist unter 800€ kostet, ziehen wir das sofort im selben Jahr ab.";
  if (cat.includes("bewirtung")) return "🍽️ Geschäftsessen! Ich buche 70% für dich ab. Schreib mir kurz die Namen der Gäste in die Notizen.";
  if (cat.includes("reisen")) return "✈️ Auf Achse? Denk an die Verpflegungspauschale! Ab 8 Std. Abwesenheit gibt es extra Geld.";
  if (cat.includes("weiterbildung")) return "🎓 Investment in dich! Das setzen wir voll ab. Sogar die Fahrt zum Kurs zählt.";
  if (cat.includes("buero") || cat.includes("bedarf")) return "📎 Bürobedarf ist immer gut. Kleinkram bis 800€ setzen wir sofort ab.";
  if (cat.includes("einnahme")) return "💰 Yay, Geld kommt rein! Ich behalte deine Steuerlast im Auge.";
  return "📦 Alles klar, ich hab das kategorisiert. Soll ich mal prüfen, ob wir hier noch was optimieren können?";
}

const DEFAULT_CATEGORIES = [
  'Reisen', 'Weiterbildung', 'Software', 'Marketing', 'Bürobedarf', 'Bewirtung', 'Versicherung', 'Hardware', 'Sonstiges'
]

interface FinanceContextValue {
  expenses: Expense[]
  incomes: Income[]
  goals: Goal[]
  budgets: Budget[]
  categories: string[]
  summary: MonthSummary
  prevSummary: MonthSummary
  breakdown: ReturnType<typeof categoryBreakdown>
  budgetStatus: ReturnType<typeof budgetStatuses>
  tips: ReturnType<typeof savingTips>
  
  // Mila Feedback System
  milaFeedback: string
  triggerMilaFeedback: (category: string) => void

  // Aktionen
  addExpense: (e: Omit<Expense, 'id'>) => void
  deleteExpense: (id: string) => void
  addIncome: (i: Omit<Income, 'id'>) => void
  deleteIncome: (id: string) => void
  markInvoicePaid: (id: string) => void
  contributeToGoal: (id: string, amount: number) => void
  
  // Kategorien & System
  addCategory: (name: string) => void
  deleteCategory: (name: string) => void
  resetToDemo: () => void
  clearAllData: () => void

  // Mila Chat
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

let uid = Date.now()
const newId = (p: string) => `${p}-${++uid}`

export function FinanceProvider({ children }: { children: ReactNode }) {
  // --- States ---
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    if (typeof window === 'undefined') return demoExpenses
    const saved = localStorage.getItem('mila_expenses')
    return saved ? JSON.parse(saved) : demoExpenses
  })

  const [incomes, setIncomes] = useState<Income[]>(() => {
    if (typeof window === 'undefined') return demoIncomes
    const saved = localStorage.getItem('mila_incomes')
    return saved ? JSON.parse(saved) : demoIncomes
  })

  const [categories, setCategories] = useState<string[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_CATEGORIES
    const saved = localStorage.getItem('mila_categories')
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES
  })

  const [milaFeedback, setMilaFeedback] = useState("Hi, ich bin Mila! Bereit für deine Belege?")
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
    return saved === 'angestellt' ? 'angestellt' : 'selbstständig'
  })
  const [taxRate, setTaxRate] = useState(() => {
    if (typeof window === 'undefined') return 30
    const saved = localStorage.getItem('mila_tax')
    return saved ? Number(saved) : 30
  })

  // --- Persistence ---
  useEffect(() => {
    localStorage.setItem('mila_name', userName)
    localStorage.setItem('mila_status', userStatus)
    localStorage.setItem('mila_tax', String(taxRate))
    localStorage.setItem('mila_expenses', JSON.stringify(expenses))
    localStorage.setItem('mila_incomes', JSON.stringify(incomes))
    localStorage.setItem('mila_categories', JSON.stringify(categories))
  }, [userName, userStatus, taxRate, expenses, incomes, categories])

  // --- Callbacks ---
  const triggerMilaFeedback = useCallback((category: string) => {
    const tip = getMilaTip(category, userStatus)
    setMilaFeedback(tip)
  }, [userStatus])

  const addExpense = useCallback((e: Omit<Expense, 'id'>) => {
    setExpenses((prev) => [{ ...e, id: newId('e') }, ...prev])
    if (e.category) triggerMilaFeedback(e.category)
  }, [triggerMilaFeedback])

  const deleteExpense = useCallback((id: string) => {
    setExpenses((prev) => prev.filter(e => e.id !== id))
  }, [])

  const addIncome = useCallback((i: Omit<Income, 'id'>) => {
    setIncomes((prev) => [{ ...i, id: newId('i') }, ...prev])
    triggerMilaFeedback("einnahme")
  }, [triggerMilaFeedback])

  const deleteIncome = useCallback((id: string) => {
    setIncomes((prev) => prev.filter(i => i.id !== id))
  }, [])

  const addCategory = useCallback((name: string) => {
    setCategories((prev) => prev.includes(name) ? prev : [...prev, name])
  }, [])

  const deleteCategory = useCallback((name: string) => {
    setCategories((prev) => prev.filter(c => c !== name))
  }, [])

  const resetToDemo = useCallback(() => {
    setExpenses(demoExpenses)
    setIncomes(demoIncomes)
    setCategories(DEFAULT_CATEGORIES)
    setMilaFeedback("Ich habe alles auf die Demo-Daten zurückgesetzt!")
  }, [])

  const clearAllData = useCallback(() => {
    setExpenses([])
    setIncomes([])
    setMilaFeedback("Alles blitzblank! Dein Frühjahrsputz war erfolgreich.")
  }, [])

  const markInvoicePaid = useCallback((id: string) => {
    setIncomes((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'bezahlt' } : i)))
  }, [])

  const contributeToGoal = useCallback((id: string, amount: number) => {
    setGoals((prev) => prev.map((g) => g.id === id ? { ...g, saved: Math.min(g.target, g.saved + amount) } : g))
  }, [])

  const askMila = useCallback((prompt: string) => {
    setPendingPrompt(prompt)
    setChatOpen(true)
  }, [])

  const clearPending = useCallback(() => setPendingPrompt(null), [])

  // --- Memos ---
  const summary = useMemo(() => monthSummary(expenses, incomes, 0), [expenses, incomes])
  const prevSummary = useMemo(() => monthSummary(expenses, incomes, -1), [expenses, incomes])
  const breakdown = useMemo(() => categoryBreakdown(expenses), [expenses])
  const budgetStatus = useMemo(() => budgetStatuses(budgets, expenses), [budgets, expenses])
  const tips = useMemo(() => savingTips(expenses), [expenses])

  const value: FinanceContextValue = {
    expenses, incomes, goals, budgets, categories,
    summary, prevSummary, breakdown, budgetStatus, tips,
    milaFeedback, triggerMilaFeedback,
    addExpense, deleteExpense, addIncome, deleteIncome,
    markInvoicePaid, contributeToGoal, addCategory, deleteCategory,
    resetToDemo, clearAllData, chatOpen, setChatOpen,
    pendingPrompt, askMila, clearPending,
    userName, setUserName, userStatus, setUserStatus, taxRate, setTaxRate
  }

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

export function useFinance() {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider')
  return ctx
}