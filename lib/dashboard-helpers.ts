import { getEntryCategory } from '@/lib/mila-classifier'

export function formatEuro(value: number) {
  return Number(value || 0).toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  })
}

export function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 11) return 'Guten Morgen'
  if (hour < 17) return 'Guten Tag'
  return 'Guten Abend'
}

export function findRecurringExpenses(expenses: any[]) {
  if (!Array.isArray(expenses)) return []

  const groups: Record<string, { count: number; total: number; name: string }> = {}

  expenses.forEach((expense) => {
    const name = String(expense.vendor || expense.title || '').trim()
    if (!name) return

    const key = name.toLowerCase()
    const amount = Number(expense.amount || 0)

    if (!groups[key]) groups[key] = { count: 0, total: 0, name }
    groups[key].count += 1
    groups[key].total += amount
  })

  return Object.values(groups).filter((item) => item.count >= 2)
}

export function getSoftwareExpenses(expenses: any[]) {
  if (!Array.isArray(expenses)) return []
  return expenses.filter((expense) => getEntryCategory(expense) === 'software')
}

export function getOpenObligations(obligations: any[]) {
  return (obligations || []).filter(
    (item: any) => String(item.status || '').toLowerCase() !== 'bezahlt'
  )
}

export function getObligationBuckets(openObligations: any[]) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const overdue = openObligations.filter((item: any) => {
    const dueDate = item.dueDate || item.due_date
    if (!dueDate) return false

    const due = new Date(dueDate)
    due.setHours(0, 0, 0, 0)
    return due.getTime() < today.getTime()
  })

  const dueSoon = openObligations.filter((item: any) => {
    const dueDate = item.dueDate || item.due_date
    if (!dueDate) return false

    const due = new Date(dueDate)
    due.setHours(0, 0, 0, 0)

    const days = (due.getTime() - today.getTime()) / 86_400_000
    return days >= 0 && days <= 3
  })

  const inkasso = openObligations.filter((item: any) => {
    const text = `${item.type || ''} ${item.title || ''} ${
      item.partner || item.creditor || ''
    }`.toLowerCase()

    return text.includes('inkasso') || text.includes('forderung')
  })

  return { overdue, dueSoon, inkasso }
}

export function daysUntil(dateValue: string) {
  const due = new Date(dateValue)
  due.setHours(0, 0, 0, 0)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return Math.round((due.getTime() - today.getTime()) / 86_400_000)
}
