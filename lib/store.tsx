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
import type { Expense, Income, Goal, Budget, CategoryId } from './types'
import { CATEGORIES } from './types'
import { demoExpenses, demoIncomes, demoGoals, demoBudgets } from './demo-data'
import {
  monthSummary,
  categoryBreakdown,
  budgetStatuses,
  savingTips,
  type MonthSummary,
} from './calculations'

// --- USER STATUS ERWEITERT ---
export type UserStatus =
// --- Morning Briefing ---
const [morningBriefing, setMorningBriefing] = useState("")

  | 'angestellt'
  | 'selbstständig'
  | 'kleinunternehmer'
  | 'freelancer'
  | 'minijob'

// --- AUTOMATISCHE STEUERLOGIK ---
function autoTaxRateForStatus(status: UserStatus): number {
  switch (status) {
    case 'angestellt':
      return 20
    case 'selbstständig':
      return 30
    case 'freelancer':
      return 28
    case 'kleinunternehmer':
      return 25
    case 'minijob':
      return 0
    default:
      return 30
  }
}

// --- MILAS EXPERTEN-WISSEN ---
export interface SteuerTipp {
  id: CategoryId;
  titel: string;
  status_info: string;
  nische: string;
}

export const STEUER_TIPPS: SteuerTipp[] = [
  { id: 'miete', titel: "Homeoffice-Pauschale", status_info: "Voll absetzbar", nische: "Egal ob Küchentisch oder Couch – Hauptsache du warst produktiv! 6€ pro Tag sind sicher." },
  { id: 'software', titel: "Apps & Abos", status_info: "Voll absetzbar", nische: "Adobe, Notion oder ChatGPT? Alles, was dein Business smarter macht, setzen wir monatlich voll ab." },
  { id: 'marketing', titel: "Sichtbarkeit", status_info: "Voll absetzbar", nische: "Anzeigen, Visitenkarten oder deine Website – alles, was dich bekannter macht, ist steuerlich dein Freund." },
  { id: 'buerobedarf', titel: "Arbeitsmittel & Tech", status_info: "Sofortabzug", nische: "Laptops, Monitore & Co setzen wir sofort ab, wenn sie unter 800€ netto kosten. Dein Setup muss glänzen!" },
  { id: 'reisen', titel: "Mila on Tour", status_info: "Pauschale", nische: "Jeder KM zählt! 0,30€ fürs Auto oder 0,20€ fürs Rad. Denk auch an die Verpflegungspauschale!" },
  { id: 'weiterbildung', titel: "Investment in dich", status_info: "Voll absetzbar", nische: "Kurse, Coachings oder Fachbücher – jeder Cent für dein Wissen mindert deine Steuerlast." },
  { id: 'sonstiges', titel: "Kleinkram & Co.", status_info: "Checken wir", nische: "Hier schaue ich individuell drüber. Denk dran: Fast alles, was betrieblich ist, lässt sich irgendwie nutzen!" }
];

export function getMilaTipForUser(catId: CategoryId): string {
  const tipp = STEUER_TIPPS.find(t => t.id === catId);
  return tipp ? tipp.nische : "Alles klar, ich hab das kategorisiert. Soll ich mal prüfen, ob wir hier noch was optimieren können?";
}

// --- STORE LOGIK ---

interface FinanceContextValue {
  expenses: Expense[]; incomes: Income[]; goals: Goal[]; budgets: Budget[]; categories: string[];
  summary: MonthSummary; prevSummary: MonthSummary; breakdown: any; budgetStatus: any; tips: any;
  milaFeedback: string; triggerMilaFeedback: (category: CategoryId) => void;
  addExpense: (e: Omit<Expense, 'id'>) => void; deleteExpense: (id: string) => void;
  addIncome: (i: Omit<Income, 'id'>) => void; deleteIncome: (id: string) => void;
  markInvoicePaid: (id: string) => void; contributeToGoal: (id: string, amount: number) => void;
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

  const [userName, setUserName] = useState(() => {
    if (typeof window === 'undefined') return 'Julia'
    return localStorage.getItem('mila_name') || 'Julia'
  })

  const [userStatus, _setUserStatus] = useState<UserStatus>(() => {
    if (typeof window === 'undefined') return 'selbstständig'
    const saved = localStorage.getItem('mila_status') as UserStatus
    const valid = ['angestellt', 'selbstständig', 'kleinunternehmer', 'freelancer', 'minijob']
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
    return saved ? Number(saved) : autoTaxRateForStatus('selbstständig')
  })

  // --- LOCALSTORAGE SYNC ---
  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem('mila_name', userName)
    localStorage.setItem('mila_status', userStatus)
    localStorage.setItem('mila_tax', String(taxRate))
    localStorage.setItem('mila_expenses', JSON.stringify(expenses))
    localStorage.setItem('mila_incomes', JSON.stringify(incomes))
  }, [userName, userStatus, taxRate, expenses, incomes])

  // --- MILA FEEDBACK ---
  const triggerMilaFeedback = useCallback((category: CategoryId) => {
    const tip = getMilaTipForUser(category)
    setMilaFeedback(`Hey ${userName}, pass auf: ${tip}`)
  }, [userName])
// --- Morning Briefing Generator ---
function generateMorningBriefing(userName: string, summary: MonthSummary, incomes: Income[]) {
  const offene = incomes.filter(i => i.status === "offen").length
  const gewinn = summary.income - summary.expenses

  let stimmung = ""

  if (gewinn > 2000) stimmung = "Du bist richtig gut unterwegs."
  else if (gewinn > 0) stimmung = "Alles stabil, du machst das gut."
  else stimmung = "Ich halte dich. Wir schauen das gemeinsam an."

  return `
Guten Morgen ${userName} ☀️

• Dein aktueller Monatsgewinn liegt bei ${gewinn.toFixed(2)}€.
• Du hast ${offene} offene Rechnungen.
• ${stimmung}

Atme kurz. Ich begleite dich heute durch alles, was ansteht.
`
}

const refreshMorningBriefing = () => {
  const text = generateMorningBriefing(userName, summary, incomes)
  setMorningBriefing(text)
}


  // --- EXPENSES ---
  const addExpense = useCallback((e: Omit<Expense, 'id'>) => {
    setExpenses((prev) => [{ ...e, id: newId('e') } as Expense, ...prev])
    if (e.category) triggerMilaFeedback(e.category)
  }, [triggerMilaFeedback])

  const deleteExpense = useCallback((id: string) =>
    setExpenses((prev) => prev.filter(e => e.id !== id)), [])

  // --- INCOME ---
  const addIncome = useCallback((i: Omit<Income, 'id'>) => {
    setIncomes((prev) => [{ ...i, id: newId('i') } as Income, ...prev])
    setMilaFeedback(`💰 Yay ${userName}, Zahltag!`)
  }, [userName])

  const deleteIncome = useCallback((id: string) =>
    setIncomes((prev) => prev.filter(i => i.id !== id)), [])

  // --- GOALS ---
  const markInvoicePaid = useCallback((id: string) =>
    setIncomes((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'bezahlt' } : i))), [])

  const contributeToGoal = useCallback((id: string, amount: number) =>
    setGoals((prev) => prev.map((g) =>
      g.id === id ? { ...g, saved: Math.min(g.target, g.saved + amount) } : g
    )), [])

  // --- CHAT ---
  const askMila = useCallback((prompt: string) => {
    setPendingPrompt(prompt)
    setChatOpen(true)
  }, [])

  const clearPending = useCallback(() => setPendingPrompt(null), [])

  // --- SUMMARY ---
  const summary = useMemo(() => monthSummary(expenses, incomes, 0), [expenses, incomes])
  const prevSummary = useMemo(() => monthSummary(expenses, incomes, -1), [expenses, incomes])
  const breakdown = useMemo(() => categoryBreakdown(expenses), [expenses])
  const budgetStatus = useMemo(() => budgetStatuses(budgets, expenses), [budgets, expenses])
  const tips = useMemo(() => savingTips(expenses), [expenses])

  // --- SET USER STATUS MIT AUTO-STEUER ---
  const setUserStatus = (status: UserStatus) => {
    _setUserStatus(status)
    setTaxRate(autoTaxRateForStatus(status))
  }

  const value: FinanceContextValue = {
    expenses, incomes, goals, budgets, categories: Object.keys(CATEGORIES),
    summary, prevSummary, breakdown, budgetStatus, tips,
    milaFeedback, triggerMilaFeedback,
    addExpense, deleteExpense, addIncome, deleteIncome,
    markInvoicePaid, contributeToGoal,
    resetToDemo: () => { setExpenses(demoExpenses); setIncomes(demoIncomes) },
    clearAllData: () => { setExpenses([]); setIncomes([]) },
    chatOpen, setChatOpen, pendingPrompt, askMila, clearPending,
    userName, setUserName,
    userStatus, setUserStatus,
    taxRate, setTaxRate,
  }

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

export function useFinance() {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider')
  return ctx
}
