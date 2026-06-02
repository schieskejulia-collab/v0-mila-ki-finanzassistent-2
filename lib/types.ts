export type CategoryId =
  | 'miete'
  | 'software'
  | 'marketing'
  | 'buerobedarf'
  | 'reisen'
  | 'weiterbildung'
  | 'sonstiges'

export interface Category {
  id: CategoryId
  label: string
  icon: string
  color: string
}

export interface Expense {
  id: string
  amount: number
  category: CategoryId
  date: string
  vendor: string
  vat: number
  notes?: string
  hasReceipt: boolean
  recurring?: boolean
}

export interface Income {
  id: string
  amount: number
  date: string
  client: string
  vat: number
  status: 'bezahlt' | 'offen'
  dueDate?: string
  recurring?: boolean
  source: 'kunde' | 'sonstiges'
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

export const CATEGORIES: Record<CategoryId, Category> = {
  miete: { id: 'miete', label: 'Miete', icon: 'Home', color: 'var(--chart-1)' },
  software: { id: 'software', label: 'Software', icon: 'Laptop', color: 'var(--chart-2)' },
  marketing: { id: 'marketing', label: 'Marketing', icon: 'Megaphone', color: 'var(--chart-5)' },
  buerobedarf: { id: 'buerobedarf', label: 'Bürobedarf', icon: 'Package', color: 'var(--chart-3)' },
  reisen: { id: 'reisen', label: 'Reisen', icon: 'Plane', color: 'var(--chart-4)' },
  weiterbildung: { id: 'weiterbildung', label: 'Weiterbildung', icon: 'GraduationCap', color: 'var(--chart-2)' },
  sonstiges: { id: 'sonstiges', label: 'Sonstiges', icon: 'Tag', color: 'var(--muted-foreground)' },
}

export const CATEGORY_LIST = Object.values(CATEGORIES)
