'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type UserStatus =
  | 'angestellt'
  | 'selbstständig'
  | 'freelancer'
  | 'kleinunternehmer'

export type Expense = {
  id: string | number
  title: string
  vendor: string
  amount: number
  date: string
  category: string
  note?: string | null
}

export type Income = {
  id: string | number
  title: string
  client: string
  amount: number
  date: string
  note?: string | null
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
  }) => Promise<void>
  deleteExpense: (id: string | number) => Promise<void>
  addIncome: (income: {
    title?: string
    client?: string
    amount: number | string
    date?: string
    note?: string
  }) => Promise<void>
  deleteIncome: (id: string | number) => Promise<void>
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

function isUserStatus(value: unknown): value is UserStatus {
  return typeof value === 'string' && STATUS_VALUES.includes(value as UserStatus)
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
    'Hi, ich bin Mila. Ich helfe dir beim Sortieren deiner Finanzen.',
  )
  const [userName, setUserName] = useState('Julia')
  const [userStatus, setUserStatus] = useState<UserStatus>('selbstständig')
  const [isLoggedIn, setIsLoggedIn] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [expRes, incRes] = await Promise.all([
          fetch('/api/expenses'),
          fetch('/api/incomes'),
        ])

        const expJson = await expRes.json()
        const incJson = await incRes.json()

        if (expJson.success) {
          setExpenses(expJson.data || [])
        }

        if (incJson.success) {
          setIncomes(incJson.data || [])
        }
      } catch (e) {
        console.error('Laden fehlgeschlagen:', e)
      }
    }

    loadData()
  }, [])

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
  }

  const triggerMilaFeedback = (category: string) => {
    setMilaFeedback(getMilaTip(category, userStatus))
  }

  const addExpense: FinanceContextValue['addExpense'] = async (expense) => {
    const title = expense.title?.trim() || 'Ausgabe'
    const vendor = expense.vendor?.trim() || ''
    const automaticCategory = inferCategory(`${title} ${vendor} ${expense.note || ''}`)
    const category =
      expense.category && expense.category !== 'Automatisch'
        ? expense.category
        : automaticCategory

    const payload = {
      title,
      vendor,
      amount: toNumber(expense.amount),
      date: expense.date || new Date().toISOString().slice(0, 10),
      category,
      note: expense.note?.trim() || '',
    }

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!data.success) {
        console.error('Supabase Fehler (Expense):', data)
        setMilaFeedback('Da ging etwas schief. Versuch es gleich nochmal.')
        return
      }

      const saved: Expense = data.data?.[0]
      setExpenses((prev) => [saved, ...prev])
      setMilaFeedback(getMilaTip(category, userStatus))
    } catch (e) {
      console.error('Netzwerkfehler (Expense):', e)
      setMilaFeedback('Die Verbindung war kurz weg. Versuch es gleich nochmal.')
    }
  }

  const deleteExpense: FinanceContextValue['deleteExpense'] = async (id) => {
    try {
      const res = await fetch(`/api/expenses?id=${id}`, {
        method: 'DELETE',
      })
      const data = await res.json()

      if (!data.success) {
        console.error('Supabase Fehler (Delete Expense):', data)
        return
      }

      setExpenses((prev) => prev.filter((e) => String(e.id) !== String(id)))
      setMilaFeedback('Die Ausgabe wurde gelöscht.')
    } catch (e) {
      console.error('Netzwerkfehler (Delete Expense):', e)
    }
  }

  const addIncome: FinanceContextValue['addIncome'] = async (income) => {
    const payload = {
      title: income.title?.trim() || 'Einnahme',
      client: income.client?.trim() || '',
      amount: toNumber(income.amount),
      date: income.date || new Date().toISOString().slice(0, 10),
      note: income.note?.trim() || '',
    }

    try {
      const res = await fetch('/api/incomes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!data.success) {
        console.error('Supabase Fehler (Income):', data)
        setMilaFeedback('Da ging etwas schief. Versuch es gleich nochmal.')
        return
      }

      const saved: Income = data.data?.[0]
      setIncomes((prev) => [saved, ...prev])
      setMilaFeedback('💰 Einnahme gespeichert. Ich habe deinen Überblick aktualisiert.')
    } catch (e) {
      console.error('Netzwerkfehler (Income):', e)
      setMilaFeedback('Die Verbindung war kurz weg. Versuch es gleich nochmal.')
    }
  }

  const deleteIncome: FinanceContextValue['deleteIncome'] = async (id) => {
    try {
      const res = await fetch(`/api/incomes?id=${id}`, {
        method: 'DELETE',
      })
      const data = await res.json()

      if (!data.success) {
        console.error('Supabase Fehler (Delete Income):', data)
        return
      }

      setIncomes((prev) => prev.filter((i) => String(i.id) !== String(id)))
      setMilaFeedback('Die Einnahme wurde gelöscht.')
    } catch (e) {
      console.error('Netzwerkfehler (Delete Income):', e)
    }
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
