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

// --- MILAS INTEGRIERTES WISSEN ---
export type UserStatus = 'angestellt' | 'selbstständig' | 'kleinunternehmer' | 'freelancer';

export interface SteuerTipp {
  kategorie: string;
  titel: string;
  beschreibung: string;
  nische: Record<UserStatus, string>;
  status_info: string;
  keywords: string[];
}

export const STEUER_TIPPS: SteuerTipp[] = [
  {
    kategorie: "🏠 Home-Office",
    titel: "Deine Wohlfühl-Zone",
    beschreibung: "Pauschale für die Arbeit von Zuhause.",
    status_info: "Voll absetzbar",
    keywords: ["homeoffice", "miete", "wohnen", "arbeitszimmer"],
    nische: {
      angestellt: "Für dich sind das Werbungskosten! 6€ pro Tag, bis zu 1260€ im Jahr, auch ohne extra Zimmer.",
      selbstständig: "Betriebsausgabe! Wir setzen die Pauschale an oder anteilig Miete/Strom, wenn du ein echtes Büro hast.",
      kleinunternehmer: "Betriebsausgabe! Da du keine USt zahlst, setzen wir den Brutto-Betrag voll an.",
      freelancer: "Homeoffice-Pauschale rockt! 6€ pro Tag sind sicher, solange du nicht im Coworking warst."
    }
  },
  {
    kategorie: "🍽️ Bewirtung",
    titel: "Networking & Genuss",
    beschreibung: "Essen mit Kunden oder Partnern.",
    status_info: "70% absetzbar",
    keywords: ["bewirtung", "essen", "restaurant", "kunden"],
    nische: {
      angestellt: "Schwierig als Angestellter, außer du zahlst für Kollegen. Meistens eher was für Chefs!",
      selbstständig: "70% sind absetzbar. Wichtig: Namen der Gäste und Anlass auf den Beleg schreiben!",
      kleinunternehmer: "70% vom Brutto-Betrag! Denk an den Bewirtungsbeleg, sonst meckert das Finanzamt.",
      freelancer: "Dein Business-Lunch! 70% gehen durch. Trinkgeld zählt auch dazu!"
    }
  },
  {
    kategorie: "💻 Arbeitsmittel",
    titel: "Dein Tech-Upgrade",
    beschreibung: "Laptops, Software, Monitore.",
    status_info: "Sofortabzug bis 800€",
    keywords: ["software", "tools", "hardware", "laptop", "technik", "abo", "arbeitsmittel"],
    nische: {
      angestellt: "Werbungskosten! Über 800€ müssen wir über 3 Jahre verteilen (AfA), darunter sofort.",
      selbstständig: "Betriebsausgabe! Dank 'Digital-AfA' können wir Laptops oft sogar in einem Jahr voll absetzen.",
      kleinunternehmer: "Brutto-Sofortabzug bis 952€ (800€ netto + 19% MwSt), da du nicht vorsteuerabzugsberechtigt bist!",
      freelancer: "Dein Handwerkszeug! Software-Abos wie Adobe oder Notion setzen wir monatlich voll ab."
    }
  },
  {
    kategorie: "✈️ Reisekosten",
    titel: "Mila on Tour",
    beschreibung: "Fahrtkosten und Verpflegung.",
    status_info: "Pauschalen",
    keywords: ["reisekosten", "fahrtkosten", "pendeln", "zug", "auto", "reisen"],
    nische: {
      angestellt: "Pendlerpauschale! 0,30€ pro KM für den einfachen Weg zur Arbeit. Bei Dienstreisen mehr!",
      selbstständig: "Jeder KM zählt! 0,30€ (Auto) oder 0,20€ (Rad). Denk an die Verpflegungspauschale ab 8 Std.!",
      kleinunternehmer: "Reisekosten sind Brutto-Ausgaben. Mila rechnet dir die Pauschalen für die Verpflegung aus.",
      freelancer: "Ab zum Kunden! Bahntickets und Hotel setzen wir voll an. Verpflegungsmehraufwand nicht vergessen!"
    }
  }
];

export function getMilaTipForUser(categoryName: string, status: UserStatus): string {
  const search = categoryName.toLowerCase();
  const tipp = STEUER_TIPPS.find(t => 
    t.kategorie.toLowerCase().includes(search) || 
    t.keywords.some(k => search.includes(k))
  );
  return tipp ? tipp.nische[status] : "Alles klar, ich hab das kategorisiert. Soll ich mal prüfen, ob wir hier noch was optimieren können?";
}

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
