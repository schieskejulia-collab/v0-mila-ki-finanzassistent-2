'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react'
import { supabase } from '@/lib/supabase'

export interface FinanceContextValue {
  expenses: any[]
  incomes: any[]
  setIncomes: (i: any[]) => void
updateIncomeStatus: (id: any, status: string) => Promise<void>
  categories: string[]
  milaFeedback: string
  morningBriefing: string
  refreshMorningBriefing: () => Promise<void>
  triggerMilaFeedback: (cat: string) => void
  addExpense: (e: any) => Promise<void>
  deleteExpense: (id: any) => Promise<void>
  addIncome: (i: any) => Promise<void>
  deleteIncome: (id: any) => Promise<void>
  userName: string
  setUserName: (v: string) => void
  userStatus: any
  setUserStatus: (v: any) => void
  industry: any
  setIndustry: (v: any) => void
  taxClass: string
  setTaxClass: (v: string) => void
  annualGross: number
  setAnnualGross: (v: number) => void
  annualProfit: number
  setAnnualProfit: (v: number) => void
  vatStatus: string
  setVatStatus: (v: string) => void
  federalState: string
  setFederalState: (v: string) => void
  churchTax: boolean
  setChurchTax: (v: boolean) => void
  married: boolean
  setMarried: (v: boolean) => void
  children: number
  setChildren: (v: number) => void
  assemblyWork: boolean
  setAssemblyWork: (v: boolean) => void
  isLoggedIn: boolean
  login: (n: string, s: any) => void
  logout: () => void
  summary: any
  budgetStatus: any[]
}

export const FinanceContext = createContext<FinanceContextValue | null>(null)

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [expenses, setExpenses] = useState<any[]>([])
  const [incomes, setIncomes] = useState<any[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [milaFeedback, setMilaFeedback] = useState('')
  const [morningBriefing, setMorningBriefing] = useState('')
  const [userName, setUserName] = useState('Julia')
  const [userStatus, setUserStatus] = useState<any>('freelancer')
  const [industry, setIndustry] = useState<any>('sonstiges')
  const [taxClass, setTaxClass] = useState('1')
  const [annualGross, setAnnualGross] = useState(0)
  const [annualProfit, setAnnualProfit] = useState(0)
  const [vatStatus, setVatStatus] = useState('regelbesteuert')
  const [federalState, setFederalState] = useState('berlin')
  const [churchTax, setChurchTax] = useState(false)
  const [married, setMarried] = useState(false)
  const [childrenCount, setChildren] = useState(0)
  const [assemblyWork, setAssemblyWork] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const fetchFinanceData = useCallback(async () => {
    const { data: expensesData, error: expensesError } = await supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false })

    const { data: incomesData, error: incomesError } = await supabase
      .from('incomes')
      .select('*')
      .order('date', { ascending: false })

    if (expensesError) console.error('Expenses laden fehlgeschlagen:', expensesError)
    if (incomesError) console.error('Incomes laden fehlgeschlagen:', incomesError)

    if (expensesError) {
  console.error('Expenses laden fehlgeschlagen:', expensesError)
} else {
  setExpenses(expensesData || [])
}

if (incomesError) {
  console.error('Incomes laden fehlgeschlagen:', incomesError)
} else {
  setIncomes(incomesData || [])
}

  useEffect(() => {
    fetchFinanceData()
  }, [fetchFinanceData])

  const login = useCallback((name: string, status: any) => {
    setUserName(name || 'Julia')
    setUserStatus(status || 'freelancer')
    setIsLoggedIn(true)
  }, [])

  const logout = useCallback(() => {
    setIsLoggedIn(false)
    setExpenses([])
    setIncomes([])
  }, [])

  const addExpense = useCallback(async (exp: any) => {
    const { data, error } = await supabase
      .from('expenses')
      .insert([exp])
      .select()
      .single()

    if (error) {
      console.error('Ausgabe speichern fehlgeschlagen:', error)
      throw error
    }

    setExpenses((p) => [data, ...p])
  }, [])

  const deleteExpense = useCallback(async (id: any) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id)

    if (error) {
      console.error('Ausgabe löschen fehlgeschlagen:', error)
      throw error
    }

    setExpenses((p) => p.filter((e) => e.id !== id))
  }, [])

  const addIncome = useCallback(async (inc: any) => {
    const { data, error } = await supabase
      .from('incomes')
      .insert([inc])
      .select()
      .single()

    if (error) {
      console.error('Einnahme speichern fehlgeschlagen:', error)
      throw error
    }

    setIncomes((p) => [data, ...p])
  }, [])
const updateIncomeStatus = useCallback(async (id: any, status: string) => {
  const normalizedStatus = status.toLowerCase()

  const { data, error } = await supabase
    .from('incomes')
    .update({ status: normalizedStatus })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Status ändern fehlgeschlagen:', error)
    throw error
  }

  setIncomes((prev) =>
    prev.map((income) => (income.id === id ? data : income))
  )
}, [])
  const deleteIncome = useCallback(async (id: any) => {
    const { error } = await supabase.from('incomes').delete().eq('id', id)

    if (error) {
      console.error('Einnahme löschen fehlgeschlagen:', error)
      throw error
    }

    setIncomes((p) => p.filter((i) => i.id !== id))
  }, [])

  const summary = useMemo(() => {
    const totalExpenses = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)
    const totalIncomes = incomes.reduce((s, i) => s + (Number(i.amount) || 0), 0)

    return {
      totalExpenses,
      totalIncomes,
      balance: totalIncomes - totalExpenses,
    }
  }, [expenses, incomes])

  const budgetStatus = useMemo(() => [], [categories, expenses])

  const value = useMemo(
    () => ({
      expenses,
      incomes,
      setIncomes,
updateIncomeStatus,
      categories,
      milaFeedback,
      morningBriefing,
      refreshMorningBriefing: async () => {},
      triggerMilaFeedback: (_cat: string) => {},
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
      setChildren,
      assemblyWork,
      setAssemblyWork,
      isLoggedIn,
      login,
      logout,
      summary,
      budgetStatus,
    }),
    [
      expenses,
      incomes,
      categories,
      milaFeedback,
      morningBriefing,
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
      isLoggedIn,
      login,
      logout,
      summary,
      budgetStatus,
      addExpense,
      deleteExpense,
      addIncome,
      deleteIncome,
updateIncomeStatus,
    ]
  )
export function useFinance() {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider')
  return ctx
}
  return (
    <FinanceContext.Provider value={value}>
      {children}
    </FinanceContext.Provider>
  )
