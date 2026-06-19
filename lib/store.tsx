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
export type Industry =
  | 'webdesigner'
  | 'fotograf'
  | 'coach'
  | 'handwerker'
  | 'restaurant'
  | 'ecommerce'
  | 'berater'
  | 'sonstiges'

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
morningBriefing: string
refreshMorningBriefing: () => Promise<void>
  triggerMilaFeedback: (category: string) => void
  addExpense: (expense: {
    title?: string
    vendor?: string
    amount: number | string
    date?: string
    category?: string
    note?: string
    hasReceipt?: boolean
    vat?: number
  }) => Promise<void>
  deleteExpense: (id: string | number) => Promise<void>
  addIncome: (income: {
    title?: string
    client?: string
    amount: number | string
    date?: string
    note?: string
    vat?: number
    status?: string
    source?: string
  }) => Promise<void>
  deleteIncome: (id: string | number) => Promise<void>
  userName: string
  setUserName: (name: string) => void
  userStatus: UserStatus
  setUserStatus: (status: UserStatus) => void
industry: Industry
setIndustry: (industry: Industry) => void
  isLoggedIn: boolean
  login: (name: string, status: UserStatus) => void
  logout: () => void
  summary: Summary
  budgetStatus: BudgetStatus[]
}

// Einheitliche, kleingeschriebene Keys passend zum Formular & der DB
const DEFAULT_CATEGORIES = [
  'software', 'reisen', 'weiterbildung', 'marketing', 'buerobedarf',
  'bewirtung', 'versicherung', 'hardware', 'telefon & internet',
  'miete', 'fahrtkosten', 'bankgebühren', 'sonstiges',
]

// Schönes Mapping für die Anzeige im Budget-Check
export const CATEGORY_LABELS: Record<string, string> = {
  software: 'Software & Tools',
  reisen: 'Reisekosten',
  weiterbildung: 'Weiterbildung',
  marketing: 'Marketing',
  buerobedarf: 'Büro & Arbeitsmittel',
  bewirtung: 'Bewirtung',
  versicherung: 'Versicherung',
  hardware: 'Hardware',
  'telefon & internet': 'Telefon & Internet',
  miete: 'Miete & Coworking',
  fahrtkosten: 'Fahrtkosten',
  bankgebühren: 'Bankgebühren',
  sonstiges: 'Sonstiges',
}

const BUDGET_LIMITS: Record<string, number> = {
  software: 200,
  reisen: 500,
  weiterbildung: 300,
  marketing: 250,
  buerobedarf: 150,
  bewirtung: 200,
  versicherung: 100,
  hardware: 400,
  'telefon & internet': 150,
  miete: 600,
  fahrtkosten: 250,
  bankgebühren: 80,
  sonstiges: 100,
}

const STATUS_VALUES: UserStatus[] = [
  'angestellt', 'selbstständig', 'freelancer', 'kleinunternehmer',
]

const FinanceContext = createContext<FinanceContextValue | null>(null)

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
  if (/hetzner|herzner|hosting|server|canva|figma|adobe|openai|chatgpt|notion|software|app\b|tool\b|saas/.test(text)) return 'software'
  if (/hotel|bahn|\bdb\b|flug|reise|airbnb|booking/.test(text)) return 'reisen'
  if (/kurs|coaching|seminar|workshop|weiterbildung|fortbildung/.test(text)) return 'weiterbildung'
  if (/instagram|meta\b|facebook|google ads|werbung|marketing/.test(text)) return 'marketing'
  if (/büro|buero|papier|stift|drucker|toner/.test(text)) return 'buerobedarf'
  if (/restaurant|caf[eé]|essen|bewirtung|lunch|dinner/.test(text)) return 'bewirtung'
  if (/versicherung|haftpflicht|rechtsschutz/.test(text)) return 'versicherung'
  if (/macbook|iphone|laptop|monitor|hardware|kamera/.test(text)) return 'hardware'
  if (/telefon|internet|mobilfunk|vodafone|telekom|\bo2\b/.test(text)) return 'telefon & internet'
  if (/miete|coworking|bürofläche|buero/.test(text)) return 'miete'
  if (/taxi|uber|bolt|tank|parken|fahrt/.test(text)) return 'fahrtkosten'
  if (/bank|gebühr|gebuehr|konto|paypal|stripe/.test(text)) return 'bankgebühren'
  return 'sonstiges'
}

function getMilaTip(category: string, status: UserStatus): string {
  const displayLabel = CATEGORY_LABELS[category] || category
  const tips: Partial<Record<string, string>> = {
    software:            '💻 Software erkannt. Das kann oft sehr gut als Betriebsausgabe verbucht werden.',
    bewirtung:           '🍽️ Bewirtung erkannt. Notiere am besten Anlass und Teilnehmer.',
    reisen:              '✈️ Reise erkannt. Fahrt, Hotel und Verpflegung können steuerlich relevant sein.',
    weiterbildung:       '🎓 Weiterbildung erkannt. Sehr stark, das ist oft beruflich gut begründbar.',
    marketing:           '📣 Marketing erkannt. Ich ordne das deinen Akquise-Ausgaben zu.',
    hardware:            '🖥️ Hardware erkannt. Je nach Preis kann Abschreibung wichtig sein.',
    'telefon & internet':'📱 Telefon & Internet erkannt. Achte auf berufliche Nutzung.',
  }
  return tips[category] ?? `✨ Ich habe die Buchung als ${displayLabel} eingeordnet. Status: ${status}.`
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [incomes, setIncomes] = useState<Income[]>([])
  const [categories] = useState<string[]>(DEFAULT_CATEGORIES)
  const [milaFeedback, setMilaFeedback] = useState(
  'Hi, ich bin Mila. Ich helfe dir beim Sortieren deiner Finanzen.'
)

const [morningBriefing, setMorningBriefing] = useState('')
  const [userName, setUserName] = useState('Julia')
  
  // Voreinstellung direkt auf "freelancer" für den perfekten Start
  const [userStatus, setUserStatus] = useState<UserStatus>('freelancer')
  const [isLoggedIn, setIsLoggedIn] = useState(true)
const refreshMorningBriefing = async () => {
  const income = incomes.reduce((sum, i) => sum + toNumber(i.amount), 0)
  const expensesTotal = expenses.reduce((sum, e) => sum + toNumber(e.amount), 0)
  const profit = income - expensesTotal

  let tip = 'Behalte deine Steuerrücklage im Auge.'

  if (profit > 1000) {
    tip = 'Dein Monat läuft stark. Prüfe, ob du einen Teil des Überschusses zurücklegen möchtest.'
  }

  if (expenses.length > incomes.length) {
    tip = 'Du hast aktuell mehr Ausgaben als Einnahmen erfasst. Prüfe offene Rechnungen.'
  }

  if (profit < 0) {
    tip = 'Deine Ausgaben liegen aktuell über den Einnahmen. Schau auf größere Kostenblöcke.'
  }

  setMorningBriefing(`
🌸 Guten Tag ${userName}

Einnahmen: ${income.toFixed(2)} €
Ausgaben: ${expensesTotal.toFixed(2)} €
Überschuss: ${profit.toFixed(2)} €

Ich habe aktuell ${expenses.length} Ausgaben und ${incomes.length} Einnahmen für dich im Blick.

💜 Mein Tipp:
${tip}
`)
}
  const income = incomes.reduce((sum, i) => sum + toNumber(i.amount), 0)
  const expensesTotal = expenses.reduce((sum, e) => sum + toNumber(e.amount), 0)
  const profit = income - expensesTotal

useEffect(() => {
  refreshMorningBriefing()
}, [incomes, expenses, userName])

  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const loadData = useCallback(async (signal?: AbortSignal) => {
    try {
      const [expRes, incRes] = await Promise.all([
        fetch('/api/expenses', { signal }),
        fetch('/api/incomes',  { signal }),
      ])

      if (signal?.aborted) return

      const [expJson, incJson] = await Promise.all([
        expRes.json(),
        incRes.json(),
      ])

      if (!mountedRef.current) return

      if (expJson.success) setExpenses(expJson.data ?? [])
      if (incJson.success) setIncomes(incJson.data ?? [])
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      if (mountedRef.current) console.error('Laden fehlgeschlagen:', e)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    loadData(controller.signal)
    return () => controller.abort()
  }, [loadData])

  const login = useCallback((name: string, status: UserStatus) => {
    const safeName   = name?.trim() || 'Julia'
    const safeStatus = isUserStatus(status) ? status : 'freelancer'
    setUserName(safeName)
    setUserStatus(safeStatus)
    setIsLoggedIn(true)
    setMilaFeedback(`Willkommen zurück, ${safeName} ✨`)
    loadData()
  }, [loadData])

  const logout = useCallback(() => {
    setIsLoggedIn(false)
    setUserName('Julia')
    setUserStatus('freelancer')
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
      vat:      expense.vat ?? 19,
      hasReceipt: expense.hasReceipt ?? false
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
      vat:    income.vat ?? 19,
      status: income.status || 'offen',
      source: income.source || 'sonstiges'
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
      
      // Verwende lesbare Labels für die UI ("software" -> "Software & Tools")
      const readableLabel = CATEGORY_LABELS[category] || category
      return { category: readableLabel, spent, limit, remaining, percent }
    })
  }, [categories, expenses])

  const value = useMemo<FinanceContextValue>(() => ({
    expenses, incomes, categories, milaFeedback, morningBriefing,
refreshMorningBriefing, triggerMilaFeedback,
    addExpense, deleteExpense, addIncome, deleteIncome,
    userName, setUserName, userStatus, setUserStatus,
    isLoggedIn, login, logout, summary, budgetStatus,
  }), [
  expenses,
  incomes,
  milaFeedback,
  morningBriefing,
  refreshMorningBriefing,
  triggerMilaFeedback,
  addExpense,
  deleteExpense,
  addIncome,
  deleteIncome,
  userName,
  userStatus,
  isLoggedIn,
  login,
  logout,
  summary,
  budgetStatus,
])

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

export function useFinance() {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider')
  return ctx
}
