import type { CategoryId } from './categories'

export type TaxHint = 'likely' | 'depends' | 'private' | 'unknown'

export type MerchantInfo = {
  name: string
  category: CategoryId
  taxHint: TaxHint
  aliases: string[]
}

export const MERCHANTS: Record<string, MerchantInfo> = {
  // Supermärkte
  'aldi': { category: 'groceries', taxHint: 'private' },
'aldi nord': { category: 'groceries', taxHint: 'private' },
'aldi süd': { category: 'groceries', taxHint: 'private' },
'lidl': { category: 'groceries', taxHint: 'private' },
'rewe': { category: 'groceries', taxHint: 'private' },
'edeka': { category: 'groceries', taxHint: 'private' },
'kaufland': { category: 'groceries', taxHint: 'private' },
'netto': { category: 'groceries', taxHint: 'private' },
'netto marken-discount': { category: 'groceries', taxHint: 'private' },
'penny': { category: 'groceries', taxHint: 'private' },

// Drogerie
'dm': { category: 'drugstore', taxHint: 'private' },
'rossmann': { category: 'drugstore', taxHint: 'private' },
'müller': { category: 'drugstore', taxHint: 'private' },
'budni': { category: 'drugstore', taxHint: 'private' },
'douglas': { category: 'drugstore', taxHint: 'private' },

// Kleidung
'deichmann': { category: 'private', taxHint: 'private' },
'kik': { category: 'private', taxHint: 'private' },
'c&a': { category: 'private', taxHint: 'private' },
'h&m': { category: 'private', taxHint: 'private' },
'zara': { category: 'private', taxHint: 'private' },
'new yorker': { category: 'private', taxHint: 'private' },
'peek & cloppenburg': { category: 'private', taxHint: 'private' },
'takko': { category: 'private', taxHint: 'private' },
'ernstings family': { category: 'private', taxHint: 'private' },
'primark': { category: 'private', taxHint: 'private' },

// Baumarkt
'obi': { category: 'hardware', taxHint: 'depends' },
'bauhaus': { category: 'hardware', taxHint: 'depends' },
'hornbach': { category: 'hardware', taxHint: 'depends' },
'toom': { category: 'hardware', taxHint: 'depends' },
'hagebau': { category: 'hardware', taxHint: 'depends' },

// Möbel
'ikea': { category: 'office', taxHint: 'depends' },
'roller': { category: 'office', taxHint: 'depends' },
'porta': { category: 'office', taxHint: 'depends' },
'xxxlutz': { category: 'office', taxHint: 'depends' },
'poco': { category: 'office', taxHint: 'depends' },

// Elektronik
'mediamarkt': { category: 'electronics', taxHint: 'depends' },
'media markt': { category: 'electronics', taxHint: 'depends' },
'saturn': { category: 'electronics', taxHint: 'depends' },
'cyberport': { category: 'electronics', taxHint: 'depends' },
'gravis': { category: 'electronics', taxHint: 'depends' },

// Versand
'deutsche post': { category: 'shipping', taxHint: 'likely' },
'dhl': { category: 'shipping', taxHint: 'likely' },
'hermes': { category: 'shipping', taxHint: 'likely' },
'ups': { category: 'shipping', taxHint: 'likely' },
'gls': { category: 'shipping', taxHint: 'likely' },
'dpd': { category: 'shipping', taxHint: 'likely' },

// Reisen
'deutsche bahn': { category: 'travel', taxHint: 'depends' },
'db': { category: 'travel', taxHint: 'depends' },
'flixbus': { category: 'travel', taxHint: 'depends' },
'flixtrain': { category: 'travel', taxHint: 'depends' },
'booking.com': { category: 'travel', taxHint: 'depends' },

// Tankstellen
'aral': { category: 'fuel', taxHint: 'depends' },
'shell': { category: 'fuel', taxHint: 'depends' },
'esso': { category: 'fuel', taxHint: 'depends' },
'jet': { category: 'fuel', taxHint: 'depends' },
'hem': { category: 'fuel', taxHint: 'depends' },
'total': { category: 'fuel', taxHint: 'depends' },
'avia': { category: 'fuel', taxHint: 'depends' },

// Restaurants
'mcdonalds': { category: 'food', taxHint: 'depends' },
"mcdonald's": { category: 'food', taxHint: 'depends' },
'burger king': { category: 'food', taxHint: 'depends' },
'subway': { category: 'food', taxHint: 'depends' },
'starbucks': { category: 'food', taxHint: 'depends' },
'nordsee': { category: 'food', taxHint: 'depends' },
'vapiano': { category: 'food', taxHint: 'depends' },
'kfc': { category: 'food', taxHint: 'depends' },

// Online
'amazon': { category: 'shopping', taxHint: 'depends' },
'amazon marketplace': { category: 'shopping', taxHint: 'depends' },
'ebay': { category: 'shopping', taxHint: 'depends' },
'etsy': { category: 'shopping', taxHint: 'depends' },
'otto': { category: 'shopping', taxHint: 'depends' },
'zalando': { category: 'shopping', taxHint: 'depends' },

// Telekommunikation
'telekom': { category: 'communication', taxHint: 'depends' },
'vodafone': { category: 'communication', taxHint: 'depends' },
'o2': { category: 'communication', taxHint: 'depends' },
'1&1': { category: 'communication', taxHint: 'depends' },
'congstar': { category: 'communication', taxHint: 'depends' },

// Banken
'sparkasse': { category: 'finance', taxHint: 'none' },
'volksbank': { category: 'finance', taxHint: 'none' },
'commerzbank': { category: 'finance', taxHint: 'none' },
'deutsche bank': { category: 'finance', taxHint: 'none' },
'ing': { category: 'finance', taxHint: 'none' },

// Gesundheit
'apotheke': { category: 'health', taxHint: 'depends' },
'fielmann': { category: 'health', taxHint: 'depends' },
'apollo': { category: 'health', taxHint: 'depends' },
'sanitätshaus': { category: 'health', taxHint: 'depends' },

// Büro
'staples': { category: 'office', taxHint: 'depends' },
'office discount': { category: 'office', taxHint: 'depends' },
'paperworld': { category: 'office', taxHint: 'depends' },

// Sonstige
'nanu nana': {
  category: 'shopping',
  taxHint: 'private',
  aliases: ['nanu nana', 'nanu-nana', 'nanunana', 'nanu']
},
'nanu nana': { category: 'sonstiges', taxHint: 'depends' },
'nanu-nana': { category: 'sonstiges', taxHint: 'depends' },
'tedi': { category: 'shopping', taxHint: 'depends' },
'action': { category: 'shopping', taxHint: 'depends' },
'thalia': { category: 'education', taxHint: 'depends' },
'hugendubel': { category: 'education', taxHint: 'depends' },
'fressnapf': { category: 'pets', taxHint: 'depends' },
'zooplus': { category: 'pets', taxHint: 'depends' },
'decathlon': { category: 'sports', taxHint: 'depends' },
'intersport': { category: 'sports', taxHint: 'depends' },
'sportcheck': { category: 'sports', taxHint: 'depends' },
'louis': { category: 'vehicle', taxHint: 'depends' },
'atu': { category: 'vehicle', taxHint: 'depends' },
'euromaster': { category: 'vehicle', taxHint: 'depends' },
}
export function findMerchantInfo(vendor: string) {
  const normalizedVendor = vendor.toLowerCase().trim()

  return Object.entries(MERCHANTS).find(([merchantName]) =>
    normalizedVendor.includes(merchantName)
  )?.[1]
}