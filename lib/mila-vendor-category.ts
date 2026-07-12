import type { MilaVendorType } from './mila-vendors'
import { normalizeVendorText } from './mila-vendor-normalizer'
import { detectVendor } from './mila-vendor-detection'

const CATEGORY_KEYWORDS: Record<
  MilaVendorType,
  string[]
> = {
  software: [
    'cloud',
    'abo',
    'subscription',
    'saas',
    'software',
    'lizenz',
    'streaming',
    'office',
    'icloud',
    'ki tool',
  ],

  versicherung: [
    'versicherung',
    'krankenkasse',
    'krankenversicherung',
    'haftpflicht',
    'hausrat',
    'rechtsschutz',
    'kfz versicherung',
    'beitrag',
  ],

  behoerde: [
    'finanzamt',
    'jobcenter',
    'familienkasse',
    'bundesagentur',
    'arbeitsagentur',
    'stadtverwaltung',
    'rathaus',
    'amt',
    'behörde',
  ],

  einkommen: [
    'lohn',
    'gehalt',
    'honorar',
    'auszahlung',
    'steuererstattung',
    'lohnabrechnung',
    'gutschrift',
  ],

  onlinehandel: [
    'bestellung',
    'warenkorb',
    'shop',
    'onlinekauf',
    'versand',
    'lieferung',
    'kauf',
  ],

  bank: [
    'bank',
    'konto',
    'kontoführung',
    'überweisung',
    'lastschrift',
    'paypal',
    'kreditinstitut',
  ],

  energie: [
    'strom',
    'gas',
    'energie',
    'abschlag',
    'verbrauch',
    'stadtwerke',
  ],

  telefon: [
    'mobilfunk',
    'telefon',
    'internet',
    'dsl',
    'sim karte',
    'handyvertrag',
  ],

  sonstiges: [
    'apotheke',
    'tierarzt',
    'fitnessstudio',
    'bahn',
    'dhl',
    'post',
  ],
}

function categoryScore(
  category: MilaVendorType,
  text: string
): number {
  const normalizedText = normalizeVendorText(text)

  let score = 0

  for (const keyword of CATEGORY_KEYWORDS[category]) {
    const normalizedKeyword =
      normalizeVendorText(keyword)

    if (
      normalizedKeyword &&
      normalizedText.includes(normalizedKeyword)
    ) {
      score += 1
    }
  }

  return score
}

export function autoCategorizeVendor(
  text: string
): {
  category: MilaVendorType | null
  confidence: number
  method:
    | 'vendor-match'
    | 'keyword-fallback'
    | 'none'
} {
  const vendorResult = detectVendor(text)

  if (vendorResult.vendor) {
    return {
      category: vendorResult.vendor.type,
      confidence: vendorResult.confidence,
      method: 'vendor-match',
    }
  }

  let bestCategory: MilaVendorType | null = null
  let bestScore = 0

  const categories = Object.keys(
    CATEGORY_KEYWORDS
  ) as MilaVendorType[]

  for (const category of categories) {
    const score = categoryScore(category, text)

    if (score > bestScore) {
      bestScore = score
      bestCategory = category
    }
  }

  if (bestCategory && bestScore > 0) {
    return {
      category: bestCategory,
      confidence: Math.min(
        0.4 + bestScore * 0.15,
        0.85
      ),
      method: 'keyword-fallback',
    }
  }

  return {
    category: null,
    confidence: 0,
    method: 'none',
  }
}