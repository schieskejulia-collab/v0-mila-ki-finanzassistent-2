import type { CategoryId } from './categories'
import type { TaxHint } from './merchants'
import { classifyEntry } from './mila-classifier'
export const MILA_RECEIPT_RULES = [
  {
    category: 'Mobilität & Fahrten',
    keywords: [
      'parken',
      'parkhaus',
      'maut',
      'tankstelle',
      'werkstatt',
      'reparatur',
      'waschanlage',
      'bahn',
      'bus',
      'ticket',
      'hotel parkplatz'
    ],
    taxHint: 'prüfen',
    question: 'War diese Fahrt beruflich oder privat?'
  },

  {
    category: 'Werkzeug & Arbeitsmittel',
    keywords: [
      'baumarkt',
      'werkzeug',
      'material',
      'schrauben',
      'kabel',
      'messgerät',
      'arbeitsschuhe',
      'schutzkleidung',
      'software',
      'cloud',
      'handyhalterung'
    ],
    taxHint: 'häufig relevant',
    question: 'Nutzt du diesen Gegenstand beruflich?'
  },

  {
    category: 'Verpflegung',
    keywords: [
      'restaurant',
      'bäcker',
      'kaffee',
      'getränke',
      'snacks'
    ],
    taxHint: 'abhängig',
    question: 'War das beruflich, Montage oder privat?'
  },

  {
    category: 'Reisen & Montage',
    keywords: [
      'hotel',
      'airbnb',
      'koffer',
      'reisebedarf',
      'parkgebühr'
    ],
    taxHint: 'prüfen',
    question: 'War diese Reise beruflich veranlasst?'
  },

  {
    category: 'Gesundheit',
    keywords: [
      'apotheke',
      'medikament',
      'zahnarzt',
      'physio',
      'orthopädie',
      'bandage',
      'einlagen'
    ],
    taxHint: 'außergewöhnliche Belastung möglich',
    question: 'Wurde es ärztlich verordnet und selbst bezahlt?'
  },

  {
    category: 'Homeoffice & Büro',
    keywords: [
      'internet',
      'telefon',
      'drucker',
      'papier',
      'toner',
      'ordner'
    ],
    taxHint: 'prüfen',
    question: 'Nutzt du es beruflich?'
  },

  {
    category: 'Versicherung & Beiträge',
    keywords: [
      'haftpflicht',
      'unfallversicherung',
      'gewerkschaft',
      'berufsverband'
    ],
    taxHint: 'prüfen',
    question: 'Welche Art Versicherung ist es?'
  },

  {
    category: 'Weiterbildung',
    keywords: [
      'seminar',
      'schulung',
      'prüfung',
      'zertifikat',
      'fachbuch'
    ],
    taxHint: 'häufig relevant',
    question: 'Hat die Weiterbildung beruflichen Bezug?'
  }
]
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