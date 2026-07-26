import type { CategoryId } from './categories'
import type { TaxHint } from './merchants'
import { classifyEntry } from './mila-classifier'

export type MilaReceiptRule = {
  category: CategoryId
  keywords: string[]
  taxHint: TaxHint
  confidence: number
  needsReview: boolean
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
    taxHint: 'depends',
    confidence: 0.72,
    needsReview: true,
    question:
      'Das sieht nach Familie oder Kinderbetreuung aus. War die Ausgabe privat?',
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
    confidence: 0.55,
    needsReview: true,
    question:
      'War diese Fahrt oder Reise beruflich, auf Dienstreise oder privat?',
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
    confidence: 0.58,
    needsReview: true,
    question:
      'War die Fahrzeugausgabe beruflich oder privat veranlasst?',
  },
  {
    category: 'werkzeug',
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
    confidence: 0.6,
    needsReview: true,
    question:
      'Wird dieser Gegenstand tatsächlich beruflich genutzt?',
  },
  {
    category: 'bewirtung',
    keywords: [
      'restaurant',
      'bäcker',
      'baecker',
      'kaffee',
      'café',
      'cafe',
      'getränke',
      'getraenke',
      'snacks',
      'imbiss',
      'mcdonald',
      'burger king',
      'starbucks',
    ],
    taxHint: 'depends',
    confidence: 0.52,
    needsReview: true,
    question:
      'War das privat, ein Kundentermin oder Teil einer Dienstreise?',
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
    confidence: 0.62,
    needsReview: true,
    question:
      'War das eine private Gesundheitsausgabe oder besteht ein beruflicher Zusammenhang?',
  },
  {
    category: 'material',
    keywords: [
      'druckerpapier',
      'druckerpatrone',
      'toner',
      'aktenordner',
      'bürobedarf',
      'buerobedarf',
      'briefumschlag',
      'versandetikett',
    ],
    taxHint: 'depends',
    confidence: 0.72,
    needsReview: true,
    question:
      'Wird dieser Bürobedarf für deine berufliche Tätigkeit genutzt?',
  },
  {
    category: 'telefon',
    keywords: [
      'internetvertrag',
      'telefonvertrag',
      'mobilfunkvertrag',
      'handyvertrag',
      'datenvolumen',
    ],
    taxHint: 'depends',
    confidence: 0.7,
    needsReview: true,
    question:
      'Wird der Anschluss vollständig oder teilweise beruflich genutzt?',
  },
  {
    category: 'versicherung',
    keywords: [
      'haftpflicht',
      'unfallversicherung',
      'berufshaftpflicht',
      'betriebshaftpflicht',
      'gewerkschaft',
      'berufsverband',
    ],
    taxHint: 'depends',
    confidence: 0.68,
    needsReview: true,
    question:
      'Welche Art von Versicherung oder Mitgliedsbeitrag ist das?',
  },
  {
    category: 'weiterbildung',
    keywords: [
      'seminar',
      'schulung',
      'prüfung',
      'pruefung',
      'zertifikat',
      'fachbuch',
      'weiterbildung',
      'onlinekurs',
      'online kurs',
    ],
    taxHint: 'depends',
    confidence: 0.68,
    needsReview: true,
    question:
      'Hat die Weiterbildung einen konkreten beruflichen Bezug?',
  },
  {
    category: 'software',
    keywords: [
      'software',
      'cloud',
      'scanner-app',
      'scanner app',
      'chatgpt',
      'openai',
      'github',
      'vercel',
      'cloudflare',
      'hosting',
      'domain',
      'saas',
    ],
    taxHint: 'depends',
    confidence: 0.76,
    needsReview: true,
    question:
      'Wird dieses Tool oder Abonnement beruflich genutzt?',
  },
]

export type ReceiptRuleResult = {
  category: CategoryId
  taxHint: TaxHint
  confidence: number
  needsReview: boolean
  source:
    | 'memory'
    | 'merchant'
    | 'category'
    | 'rule'
    | 'fallback'
  question?: string
}

function getReceiptText(receipt: any) {
  return `
    ${receipt?.title || ''}
    ${receipt?.description || ''}
    ${receipt?.vendor || ''}
    ${receipt?.merchant || ''}
    ${receipt?.category || ''}
    ${receipt?.note || ''}
  `
    .toLowerCase()
    .trim()
}

export function classifyReceipt(
  receipt: any
): ReceiptRuleResult {
  const text = getReceiptText(receipt)

  /*
   * Zuerst das persönliche Händlergedächtnis und
   * vorhandene Händlerwissen prüfen.
   */
  const learnedResult = classifyEntry({
    title:
      receipt?.title ||
      receipt?.description ||
      '',
    vendor:
      receipt?.vendor ||
      receipt?.merchant ||
      '',
    category: receipt?.category || '',
    note: receipt?.note || '',
  })

  /*
   * Eine vom Nutzer gelernte Händlerentscheidung
   * hat immer Vorrang.
   */
  if (learnedResult.source === 'memory') {
    return {
      category: learnedResult.category,
      taxHint: learnedResult.taxHint,
      confidence: 0.92,
      needsReview: false,
      source: 'memory',
    }
  }

  /*
   * Eindeutige Verpflichtungen werden nicht durch
   * normale Belegregeln überschrieben.
   */
  if (
    text.includes('inkasso') ||
    text.includes('forderung') ||
    text.includes('mahnung') ||
    text.includes('gläubiger') ||
    text.includes('vollstreckung')
  ) {
    return {
      category: 'inkasso',
      taxHint: 'private',
      confidence: 0.95,
      needsReview: false,
      source: 'category',
      question:
        'Das sieht nach einer Forderung oder Verpflichtung aus.',
    }
  }

  /*
   * Danach vorsichtige Inhaltsregeln prüfen.
   * Sie liefern nur eine Vermutung und keine
   * endgültige steuerliche Entscheidung.
   */
  const matchingRule =
    MILA_RECEIPT_RULES.find((rule) =>
      rule.keywords.some((keyword) =>
        text.includes(keyword.toLowerCase())
      )
    )

  if (matchingRule) {
    return {
      category: matchingRule.category,
      taxHint: matchingRule.taxHint,
      confidence: matchingRule.confidence,
      needsReview:
        matchingRule.needsReview,
      source: 'rule',
      question: matchingRule.question,
    }
  }

  /*
   * Eine bekannte Händlerzuordnung darf einen
   * Vorschlag machen. Sie bleibt aber prüfbar,
   * solange sie nicht vom Nutzer gelernt wurde.
   */
  if (learnedResult.source === 'merchant') {
    return {
      category: learnedResult.category,
      taxHint: learnedResult.taxHint,
      confidence: 0.7,
      needsReview:
        learnedResult.taxHint !== 'likely',
      source: 'merchant',
    }
  }

  if (learnedResult.source === 'category') {
    return {
      category: learnedResult.category,
      taxHint: learnedResult.taxHint,
      confidence: 0.58,
      needsReview: true,
      source: 'category',
    }
  }

  return {
    category: 'sonstiges',
    taxHint: 'unknown',
    confidence: 0.35,
    needsReview: true,
    source: 'fallback',
    question:
      'Der Verwendungszweck ist noch nicht eindeutig erkennbar.',
  }
}
