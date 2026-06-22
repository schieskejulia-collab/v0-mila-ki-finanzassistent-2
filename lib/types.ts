// -----------------------------
// TYPES
// -----------------------------

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

// -----------------------------
// CATEGORY DEFINITIONS
// -----------------------------

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

// -----------------------------
// KEYWORD MAPPING
// -----------------------------

const CATEGORY_KEYWORDS: Record<CategoryId, string[]> = {
  miete: ['miete', 'büro', 'office rent', 'coworking'],
  software: ['software', 'saas', 'abo', 'subscription', 'cloud', 'hosting', 'domain', 'notion', 'figma', 'adobe'],
  marketing: ['ads', 'werbung', 'facebook ads', 'google ads', 'marketing', 'kampagne'],
  buerobedarf: ['papier', 'stifte', 'drucker', 'bürobedarf', 'ordner'],
  reisen: ['hotel', 'flug', 'bahn', 'reise', 'airbnb', 'uber'],
  weiterbildung: ['kurs', 'coaching', 'weiterbildung', 'training', 'seminar'],
  sonstiges: [],
}

// -----------------------------
// CATEGORY DETECTION
// -----------------------------

export function detectCategory(text: string): CategoryId {
  const lower = text.toLowerCase()

  for (const categoryId of Object.keys(CATEGORY_KEYWORDS) as CategoryId[]) {
    const keywords = CATEGORY_KEYWORDS[categoryId]
    if (keywords.some((kw) => lower.includes(kw))) {
      return categoryId
    }
  }

  return 'sonstiges'
}

// -----------------------------
// CATEGORY OBJECT FROM TEXT
// -----------------------------

export function getCategoryFromText(text: string): Category {
  const id = detectCategory(text)
  return CATEGORIES[id]
}

// -----------------------------
// ENRICH EXPENSE WITH CATEGORY
// -----------------------------

export function enrichExpense(expense: Expense) {
  const combined = `${expense.vendor} ${expense.notes ?? ''}`
  const detected = detectCategory(combined)

  return {
    ...expense,
    detectedCategory: detected,
    detectedCategoryData: CATEGORIES[detected],
  }
}
