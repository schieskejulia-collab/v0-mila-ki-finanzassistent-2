import type { CategoryId } from './categories'
import type { TaxHint } from './merchants'

export type MerchantMemory = {
  merchant: string
  category: CategoryId
  taxHint: TaxHint
  usageCount: number
  confidence: number
  lastUsed?: string
  source: 'user' | 'auto'
}

export const merchantMemory: MerchantMemory[] = []

function normalize(value: string) {
  return String(value || '').trim().toLowerCase()
}

export function findMerchantMemory(vendor: string) {
  const normalized = normalize(vendor)
  if (!normalized) return undefined

  return merchantMemory.find((entry) =>
    normalized.includes(normalize(entry.merchant))
  )
}

export function rememberMerchant(
  merchant: string,
  category: CategoryId,
  taxHint: TaxHint,
  source: 'user' | 'auto' = 'user'
) {
  const existing = findMerchantMemory(merchant)

  if (existing) {
    existing.category = category
    existing.taxHint = taxHint
    existing.source = source
    existing.usageCount += 1
    existing.lastUsed = new Date().toISOString()

    existing.confidence = Math.min(
      99,
      50 + existing.usageCount * 10
    )

    return existing
  }

  const entry: MerchantMemory = {
    merchant,
    category,
    taxHint,
    usageCount: 1,
    confidence: source === 'user' ? 60 : 50,
    lastUsed: new Date().toISOString(),
    source,
  }

  merchantMemory.push(entry)

  return entry
}

export function saveMerchantMemory(data: {
  merchant: string
  category: CategoryId
  taxHint: TaxHint
}) {
  return rememberMerchant(
    data.merchant,
    data.category,
    data.taxHint,
    'user'
  )
}