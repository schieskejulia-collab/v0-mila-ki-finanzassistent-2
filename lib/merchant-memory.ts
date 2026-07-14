import type { CategoryId } from './categories'
import type { TaxHint } from './merchants'
import { supabase } from './supabase'

export type MerchantMemory = {
  merchant: string
  category: CategoryId
  taxHint: TaxHint
  usageCount: number
  confidence: number
  lastUsed?: string
  source: 'user' | 'auto'
}

type MerchantMemoryRow = {
  merchant: string
  merchant_normalized: string
  category: string
  tax_hint: string
  usage_count: number
  confidence: number
  last_used: string | null
  source: string
}

const STORAGE_KEY = 'mila-merchant-memory-v1'

export const merchantMemory: MerchantMemory[] = []

let hasLoadedFromStorage = false
let hasStartedCloudLoad = false
let cloudLoadPromise: Promise<void> | null = null

function normalize(value: string) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '')
    .trim()
}

function isBrowser() {
  return typeof window !== 'undefined'
}

function calculateConfidence(
  usageCount: number,
  source: 'user' | 'auto'
) {
  return Math.min(
    99,
    source === 'user'
      ? 50 + usageCount * 10
      : 40 + usageCount * 10
  )
}

function persistMerchantMemoryLocally() {
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
      'Mila konnte das Händlergedächtnis lokal nicht speichern:',
      error
    )
  }
}

function loadMerchantMemoryFromLocalStorage() {
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

    const validEntries: MerchantMemory[] =
      parsed
        .filter(
          (entry: any) =>
            entry &&
            typeof entry.merchant === 'string' &&
            typeof entry.category === 'string' &&
            typeof entry.taxHint === 'string'
        )
        .map((entry: any) => {
          const usageCount = Math.max(
            1,
            Number(entry.usageCount || 1)
          )

          const source: 'user' | 'auto' =
            entry.source === 'auto'
              ? 'auto'
              : 'user'

          return {
            merchant: String(entry.merchant),
            category: entry.category as CategoryId,
            taxHint: entry.taxHint as TaxHint,
            usageCount,
            confidence: Math.max(
              0,
              Math.min(
                99,
                Number(
                  entry.confidence ||
                    calculateConfidence(
                      usageCount,
                      source
                    )
                )
              )
            ),
            lastUsed: entry.lastUsed
              ? String(entry.lastUsed)
              : undefined,
            source,
          }
        })

    merchantMemory.splice(
      0,
      merchantMemory.length,
      ...validEntries
    )
  } catch (error) {
    console.error(
      'Mila konnte das lokale Händlergedächtnis nicht laden:',
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

function findCachedMerchant(vendor: string) {
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

function mergeCloudEntry(entry: MerchantMemory) {
  const existing = findCachedMerchant(
    entry.merchant
  )

  if (!existing) {
    merchantMemory.push(entry)
    return
  }

  const cloudDate = new Date(
    entry.lastUsed || 0
  ).getTime()

  const localDate = new Date(
    existing.lastUsed || 0
  ).getTime()

  if (
    cloudDate >= localDate ||
    entry.usageCount > existing.usageCount
  ) {
    existing.category = entry.category
    existing.taxHint = entry.taxHint
    existing.usageCount = entry.usageCount
    existing.confidence = entry.confidence
    existing.lastUsed = entry.lastUsed
    existing.source = entry.source
  }
}

async function getAuthenticatedUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    console.error(
      'Mila konnte den angemeldeten Nutzer nicht lesen:',
      error
    )
    return null
  }

  return user?.id || null
}

export async function loadMerchantMemoryFromCloud() {
  if (!isBrowser()) {
    return
  }

  loadMerchantMemoryFromLocalStorage()

  const userId =
    await getAuthenticatedUserId()

  if (!userId) {
    return
  }

  const { data, error } = await supabase
    .from('merchant_memory')
    .select(
      `
        merchant,
        merchant_normalized,
        category,
        tax_hint,
        usage_count,
        confidence,
        last_used,
        source
      `
    )
    .eq('user_id', userId)
    .order('last_used', {
      ascending: false,
    })

  if (error) {
    console.error(
      'Mila konnte das Händlergedächtnis nicht aus Supabase laden:',
      error
    )
    return
  }

  const rows =
    (data || []) as MerchantMemoryRow[]

  rows.forEach((row) => {
    mergeCloudEntry({
      merchant: row.merchant,
      category: row.category as CategoryId,
      taxHint: row.tax_hint as TaxHint,
      usageCount: Math.max(
        1,
        Number(row.usage_count || 1)
      ),
      confidence: Math.max(
        0,
        Math.min(
          99,
          Number(row.confidence || 50)
        )
      ),
      lastUsed:
        row.last_used || undefined,
      source:
        row.source === 'auto'
          ? 'auto'
          : 'user',
    })
  })

  persistMerchantMemoryLocally()
}

function startCloudLoad() {
  if (
    !isBrowser() ||
    hasStartedCloudLoad
  ) {
    return
  }

  hasStartedCloudLoad = true

  cloudLoadPromise =
    loadMerchantMemoryFromCloud().catch(
      (error) => {
        console.error(
          'Fehler beim Start des Händlergedächtnisses:',
          error
        )
      }
    )
}

export async function initializeMerchantMemory() {
  loadMerchantMemoryFromLocalStorage()
  startCloudLoad()

  if (cloudLoadPromise) {
    await cloudLoadPromise
  }

  return [...merchantMemory]
}

async function persistEntryToCloud(
  entry: MerchantMemory
) {
  const userId =
    await getAuthenticatedUserId()

  if (!userId) {
    return
  }

  const merchantNormalized = normalize(
    entry.merchant
  )

  if (!merchantNormalized) {
    return
  }

  const { error } = await supabase
    .from('merchant_memory')
    .upsert(
      {
        user_id: userId,
        merchant: entry.merchant,
        merchant_normalized:
          merchantNormalized,
        category: entry.category,
        tax_hint: entry.taxHint,
        confidence: entry.confidence,
        usage_count: entry.usageCount,
        source: entry.source,
        last_used:
          entry.lastUsed ||
          new Date().toISOString(),
        updated_at:
          new Date().toISOString(),
      },
      {
        onConflict:
          'user_id,merchant_normalized',
      }
    )

  if (error) {
    console.error(
      'Mila konnte den Händler nicht in Supabase speichern:',
      error
    )
  }
}

export function getMerchantMemory() {
  loadMerchantMemoryFromLocalStorage()
  startCloudLoad()

  return [...merchantMemory]
}

export function findMerchantMemory(
  vendor: string
) {
  loadMerchantMemoryFromLocalStorage()
  startCloudLoad()

  return findCachedMerchant(vendor)
}

export function rememberMerchant(
  merchant: string,
  category: CategoryId,
  taxHint: TaxHint,
  source: 'user' | 'auto' = 'user'
) {
  loadMerchantMemoryFromLocalStorage()
  startCloudLoad()

  const cleanedMerchant = String(
    merchant || ''
  ).trim()

  if (!cleanedMerchant) {
    return undefined
  }

  const existing =
    findCachedMerchant(cleanedMerchant)

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

    existing.confidence =
      calculateConfidence(
        existing.usageCount,
        source
      )

    persistMerchantMemoryLocally()

    void persistEntryToCloud(existing)

    return existing
  }

  const entry: MerchantMemory = {
    merchant: cleanedMerchant,
    category,
    taxHint,
    usageCount: 1,
    confidence:
      calculateConfidence(1, source),
    lastUsed: new Date().toISOString(),
    source,
  }

  merchantMemory.push(entry)
  persistMerchantMemoryLocally()

  void persistEntryToCloud(entry)

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

export async function removeMerchantMemory(
  merchant: string
) {
  loadMerchantMemoryFromLocalStorage()

  const normalizedMerchant =
    normalize(merchant)

  const index = merchantMemory.findIndex(
    (entry) =>
      merchantMatches(
        merchant,
        entry.merchant
      )
  )

  if (index !== -1) {
    merchantMemory.splice(index, 1)
    persistMerchantMemoryLocally()
  }

  const userId =
    await getAuthenticatedUserId()

  if (!userId || !normalizedMerchant) {
    return index !== -1
  }

  const { error } = await supabase
    .from('merchant_memory')
    .delete()
    .eq('user_id', userId)
    .eq(
      'merchant_normalized',
      normalizedMerchant
    )

  if (error) {
    console.error(
      'Mila konnte den Händler nicht aus Supabase löschen:',
      error
    )
    return false
  }

  return true
}

export async function clearMerchantMemory() {
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

  const userId =
    await getAuthenticatedUserId()

  if (!userId) {
    return
  }

  const { error } = await supabase
    .from('merchant_memory')
    .delete()
    .eq('user_id', userId)

  if (error) {
    console.error(
      'Mila konnte das Händlergedächtnis in Supabase nicht leeren:',
      error
    )
  }
}