import type { CategoryId } from './categories'

export interface Expense {
  id: string
  amount: number
  category: CategoryId
  date: string
  vendor: string
  vat?: number
  notes?: string
  note?: string
  hasReceipt?: boolean
  recurring?: boolean
  title?: string
  status?: string
}

export interface Income {
  id: string
  amount: number
  date: string
  client: string
  vat?: number
  status: 'bezahlt' | 'offen' | 'ueberfaellig' | 'überfällig' | 'pending'
  dueDate?: string
  due_date?: string
  recurring?: boolean
  source?: 'kunde' | 'sonstiges'
  title?: string
}

export interface Goal {
  id: string
  title: string
  icon: string
  target: number
  saved: number
  monthlyContribution: number
}

export interface Budget {
  category: CategoryId
  limit: number
  warnThreshold: number
}