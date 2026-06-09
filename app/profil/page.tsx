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
  expenses: any[]
  incomes: any[]
  categories: string[]
  milaFeedback: string
  triggerMilaFeedback: (category: string) => void
  addExpense: (e: any) => void
  deleteExpense: (id: string) => void
  addIncome: (i: any) => void
  deleteIncome: (id: string) => void
  userName: string
  setUserName: (name: string) => void
  userStatus: string
  setUserStatus: (status: any) => void
  isLoggedIn: boolean
  login: (name: string, status: string) => void
  logout: () => void
  summary: any
  budgetStatus: any[]
}

const FinanceContext = createContext<FinanceContextValue | null>(null)

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [expenses, setExpenses] = useState<any[]>([])
  const [incomes, setIncomes] = useState<any[]>([])
  const [categories] = useState<string[]>(DEFAULT_CATEGORIES)
  const [milaFeedback, setMilaFeedback] = useState("Hi, ich bin Mila!")
  const [userName, setUserName] = useState("")
  const [userStatus, setUserStatus] = useState("selbstständig")
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // Laden beim Start
  useEffect(() => {
    const savedName = localStorage.getItem('mila_name')
    const savedStatus = localStorage.getItem('mila_status')
    const savedExpenses = localStorage.getItem('mila_expenses')
    const savedIncomes = localStorage.getItem('mila_incomes')

    if (savedName) {
      setUserName(savedName)
      setIsLoggedIn(true)
    }
    if (savedStatus) setUserStatus(savedStatus)
    if (savedExpenses) setExpenses(JSON.parse(savedExpenses))
    if (savedIncomes) setIncomes(JSON.parse(savedIncomes))
  }, [])

  // Speichern
  useEffect(() => {
    if (isLoggedIn) {
      localStorage.setItem('mila_name', userName)
      localStorage.setItem('mila_status', userStatus)
      localStorage.setItem('mila_expenses', JSON.stringify(expenses))
      localStorage.setItem('mila_incomes', JSON.stringify(incomes))
    }
  }, [userName, userStatus, expenses, incomes, isLoggedIn])

  const login = (name: string, status: string) => {
    setUserName(name)
    setUserStatus(status)
    setIsLoggedIn(true)
  }

  const logout = () => {
    setIsLoggedIn(false)
    setUserName("")
    localStorage.clear()
    window.location.reload()
  }

  const triggerMilaFeedback = (category: string) => {
    setMilaFeedback(getMilaTip(category, userStatus))
  }

  const addExpense = (e: any) => {
    const newExp = { ...e, id: `e-${Date.now()}`, date: e.date || new Date().toISOString() }
    setExpenses(prev => [newExp, ...prev])
    triggerMilaFeedback(e.category || "Sonstiges")
  }

  const deleteExpense = (id: string) => setExpenses(prev => prev.filter(e => e.id !== id))
  
  const addIncome = (i: any) => {
    const newInc = { ...i, id: `i-${Date.now()}`, date: i.date || new Date().toISOString() }
    setIncomes(prev => [newInc, ...prev])
    setMilaFeedback("💰 Einnahme verbucht! Sehr gut.")
  }

  const deleteIncome = (id: string) => setIncomes(prev => prev.filter(i => i.id !== id))

  // Berechnungen für das Dashboard
  const summary = useMemo(() => {
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0)
    const totalIncomes = incomes.reduce((sum, i) => sum + Number(i.amount), 0)
    return { totalExpenses, totalIncomes, balance: totalIncomes - totalExpenses }
  }, [expenses, incomes])

  const value = {
    expenses, incomes, categories, milaFeedback, triggerMilaFeedback,
    addExpense, deleteExpense, addIncome, deleteIncome,
    userName, setUserName, userStatus, setUserStatus,
    isLoggedIn, login, logout, summary, budgetStatus: []
  }

  return <FinanceContext.Provider value={value as any}>{children}</FinanceContext.Provider>
}

export function useFinance() {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider')
  return ctx
}
