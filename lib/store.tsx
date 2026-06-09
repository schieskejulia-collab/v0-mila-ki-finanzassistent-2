'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
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

export type UserStatus =
  | 'angestellt'
  | 'selbstständig'
  | 'freelancer'
  | 'kleinunternehmer'

export type Expense = {
  id: string
  title: string
  vendor: string
  amount: number
  date: string
  category: string
  note?: string
}

export type Income = {
  id: string
  title: string
  client: string
  amount: number
  date: string
  note?: string
}

export type BudgetStatus = {
  category: string
  spent: number
  limit: number
  remaining: number
  percent: number
}

type Summary = {
  totalExpenses: number
  totalIncomes: number
  balance: number
}

interface FinanceContextValue {
  expenses: Expense[]
  incomes: Income[]
  categories: string[]
  milaFeedback: string
  triggerMilaFeedback: (category: string) => void
  addExpense: (expense: {
    title?: string
    vendor?: string
    amount: number | string
    date?: string
    category?: string
    note?: string
  }) => void
  deleteExpense: (id: string) => void
  addIncome: (income: {
    title?: string
    client?: string
    amount: number | string
    date?: string
    note?: string
  }) => void
  deleteIncome: (id: string) => void
  userName: string
  setUserName: (name: string) => void
  userStatus: UserStatus
  setUserStatus: (status: UserStatus) => void
  isLoggedIn: boolean
  login: (name: string, status: UserStatus) => void
  logout: () => void
  summary: Summary
  budgetStatus: BudgetStatus[]
}

const DEFAULT_CATEGORIES = [
  'Software',
  'Reisen',
  'Weiterbildung',
  'Marketing',
  'Bürobedarf',
  'Bewirtung',
  'Versicherung',
  'Hardware',
  'Telefon & Internet',
  'Miete',
  'Fahrtkosten',
  'Bankgebühren',
  'Sonstiges',
]

const STATUS_VALUES: UserStatus[] = [
  'angestellt',
  'selbstständig',
  'freelancer',
  'kleinunternehmer',
]

const FinanceContext = createContext<FinanceContextValue | null>(null)

function createId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

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

export function toNumber(value: number | string | undefined | null): number {
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

export function inferCategory(input: string): string {
  const text = input.toLowerCase()

  if (
    text.includes('canva') ||
    text.includes('figma') ||
    text.includes('adobe') ||
    text.includes('openai') ||
    text.includes('chatgpt') ||
    text.includes('notion') ||
    text.includes('software') ||
    text.includes('app') ||
    text.includes('tool') ||
    text.includes('saas')
  ) {
    return 'Software'
  }

  if (
    text.includes('hotel') ||
    text.includes('bahn') ||
    text.includes('db') ||
    text.includes('flug') ||
    text.includes('reise') ||
    text.includes('airbnb') ||
    text.includes('booking')
  ) {
    return 'Reisen'
  }

  if (
    text.includes('kurs') ||
    text.includes('coaching') ||
    text.includes('seminar') ||
    text.includes('workshop') ||
    text.includes('weiterbildung') ||
    text.includes('fortbildung')
  ) {
    return 'Weiterbildung'
  }

  if (
    text.includes('instagram') ||
    text.includes('meta') ||
    text.includes('facebook') ||
    text.includes('google ads') ||
    text.includes('werbung') ||
    text.includes('marketing')
  ) {
    return 'Marketing'
  }

  if (
    text.includes('büro') ||
    text.includes('buero') ||
    text.includes('papier') ||
    text.includes('stift') ||
    text.includes('drucker') ||
    text.includes('toner')
  ) {
    return 'Bürobedarf'
  }

  if (
    text.includes('restaurant') ||
    text.includes('cafe') ||
    text.includes('café') ||
    text.includes('essen') ||
    text.includes('bewirtung') ||
    text.includes('lunch') ||
    text.includes('dinner')
  ) {
    return 'Bewirtung'
  }

  if (
    text.includes('versicherung') ||
    text.includes('haftpflicht') ||
    text.includes('rechtsschutz')
  ) {
    return 'Versicherung'
  }

  if (
    text.includes('macbook') ||
    text.includes('iphone') ||
    text.includes('laptop') ||
    text.includes('monitor') ||
    text.includes('hardware') ||
    text.includes('kamera')
  ) {
    return 'Hardware'
  }

  if (
    text.includes('telefon') ||
    text.includes('internet') ||
    text.includes('mobilfunk') ||
    text.includes('vodafone') ||
    text.includes('telekom') ||
    text.includes('o2')
  ) {
    return 'Telefon & Internet'
  }

  if (
    text.includes('miete') ||
    text.includes('coworking') ||
    text.includes('bürofläche') ||
    text.includes('buero')
  ) {
    return 'Miete'
  }

  if (
    text.includes('taxi') ||
    text.includes('uber') ||
    text.includes('bolt') ||
    text.includes('tank') ||
    text.includes('parken') ||
    text.includes('fahrt')
  ) {
    return 'Fahrtkosten'
  }

  if (
    text.includes('bank') ||
    text.includes('gebühr') ||
    text.includes('gebuehr') ||
    text.includes('konto') ||
    text.includes('paypal') ||
    text.includes('stripe')
  ) {
    return 'Bankgebühren'
  }

  return 'Sonstiges'
}

function getMilaTip(category: string, status: UserStatus) {
  if (category === 'Software') {
    return '💻 Software erkannt. Das kann oft sehr gut als Betriebsausgabe verbucht werden.'
  }

  if (category === 'Bewirtung') {
    return '🍽️ Bewirtung erkannt. Notiere am besten Anlass und Teilnehmer.'
  }

  if (category === 'Reisen') {
    return '✈️ Reise erkannt. Fahrt, Hotel und Verpflegung können steuerlich relevant sein.'
  }

  if (category === 'Weiterbildung') {
    return '🎓 Weiterbildung erkannt. Sehr stark, das ist oft beruflich gut begründbar.'
  }

  if (category === 'Marketing') {
    return '📣 Marketing erkannt. Ich ordne das deinen Akquise-Ausgaben zu.'
  }

  if (category === 'Hardware') {
    return '💻 Hardware erkannt. Je nach Preis kann Abschreibung wichtig sein.'
  }

  if (category === 'Telefon & Internet') {
    return '📱 Telefon & Internet erkannt. Achte auf berufliche Nutzung.'
  }

  return `✨ Ich habe die Buchung als ${category} eingeordnet. Status: ${status}.`
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [incomes, setIncomes] = useState<Income[]>([])
  const [categories] = useState<string[]>(DEFAULT_CATEGORIES)
  const [milaFeedback, setMilaFeedback] = useState(
    'Hi, ich bin Mila. Ich helfe dir beim Sortieren deiner Finanzen.'
  )
  const [userName, setUserName] = useState('Julia')
  const [userStatus, setUserStatus] = useState<UserStatus>('selbstständig')
  const [isLoggedIn, setIsLoggedIn] = useState(true)
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
      window.localStorage.setItem('mila_name', userName)
      window.localStorage.setItem('mila_status', userStatus)
      window.localStorage.setItem('mila_expenses', JSON.stringify(expenses))
      window.localStorage.setItem('mila_incomes', JSON.stringify(incomes))
    } catch {
      // Mila läuft weiter, auch wenn localStorage blockiert ist.
    }
  }, [userName, userStatus, expenses, incomes, mounted])

  const login = (name: string, status: UserStatus) => {
    setUserName(name || 'Julia')
    setUserStatus(status)
    setIsLoggedIn(true)
    setMilaFeedback(`Willkommen zurück, ${name || 'Julia'} ✨`)
  }

  const logout = () => {
    setIsLoggedIn(false)
    setUserName('Julia')
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
      // Ignorieren.
    }
  }

  const triggerMilaFeedback = (category: string) => {
    setMilaFeedback(getMilaTip(category, userStatus))
  }

  const addExpense = (expense: {
    title?: string
    vendor?: string
    amount: number | string
    date?: string
    category?: string
    note?: string
  }) => {
    const title = expense.title?.trim() || 'Ausgabe'
    const vendor = expense.vendor?.trim() || ''
    const automaticCategory = inferCategory(`${title} ${vendor} ${expense.note || ''}`)
    const category =
      expense.category && expense.category !== 'Automatisch'
        ? expense.category
        : automaticCategory

    const newExpense: Expense = {
      id: createId('expense'),
      title,
      vendor,
      amount: toNumber(expense.amount),
      date: expense.date || new Date().toISOString().slice(0, 10),
      category,
      note: expense.note?.trim() || '',
    }

    setExpenses((prev) => [newExpense, ...prev])
    setMilaFeedback(getMilaTip(category, userStatus))
  }

  const deleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((expense) => expense.id !== id))
    setMilaFeedback('Die Ausgabe wurde gelöscht.')
  }

  const addIncome = (income: {
    title?: string
    client?: string
    amount: number | string
    date?: string
    note?: string
  }) => {
    const newIncome: Income = {
      id: createId('income'),
      title: income.title?.trim() || 'Einnahme',
      client: income.client?.trim() || '',
      amount: toNumber(income.amount),
      date: income.date || new Date().toISOString().slice(0, 10),
      note: income.note?.trim() || '',
    }

    setIncomes((prev) => [newIncome, ...prev])
    setMilaFeedback('💰 Einnahme gespeichert. Ich habe deinen Überblick aktualisiert.')
  }

  const deleteIncome = (id: string) => {
    setIncomes((prev) => prev.filter((income) => income.id !== id))
    setMilaFeedback('Die Einnahme wurde gelöscht.')
  }

  const summary = useMemo<Summary>(() => {
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

  const budgetStatus = useMemo<BudgetStatus[]>(() => {
    const budgetLimits: Record<string, number> = {
      Software: 200,
      Reisen: 500,
      Weiterbildung: 300,
      Marketing: 250,
      Bürobedarf: 150,
      Bewirtung: 200,
      Versicherung: 100,
      Hardware: 400,
      'Telefon & Internet': 150,
      Miete: 600,
      Fahrtkosten: 250,
      Bankgebühren: 80,
      Sonstiges: 100,
    }

    return categories.map((category) => {
      const spent = expenses
        .filter((expense) => expense.category === category)
        .reduce((sum, expense) => sum + toNumber(expense.amount), 0)

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
