import type { CategoryId } from './categories'
import { detectCategory } from './categories'
import { findMerchantInfo, type TaxHint } from './merchants'
import { findMerchantMemory } from './merchant-memory'

export type MilaClassification = {
  category: CategoryId
  taxHint: TaxHint
  source: 'memory' | 'merchant' | 'category' | 'fallback'
}

function getEntryText(entry: any) {
  return `${entry.title || ''} ${entry.vendor || ''} ${entry.client || ''} ${
    entry.category || ''
  } ${entry.note || ''}`.toLowerCase()
}

export function classifyEntry(entry: any): MilaClassification {
  const vendor = String(entry.vendor || entry.title || '').trim()
  const text = getEntryText(entry)

  const memory = findMerchantMemory(vendor || text)

  if (memory) {
    return {
      category: memory.category,
      taxHint: memory.taxHint,
      source: 'memory',
    }
  }

  const merchant = findMerchantInfo(vendor || text)

  if (merchant) {
    return {
      category: merchant.category,
      taxHint: merchant.taxHint,
      source: 'merchant',
    }
  }

  const category = detectCategory(text)

  if (category !== 'sonstiges') {
    return {
      category,
      taxHint: 'depends',
      source: 'category',
    }
  }

  return {
    category: 'sonstiges',
    taxHint: 'unknown',
    source: 'fallback',
  }
}

export function getEntryCategory(entry: any): CategoryId {
  return classifyEntry(entry).category
}

export function getEntryTaxHint(entry: any): TaxHint {
  return classifyEntry(entry).taxHint
}