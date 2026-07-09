import type { CategoryId } from './categories'
import type { TaxHint } from './merchants'
import { classifyEntry } from './mila-classifier'

export type MilaReceiptRule = {
  category: CategoryId
  keywords: string[]
  taxHint: TaxHint
  question: string
}

export const MILA_RECEIPT_RULES: MilaReceiptRule[] = [
  {
    category: 'privat',
    keywords: [
      'kita',
      'kindergarten',
      'hort',
      'schule',
      'essengeld',
      'verpflegung kindergarten',
      'verpflegung kita',
      'verpflegungsleistungen',
      'betreuung',
      'besseressen',
    ],
    taxHint: 'no',
    question: 'Das sieht nach Familie/Kinderbetreuung aus. Soll ich es privat einordnen?',
  },
  {
    category: 'reisen',
    keywords: [
      'parken',
      'parkhaus',
      'maut',
      'bahn',
      'bus',
      'ticket',
      'fahrkarte',
      'hotel',
      'airbnb',
      'koffer',
      'reisebedarf',
      'parkgebühr',
      'parkgebuehr',
    ],
    taxHint: 'depends',
    question: 'War diese Fahrt oder Reise beruflich, Montage oder privat?',
  },
  {
    category: 'fahrzeug',
    keywords: [
      'tankstelle',
      'tanken',
      'benzin',
      'diesel',
      'werkstatt',
      'reparatur',
      'waschanlage',
    ],
    taxHint: 'depends',
    question: 'War das beruflich, Fahrt zur Arbeit oder privat?',
  },
  {
    category: 'arbeitsmittel',
    keywords: [
      'baumarkt',
      'werkzeug',
      'material',
      'schrauben',
      'kabel',
      'messgerät',
      'messgeraet',
      'arbeitsschuhe',
      'schutzkleidung',
      'handyhalterung',
    ],
    taxHint: 'depends',
    question: 'Nutzt du diesen Gegenstand beruflich?',
  },
  {
    category: 'bewirtung',
    keywords: ['restaurant', 'bäcker', 'baecker', 'kaffee', 'getränke', 'getraenke', 'snacks'],
    taxHint: 'depends',
    question: 'War das beruflich, Montage oder privat?',
  },
  {
    category: 'gesundheit',
    keywords: [
      'apotheke',
      'medikament',
      'zahnarzt',
      'physio',
      'orthopädie',
      'orthopaedie',
      'bandage',
      'einlagen',
      'schmerzmittel',
    ],
    taxHint: 'depends',
    question: 'Wurde es ärztlich verordnet und selbst bezahlt?',
  },
  {
    category: 'buerobedarf',
    keywords: ['drucker', 'papier', 'toner', 'ordner', 'bürobedarf', 'buerobedarf'],
    taxHint: 'depends',
    question: 'Nutzt du es beruflich?',
  },
  {
    category: 'telefon',
    keywords: ['internet', 'telefon', 'mobilfunk', 'handyvertrag'],
    taxHint: 'depends',
    question: 'Gibt es eine berufliche Nutzung?',
  },
  {
    category: 'versicherungen',
    keywords: ['haftpflicht', 'unfallversicherung', 'gewerkschaft', 'berufsverband'],
    taxHint: 'depends',
    question: 'Welche Art Versicherung oder Beitrag ist es?',
  },
  {
    category: 'weiterbildung',
    keywords: ['seminar', 'schulung', 'prüfung', 'pruefung', 'zertifikat', 'fachbuch'],
    taxHint: 'depends',
    question: 'Hat die Weiterbildung beruflichen Bezug?',
  },
  {
    category: 'software',
    keywords: ['software', 'cloud', 'scanner-app', 'scanner app', 'chatgpt', 'openai'],
    taxHint: 'yes',
    question: 'Wird das Tool beruflich genutzt?',
  },
]

export type ReceiptRuleResult = {
  category: CategoryId
  taxHint: TaxHint
  confidence: 'high' | 'medium' | 'low'
  needsReview: boolean
  source: 'memory' | 'merchant' | 'category' | 'rule' | 'fallback'
  question?: string
}

export function classifyReceipt(receipt: any): ReceiptRuleResult {
  const text = `${receipt.title || ''} ${receipt.description || ''} ${
    receipt.vendor || receipt.merchant || ''
  } ${receipt.category || ''} ${receipt.note || ''}`.toLowerCase()

  const rule = MILA_RECEIPT_RULES.find((item) =>
    item.keywords.some((keyword) => text.includes(keyword.toLowerCase()))
  )

  if (rule) {
    return {
      category: rule.category,
      taxHint: rule.taxHint,
      confidence: 'medium',
      needsReview: rule.taxHint !== 'yes',
      source: 'rule',
      question: rule.question,
    }
  }

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