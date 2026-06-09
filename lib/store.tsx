'use client'

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from 'react'

export const STEUER_TIPPS = [
  {
    titel: 'Software absetzen',
    kategorie: 'Software',
    status_info: 'Selbstständig',
    beschreibung:
      'Software kann oft sofort oder über die Nutzungsdauer abgesetzt werden, je nach Preis und Nutzung.',
  },
  {
    titel: 'Bewirtung korrekt buchen',
    kategorie: 'Bewirtung',
    status_info: 'Freelancer',
    beschreibung:
      'Geschäftsessen sind nur teilweise absetzbar und brauchen einen geschäftlichen Anlass.',
  },
  {
    titel: 'Reisen und Verpflegung',
    kategorie: 'Reisen',
    status_info: 'Alle',
    beschreibung:
      'Bei beruflichen Reisen können Fahrt, Übernachtung und Pauschalen relevant sein.',
  },
  {
    titel: 'Weiterbildung',
    kategorie: 'Weiterbildung',
    status_info: 'Alle',
    beschreibung:
      'Berufliche Weiterbildung ist oft voll absetzbar, wenn sie den Job unterstützt.',
  },
]

export type UserStatus = 'angestellt' | 'selbstständig' | 'freelancer' | 'kleinunternehmer'

export type Expense = {
  id: string
  title?: string
  vendor?: string
  amount: number | string
  date: string
  category: string
}

export type Income = {
  id: string
  title?: string
  client?: string
  amount: number | string
  date: string
}

export type BudgetStatus = {
  category: string
  spent: number
  limit: number
  remaining: number
  percent: number
}

interface FinanceContextValue {
  expenses: Expense[]
  incomes: Income[]
  categories: string[]
  milaFeedback: string
  triggerMilaFeedback: (category: string) => void
  addExpense: (e: Partial<Expense> & { amount: number | string; category?: string }) => void
  deleteExpense: (id: string) => void
  addIncome: (i: Partial<Income> & { amount: number | string }) => void
  deleteIncome: (id: string) => void
  userName: string
  setUserName: (name: string) => void
  userStatus: UserStatus
  setUserStatus: (status: UserStatus) => void
  isLoggedIn: boolean
  login: (name: string, status: UserStatus) => void
  logout: () => void
  summary: {
    totalExpenses: number
    totalIncomes: number
    balance: number
  }
  budgetStatus: BudgetStatus[]
}

const DEFAULT_CATEGORIES = [
  'Reisen',
  'Weiterbildung',
  'Software',
  'Marketing',
  'Bürobedarf',
  'Bewirtung',
  'Versicherung',
  'Hardware',
  'Sonstiges',
]

const STATUS_VALUES: UserStatus[] = [
  'angestellt',
  'selbstständig',
  'freelancer',
  'kleinunternehmer',
]

const FinanceContext = createContext<FinanceContextValue | null>(null)

function isUserStatus(value: unknown): value is UserStatus {
  return typeof value === 'string' && STATUS_VALUES.includes(value as UserStatus)
}

function safeParseArray<T>(value: string | null): T[] {
  if (!value) return []

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function toNumber(value: number | string | undefined | null): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }

  const raw = String(value ?? '').trim()

  if (!raw) return 0

  const normalized = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw

  const cleaned = normalized.replace(/[^\d.-]/g, '')
  const number = Number(cleaned)

  return Number.isFinite(number) ? number : 0
}

function getMilaTip(category: string, status: string) {
  const cat = category.toLowerCase()

  if (cat.includes('software')) {
    return '💻 Voll absetzbar! Software kann oft sehr sinnvoll verbucht werden.'
  }

  if (cat.includes('bewirtung')) {
    return '🍽️ Geschäftsessen! Achte auf den geschäftlichen Anlass und die Notizen.'
  }

  if (cat.includes('reisen')) {
    return '✈️ Reise erkannt! Fahrt, Hotel und Pauschalen prüfen wir getrennt.'
  }

  if (cat.includes('weiterbildung')) {
    return '🎓 Stark! Weiterbildung ist oft ein guter Steuerfall.'
  }

  if (cat.includes('büro') || cat.includes('buero') || cat.includes('bedarf')) {
    return '📎 Bürobedarf ist perfekt für saubere Buchungen.'
  }

  if (cat.includes('einnahme')) {
    return '💰 Einnahme verbucht! Ich behalte deine Übersicht im Blick.'
  }

  return `📦 Kategorie gespeichert für ${status}.`
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [incomes, setIncomes] = useState<Income[]>([])
  const [categories] = useState<string[]>(DEFAULT_CATEGORIES)
  const [milaFeedback, setMilaFeedback] = useState('Hi, ich bin Mila!')
  const [userName, setUserName] = useState('')
  const [userStatus, setUserStatus] = useState<UserStatus>('selbstständig')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    try {
      const savedName = window.localStorage.getItem('mila_name')
      const savedStatus = window.localStorage.getItem('mila_status')
      const savedExpenses = window.localStorage.getItem('mila_expenses')
      const savedIncomes = window.localStorage.getItem('mila_incomes')

      if (savedName) {
        setUserName(savedName)
        setIsLoggedIn(true)
      }

      if (isUserStatus(savedStatus)) {
        setUserStatus(savedStatus)
      }

      setExpenses(safeParseArray<Expense>(savedExpenses))
      setIncomes(safeParseArray<Income>(savedIncomes))
    } catch {
      setExpenses([])
      setIncomes([])
    }
  }, [])

  useEffect(() => {
    if (!mounted) return

    try {
      if (isLoggedIn) {
        window.localStorage.setItem('mila_name', userName)
        window.localStorage.setItem('mila_status', userStatus)
        window.localStorage.setItem('mila_expenses', JSON.stringify(expenses))
        window.localStorage.setItem('mila_incomes', JSON.stringify(incomes))
      }
    } catch {
      // Falls localStorage blockiert ist, läuft Mila trotzdem weiter.
    }
  }, [userName, userStatus, expenses, incomes, isLoggedIn, mounted])

  const login = (name: string, status: UserStatus) => {
    setUserName(name)
    setUserStatus(status)
    setIsLoggedIn(true)
  }

  const logout = () => {
    setIsLoggedIn(false)
    setUserName('')
    setUserStatus('selbstständig')
    setExpenses([])
    setIncomes([])
    setMilaFeedback('Du wurdest ausgeloggt. Ich bin bereit, wenn du zurück bist.')

    try {
      window.localStorage.removeItem('mila_name')
      window.localStorage.removeItem('mila_status')
      window.localStorage.removeItem('mila_expenses')
      window.localStorage.removeItem('mila_incomes')
    } catch {
      // Ignorieren, falls localStorage nicht verfügbar ist.
    }
  }

  const triggerMilaFeedback = (category: string) => {
    setMilaFeedback(getMilaTip(category, userStatus))
  }

  const addExpense = (e: Partial<Expense> & { amount: number | string; category?: string }) => {
    const newExp: Expense = {
      id: `e-${Date.now()}`,
      title: e.title || '',
      vendor: e.vendor || '',
      amount: e.amount,
      date: e.date || new Date().toISOString(),
      category: e.category || 'Sonstiges',
    }

    setExpenses((prev) => [newExp, ...prev])
    triggerMilaFeedback(newExp.category)
  }

  const deleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((expense) => expense.id !== id))
  }

  const addIncome = (i: Partial<Income> & { amount: number | string }) => {
    const newInc: Income = {
      id: `i-${Date.now()}`,
      title: i.title || '',
      client: i.client || '',
      amount: i.amount,
      date: i.date || new Date().toISOString(),
    }

    setIncomes((prev) => [newInc, ...prev])
    setMilaFeedback('💰 Einnahme verbucht! Sehr gut.')
  }

  const deleteIncome = (id: string) => {
    setIncomes((prev) => prev.filter((income) => income.id !== id))
  }

  const summary = useMemo(() => {
    const totalExpenses = expenses.reduce((sum, expense) => {
      return sum + toNumber(expense.amount)
    }, 0)

    const totalIncomes = incomes.reduce((sum, income) => {
      return sum + toNumber(income.amount)
    }, 0)

    return {
      totalExpenses,
      totalIncomes,
      balance: totalIncomes - totalExpenses,
    }
  }, [expenses, incomes])

  const budgetStatus = useMemo(() => {
    const budgetLimits: Record<string, number> = {
      Software: 200,
      Reisen: 500,
      Weiterbildung: 300,
      Marketing: 250,
      Bürobedarf: 150,
      Bewirtung: 200,
      Hardware: 400,
      Versicherung: 100,
      Sonstiges: 100,
    }

    return categories.map((category) => {
      const spent = expenses
        .filter((expense) => {
          return (expense.category || 'Sonstiges').toLowerCase() === category.toLowerCase()
        })
        .reduce((sum, expense) => {
          return sum + toNumber(expense.amount)
        }, 0)

      const limit = budgetLimits[category] ?? 100
      const remaining = limit - spent
      const percent = limit > 0 ? Math.min(100, Math.max(0, (spent / limit) * 100)) : 0

      return {
        category,
        spent,
        limit,
        remaining,
        percent,
      }
    })
  }, [categories, expenses])

  const value: FinanceContextValue = {
    expenses,
    incomes,
    categories,
    milaFeedback,
    triggerMilaFeedback,
    addExpense,
    deleteExpense,
    addIncome,
    deleteIncome,
    userName,
    setUserName,
    userStatus,
    setUserStatus,
    isLoggedIn,
    login,
    logout,
    summary,
    budgetStatus,
  }

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

export function useFinance() {
  const ctx = useContext(FinanceContext)

  if (!ctx) {
    throw new Error('useFinance must be used within FinanceProvider')
  }

  return ctx
}
