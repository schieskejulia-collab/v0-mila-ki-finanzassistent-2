import type { CategoryId } from './categories'

export type TaxHint = 'likely' | 'depends' | 'private' | 'unknown'

export type MerchantInfo = {
  name: string
  category: CategoryId
  taxHint: TaxHint
  aliases: string[]
}

export const MERCHANTS: Record<string, MerchantInfo> = {
  medimax: {
  name: 'Medimax',
  category: 'hardware',
  taxHint: 'depends',
  aliases: [
    'medimax',
    'medimax stendal',
    'medimax gmbh',
  ],
},

  "mcdonald's": {
    category: 'bewirtung',
    taxHint: 'depends',
  },

  'deutsche post': {
  name: 'Deutsche Post',
  category: 'versand',
  taxHint: 'likely',
  aliases: [
    'deutsche post',
    'deutsche post ag',
    'briefzentrum',
  ],
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