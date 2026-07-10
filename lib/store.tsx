'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { supabase } from '@/lib/supabase'
import { calculateSummary } from '@/lib/calculations'
import type { Obligation } from './mila-obligations'
import type { MilaDocument } from './mila-documents'

interface FinanceContextValue {
  expenses: any[]
  incomes: any[]
  setIncomes: (items: any[]) => void

  categories: string[]
  milaFeedback: string
  morningBriefing: string
  refreshMorningBriefing: () => Promise<void>
  triggerMilaFeedback: (category: string) => void

  addExpense: (item: any) => Promise<void>
  deleteExpense: (item: any) => Promise<void>

  addIncome: (item: any) => Promise<void>
  deleteIncome: (id: any) => Promise<void>
  updateIncomeStatus: (
    id: any,
    status: string
  ) => Promise<void>

  obligations: Obligation[]
  setObligations: (
    items: Obligation[]
  ) => void
  addObligation: (
    item: Obligation
  ) => Promise<void>
  updateObligation: (
    id: string,
    updates: Partial<Obligation>
  ) => Promise<void>
  deleteObligation: (
    id: string
  ) => Promise<void>

 documents: MilaDocument[]

setDocuments: (
  items: MilaDocument[]
) => void

deleteDocument: (id: string) => void

userName: string
  setUserName: (value: string) => void

  userStatus: any
  setUserStatus: (value: any) => void

  industry: any
  setIndustry: (value: any) => void

  taxClass: string
  setTaxClass: (value: string) => void

  annualGross: number
  setAnnualGross: (value: number) => void

  annualProfit: number
  setAnnualProfit: (value: number) => void

  vatStatus: string
  setVatStatus: (value: string) => void

  federalState: string
  setFederalState: (value: string) => void

  churchTax: boolean
  setChurchTax: (value: boolean) => void

  married: boolean
  setMarried: (value: boolean) => void

  children: number
  setChildren: (value: number) => void

  assemblyWork: boolean
  setAssemblyWork: (value: boolean) => void

  isLoggedIn: boolean
  login: (
    name: string,
    status: any
  ) => void
  logout: () => void

  summary: any
  budgetStatus: any[]
}

export const FinanceContext =
  createContext<FinanceContextValue | null>(
    null
  )

function profileKey(userId?: string) {
  return userId
    ? `mila-profile-${userId}`
    : 'mila-profile-guest'
}

function expensesKey(userId?: string) {
  return userId
    ? `mila-expenses-${userId}`
    : 'mila-expenses-guest'
}

function incomesKey(userId?: string) {
  return userId
    ? `mila-incomes-${userId}`
    : 'mila-incomes-guest'
}

function obligationsKey(
  userId?: string
) {
  return userId
    ? `mila-obligations-${userId}`
    : 'mila-obligations-guest'
}

function documentsKey(userId?: string) {
  return userId
    ? `mila-documents-${userId}`
    : 'mila-documents-guest'
}

function safeParse<T>(
  value: string | null,
  fallback: T
): T {
  if (!value) return fallback

  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function normalizeIndustry(
  value?: string
) {
  if (!value) return 'sonstiges'

  const oldToNew: Record<
    string,
    string
  > = {
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

function normalizeObligation(
  item: any
): Obligation {
  return {
    ...item,
    dueDate:
      item?.dueDate ||
      item?.due_date ||
      '',
    due_date:
      item?.due_date ||
      item?.dueDate ||
      '',
    reminderDays:
      item?.reminderDays ||
      [14, 3, 0],
    reminder_days:
      item?.reminder_days ??
      3,
  } as Obligation
}

function createLocalId() {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID ===
      'function'
  ) {
    return crypto.randomUUID()
  }

  return `local-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`
}

export function FinanceProvider({
  children,
}: {
  children: ReactNode
}) {
  const [userId, setUserId] =
    useState('')

  const [expenses, setExpenses] =
    useState<any[]>([])

  const [incomes, setIncomes] =
    useState<any[]>([])

  const [categories] = useState<
    string[]
  >([])

  const [milaFeedback] =
    useState('')

  const [morningBriefing] =
    useState('')

  const [userName, setUserName] =
    useState('')

  const [
    userStatus,
    setUserStatus,
  ] = useState<any>('')

  const [industry, setIndustry] =
    useState<any>('sonstiges')

  const [taxClass, setTaxClass] =
    useState('1')

  const [
    annualGross,
    setAnnualGross,
  ] = useState(0)

  const [
    annualProfit,
    setAnnualProfit,
  ] = useState(0)

  const [vatStatus, setVatStatus] =
    useState('')

  const [
    federalState,
    setFederalState,
  ] = useState('')

  const [
    churchTax,
    setChurchTax,
  ] = useState(false)

  const [married, setMarried] =
    useState(false)

  const [
    childrenCount,
    setChildren,
  ] = useState(0)

  const [
    assemblyWork,
    setAssemblyWork,
  ] = useState(false)

  const [
    obligations,
    setObligations,
  ] = useState<Obligation[]>([])

  const [
    documents,
    setDocuments,
  ] = useState<MilaDocument[]>([])

  const [
    isLoggedIn,
    setIsLoggedIn,
  ] = useState(false)

  const [
    profileLoaded,
    setProfileLoaded,
  ] = useState(false)

  const loadLocalProfile =
    useCallback((uid?: string) => {
      const savedProfile =
        safeParse<any>(
          localStorage.getItem(
            profileKey(uid)
          ),
          null
        )

      const savedExpenses =
        safeParse<any[]>(
          localStorage.getItem(
            expensesKey(uid)
          ),
          []
        )

      const savedIncomes =
        safeParse<any[]>(
          localStorage.getItem(
            incomesKey(uid)
          ),
          []
        )

      const savedObligations =
        safeParse<any[]>(
          localStorage.getItem(
            obligationsKey(uid)
          ),
          []
        )

      const savedDocuments =
        safeParse<MilaDocument[]>(
          localStorage.getItem(
            documentsKey(uid)
          ),
          []
        )

      if (savedProfile) {
        setUserName(
          savedProfile.userName ?? ''
        )

        setUserStatus(
          savedProfile.userStatus ?? ''
        )

        setIndustry(
          normalizeIndustry(
            savedProfile.industry
          )
        )

        setTaxClass(
          savedProfile.taxClass ?? '1'
        )

        setAnnualGross(
          Number(
            savedProfile.annualGross ??
              0
          )
        )

        setAnnualProfit(
          Number(
            savedProfile.annualProfit ??
              0
          )
        )

        setVatStatus(
          savedProfile.vatStatus ?? ''
        )

        setFederalState(
          savedProfile.federalState ??
            ''
        )

        setChurchTax(
          Boolean(
            savedProfile.churchTax ??
              false
          )
        )

        setMarried(
          Boolean(
            savedProfile.married ??
              false
          )
        )

        setChildren(
          Number(
            savedProfile.children ?? 0
          )
        )

        setAssemblyWork(
          Boolean(
            savedProfile.assemblyWork ??
              false
          )
        )
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

      setExpenses(savedExpenses)
      setIncomes(savedIncomes)

      setObligations(
        savedObligations.map(
          normalizeObligation
        )
      )

      setDocuments(savedDocuments)
      setProfileLoaded(true)
    }, [])

  const fetchFinanceData =
    useCallback(
      async (uid?: string) => {
        // Gastmodus nutzt ausschließlich
        // die bereits geladenen lokalen Daten.
        if (!uid) return

        const [
          expensesResult,
          incomesResult,
          obligationsResult,
        ] = await Promise.all([
          supabase
            .from('expenses')
            .select('*')
            .eq('user_id', uid)
            .order('created_at', {
              ascending: false,
            }),

          supabase
            .from('incomes')
            .select('*')
            .eq('user_id', uid)
            .order('created_at', {
              ascending: false,
            }),

          supabase
            .from('obligations')
            .select('*')
            .eq('user_id', uid)
            .order('created_at', {
              ascending: false,
            }),
        ])

        if (expensesResult.error) {
          console.error(
            'Ausgaben laden fehlgeschlagen:',
            expensesResult.error
          )
        } else {
          setExpenses(
            expensesResult.data || []
          )
        }

        if (incomesResult.error) {
          console.error(
            'Einnahmen laden fehlgeschlagen:',
            incomesResult.error
          )
        } else {
          setIncomes(
            incomesResult.data || []
          )
        }

        if (
          obligationsResult.error
        ) {
          console.error(
            'Verpflichtungen laden fehlgeschlagen:',
            obligationsResult.error
          )
        } else {
          setObligations(
            (
              obligationsResult.data ||
              []
            ).map(normalizeObligation)
          )
        }
      },
      []
    )

  useEffect(() => {
    let mounted = true

    async function init() {
      const {
        data: { session },
      } =
        await supabase.auth.getSession()

      if (!mounted) return

      const uid =
        session?.user?.id || ''

      setUserId(uid)
      setIsLoggedIn(Boolean(uid))

      loadLocalProfile(
        uid || undefined
      )

      await fetchFinanceData(
        uid || undefined
      )
    }

    init()

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        async (_event, session) => {
          const uid =
            session?.user?.id || ''

          setProfileLoaded(false)
          setUserId(uid)
          setIsLoggedIn(Boolean(uid))

          loadLocalProfile(
            uid || undefined
          )

          await fetchFinanceData(
            uid || undefined
          )
        }
      )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [
    fetchFinanceData,
    loadLocalProfile,
  ])

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
      expensesKey(userId || undefined),
      JSON.stringify(expenses)
    )
  }, [
    expenses,
    profileLoaded,
    userId,
  ])

  useEffect(() => {
    if (!profileLoaded) return

    localStorage.setItem(
      incomesKey(userId || undefined),
      JSON.stringify(incomes)
    )
  }, [
    incomes,
    profileLoaded,
    userId,
  ])

  useEffect(() => {
    if (!profileLoaded) return

    localStorage.setItem(
      obligationsKey(
        userId || undefined
      ),
      JSON.stringify(obligations)
    )
  }, [
    obligations,
    profileLoaded,
    userId,
  ])

  useEffect(() => {
    if (!profileLoaded) return

    localStorage.setItem(
      documentsKey(
        userId || undefined
      ),
      JSON.stringify(documents)
    )
  }, [
    documents,
    profileLoaded,
    userId,
  ])

  const login = useCallback(
    (name: string, status: any) => {
      setUserName(name || '')
      setUserStatus(status || '')
      setIsLoggedIn(true)
    },
    []
  )

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
    setTaxClass('1')
    setAnnualGross(0)
    setAnnualProfit(0)
    setVatStatus('')
    setFederalState('')
    setChurchTax(false)
    setMarried(false)
    setChildren(0)
    setAssemblyWork(false)

    setTimeout(() => {
      loadLocalProfile()
    }, 0)
  }, [loadLocalProfile])

  const addExpense = useCallback(
    async (item: any) => {
      if (!userId) {
        const localItem = {
          ...item,
          id:
            item?.id ||
            createLocalId(),
        }

        setExpenses((previous) => [
          localItem,
          ...previous,
        ])

        return
      }

      const payload = {
        ...item,
        user_id: userId,
      }

      const { data, error } =
        await supabase
          .from('expenses')
          .insert([payload])
          .select()
          .single()

      if (error) {
        console.error(
          'Ausgabe speichern fehlgeschlagen:',
          error
        )

        throw error
      }

      setExpenses((previous) => [
        data,
        ...previous,
      ])
    },
    [userId]
  )

  const addIncome = useCallback(
    async (item: any) => {
      if (!userId) {
        const localItem = {
          ...item,
          id:
            item?.id ||
            createLocalId(),
        }

        setIncomes((previous) => [
          localItem,
          ...previous,
        ])

        return
      }

      const payload = {
        ...item,
        user_id: userId,
      }

      const { data, error } =
        await supabase
          .from('incomes')
          .insert([payload])
          .select()
          .single()

      if (error) {
        console.error(
          'Einnahme speichern fehlgeschlagen:',
          error
        )

        throw error
      }

      setIncomes((previous) => [
        data,
        ...previous,
      ])
    },
    [userId]
  )

  const deleteExpense =
    useCallback(
      async (item: any) => {
        const id = item?.id

        if (!id) {
          throw new Error(
            'Diese Ausgabe hat keine ID.'
          )
        }

        if (!userId) {
          setExpenses((previous) =>
            previous.filter(
              (expense) =>
                expense.id !== id
            )
          )

          return
        }

        const { error } =
          await supabase
            .from('expenses')
            .delete()
            .eq('id', id)

        if (error) {
          console.error(
            'Ausgabe löschen fehlgeschlagen:',
            error
          )

          throw error
        }

        setExpenses((previous) =>
          previous.filter(
            (expense) =>
              expense.id !== id
          )
        )
      },
      [userId]
    )

  const deleteIncome =
    useCallback(
      async (id: any) => {
        if (!userId) {
          setIncomes((previous) =>
            previous.filter(
              (income) =>
                income.id !== id
            )
          )

          return
        }

        const { error } =
          await supabase
            .from('incomes')
            .delete()
            .eq('id', id)

        if (error) {
          console.error(
            'Einnahme löschen fehlgeschlagen:',
            error
          )

          throw error
        }

        setIncomes((previous) =>
          previous.filter(
            (income) =>
              income.id !== id
          )
        )
      },
      [userId]
    )

  const updateIncomeStatus =
    useCallback(
      async (
        id: any,
        status: string
      ) => {
        const normalizedStatus =
          status.toLowerCase()

        if (!userId) {
          setIncomes((previous) =>
            previous.map((income) =>
              income.id === id
                ? {
                    ...income,
                    status:
                      normalizedStatus,
                  }
                : income
            )
          )

          return
        }

        const { data, error } =
          await supabase
            .from('incomes')
            .update({
              status:
                normalizedStatus,
            })
            .eq('id', id)
            .select()
            .single()

        if (error) {
          console.error(
            'Status ändern fehlgeschlagen:',
            error
          )

          throw error
        }

        setIncomes((previous) =>
          previous.map((income) =>
            income.id === id
              ? data
              : income
          )
        )
      },
      [userId]
    )

  const addObligation =
    useCallback(
      async (item: Obligation) => {
        const normalizedItem =
          normalizeObligation({
            ...item,
            id:
              item?.id ||
              createLocalId(),
          })

        if (!userId) {
          setObligations(
            (previous) => [
              normalizedItem,
              ...previous,
            ]
          )

          return
        }

        const payload = {
          user_id: userId,
          title: item.title,
          partner:
            item.partner || '',
          creditor:
            (item as any).creditor ||
            item.partner ||
            '',
          amount: Number(
            item.amount || 0
          ),
          type:
            item.type ||
            'rechnung',
          area:
            item.area ||
            'privat',
          due_date:
            item.dueDate ||
            (item as any).due_date ||
            null,
          status:
            item.status ||
            'offen',
          priority:
            item.priority ||
            'normal',
          reminder_days: Number(
            (item as any)
              .reminder_days || 3
          ),
        }

        const { data, error } =
          await supabase
            .from('obligations')
            .insert([payload])
            .select()
            .single()

        if (error) {
          console.error(
            'Verpflichtung speichern fehlgeschlagen:',
            error
          )

          throw error
        }

        setObligations(
          (previous) => [
            normalizeObligation(data),
            ...previous,
          ]
        )
      },
      [userId]
    )

  const updateObligation =
    useCallback(
      async (
        id: string,
        updates: Partial<Obligation>
      ) => {
        if (!userId) {
          setObligations(
            (previous) =>
              previous.map((item) =>
                item.id === id
                  ? normalizeObligation({
                      ...item,
                      ...updates,
                    })
                  : item
              )
          )

          return
        }

        const payload: any = {}

        if (
          updates.title !== undefined
        ) {
          payload.title =
            updates.title
        }

        if (
          updates.partner !==
          undefined
        ) {
          payload.partner =
            updates.partner
        }

        if (
          (updates as any)
            .creditor !== undefined
        ) {
          payload.creditor = (
            updates as any
          ).creditor
        }

        if (
          updates.amount !== undefined
        ) {
          payload.amount = Number(
            updates.amount || 0
          )
        }

        if (
          updates.type !== undefined
        ) {
          payload.type = updates.type
        }

        if (
          updates.area !== undefined
        ) {
          payload.area = updates.area
        }

        if (
          updates.status !== undefined
        ) {
          payload.status =
            updates.status
        }

        if (
          updates.priority !==
          undefined
        ) {
          payload.priority =
            updates.priority
        }

        if (
          updates.dueDate !==
          undefined
        ) {
          payload.due_date =
            updates.dueDate
        }

        if (
          (updates as any)
            .due_date !== undefined
        ) {
          payload.due_date = (
            updates as any
          ).due_date
        }

        const { data, error } =
          await supabase
            .from('obligations')
            .update(payload)
            .eq('id', id)
            .select()
            .single()

        if (error) {
          console.error(
            'Verpflichtung aktualisieren fehlgeschlagen:',
            error
          )

          throw error
        }

        setObligations(
          (previous) =>
            previous.map((item) =>
              item.id === id
                ? normalizeObligation(
                    data
                  )
                : item
            )
        )
      },
      [userId]
    )

const deleteObligation = useCallback(
  async (id: string) => {
    if (!id) {
      console.warn(
        'Verpflichtung konnte nicht gelöscht werden: ID fehlt.'
      )
      return
    }

    if (!userId) {
      setObligations((previous) =>
        previous.filter((item) => item.id !== id)
      )
      return
    }

    const { error } = await supabase
      .from('obligations')
      .delete()
      .eq('id', id)

    if (error) {
      console.error(
        'Verpflichtung löschen fehlgeschlagen:',
        error
      )
      throw error
    }

    setObligations((previous) =>
      previous.filter((item) => item.id !== id)
    )
  },
  [userId]
)

const deleteDocument = useCallback((id: string) => {
  if (!id) {
    console.warn(
      'Dokument konnte nicht gelöscht werden: ID fehlt.'
    )
    return
  }

  setDocuments((previous) =>
    previous.filter((item: any) => item.id !== id)
  )
}, [])
  const summary = useMemo(
    () =>
      calculateSummary(
        incomes,
        expenses
      ),
    [incomes, expenses]
  )
const documentWithId = {
  ...document,
  id: document.id || crypto.randomUUID(),
}

setDocuments((previous) => [
  documentWithId,
  ...previous,
])
  const budgetStatus = useMemo(
    () => [],
    [categories, expenses]
  )

  const value = useMemo(
    () => ({
      expenses,
      incomes,
      setIncomes,

      categories,
      milaFeedback,
      morningBriefing,

      refreshMorningBriefing:
        async () => {},

      triggerMilaFeedback:
        (_category: string) => {},

      addExpense,
      deleteExpense,

      addIncome,
      deleteIncome,
      updateIncomeStatus,

      obligations,
      setObligations,
      addObligation,
      updateObligation,
      deleteObligation,

      documents,
setDocuments,
deleteDocument,

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
      updateObligation,
      deleteObligation,

      documents,
deleteDocument,
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
    <FinanceContext.Provider
      value={value}
    >
      {children}
    </FinanceContext.Provider>
  )
}

export function useFinance() {
  const context =
    useContext(FinanceContext)

  if (!context) {
    throw new Error(
      'useFinance must be used within FinanceProvider'
    )
  }

  return context
}