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
import type { MilaGoal } from '@/lib/mila-goals'
import type { Obligation } from './mila-obligations'
import type { MilaDocument } from './mila-documents'

export type { Expense, Income } from './types'

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

   goals: MilaGoal[]
  addGoal: (goal: MilaGoal) => Promise<void>
  updateGoal: (
    id: string,
    saved: number
  ) => Promise<void>
  deleteGoal: (id: string) => Promise<void>

  documents: MilaDocument[]
  setDocuments: (items: MilaDocument[]) => void
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
  logout: () => Promise<void>

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
  goals,
  setGoals,
] = useState<MilaGoal[]>([])

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

if (!uid) {
  setExpenses(
    Array.isArray(savedExpenses)
      ? savedExpenses
      : []
  )

  setIncomes(
    Array.isArray(savedIncomes)
      ? savedIncomes
      : []
  )

  setObligations(
    Array.isArray(savedObligations)
      ? savedObligations.map(
          normalizeObligation
        )
      : []
  )
}

setDocuments(
  Array.isArray(savedDocuments)
    ? savedDocuments
    : []
)

}, [])

const fetchFinanceData =
  useCallback(
      async (uid?: string) => {
        // Gastmodus nutzt ausschließlich
        // die bereits geladenen lokalen Daten.
        if (!uid) return

     const [
  profileResult,
  expensesResult,
  incomesResult,
  obligationsResult,
  goalsResult,
] = await Promise.all([
supabase
  .from('profiles')
  .select('*')
  .eq('id', uid)
  .maybeSingle(),
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
supabase
  .from('goals')
  .select('*')
  .eq('user_id', uid),
        ])

if (profileResult.error) {
  console.error(
    'Profil laden fehlgeschlagen:',
    profileResult.error
  )
} else {
  const profile = profileResult.data

  setUserName(profile?.display_name || '')
  setUserStatus(profile?.user_status || '')
  setIndustry(profile?.industry || 'sonstiges')
  setTaxClass(profile?.tax_class || '1')
  setAnnualGross(Number(profile?.annual_gross || 0))
  setAnnualProfit(Number(profile?.annual_profit || 0))
  setVatStatus(profile?.vat_status || '')
  setFederalState(profile?.federal_state || '')
  setChurchTax(Boolean(profile?.church_tax))
  setMarried(Boolean(profile?.married))
  setChildren(Number(profile?.children || 0))
  setAssemblyWork(Boolean(profile?.assembly_work))
}
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
if (obligationsResult.error) {
  console.error(
    'Verpflichtungen laden fehlgeschlagen:',
    obligationsResult.error
  )
} else {
  setObligations(
    (obligationsResult.data || []).map(
      normalizeObligation
    )
  )
}

if (!goalsResult) {
  console.warn('Ziele konnten nicht geladen werden: Ergebnis fehlt.')
  setGoals([])
} else if (goalsResult.error) {
  console.error(
    'Ziele laden fehlgeschlagen:',
    goalsResult.error
  )
  setGoals([])
} else {
  setGoals(
    (goalsResult.data || []).map((goal: any) => ({
      id: goal.id,
      title: String(goal.title || ''),
      target: Number(goal.target || 0),
      saved: Number(goal.saved || 0),
      dueDate: goal.due_date || undefined,
    }))
  )
}
  },
  []
)

useEffect(() => {
  let mounted = true

  async function loadSessionData() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (!mounted) return

    if (error) {
      console.error(
        'Session konnte nicht geladen werden:',
        error
      )
    }

    const uid = session?.user?.id || ''

    setProfileLoaded(false)
    setUserId(uid)
    setIsLoggedIn(Boolean(uid))

    if (!uid) {
      loadLocalProfile()
      return
    }


    // Finanzdaten danach verbindlich aus Supabase holen.
    await fetchFinanceData(uid)

    if (mounted) {
      setProfileLoaded(true)
    }
  }

  void loadSessionData()

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      const uid = session?.user?.id || ''

      setProfileLoaded(false)
      setUserId(uid)
      setIsLoggedIn(Boolean(uid))

      // Supabase-Abfragen bewusst aus dem direkten
      // Auth-Callback heraus verschieben.
      window.setTimeout(async () => {
        if (!mounted) return

        if (!uid) {
          loadLocalProfile()
          return
        }

        await fetchFinanceData(uid)

        if (mounted) {
          setProfileLoaded(true)
        }
      }, 0)
    }
  )

  return () => {
    mounted = false
    subscription.unsubscribe()
  }
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

  const logout = useCallback(async () => {
  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error(
      'Abmelden fehlgeschlagen:',
      error
    )
    throw error
  }

  setProfileLoaded(false)
  setIsLoggedIn(false)
  setUserId('')

  setExpenses([])
  setIncomes([])
  setObligations([])
  setGoals([])
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
}, [])
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
    createdAt:
      item.createdAt ||
      new Date().toISOString(),
  })
        if (!userId) {
  setObligations((previous) => {
    const alreadyExists = previous.some(
      (old) =>
        String(old.partner || '').toLowerCase() ===
          String(normalizedItem.partner || '').toLowerCase() &&
        Number(old.amount) === Number(normalizedItem.amount) &&
        String(old.dueDate || '') ===
          String(normalizedItem.dueDate || '')
    )

    if (alreadyExists) {
      alert('Diese Verpflichtung ist bereits vorhanden. ⚠️')
      return previous
    }

    return [
      normalizedItem,
      ...previous,
    ]
  })

  return
}
        const payload = {
  user_id: userId,

  created_at:
    normalizedItem.createdAt,

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

  const updateObligation = useCallback(
  async (
    id: string,
    updates: Partial<Obligation>
  ) => {
    const finalUpdates = {
      ...updates,
      paidAt:
        updates.status === 'bezahlt'
          ? updates.paidAt || new Date().toISOString()
          : updates.paidAt,
    }

    if (!userId) {
      setObligations((previous) =>
        previous.map((item) =>
          item.id === id
            ? normalizeObligation({
                ...item,
                ...finalUpdates,
              })
            : item
        )
      )

      return
    }

    const payload: any = {}

    if (finalUpdates.title !== undefined) {
      payload.title = finalUpdates.title
    }

    if (finalUpdates.partner !== undefined) {
      payload.partner = finalUpdates.partner
    }

    if ((finalUpdates as any).creditor !== undefined) {
      payload.creditor = (finalUpdates as any).creditor
    }

    if (finalUpdates.amount !== undefined) {
      payload.amount = Number(finalUpdates.amount || 0)
    }

    if (finalUpdates.type !== undefined) {
      payload.type = finalUpdates.type
    }

    if (finalUpdates.area !== undefined) {
      payload.area = finalUpdates.area
    }

    if (finalUpdates.status !== undefined) {
      payload.status = finalUpdates.status
    }

    if (finalUpdates.priority !== undefined) {
      payload.priority = finalUpdates.priority
    }

    if (finalUpdates.dueDate !== undefined) {
      payload.due_date = finalUpdates.dueDate
    }

    if ((finalUpdates as any).due_date !== undefined) {
      payload.due_date = (finalUpdates as any).due_date
    }

    if (finalUpdates.paidAt !== undefined) {
      payload.paid_at = finalUpdates.paidAt
    }

    const { data, error } = await supabase
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

    setObligations((previous) =>
      previous.map((item) =>
        item.id === id
          ? normalizeObligation({
              ...data,
              paidAt: data.paid_at || '',
            })
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
const addGoal = useCallback(
  async (goal: MilaGoal) => {
    const normalizedGoal: MilaGoal = {
      ...goal,
      id: goal.id || createLocalId(),
      title: String(goal.title || '').trim(),
      target: Math.max(0, Number(goal.target || 0)),
      saved: Math.max(0, Number(goal.saved || 0)),
      dueDate: goal.dueDate || undefined,
    }

    if (!normalizedGoal.title) {
      throw new Error('Das Ziel braucht einen Namen.')
    }

    if (normalizedGoal.target <= 0) {
      throw new Error('Der Zielbetrag muss größer als 0 sein.')
    }

    if (userId) {
      const { error } = await supabase
        .from('goals')
        .insert({
          id: normalizedGoal.id,
          user_id: userId,
          title: normalizedGoal.title,
          target: normalizedGoal.target,
          saved: normalizedGoal.saved,
          due_date: normalizedGoal.dueDate || null,
        })

      if (error) {
        console.error(
          'Ziel speichern fehlgeschlagen:',
          error
        )
        throw error
      }
    }

    setGoals((previous) => [
      ...previous,
      normalizedGoal,
    ])
  },
  [userId]
)

const updateGoal = useCallback(
  async (id: string, saved: number) => {
    const normalizedSaved = Math.max(
      0,
      Number(saved || 0)
    )

    if (userId) {
      const { error } = await supabase
        .from('goals')
        .update({
          saved: normalizedSaved,
        })
        .eq('id', id)
        .eq('user_id', userId)

      if (error) {
        console.error(
          'Ziel aktualisieren fehlgeschlagen:',
          error
        )
        throw error
      }
    }

    setGoals((previous) =>
      previous.map((goal) =>
        goal.id === id
          ? {
              ...goal,
              saved: normalizedSaved,
            }
          : goal
      )
    )
  },
  [userId]
)

const deleteGoal = useCallback(
  async (id: string) => {
    if (userId) {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

      if (error) {
        console.error(
          'Ziel löschen fehlgeschlagen:',
          error
        )
        throw error
      }
    }

    setGoals((previous) =>
      previous.filter(
        (goal) => goal.id !== id
      )
    )
  },
  [userId]
)

const deleteDocument = useCallback(
  (id: string) => {
    setDocuments((previous) =>
      previous.filter(
        (item: any) => item.id !== id
      )
    )
  },
  []
)

const summary = useMemo(
  () => calculateSummary(incomes, expenses),
  [incomes, expenses]
)

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

      refreshMorningBriefing: async () => {},
      triggerMilaFeedback: (_category: string) => {},

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

      goals,
      addGoal,
      updateGoal,
      deleteGoal,

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

      goals,
      addGoal,
      updateGoal,
      deleteGoal,

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
    <FinanceContext.Provider value={value}>
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
