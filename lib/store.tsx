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

// --- MILAS EXPERTEN-WISSEN (DEINE SEELE) ---
export type UserStatus = 'angestellt' | 'selbstständig' | 'kleinunternehmer' | 'freelancer';

export interface SteuerTipp {
  kategorie: string;
  emoji: string;
  titel: string;
  status_info: string;
  nische: string;
  keywords: string[];
}

export const STEUER_TIPPS: SteuerTipp[] = [
  { kategorie: "Home-Office", emoji: "🏠", titel: "Die Homeoffice-Pauschale", status_info: "Voll absetzbar", nische: "Egal ob Küchentisch oder Couch – Hauptsache du warst produktiv! 6€ pro Tag sind sicher.", keywords: ["home", "miete", "wohnen", "strom"] },
  { kategorie: "Arbeitsmittel", emoji: "🛠️", titel: "Dein Tech-Upgrade", status_info: "Sofortabzug bis 800€", nische: "Laptops, Monitore & Co setzen wir sofort ab, wenn sie unter 800€ netto kosten. Dein Setup muss glänzen!", keywords: ["laptop", "hardware", "monitor", "maus", "tastatur"] },
  { kategorie: "Software", emoji: "💻", titel: "Apps & Abos", status_info: "Voll absetzbar", nische: "Adobe, Notion oder ChatGPT? Alles, was dein Business smarter macht, setzen wir monatlich voll ab.", keywords: ["software", "tools", "abo", "notion", "adobe", "cloud"] },
  { kategorie: "Weiterbildung", emoji: "📚", titel: "Investment in dich", status_info: "Voll absetzbar", nische: "Kurse, Coachings oder Fachbücher – jeder Cent für dein Wissen mindert deine Steuerlast.", keywords: ["kurs", "coaching", "buch", "seminar", "lernen"] },
  { kategorie: "Reisekosten", emoji: "✈️", titel: "Mila on Tour", status_info: "Pauschale", nische: "Jeder KM zählt! 0,30€ fürs Auto oder 0,20€ fürs Rad. Denk auch an die Verpflegungspauschale ab 8 Std.!", keywords: ["reise", "fahrt", "zug", "hotel", "taxi", "km"] },
  { kategorie: "Bewirtung", emoji: "🍽️", titel: "Business-Lunch", status_info: "70% absetzbar", nische: "Lass es dir schmecken! 70% gehen durch. Schreib nur kurz die Namen der Gäste auf den Beleg.", keywords: ["essen", "restaurant", "bewirtung", "lunch"] },
  { kategorie: "Marketing", emoji: "📣", titel: "Sichtbarkeit", status_info: "Voll absetzbar", nische: "Anzeigen, Visitenkarten oder deine Website – alles, was dich bekannter macht, ist steuerlich dein Freund.", keywords: ["werbung", "ads", "marketing", "website", "design"] },
  { kategorie: "Bürohund", emoji: "🐶", titel: "Der Bürohund-Trick", status_info: "Anteilig absetzbar", nische: "Ja, wirklich! Haftpflicht oder spezielles Training können wir oft anteilig als Betriebsausgabe durchkriegen.", keywords: ["hund", "tier", "versicherung"] }
];

export function getMilaTipForUser(categoryName: string, status: UserStatus): string {
  const search = categoryName.toLowerCase();
  const tipp = STEUER_TIPPS.find(t => t.kategorie.toLowerCase().includes(search) || t.keywords.some(k => search.includes(k)));
  return tipp ? tipp.nische : "Alles klar, ich hab das kategorisiert. Soll ich mal prüfen, ob wir hier noch was optimieren können?";
}

const DEFAULT_CATEGORIES = STEUER_TIPPS.map(t => t.kategorie).concat(['Sonstiges']);

// --- STORE LOGIK ---

interface FinanceContextValue {
  expenses: Expense[]; incomes: Income[]; goals: Goal[]; budgets: Budget[]; categories: string[];
  summary: MonthSummary; prevSummary: MonthSummary; breakdown: any; budgetStatus: any; tips: any;
  milaFeedback: string; triggerMilaFeedback: (category: string) => void;
  addExpense: (e: Omit<Expense, 'id'>) => void; deleteExpense: (id: string) => void;
  addIncome: (i: Omit<Income, 'id'>) => void; deleteIncome: (id: string) => void;
  markInvoicePaid: (id: string) => void; contributeToGoal: (id: string, amount: number) => void;
  addCategory: (name: string) => void; deleteCategory: (name: string) => void;
  resetToDemo: () => void; clearAllData: () => void;
  chatOpen: boolean; setChatOpen: (open: boolean) => void;
  pendingPrompt: string | null; askMila: (prompt: string) => void; clearPending: () => void;
  userName: string; setUserName: (name: string) => void;
  userStatus: UserStatus; setUserStatus: (status: UserStatus) => void;
  taxRate: number; setTaxRate: (rate: number) => void;
}

const FinanceContext = createContext<FinanceContextValue | null>(null)

let uid = Date.now()
const newId = (p: string) => `${p}-${++uid}`

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    if (typeof window === 'undefined') return demoExpenses
    try {
      const saved = localStorage.getItem('mila_expenses')
      return saved ? JSON.parse(saved) : demoExpenses
    } catch { return demoExpenses }
  })

  const [incomes, setIncomes] = useState<Income[]>(() => {
    if (typeof window === 'undefined') return demoIncomes
    try {
      const saved = localStorage.getItem('mila_incomes')
      return saved ? JSON.parse(saved) : demoIncomes
    } catch { return demoIncomes }
  })

  const [categories, setCategories] = useState<string[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_CATEGORIES
    try {
      const saved = localStorage.getItem('mila_categories')
      return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES
    } catch { return DEFAULT_CATEGORIES }
  })

  const [userName, setUserName] = useState(() => {
    if (typeof window === 'undefined') return 'Julia'
    return localStorage.getItem('mila_name') || 'Julia'
  })

  const [userStatus, setUserStatus] = useState<UserStatus>(() => {
    if (typeof window === 'undefined') return 'selbstständig'
    const saved = localStorage.getItem('mila_status') as UserStatus
    const valid = ['angestellt', 'selbstständig', 'kleinunternehmer', 'freelancer']
    return valid.includes(saved) ? saved : 'selbstständig'
  })

  const [milaFeedback, setMilaFeedback] = useState(`Hi ${userName}, ich bin Mila!`)
  const [goals, setGoals] = useState<Goal[]>(demoGoals)
  const [budgets] = useState<Budget[]>(demoBudgets)
  const [chatOpen, setChatOpen] = useState(false)
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null)
  const [taxRate, setTaxRate] = useState(() => {
    if (typeof window === 'undefined') return 30
    const saved = localStorage.getItem('mila_tax')
    return saved ? Number(saved) : 30
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem('mila_name', userName)
    localStorage.setItem('mila_status', userStatus)
    localStorage.setItem('mila_tax', String(taxRate))
    localStorage.setItem('mila_expenses', JSON.stringify(expenses))
    localStorage.setItem('mila_incomes', JSON.stringify(incomes))
    localStorage.setItem('mila_categories', JSON.stringify(categories))
  }, [userName, userStatus, taxRate, expenses, incomes, categories])

  const triggerMilaFeedback = useCallback((category: string) => {
    const tip = getMilaTipForUser(category, userStatus)
    setMilaFeedback(`Hey ${userName}, pass auf: ${tip}`)
  }, [userStatus, userName])

  const addExpense = useCallback((e: Omit<Expense, 'id'>) => {
    setExpenses((prev) => [{ ...e, id: newId('e') }, ...prev])
    if (e.category) triggerMilaFeedback(e.category)
  }, [triggerMilaFeedback])

  const deleteExpense = useCallback((id: string) => setExpenses((prev) => prev.filter(e => e.id !== id)), [])
  const addIncome = useCallback((i: Omit<Income, 'id'>) => {
    setIncomes((prev) => [{ ...i, id: newId('i') }, ...prev])
    setMilaFeedback(`💰 Yay ${userName}, Zahltag!`)
  }, [userName])
  const deleteIncome = useCallback((id: string) => setIncomes((prev) => prev.filter(i => i.id !== id)), [])
  const addCategory = useCallback((name: string) => setCategories((prev) => prev.includes(name) ? prev : [...prev, name]), [])
  const deleteCategory = useCallback((name: string) => setCategories((prev) => prev.filter(c => c !== name)), [])
  const resetToDemo = useCallback(() => { setExpenses(demoExpenses); setIncomes(demoIncomes); setCategories(DEFAULT_CATEGORIES); }, [])
  const clearAllData = useCallback(() => { setExpenses([]); setIncomes([]); }, [])
  const markInvoicePaid = useCallback((id: string) => setIncomes((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'bezahlt' } : i))), [])
  const contributeToGoal = useCallback((id: string, amount: number) => setGoals((prev) => prev.map((g) => g.id === id ? { ...g, saved: Math.min(g.target, g.saved + amount) } : g)), [])
  const askMila = useCallback((prompt: string) => { setPendingPrompt(prompt); setChatOpen(true); }, [])
  const clearPending = useCallback(() => setPendingPrompt(null), [])

  const summary = useMemo(() => monthSummary(expenses, incomes, 0), [expenses, incomes])
  const prevSummary = useMemo(() => monthSummary(expenses, incomes, -1), [expenses, incomes])
  const breakdown = useMemo(() => categoryBreakdown(expenses), [expenses])
  const budgetStatus = useMemo(() => budgetStatuses(budgets, expenses), [budgets, expenses])
  const tips = useMemo(() => savingTips(expenses), [expenses])

  const value: FinanceContextValue = {
    expenses, incomes, goals, budgets, categories, summary, prevSummary, breakdown, budgetStatus, tips,
    milaFeedback, triggerMilaFeedback, addExpense, deleteExpense, addIncome, deleteIncome,
    markInvoicePaid, contributeToGoal, addCategory, deleteCategory, resetToDemo, clearAllData,
    chatOpen, setChatOpen, pendingPrompt, askMila, clearPending, userName, setUserName,
    userStatus, setUserStatus, taxRate, setTaxRate
  }
  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

export function useFinance() {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider')
  return ctx
}
