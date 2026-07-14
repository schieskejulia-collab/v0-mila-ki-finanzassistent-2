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

const STORAGE_KEY = 'mila-merchant-memory-v1'

export const merchantMemory: MerchantMemory[] = []

let hasLoadedFromStorage = false

function normalize(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

function isBrowser() {
  return typeof window !== 'undefined'
}

function loadMerchantMemory() {
  if (!isBrowser() || hasLoadedFromStorage) {
    return
  }

  hasLoadedFromStorage = true

  try {
    const storedValue =
      window.localStorage.getItem(STORAGE_KEY)

    if (!storedValue) {
      return
    }

    const parsed = JSON.parse(storedValue)

    if (!Array.isArray(parsed)) {
      return
    }

    const validEntries = parsed.filter(
      (entry: any) =>
        entry &&
        typeof entry.merchant === 'string' &&
        typeof entry.category === 'string' &&
        typeof entry.taxHint === 'string'
    )

    merchantMemory.splice(
      0,
      merchantMemory.length,
      ...validEntries.map((entry: any) => ({
        merchant: String(entry.merchant),
        category: entry.category as CategoryId,
        taxHint: entry.taxHint as TaxHint,
        usageCount: Math.max(
          1,
          Number(entry.usageCount || 1)
        ),
        confidence: Math.max(
          0,
          Math.min(
            99,
            Number(entry.confidence || 50)
          )
        ),
        lastUsed: entry.lastUsed
          ? String(entry.lastUsed)
          : undefined,
        source:
          entry.source === 'auto'
            ? 'auto'
            : 'user',
      }))
    )
  } catch (error) {
    console.error(
      'Mila konnte das Händlergedächtnis nicht laden:',
      error
    )
  }
}

function persistMerchantMemory() {
  if (!isBrowser()) {
    return
  }

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(merchantMemory)
    )
  } catch (error) {
    console.error(
      'Mila konnte das Händlergedächtnis nicht speichern:',
      error
    )
  }
}

function merchantMatches(
  searchedMerchant: string,
  storedMerchant: string
) {
  const searched = normalize(searchedMerchant)
  const stored = normalize(storedMerchant)

  if (!searched || !stored) {
    return false
  }

  return (
    searched === stored ||
    searched.includes(stored) ||
    stored.includes(searched)
  )
}

export function getMerchantMemory() {
  loadMerchantMemory()

  return [...merchantMemory]
}

export function findMerchantMemory(
  vendor: string
) {
  loadMerchantMemory()

  const normalizedVendor = normalize(vendor)

  if (!normalizedVendor) {
    return undefined
  }

  return merchantMemory.find((entry) =>
    merchantMatches(
      normalizedVendor,
      entry.merchant
    )
  )
}

export function rememberMerchant(
  merchant: string,
  category: CategoryId,
  taxHint: TaxHint,
  source: 'user' | 'auto' = 'user'
) {
  loadMerchantMemory()

  const cleanedMerchant = String(
    merchant || ''
  ).trim()

  if (!cleanedMerchant) {
    return undefined
  }

  const existing =
    findMerchantMemory(cleanedMerchant)

  if (existing) {
    const sameCategory =
      existing.category === category

    existing.category = category
    existing.taxHint = taxHint
    existing.source = source
    existing.lastUsed =
      new Date().toISOString()

    if (sameCategory) {
      existing.usageCount += 1
    } else {
      existing.usageCount = 1
    }

    existing.confidence = Math.min(
      99,
      source === 'user'
        ? 50 + existing.usageCount * 10
        : 40 + existing.usageCount * 10
    )

    persistMerchantMemory()

    return existing
  }

  const entry: MerchantMemory = {
    merchant: cleanedMerchant,
    category,
    taxHint,
    usageCount: 1,
    confidence:
      source === 'user' ? 60 : 50,
    lastUsed: new Date().toISOString(),
    source,
  }

  merchantMemory.push(entry)
  persistMerchantMemory()

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

export function removeMerchantMemory(
  merchant: string
) {
  loadMerchantMemory()

  const index = merchantMemory.findIndex(
    (entry) =>
      merchantMatches(
        merchant,
        entry.merchant
      )
  )

  if (index === -1) {
    return false
  }

  merchantMemory.splice(index, 1)
  persistMerchantMemory()

  return true
}

export function clearMerchantMemory() {
  merchantMemory.splice(
    0,
    merchantMemory.length
  )

  hasLoadedFromStorage = true

  if (isBrowser()) {
    window.localStorage.removeItem(
      STORAGE_KEY
    )
  }
}