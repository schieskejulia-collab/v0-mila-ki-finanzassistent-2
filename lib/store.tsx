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

import { supabase } from '@/lib/supabase'

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
  status?: string
  due_date?: string
  dueDate?: string
  invoiceNumber?: string
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
  setIncomes: (incomes: Income[]) => void
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
  taxClass: string
  setTaxClass: (value: string) => void
  annualGross: string
  setAnnualGross: (value: string) => void
  annualProfit: string
  setAnnualProfit: (value: string) => void
  vatStatus: string
  setVatStatus: (value: string) => void
  federalState: string
  setFederalState: (value: string) => void
  churchTax: string
  setChurchTax: (value: string) => void
  married: string
  setMarried: (value: string) => void
  children: string
  setChildren: (value: string) => void
  assemblyWork: string
  setAssemblyWork: (value: string) => void
}

const DEFAULT_CATEGORIES = [
  'software',
  'hardware',
  'elektronik',
  'telefon & internet',
  'marketing',
  'buerobedarf',
  'reisen',
  'fahrtkosten',
  'bewirtung',
  'weiterbildung',
  'versicherung',
  'miete',
  'bankgebühren',
  'material',
  'werkzeug',
  'arbeitskleidung',
  'sonstiges',
]

export const CATEGORY_LABELS: Record<string, string> = {
  software: 'Software & IT',
  hardware: 'Hardware',
  elektronik: 'Elektronik',
  'telefon & internet': 'Telefon & Internet',
  marketing: 'Marketing',
  buerobedarf: 'Büro & Arbeitsmittel',
  reisen: 'Reisekosten',
  fahrtkosten: 'Fahrtkosten',
  bewirtung: 'Bewirtung',
  weiterbildung: 'Weiterbildung',
  versicherung: 'Versicherung',
  miete: 'Miete & Coworking',
  bankgebühren: 'Bankgebühren',
  material: 'Material',
  werkzeug: 'Werkzeug',
  arbeitskleidung: 'Arbeitskleidung',
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

const STATUS_VALUES: UserStatus[] = ['angestellt', 'selbstständig', 'freelancer', 'kleinunternehmer']

const FinanceContext = createContext<FinanceContextValue | null>(null)

function isUserStatus(value: unknown): value is UserStatus {
  return typeof value === 'string' && STATUS_VALUES.includes(value as UserStatus)
}

export function toNumber(value: number | string | undefined | null): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const raw = String(value ?? '').trim()
  if (!raw) return 0
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw
  const cleaned = normalized.replace(/[^\d.-]/g, '')
  const number = Number(cleaned)
  return Number.isFinite(number) ? number : 0
}

// ✅ ECHTE MILA-TIPPS FÜR PUNKTE 2, 3, 4 WIEDERHERGESTELLT
function getMilaTip(category: string, status: UserStatus): string {
  if (status === 'angestellt') {
    if (category === 'software') return '💻 Nutzt du das privat oder beruflich? Als Angestellte kannst du Arbeitsmittel bis 110 € oft direkt ohne Beleg als Werbungskosten absetzen!'
    if (category === 'fahrtkosten') return '🚗 Pendlerpauschale nicht vergessen! Jeder Kilometer Arbeitsweg bringt dir bares Geld in der Steuererklärung zurück.'
    if (category === 'weiterbildung') return '📚 Fortbildungskosten sind voll abziehbar. Heb die Rechnung und das Zertifikat gut für das Finanzamt auf.'
  } else {
    // Selbstständig, Freelancer, Kleinunternehmer
    if (category === 'software') return '⚙️ Software-Abos (SaaS) sind sofort abziehbare Betriebsausgaben. Achte darauf, dass die Rechnung auf deinen Namen läuft!'
    if (category === 'reisen') return '✈️ Geschäftsreisen? Denke neben Hotelbelegen auch an die Verpflegungsmehraufwendungen (Pauschalen pro Tag)!'
    if (category === 'marketing') return '📣 Marketingkosten mindern deinen Gewinn direkt. Perfekt, um deine Steuerlast legal zu senken.'
    if (category === 'miete') return '🏢 Miete für dein Büro oder Coworking ist voll abziehbar. Bei Homeoffice gelten Sonderregeln – Mila behält das im Blick.'
  }
  return `✨ Gebucht unter "${CATEGORY_LABELS[category] || category}". Mila hat deine Ausgabenübersicht aktualisiert und prüft deine Budgets.`
}

export function inferCategory(input: string): string {
  const text = input.toLowerCase()
  if (/laptop|notebook|computer|pc|macbook|monitor|bildschirm|maus|funkmaus|tastatur|keyboard|drucker|scanner|webcam|headset|usb|adapter|kabel|dock|hardware/.test(text)) return 'hardware'
  if (/mediamarkt|saturn|elektronik|technik/.test(text)) return 'elektronik'
  if (/werkzeug|bohrer|akkuschrauber|maschine|schrauben|zange|hammer/.test(text)) return 'werkzeug'
  if (/material|farbe|holz|metall|rohr|kabelkanal|baustoff/.test(text)) return 'material'
  if (/arbeitskleidung|arbeitsschuhe|schutzbrille|handschuhe|helm/.test(text)) return 'arbeitskleidung'
  if (/hetzner|hosting|server|canva|figma|adobe|openai|chatgpt|notion|software|app\b|tool\b|saas/.test(text)) return 'software'
  if (/telefon|internet|mobilfunk|vodafone|telekom|\bo2\b/.test(text)) return 'telefon & internet'
  if (/hotel|bahn|\bdb\b|flug|reise|airbnb|booking/.test(text)) return 'reisen'
  if (/kurs|coaching|seminar|workshop|weiterbildung|fortbildung/.test(text)) return 'weiterbildung'
  if (/instagram|meta\b|facebook|google ads|werbung|marketing/.test(text)) return 'marketing'
  if (/büro|buero|papier|stift|toner/.test(text)) return 'buerobedarf'
  if (/restaurant|caf[eé]|essen|bewirtung|lunch|dinner/.test(text)) return 'bewirtung'
  if (/versicherung|haftpflicht|rechtsschutz/.test(text)) return 'versicherung'
  if (/miete|coworking|bürofläche|buero/.test(text)) return 'miete'
  if (/taxi|uber|bolt|tank|parken|fahrt/.test(text)) return 'fahrtkosten'
  if (/bank|gebühr|gebuehr|konto|paypal|stripe/.test(text)) return 'bankgebühren'
  return 'sonstiges'
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [incomes, setIncomes] = useState<Income[]>([])
  const [categories] = useState<string[]>(DEFAULT_CATEGORIES)
  const [milaFeedback, setMilaFeedback] = useState('Hi, ich bin Mila. Ich helfe dir beim Sortieren deiner Finanzen.')
  const [industry, setIndustry] = useState<Industry>('webdesigner')
  const [morningBriefing, setMorningBriefing] = useState('')
  const [userName, setUserName] = useState('Julia')
  const [userStatus, setUserStatus] = useState<UserStatus>('freelancer')
  
  const [taxClass, setTaxClass] = useState('1')
  const [annualGross, setAnnualGross] = useState('')
  const [annualProfit, setAnnualProfit] = useState('')
  const [vatStatus, setVatStatus] = useState('kleinunternehmer')
  const [federalState, setFederalState] = useState('Sachsen-Anhalt')
  const [churchTax, setChurchTax] = useState('nein')
  const [married, setMarried] = useState('nein')
  const [childrenCount, setChildrenCount] = useState('0')
  const [assemblyWork, setAssemblyWork] = useState('nein')
  const [isLoggedIn, setIsLoggedIn] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem('mila_profile_central')
    if (!saved) return
    try {
      const p = JSON.parse(saved)
      if (p.userName) setUserName(p.userName)
      if (p.userStatus) setUserStatus(p.userStatus)
      if (p.industry) setIndustry(p.industry)
      if (p.taxClass) setTaxClass(p.taxClass)
      if (p.annualGross) setAnnualGross(p.annualGross)
      if (p.annualProfit) setAnnualProfit(p.annualProfit)
      if (p.vatStatus) setVatStatus(p.vatStatus)
      if (p.federalState) setFederalState(p.federalState)
      if (p.churchTax) setChurchTax(p.churchTax)
      if (p.married) setMarried(p.married)
      if (p.childrenCount) setChildrenCount(p.childrenCount)
      if (p.assemblyWork) setAssemblyWork(p.assemblyWork)
    } catch (e) {
      console.error('Fehler beim Laden des zentralen Profils', e)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(
      'mila_profile_central',
      JSON.stringify({
        userName,
        userStatus,
        industry,
        taxClass,
        annualGross,
        annualProfit,
        vatStatus,
        federalState,
        churchTax,
        married,
        childrenCount,
        assemblyWork,
      })
    )
  }, [
    userName,
    userStatus,
    industry,
    taxClass,
    annualGross,
    annualProfit,
    vatStatus,
    federalState,
    churchTax,
    married,
    childrenCount,
    assemblyWork,
  ])

  const refreshMorningBriefing = async () => {
    const incomeTotal = incomes.reduce((sum, i) => sum + toNumber(i.amount), 0)
    const expensesTotal = expenses.reduce((sum, e) => sum + toNumber(e.amount), 0)
    const profit = incomeTotal - expensesTotal

    let tip = 'Behalte deine Steuerrücklage im Auge.'
    if (profit > 1000) tip = 'Dein Monat läuft stark. Prüfe, ob du einen Teil des Überschusses zurücklegen möchtest.'
    if (expenses.length > incomes.length) tip = 'Du hast aktuell mehr Ausgaben als Einnahmen erfasst. Prüfe offene Rechnungen.'
    if (profit < 0) tip = 'Deine Ausgaben liegen aktuell über den Einnahmen. Schau auf größere Kostenblöcke.'

    setMorningBriefing(`
🌸 Guten Tag ${userName}

Einnahmen: ${incomeTotal.toFixed(2)} €
Ausgaben: ${expensesTotal.toFixed(2)} €
Überschuss: ${profit.toFixed(2)} €

Ich habe aktuell ${expenses.length} Ausgaben und ${incomes.length} Einnahmen für dich im Blick.

💜 Mein Tipp:
${tip}
`)
  }

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
      const [expJson, incJson] = await Promise.all([expRes.json(), incRes.json()])
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

  const addExpense = useCallback(async (expense: any) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setMilaFeedback('Bitte zuerst einloggen, bevor du Buchungen speicherst.')
      return
    }
    const title = expense.title?.trim() || 'Ausgabe'
    const vendor = expense.vendor?.trim() || ''
    const autoCategory = inferCategory(`${title} ${vendor} ${expense.note ?? ''}`)
    const category = expense.category && expense.category !== 'Automatisch' && expense.category !== 'sonstiges' ? expense.category : autoCategory

    const payload = {
      title,
      vendor,
      amount: toNumber(expense.amount),
      date: expense.date || new Date().toISOString().slice(0, 10),
      category,
      note: expense.note?.trim() || '',
      vat: expense.vat ?? 19,
      user_id: user.id,
    }

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      const saved = data.data?.[0]
      if (mountedRef.current && saved) {
        setExpenses((prev) => [saved, ...prev])
        setMilaFeedback(getMilaTip(category, userStatus))
      }
    } catch (e) {
      console.error(e)
    }
  }, [userStatus])

  const deleteExpense = useCallback(async (id: string | number) => {
    try {
      const res = await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success && mountedRef.current) {
        setExpenses((prev) => prev.filter((e) => String(e.id) !== String(id)))
        setMilaFeedback('Die Ausgabe wurde gelöscht.')
      }
    } catch (e) {
      console.error(e)
    }
  }, [])

  const addIncome = useCallback(async (income: any) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const payload = {
      title: income.title?.trim() || 'Einnahme',
      client: income.client?.trim() || '',
      amount: toNumber(income.amount),
      date: income.date || new Date().toISOString().slice(0, 10),
      note: income.note?.trim() || '',
      user_id: user.id,
      created_at: new Date().toISOString(),
    }
    try {
      const res = await fetch('/api/incomes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      const saved = data.data?.[0]
      if (mountedRef.current && saved) {
        setIncomes((prev) => [saved, ...prev])
        setMilaFeedback('💰 Einnahme gespeichert.')
      }
    } catch (e) {
      console.error(e)
    }
  }, [])

  const deleteIncome = useCallback(async (id: string | number) => {
    try {
      const res = await fetch(`/api/incomes?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success && mountedRef.current) {
        setIncomes((prev) => prev.filter((i) => String(i.id) !== String(id)))
      }
    } catch (e) {
      console.error(e)
    }
  }, [])

  const summary = useMemo<Summary>(() => {
    const totalExpenses = expenses.reduce((sum, e) => sum + toNumber(e.amount), 0)
    const totalIncomes  = incomes.reduce((sum,  i) => sum + toNumber(i.amount), 0)
    return { totalExpenses, totalIncomes, balance: totalIncomes - totalExpenses }
  }, [expenses, incomes])

  const budgetStatus = useMemo<BudgetStatus[]>(() => {
    return categories.map((category) => {
      const spent = expenses.filter((e) => e.category === category).reduce((sum, e) => sum + toNumber(e.amount), 0)
      const limit     = BUDGET_LIMITS[category] ?? 100
      const remaining = limit - spent
      const percent   = limit > 0 ? Math.min(100, Math.max(0, (spent / limit) * 100)) : 0
      return { category: CATEGORY_LABELS[category] || category, spent, limit, remaining, percent }
    })
  }, [categories, expenses])

  const value = useMemo<FinanceContextValue>(() => ({
    expenses,
    incomes,
    setIncomes,
    categories,
    milaFeedback,
    morningBriefing,
    refreshMorningBriefing,
    triggerMilaFeedback,
    addExpense,
    deleteExpense,
    addIncome,
    deleteIncome,
    userName,
    setUserName,
    userStatus,
    setUserStatus,
    industry,
    setIndustry,
    taxClass,
    setTaxClass,
    annualGross,
    setAnnualGross,
    annualProfit,
    setAnnualProfit,
    vatStatus,
    setVatStatus,
    federalState,
    setFederalState,
    churchTax,
    setChurchTax,
    married,
    setMarried,
    children: childrenCount,
    setChildren: setChildrenCount,
    assemblyWork,
    setAssemblyWork,
    isLoggedIn,
    login,
    logout,
    summary,
    budgetStatus,
  }), [
    expenses, incomes, categories, milaFeedback, morningBriefing, userName, userStatus, industry,
    taxClass, annualGross, annualProfit, vatStatus, federalState, churchTax, married, childrenCount,
    assemblyWork, isLoggedIn, login, logout, summary, budgetStatus
  ])

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

export function useFinance() {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider')
  return ctx
}
