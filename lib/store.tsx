'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

// 1. Context Interface
export interface FinanceContextValue {
  expenses: any[]; incomes: any[]; setIncomes: (i: any[]) => void;
  categories: string[]; milaFeedback: string; morningBriefing: string;
  refreshMorningBriefing: () => Promise<void>; triggerMilaFeedback: (cat: string) => void;
  addExpense: (e: any) => Promise<void>; deleteExpense: (id: any) => Promise<void>;
  addIncome: (i: any) => Promise<void>; deleteIncome: (id: any) => Promise<void>;
  userName: string; setUserName: (v: string) => void;
  userStatus: any; setUserStatus: (v: any) => void;
  industry: any; setIndustry: (v: any) => void;
  taxClass: string; setTaxClass: (v: string) => void;
  annualGross: number; setAnnualGross: (v: number) => void;
  annualProfit: number; setAnnualProfit: (v: number) => void;
  vatStatus: string; setVatStatus: (v: string) => void;
  federalState: string; setFederalState: (v: string) => void;
  churchTax: boolean; setChurchTax: (v: boolean) => void;
  married: boolean; setMarried: (v: boolean) => void;
  children: number; setChildren: (v: number) => void;
  assemblyWork: boolean; setAssemblyWork: (v: boolean) => void;
  isLoggedIn: boolean; login: (n: string, s: any) => void; logout: () => void;
  summary: any; budgetStatus: any[];
}

export const FinanceContext = createContext<FinanceContextValue | null>(null)
export function FinanceProvider({ children }: { children: ReactNode }) {
  // --- States ---
  export function FinanceProvider({ children }: { children: ReactNode }) {
  const [expenses, setExpenses] = useState<any[]>([])
  const [incomes, setIncomes] = useState<any[]>([])
  const [categories, setCategories] = useState<string[]>([])

  const [milaFeedback, setMilaFeedback] = useState('')
  const [morningBriefing, setMorningBriefing] = useState('')

  const [userName, setUserName] = useState('Julia')
  const [userStatus, setUserStatus] = useState<UserStatus>('freelancer')
  const [industry, setIndustry] = useState<Industry>('sonstiges')

  const [taxClass, setTaxClass] = useState('1')
  const [annualGross, setAnnualGross] = useState(0)
  const [annualProfit, setAnnualProfit] = useState(0)

  const [vatStatus, setVatStatus] = useState('regelbesteuert')
  const [federalState, setFederalState] = useState('berlin')

  const [churchTax, setChurchTax] = useState(false)
  const [married, setMarried] = useState(false)
  const [childrenCount, setChildrenCount] = useState(0)

  const [assemblyWork, setAssemblyWork] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const mountedRef = useRef(true)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = localStorage.getItem('mila_profile_central')
    if (!raw) return

    try {
      const p = JSON.parse(raw)
      if (p.userName) setUserName(p.userName)
      if (p.userStatus) setUserStatus(p.userStatus)
      if (p.industry) setIndustry(p.industry)
      if (p.taxClass) setTaxClass(p.taxClass)
      if (p.annualGross) setAnnualGross(Number(p.annualGross))
      if (p.annualProfit) setAnnualProfit(Number(p.annualProfit))
      if (p.vatStatus) setVatStatus(p.vatStatus)
      if (p.federalState) setFederalState(p.federalState)
      if (typeof p.churchTax === 'boolean') setChurchTax(p.churchTax)
      if (typeof p.married === 'boolean') setMarried(p.married)
      if (p.children) setChildrenCount(Number(p.children))
      if (typeof p.assemblyWork === 'boolean') setAssemblyWork(p.assemblyWork)
    } catch (e) {
      console.error('Fehler beim Laden', e)
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
        children: childrenCount,
        assemblyWork,
      })
    )
  }, [
    userName, userStatus, industry, taxClass, annualGross, annualProfit,
    vatStatus, federalState, churchTax, married, childrenCount, assemblyWork
  ])

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

    const login = useCallback((name: string, status: UserStatus) => {
    const safeName = name?.trim() || 'Julia'
    const safeStatus = status || 'freelancer'

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
  const loadData = useCallback(async (signal?: AbortSignal) => {
    try {
      const [expRes, incRes] = await Promise.all([
        fetch('/api/expenses', { signal }),
        fetch('/api/incomes', { signal }),
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
      console.error('Laden fehlgeschlagen:', e)
    }
  }, [])
  const login = useCallback((name: string, status: UserStatus) => {
    const safeName = name?.trim() || 'Julia'
    const safeStatus = status || 'freelancer'

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
  const addExpense = useCallback(async (exp: any) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setMilaFeedback('Bitte zuerst einloggen.')
      return
    }

    const title = exp.title?.trim() || 'Ausgabe'
    const vendor = exp.vendor?.trim() || ''
    const autoCategory = inferCategory(`${title} ${vendor} ${exp.note ?? ''}`)
    const category =
      exp.category && exp.category !== 'Automatisch' && exp.category !== 'sonstiges'
        ? exp.category
        : autoCategory

    const payload = {
      title,
      vendor,
      amount: toNumber(exp.amount),
      date: exp.date || new Date().toISOString().slice(0, 10),
      category,
      note: exp.note?.trim() || '',
      vat: exp.vat ?? 19,
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
        setExpenses((p) => [saved, ...p])
        setMilaFeedback(getMilaTip(category, userStatus))
      }
    } catch (e) {
      console.error(e)
    }
  }, [userStatus])
  const deleteExpense = useCallback(async (id: any) => {
    try {
      const res = await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' })
      const data = await res.json()

      if (data.success && mountedRef.current) {
        setExpenses((p) => p.filter((e) => String(e.id) !== String(id)))
        setMilaFeedback('Die Ausgabe wurde gelöscht.')
      }
    } catch (e) {
      console.error(e)
    }
  }, [])
  const addIncome = useCallback(async (inc: any) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload = {
      title: inc.title?.trim() || 'Einnahme',
      client: inc.client?.trim() || '',
      amount: toNumber(inc.amount),
      date: inc.date || new Date().toISOString().slice(0, 10),
      note: inc.note?.trim() || '',
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
        setIncomes((p) => [saved, ...p])
        setMilaFeedback('💰 Einnahme gespeichert.')
      }
    } catch (e) {
      console.error(e)
    }
  }, [])
  const deleteIncome = useCallback(async (id: any) => {
    try {
      const res = await fetch(`/api/incomes?id=${id}`, { method: 'DELETE' })
      const data = await res.json()

      if (data.success && mountedRef.current) {
        setIncomes((p) => p.filter((i) => String(i.id) !== String(id)))
      }
    } catch (e) {
      console.error(e)
    }
  }, [])
  const summary = useMemo(() => {
    const totalExpenses = expenses.reduce((s, e) => s + toNumber(e.amount), 0)
    const totalIncomes = incomes.reduce((s, i) => s + toNumber(i.amount), 0)
    return { totalExpenses, totalIncomes, balance: totalIncomes - totalExpenses }
  }, [expenses, incomes])

  const budgetStatus = useMemo(() =>
    categories.map((c) => {
      const spent = expenses
        .filter((e) => e.category === c)
        .reduce((s, e) => s + toNumber(e.amount), 0)

      const limit = BUDGET_LIMITS[c] ?? 100
      const remaining = limit - spent
      const percent = limit > 0
        ? Math.min(100, Math.max(0, (spent / limit) * 100))
        : 0

      return {
        category: CATEGORY_LABELS[c] || c,
        spent,
        limit,
        remaining,
        percent,
      }
    }),
  [categories, expenses])
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

export function useFinance() {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider')
  return ctx
}
