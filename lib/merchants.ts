import type { CategoryId } from './categories'

export type TaxHint = 'likely' | 'depends' | 'private' | 'unknown'

export type MerchantInfo = {
  category: CategoryId
  taxHint: TaxHint
}

export const MERCHANTS: Record<string, MerchantInfo> = {
  medimax: {
    category: 'hardware',
    taxHint: 'depends',
  },

  "mcdonald's": {
    category: 'bewirtung',
    taxHint: 'depends',
  },

  'deutsche post': {
    category: 'versand',
    taxHint: 'likely',
  },

  dhl: {
    category: 'versand',
    taxHint: 'likely',
  },

  kik: {
    category: 'privat',
    taxHint: 'private',
  },

  deichmann: {
    category: 'privat',
    taxHint: 'private',
  },

  'nanu-nana': {
    category: 'sonstiges',
    taxHint: 'depends',
  },

  'deutsche bahn': {
    category: 'reisen',
    taxHint: 'depends',
  },

  nahverkehr: {
    category: 'reisen',
    taxHint: 'depends',
  },
}

export function findMerchantInfo(vendor: string) {
  const normalizedVendor = vendor.toLowerCase().trim()

  return Object.entries(MERCHANTS).find(([merchantName]) =>
    normalizedVendor.includes(merchantName)
  )?.[1]
}