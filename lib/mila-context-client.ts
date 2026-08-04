'use client'

import { supabase } from '@/lib/supabase'

export type MilaContext = {
  month: string
  incomeTotal: number
  expenseTotal: number
  balance: number
  categories: unknown[]
  recentExpenses: unknown[]
  openObligations: unknown[]
  projects: unknown[]
  goals: unknown[]
  taxRelevantReceipts: unknown[]
  healthScore: number
  warnings: string[]
  suggestions: string[]
}

export type MilaContextResponse = {
  ok: boolean
  context?: MilaContext
  error?: string
}

export function getCurrentMilaMonth() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export async function fetchMilaContext(month = getCurrentMilaMonth()): Promise<MilaContextResponse> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) {
    return {
      ok: false,
      error: sessionError.message,
    }
  }

  if (!session?.access_token) {
    return {
      ok: false,
      error: 'Nicht eingeloggt. Mila Context braucht einen Supabase Login-Token.',
    }
  }

  const params = new URLSearchParams()
  if (month) params.set('month', month)

  const url = `/api/mila/context${params.toString() ? `?${params.toString()}` : ''}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
    cache: 'no-store',
  })

  const data = (await response.json().catch(() => null)) as MilaContextResponse | null

  if (!response.ok) {
    return {
      ok: false,
      error: data?.error || `Mila Context konnte nicht geladen werden (${response.status}).`,
    }
  }

  if (!data) {
    return {
      ok: false,
      error: 'Mila Context hat keine lesbare Antwort geliefert.',
    }
  }

  return data
}
