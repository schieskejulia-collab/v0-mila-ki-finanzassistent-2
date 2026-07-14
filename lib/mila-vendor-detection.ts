import {
  MILA_VENDORS,
  type MilaVendor,
} from './mila-vendors'
import { normalizeVendorText } from './mila-vendor-normalizer'

function levenshtein(a: string, b: string): number {
  const matrix = Array.from(
    { length: a.length + 1 },
    () => Array<number>(b.length + 1).fill(0)
  )

  for (let i = 0; i <= a.length; i += 1) {
    matrix[i][0] = i
  }

  for (let j = 0; j <= b.length; j += 1) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1

      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }

  return matrix[a.length][b.length]
}

export function matchVendorByKeyword(
  text: string
): MilaVendor | null {
  const normalizedText = normalizeVendorText(text)

  if (!normalizedText) {
    return null
  }

  for (const vendor of MILA_VENDORS) {
    const hasMatch = vendor.keywords.some((keyword) => {
      const normalizedKeyword = normalizeVendorText(keyword)

      return (
        normalizedKeyword.length > 0 &&
        normalizedText.includes(normalizedKeyword)
      )
    })

    if (hasMatch) {
      return vendor
    }
  }

  return null
}

export function matchVendorFuzzy(
  text: string
): MilaVendor | null {
  const normalizedText = normalizeVendorText(text)

  if (!normalizedText) {
    return null
  }

  const textTokens = normalizedText
    .split(' ')
    .filter((token) => token.length >= 3)

  let bestVendor: MilaVendor | null = null
  let bestDistance = Number.POSITIVE_INFINITY

  for (const vendor of MILA_VENDORS) {
    for (const keyword of vendor.keywords) {
      const normalizedKeyword = normalizeVendorText(keyword)

      if (!normalizedKeyword) {
        continue
      }

      const candidates = [
        normalizedText,
        ...textTokens,
      ]

      for (const candidate of candidates) {
        const distance = levenshtein(
          candidate,
          normalizedKeyword
        )

        if (distance < bestDistance) {
          bestDistance = distance
          bestVendor = vendor
        }
      }
    }
  }

  if (!bestVendor) return null

const shortestKeywordLength = Math.min(
  ...bestVendor.keywords
    .map((keyword) => normalizeVendorText(keyword).length)
    .filter((length) => length > 0)
)

const allowedDistance =
  shortestKeywordLength <= 5 ? 1 : 2

return bestDistance <= allowedDistance
  ? bestVendor
  : null
}

export function vendorConfidence(
  vendor: MilaVendor | null,
  text: string
): number {
  if (!vendor) {
    return 0
  }

  const normalizedText = normalizeVendorText(text)

  const exactMatch = vendor.keywords.some((keyword) =>
    normalizedText.includes(
      normalizeVendorText(keyword)
    )
  )

  if (exactMatch) {
    return 1
  }

  const textTokens = normalizedText
    .split(' ')
    .filter((token) => token.length >= 3)

  let bestDistance = Number.POSITIVE_INFINITY

  for (const keyword of vendor.keywords) {
    const normalizedKeyword = normalizeVendorText(keyword)

    for (const candidate of [
      normalizedText,
      ...textTokens,
    ]) {
      const distance = levenshtein(
        candidate,
        normalizedKeyword
      )

      bestDistance = Math.min(
        bestDistance,
        distance
      )
    }
  }

  const shortestKeywordLength = Math.min(
  ...vendor.keywords
    .map((keyword) => normalizeVendorText(keyword).length)
    .filter((length) => length > 0)
)

if (bestDistance === 0) return 1
if (bestDistance === 1) return 0.85

if (
  bestDistance === 2 &&
  shortestKeywordLength >= 6
) {
  return 0.7
}

return 0

  return 0
}

export function detectVendor(text: string): {
  vendor: MilaVendor | null
  confidence: number
  method: 'keyword' | 'fuzzy' | 'none'
} {
  const keywordMatch = matchVendorByKeyword(text)

  if (keywordMatch) {
    return {
      vendor: keywordMatch,
      confidence: vendorConfidence(
        keywordMatch,
        text
      ),
      method: 'keyword',
    }
  }

  const fuzzyMatch = matchVendorFuzzy(text)

  if (fuzzyMatch) {
    return {
      vendor: fuzzyMatch,
      confidence: vendorConfidence(
        fuzzyMatch,
        text
      ),
      method: 'fuzzy',
    }
  }

  return {
    vendor: null,
    confidence: 0,
    method: 'none',
  }
}