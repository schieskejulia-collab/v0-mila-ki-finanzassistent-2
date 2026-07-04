import type { CategoryId } from './categories'
import type { TaxHint } from './merchants'

export type MerchantMemory = {
  merchant: string
  category: CategoryId
  taxHint: TaxHint
  usageCount: number
  lastUsed?: string
  source: 'user' | 'auto'
}

export const merchantMemory: MerchantMemory[] = []

export function findMerchantMemory(vendor: string) {
  const normalized = String(vendor || '').toLowerCase().trim()
  if (!normalized) return undefined

  return merchantMemory.find((entry) =>
    normalized.includes(entry.merchant.toLowerCase())
  )
}

export function rememberMerchant(
  merchant: string,
  category: CategoryId,
  taxHint: TaxHint
) {
  const existing = findMerchantMemory(merchant)

  if (existing) {
    existing.usageCount += 1
    existing.lastUsed = new Date().toISOString()
    return existing
  }

  const entry: MerchantMemory = {
    merchant,
    category,
    taxHint,
    usageCount: 1,
    lastUsed: new Date().toISOString(),
    source: 'auto',
  }

  merchantMemory.push(entry)

  return entry
}

export function saveMerchantMemory(data: {
  merchant: string
  category: CategoryId
  taxHint: TaxHint
}) {
  return rememberMerchant(data.merchant, data.category, data.taxHint)
}