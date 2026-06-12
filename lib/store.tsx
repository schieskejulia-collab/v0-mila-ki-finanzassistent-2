'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  'Software', 'Reisen', 'Weiterbildung', 'Marketing', 'Bürobedarf',
  'Bewirtung', 'Versicherung', 'Hardware', 'Telefon & Internet',
  'Miete', 'Fahrtkosten', 'Bankgebühren', 'Sonstiges',
]

// ✅ Fix #6: Außerhalb von useMemo, wird nicht bei jedem Render neu erzeugt
const BUDGET_LIMITS: Record<string, number> = {
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

const STATUS_VALUES: UserStatus[] = [
  'angestellt', 'selbstständig', 'freelancer', 'kleinunternehmer',
]

const FinanceContext = createContext<FinanceContextValue | null>(null)

// ✅ Fix #4: isUserStatus jetzt tatsächlich genutzt (in login)
function isUserStatus(value: unknown): value is UserStatus {
  return typeof value === 'string' && STATUS_VALUES.includes(value as UserStatus)
}

export function toNumber(value: number | string | undefined | null): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
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
  if (/canva|figma|adobe|openai|chatgpt|notion|software|app\b|tool\b|saas/.test(text)) return 'Software'
  if (/hotel|bahn|\bdb\b|flug|reise|airbnb|booking/.test(text)) return 'Reisen'
  if (/kurs|coaching|seminar|workshop|weiterbildung|fortbildung/.test(text)) return 'Weiterbildung'
  if (/instagram|meta\b|facebook|google ads|werbung|marketing/.test(text)) return 'Marketing'
  if (/büro|buero|papier|stift|drucker|toner/.test(text)) return 'Bürobedarf'
  if (/restaurant|caf[eé]|essen|bewirtung|lunch|dinner/.test(text)) return 'Bewirtung'
  if (/versicherung|haftpflicht|rechtsschutz/.test(text)) return 'Versicherung'
  if (/macbook|iphone|laptop|monitor|hardware|kamera/.test(text)) return 'Hardware'
  if (/telefon|internet|mobilfunk|vodafone|telekom|\bo2\b/.test(text)) return 'Telefon & Internet'
  if (/miete|coworking|bürofläche|buero/.test(text)) return 'Miete'
  if (/taxi|uber|bolt|tank|parken|fahrt/.test(text)) return 'Fahrtkosten'
  if (/bank|gebühr|gebuehr|konto|paypal|stripe/.test(text)) return 'Bankgebühren'
  return 'Sonstiges'
}

function getMilaTip(category: string, status: UserStatus): string {
  const tips: Partial<Record<string, string>> = {
    Software:            '💻 Software erkannt. Das kann oft sehr gut als Betriebsausgabe verbucht werden.',
    Bewirtung:           '🍽️ Bewirtung erkannt. Notiere am besten Anlass und Teilnehmer.',
    Reisen:              '✈️ Reise erkannt. Fahrt, Hotel und Verpflegung können steuerlich relevant sein.',
    Weiterbildung:       '🎓 Weiterbildung erkannt. Sehr stark, das ist oft beruflich gut begründbar.',
    Marketing:           '📣 Marketing erkannt. Ich ordne das deinen Akquise-Ausgaben zu.',
    Hardware:            '🖥️ Hardware erkannt. Je nach Preis kann Abschreibung wichtig sein.',
    'Telefon & Internet':'📱 Telefon & Internet erkannt. Achte auf berufliche Nutzung.',
  }
  return tips[category] ?? `✨ Ich habe die Buchung als ${category} eingeordnet. Status: ${status}.`
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

  // ✅ Fix #2: mountedRef verhindert State-Updates auf unmountierter Komponente
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // ✅ Fix #3: loadData als useCallback, damit login es aufrufen kann
  const loadData = useCallback(async (signal?: AbortSignal) => {
    try {
      const [expRes, incRes] = await Promise.all([
        fetch('/api/expenses', { signal }),
        fetch('/api/incomes',  { signal }),
      ])

      // Fetch wurde abgebrochen → kein weiteres State-Update
      if (signal?.aborted) return

      const [expJson, incJson] = await Promise.all([
        expRes.json(),
        incRes.json(),
      ])

      if (!mountedRef.current) return   // Komponente bereits unmountet

      if (expJson.success) setExpenses(expJson.data ?? [])
      if (incJson.success) setIncomes(incJson.data ?? [])
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      if (mountedRef.current) console.error('Laden fehlgeschlagen:', e)
    }
  }, [])

  // ✅ Fix #2: AbortController saubert beim Unmount / Re-Render auf
  useEffect(() => {
    const controller = new AbortController()
    loadData(controller.signal)
    return () => controller.abort()
  }, [loadData])

  // ✅ Fix #4: status wird mit isUserStatus validiert
  const login = useCallback((name: string, status: UserStatus) => {
    const safeName   = name?.trim() || 'Julia'
    const safeStatus = isUserStatus(status) ? status : 'selbstständig'
    setUserName(safeName)
    setUserStatus(safeStatus)
    setIsLoggedIn(true)
    setMilaFeedback(`Willkommen zurück, ${safeName} ✨`)
    // ✅ Fix #3: Daten nach Login sofort laden
    loadData()
  }, [loadData])

  const logout = useCallback(() => {
    setIsLoggedIn(false)
    setUserName('Julia')
    setUserStatus('selbstständig')
    setExpenses([])
    setIncomes([])
    setMilaFeedback('Du wurdest ausgeloggt. Ich bin bereit, wenn du zurück bist.')
  }, [])

  const triggerMilaFeedback = useCallback((category: string) => {
    setMilaFeedback(getMilaTip(category, userStatus))
  }, [userStatus])

  const addExpense: FinanceContextValue['addExpense'] = useCallback(async (expense) => {
    const title   = expense.title?.trim()  || 'Ausgabe'
    const vendor  = expense.vendor?.trim() || ''
    const autoCategory = inferCategory(`${title} ${vendor} ${expense.note ?? ''}`)
    const category =
      expense.category && expense.category !== 'Automatisch'
        ? expense.category
        : autoCategory

    const payload = {
      title,
      vendor,
      amount:   toNumber(expense.amount),
      date:     expense.date || new Date().toISOString().slice(0, 10),
      category,
      note:     expense.note?.trim() || '',
    }

    try {
      const res  = await fetch('/api/expenses', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      const data = await res.json()

      if (!data.success) {
        console.error('Supabase Fehler (Expense):', data)
        setMilaFeedback('Da ging etwas schief. Versuch es gleich nochmal.')
        return
      }

      // ✅ Fix #5: Guard gegen undefined / leeres Array
      const saved: Expense | undefined = data.data?.[0]
      if (!saved) {
        console.error('Keine gespeicherte Expense zurückerhalten:', data)
        setMilaFeedback('Gespeichert, aber die Antwort war unerwartet. Bitte Seite neu laden.')
        return
      }

      if (mountedRef.current) {
        setExpenses((prev) => [saved, ...prev])
        setMilaFeedback(getMilaTip(category, userStatus))
      }
    } catch (e) {
      console.error('Netzwerkfehler (Expense):', e)
      if (mountedRef.current)
        setMilaFeedback('Die Verbindung war kurz weg. Versuch es gleich nochmal.')
    }
  }, [userStatus])

  const deleteExpense: FinanceContextValue['deleteExpense'] = useCallback(async (id) => {
    try {
      const res  = await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' })
      const data = await res.json()

      if (!data.success) {
        console.error('Supabase Fehler (Delete Expense):', data)
        return
      }

      if (mountedRef.current) {
        setExpenses((prev) => prev.filter((e) => String(e.id) !== String(id)))
        setMilaFeedback('Die Ausgabe wurde gelöscht.')
      }
    } catch (e) {
      console.error('Netzwerkfehler (Delete Expense):', e)
    }
  }, [])

  const addIncome: FinanceContextValue['addIncome'] = useCallback(async (income) => {
    const payload = {
      title:  income.title?.trim()  || 'Einnahme',
      client: income.client?.trim() || '',
      amount: toNumber(income.amount),
      date:   income.date || new Date().toISOString().slice(0, 10),
      note:   income.note?.trim() || '',
    }

    try {
      const res  = await fetch('/api/incomes', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      const data = await res.json()

      if (!data.success) {
        console.error('Supabase Fehler (Income):', data)
        setMilaFeedback('Da ging etwas schief. Versuch es gleich nochmal.')
        return
      }

      // ✅ Fix #5: Guard gegen undefined / leeres Array
      const saved: Income | undefined = data.data?.[0]
      if (!saved) {
        console.error('Keine gespeicherte Income zurückerhalten:', data)
        setMilaFeedback('Gespeichert, aber die Antwort war unerwartet. Bitte Seite neu laden.')
        return
      }

      if (mountedRef.current) {
        setIncomes((prev) => [saved, ...prev])
        setMilaFeedback('💰 Einnahme gespeichert. Ich habe deinen Überblick aktualisiert.')
      }
    } catch (e) {
      console.error('Netzwerkfehler (Income):', e)
      if (mountedRef.current)
        setMilaFeedback('Die Verbindung war kurz weg. Versuch es gleich nochmal.')
    }
  }, [])

  const deleteIncome: FinanceContextValue['deleteIncome'] = useCallback(async (id) => {
    try {
      const res  = await fetch(`/api/incomes?id=${id}`, { method: 'DELETE' })
      const data = await res.json()

      if (!data.success) {
        console.error('Supabase Fehler (Delete Income):', data)
        return
      }

      if (mountedRef.current) {
        setIncomes((prev) => prev.filter((i) => String(i.id) !== String(id)))
        setMilaFeedback('Die Einnahme wurde gelöscht.')
      }
    } catch (e) {
      console.error('Netzwerkfehler (Delete Income):', e)
    }
  }, [])

  const summary = useMemo<Summary>(() => {
    const totalExpenses = expenses.reduce((sum, e) => sum + toNumber(e.amount), 0)
    const totalIncomes  = incomes.reduce((sum,  i) => sum + toNumber(i.amount), 0)
    return { totalExpenses, totalIncomes, balance: totalIncomes - totalExpenses }
  }, [expenses, incomes])

  const budgetStatus = useMemo<BudgetStatus[]>(() => {
    return categories.map((category) => {
      const spent = expenses
        .filter((e) => e.category === category)
        .reduce((sum, e) => sum + toNumber(e.amount), 0)
      const limit     = BUDGET_LIMITS[category] ?? 100
      const remaining = limit - spent
      const percent   = limit > 0 ? Math.min(100, Math.max(0, (spent / limit) * 100)) : 0
      return { category, spent, limit, remaining, percent }
    })
  }, [categories, expenses])

  const value = useMemo<FinanceContextValue>(() => ({
    expenses, incomes, categories, milaFeedback, triggerMilaFeedback,
    addExpense, deleteExpense, addIncome, deleteIncome,
    userName, setUserName, userStatus, setUserStatus,
    isLoggedIn, login, logout, summary, budgetStatus,
  }), [
    expenses, incomes, milaFeedback, triggerMilaFeedback,
    addExpense, deleteExpense, addIncome, deleteIncome,
    userName, userStatus, isLoggedIn, login, logout, summary, budgetStatus,
  ])

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

export function useFinance() {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider')
  return ctx
}