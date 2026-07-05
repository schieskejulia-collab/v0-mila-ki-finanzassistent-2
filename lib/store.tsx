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
import { calculateSummary } from '@/lib/calculations'
import type { Obligation } from './mila-obligations'
import type { MilaDocument } from './mila-documents'

export interface FinanceContextValue {
  expenses: any[]
  incomes: any[]
  setIncomes: (i: any[]) => void

  categories: string[]
  milaFeedback: string
  morningBriefing: string
  refreshMorningBriefing: () => Promise<void>
  triggerMilaFeedback: (cat: string) => void

  addExpense: (e: any) => Promise<void>
  deleteExpense: (item: any) => Promise<void>
  addIncome: (i: any) => Promise<void>
  deleteIncome: (id: any) => Promise<void>
  updateIncomeStatus: (id: any, status: string) => Promise<void>

  obligations: Obligation[]
  setObligations: (items: Obligation[]) => void
  addObligation: (item: Obligation) => void
  deleteObligation: (id: string) => void

  documents: MilaDocument[]
  setDocuments: (items: MilaDocument[]) => void

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

function profileKey(userId?: string) {
  return userId ? `mila-profile-${userId}` : 'mila-profile-guest'
}

function obligationsKey(userId?: string) {
  return userId ? `mila-obligations-${userId}` : 'mila-obligations-guest'
}

function documentsKey(userId?: string) {
  return userId ? `mila-documents-${userId}` : 'mila-documents-guest'
}

function normalizeIndustry(value?: string) {
  if (!value) return 'sonstiges'

  const oldToNew: Record<string, string> = {
    berater: 'beratung',
    handwerker: 'handwerk',
    restaurant: 'gastro',
    ecommerce: 'handel',
    webdesigner: 'digital',
    fotograf: 'kreativ',
    coach: 'bildung',
  }

  return oldToNew[value] || value
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string>('')

  const [expenses, setExpenses] = useState<any[]>([])
  const [incomes, setIncomes] = useState<any[]>([])
  const [categories] = useState<string[]>([])

  const [milaFeedback] = useState('')
  const [morningBriefing] = useState('')

  const [userName, setUserName] = useState('')
  const [userStatus, setUserStatus] = useState<any>('')
  const [industry, setIndustry] = useState<any>('sonstiges')

  const [taxClass, setTaxClass] = useState('1')
  const [annualGross, setAnnualGross] = useState(0)
  const [annualProfit, setAnnualProfit] = useState(0)
  const [vatStatus, setVatStatus] = useState('')
  const [federalState, setFederalState] = useState('')
  const [churchTax, setChurchTax] = useState(false)
  const [married, setMarried] = useState(false)
  const [childrenCount, setChildren] = useState(0)
  const [assemblyWork, setAssemblyWork] = useState(false)

  const [obligations, setObligations] = useState<Obligation[]>([])
  const [documents, setDocuments] = useState<MilaDocument[]>([])

  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [profileLoaded, setProfileLoaded] = useState(false)

  const loadLocalProfile = useCallback((uid?: string) => {
    const savedProfile = localStorage.getItem(profileKey(uid))
    const savedObligations = localStorage.getItem(obligationsKey(uid))
    const savedDocuments = localStorage.getItem(documentsKey(uid))

    if (savedProfile) {
      const profile = JSON.parse(savedProfile)

      setUserName(profile.userName ?? '')
      setUserStatus(profile.userStatus ?? '')
      setIndustry(normalizeIndustry(profile.industry))
      setTaxClass(profile.taxClass ?? '1')
      setAnnualGross(Number(profile.annualGross ?? 0))
      setAnnualProfit(Number(profile.annualProfit ?? 0))
      setVatStatus(profile.vatStatus ?? '')
      setFederalState(profile.federalState ?? '')
      setChurchTax(Boolean(profile.churchTax ?? false))
      setMarried(Boolean(profile.married ?? false))
      setChildren(Number(profile.children ?? 0))
      setAssemblyWork(Boolean(profile.assemblyWork ?? false))
    } else {
      setUserName('')
      setUserStatus('')
      setIndustry('sonstiges')
      setTaxClass('1')
      setAnnualGross(0)
      setAnnualProfit(0)
      setVatStatus('')
      setFederalState('')
      setChurchTax(false)
      setMarried(false)
      setChildren(0)
      setAssemblyWork(false)
    }

    setObligations(savedObligations ? JSON.parse(savedObligations) : [])
    setDocuments(savedDocuments ? JSON.parse(savedDocuments) : [])
    setProfileLoaded(true)
  }, [])

  const fetchFinanceData = useCallback(async (uid?: string) => {
    if (!uid) {
      setExpenses([])
      setIncomes([])
      return
    }

    const { data: expensesData, error: expensesError } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', uid)
      .order('date', { ascending: false })

    const { data: incomesData, error: incomesError } = await supabase
      .from('incomes')
      .select('*')
      .eq('user_id', uid)
      .order('date', { ascending: false })

    if (expensesError) {
      console.error('Expenses laden fehlgeschlagen:', expensesError)
      setExpenses([])
    } else {
      setExpenses(expensesData || [])
    }

    if (incomesError) {
      console.error('Incomes laden fehlgeschlagen:', incomesError)
      setIncomes([])
    } else {
      setIncomes(incomesData || [])
    }
  }, [])

  useEffect(() => {
    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const uid = session?.user?.id || ''

      setUserId(uid)
      setIsLoggedIn(Boolean(uid))
      loadLocalProfile(uid || undefined)
      await fetchFinanceData(uid || undefined)
    }

    init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const uid = session?.user?.id || ''

      setUserId(uid)
      setIsLoggedIn(Boolean(uid))
      setProfileLoaded(false)

      loadLocalProfile(uid || undefined)
      await fetchFinanceData(uid || undefined)
    })

    return () => subscription.unsubscribe()
  }, [fetchFinanceData, loadLocalProfile])

  useEffect(() => {
    if (!profileLoaded) return

    localStorage.setItem(
      profileKey(userId || undefined),
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
        children: childrenCount,
        assemblyWork,
      })
    )
  }, [
    profileLoaded,
    userId,
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

  useEffect(() => {
    if (!profileLoaded) return

    localStorage.setItem(
      obligationsKey(userId || undefined),
      JSON.stringify(obligations)
    )
  }, [obligations, profileLoaded, userId])

  useEffect(() => {
    if (!profileLoaded) return

    localStorage.setItem(
      documentsKey(userId || undefined),
      JSON.stringify(documents)
    )
  }, [documents, profileLoaded, userId])

  const login = useCallback((name: string, status: any) => {
    setUserName(name || '')
    setUserStatus(status || '')
    setIsLoggedIn(true)
  }, [])

  const logout = useCallback(() => {
  setProfileLoaded(false)
  setIsLoggedIn(false)
  setUserId('')
  setExpenses([])
  setIncomes([])
  setObligations([])
  setDocuments([])
  setUserName('')
  setUserStatus('')
  setIndustry('sonstiges')
  setAnnualGross(0)
  setAnnualProfit(0)
  setVatStatus('')
  setFederalState('')
  setChurchTax(false)
  setMarried(false)
  setChildren(0)
  setAssemblyWork(false)
}, [])

  const addExpense = useCallback(
    async (exp: any) => {
      if (!userId) throw new Error('Nicht angemeldet.')

      const payload = {
        ...exp,
        user_id: userId,
      }

      const { data, error } = await supabase
        .from('expenses')
        .insert([payload])
        .select()
        .single()

      if (error) {
        console.error('Ausgabe speichern fehlgeschlagen:', error)
        throw error
      }

      setExpenses((prev) => [data, ...prev])
    },
    [userId]
  )

  const addIncome = useCallback(
    async (inc: any) => {
      if (!userId) throw new Error('Nicht angemeldet.')

      const payload = {
        ...inc,
        user_id: userId,
      }

      const { data, error } = await supabase
        .from('incomes')
        .insert([payload])
        .select()
        .single()

      if (error) {
        console.error('Einnahme speichern fehlgeschlagen:', error)
        throw error
      }

      setIncomes((prev) => [data, ...prev])
    },
    [userId]
  )

  const deleteExpense = useCallback(async (item: any) => {
    const id = item?.id

    if (!id) {
      alert('Diese Ausgabe hat keine ID und konnte nicht gelöscht werden.')
      return
    }

    const { error } = await supabase.from('expenses').delete().eq('id', id)

    if (error) {
      console.error('Ausgabe löschen fehlgeschlagen:', error)
      alert(`Ausgabe konnte nicht gelöscht werden: ${error.message}`)
      throw error
    }

    setExpenses((prev) => prev.filter((expense) => expense.id !== id))
  }, [])

  const deleteIncome = useCallback(async (id: any) => {
    const { error } = await supabase.from('incomes').delete().eq('id', id)

    if (error) {
      console.error('Einnahme löschen fehlgeschlagen:', error)
      throw error
    }

    setIncomes((prev) => prev.filter((income) => income.id !== id))
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

  const addObligation = useCallback((item: Obligation) => {
  const safeItem = {
    ...item,
    id: item.id || `obligation-${Date.now()}`,
    status: item.status || 'offen',
    amount: Number(item.amount || 0),
    reminder_days: Number((item as any).reminder_days || 3),
  }

  setObligations((prev) => [safeItem, ...prev])
}, [])

const deleteObligation = useCallback((id: string) => {
  setObligations((prev) => prev.filter((item) => item.id !== id))
}, [])

  const summary = useMemo(() => {
    return calculateSummary(incomes, expenses)
  }, [incomes, expenses])

  const budgetStatus = useMemo(() => [], [categories, expenses])

  const value = useMemo(
    () => ({
      expenses,
      incomes,
      setIncomes,

      categories,
      milaFeedback,
      morningBriefing,
      refreshMorningBriefing: async () => {},
      triggerMilaFeedback: (_cat: string) => {},

      addExpense,
      deleteExpense,
      addIncome,
      deleteIncome,
      updateIncomeStatus,

      obligations,
      setObligations,
      addObligation,
      deleteObligation,

      documents,
      setDocuments,

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
      addExpense,
      deleteExpense,
      addIncome,
      deleteIncome,
      updateIncomeStatus,
      obligations,
      addObligation,
      deleteObligation,
      documents,
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
    ]
  )

  return (
    <FinanceContext.Provider value={value}>
      {children}
    </FinanceContext.Provider>
  )
}

export function useFinance() {
  const ctx = useContext(FinanceContext)

  if (!ctx) throw new Error('useFinance must be used within FinanceProvider')

  return ctx
}