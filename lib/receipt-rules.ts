import type { CategoryId } from './categories'
import type { TaxHint } from './merchants'
import { classifyEntry } from './mila-classifier'

export type ReceiptRuleResult = {
  category: CategoryId
  taxHint: TaxHint
  confidence: 'high' | 'medium' | 'low'
  needsReview: boolean
  source: 'memory' | 'merchant' | 'category' | 'fallback'
}

export function classifyReceipt(receipt: any): ReceiptRuleResult {
  const result = classifyEntry({
    title: receipt.title || receipt.description || '',
    vendor: receipt.vendor || receipt.merchant || '',
    category: receipt.category || '',
    note: receipt.note || '',
  })

  const needsReview =
    result.taxHint === 'depends' ||
    result.taxHint === 'unknown' ||
    result.category === 'sonstiges'

  return {
    category: result.category,
    taxHint: result.taxHint,
    confidence:
      result.source === 'memory' || result.source === 'merchant'
        ? 'high'
        : result.source === 'category'
        ? 'medium'
        : 'low',
    needsReview,
    source: result.source,
  }
}