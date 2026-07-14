// Mila – zentrale Kategorien

// ---------------------------------------------------------
// Kategorie-Typen
// ---------------------------------------------------------

export type CategoryId =
  | 'software'
  | 'hardware'
  | 'werkzeug'
  | 'arbeitskleidung'
  | 'bekleidung'
  | 'telefon'
  | 'marketing'
  | 'kinder'
  | 'bewirtung'
  | 'reisen'
  | 'fahrzeug'
  | 'weiterbildung'
  | 'fachliteratur'
  | 'miete'
  | 'homeoffice'
  | 'dienstleister'
  | 'recht'
  | 'versicherung'
  | 'bank'
  | 'mitgliedschaften'
  | 'geschenke'
  | 'versand'
  | 'gesundheit'
  | 'material'
  | 'steuern'
  | 'privat'
  | 'dekoration'
  | 'inkasso'
  | 'sonstiges'

export interface Category {
  id: CategoryId
  label: string
  icon: string
  color: string
}

// ---------------------------------------------------------
// Kategorien
// ---------------------------------------------------------

export const CATEGORIES: Record<CategoryId, Category> = {
  software: {
    id: 'software',
    label: 'Software & KI',
    icon: 'Laptop',
    color: 'var(--chart-1)',
  },

  hardware: {
    id: 'hardware',
    label: 'Hardware & Technik',
    icon: 'Monitor',
    color: 'var(--chart-2)',
  },

  werkzeug: {
    id: 'werkzeug',
    label: 'Werkzeug & Material',
    icon: 'Wrench',
    color: 'var(--chart-3)',
  },

  arbeitskleidung: {
    id: 'arbeitskleidung',
    label: 'Arbeitskleidung',
    icon: 'Shirt',
    color: 'var(--chart-4)',
  },

  bekleidung: {
    id: 'bekleidung',
    label: 'Bekleidung / Privat',
    icon: 'Shirt',
    color: 'var(--chart-4)',
  },

  telefon: {
    id: 'telefon',
    label: 'Telefon & Internet',
    icon: 'Smartphone',
    color: 'var(--chart-5)',
  },

  marketing: {
    id: 'marketing',
    label: 'Marketing & Werbung',
    icon: 'Megaphone',
    color: 'var(--chart-1)',
  },

  kinder: {
    id: 'kinder',
    label: '👶 Kinder & Betreuung',
    icon: 'Baby',
    color: 'var(--chart-5)',
  },

  bewirtung: {
    id: 'bewirtung',
    label: 'Bewirtung',
    icon: 'Utensils',
    color: 'var(--chart-2)',
  },

  reisen: {
    id: 'reisen',
    label: 'Reisen & Unterkünfte',
    icon: 'Plane',
    color: 'var(--chart-3)',
  },

  fahrzeug: {
    id: 'fahrzeug',
    label: 'Fahrtkosten & Fahrzeuge',
    icon: 'Car',
    color: 'var(--chart-4)',
  },

  weiterbildung: {
    id: 'weiterbildung',
    label: 'Weiterbildung',
    icon: 'GraduationCap',
    color: 'var(--chart-5)',
  },

  fachliteratur: {
    id: 'fachliteratur',
    label: 'Fachliteratur',
    icon: 'BookOpen',
    color: 'var(--chart-1)',
  },

  miete: {
    id: 'miete',
    label: 'Miete & Räume',
    icon: 'Building',
    color: 'var(--chart-2)',
  },

  homeoffice: {
    id: 'homeoffice',
    label: 'Homeoffice',
    icon: 'Home',
    color: 'var(--chart-3)',
  },

  dienstleister: {
    id: 'dienstleister',
    label: 'Leistungen Dritter',
    icon: 'Users',
    color: 'var(--chart-4)',
  },

  recht: {
    id: 'recht',
    label: 'Rechtsberatung',
    icon: 'Scale',
    color: 'var(--chart-5)',
  },

  versicherung: {
    id: 'versicherung',
    label: 'Versicherungen',
    icon: 'Shield',
    color: 'var(--chart-1)',
  },

  bank: {
    id: 'bank',
    label: 'Bankgebühren & Finanzen',
    icon: 'Landmark',
    color: 'var(--chart-2)',
  },

  mitgliedschaften: {
    id: 'mitgliedschaften',
    label: 'Mitgliedschaften & Beiträge',
    icon: 'BadgeCheck',
    color: 'var(--chart-3)',
  },

  geschenke: {
    id: 'geschenke',
    label: 'Geschenke & Aufmerksamkeiten',
    icon: 'Gift',
    color: 'var(--chart-4)',
  },

  versand: {
    id: 'versand',
    label: 'Versand & Porto',
    icon: 'Package',
    color: 'var(--chart-5)',
  },

  gesundheit: {
    id: 'gesundheit',
    label: 'Gesundheit & Arbeitsschutz',
    icon: 'HeartPulse',
    color: 'var(--chart-1)',
  },

  material: {
    id: 'material',
    label: 'Material & Verbrauch',
    icon: 'Hammer',
    color: 'var(--chart-2)',
  },

  steuern: {
    id: 'steuern',
    label: 'Steuern & Abgaben',
    icon: 'Receipt',
    color: 'var(--chart-3)',
  },

  privat: {
    id: 'privat',
    label: 'Privat / Nicht absetzbar',
    icon: 'User',
    color: 'var(--chart-4)',
  },

  dekoration: {
    id: 'dekoration',
    label: 'Dekoration',
    icon: 'Sparkles',
    color: 'var(--chart-5)',
  },

  inkasso: {
    id: 'inkasso',
    label: '⚖️ Inkasso / Forderung',
    icon: 'Scale',
    color: 'var(--chart-5)',
  },

  sonstiges: {
    id: 'sonstiges',
    label: 'Sonstiges',
    icon: 'Tag',
    color: 'var(--chart-5)',
  },
}

// ---------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------

export function getCategoryLabel(categoryId: string) {
  const normalizedId = String(categoryId || '')
    .trim()
    .toLowerCase()

  return (
    CATEGORIES[normalizedId as CategoryId]?.label ??
    CATEGORIES.sonstiges.label
  )
}

export const CATEGORY_LIST = Object.values(CATEGORIES)

// ---------------------------------------------------------
// Schlüsselwörter für automatische Erkennung
// Reihenfolge ist wichtig:
// Spezifische Kategorien stehen vor allgemeinen Kategorien.
// ---------------------------------------------------------

export const CATEGORY_KEYWORDS: Record<CategoryId, string[]> = {
  software: [
    'adobe',
    'openai',
    'chatgpt',
    'claude',
    'anthropic',
    'hosting',
    'domain',
    'hetzner',
    'notion',
    'figma',
    'canva',
    'webflow',
    'github',
    'vercel',
    'cloudflare',
    'microsoft',
    'google workspace',
  ],

  hardware: [
    'laptop',
    'computer',
    'monitor',
    'maus',
    'tastatur',
    'drucker',
    'scanner',
    'webcam',
    'iphone',
    'samsung',
    'tablet',
  ],

  werkzeug: [
    'würth',
    'obi',
    'hornbach',
    'toom',
    'bauhaus',
    'werkzeug',
    'schrauben',
    'bohrer',
    'maschine',
  ],

  arbeitskleidung: [
    'engelbert strauss',
    'arbeitskleidung',
    'sicherheitsschuhe',
    'arbeitshose',
    'schutzkleidung',
  ],

  bekleidung: [
    'kik',
    'deichmann',
    'c&a',
    'h&m',
    'zara',
    'new yorker',
    'takko',
    'ernstings family',
  ],

  telefon: [
    'vodafone',
    'telekom',
    'o2',
    'telefonica',
    '1&1',
    '1und1',
    'congstar',
    'telefon',
    'internet',
    'mobilfunk',
    'dsl',
  ],

  marketing: [
    'facebook',
    'instagram',
    'linkedin',
    'google ads',
    'meta ads',
    'werbung',
    'marketing',
  ],

  // Muss vor "bewirtung" stehen, weil Essengeld
  // und Kita-Verpflegung ebenfalls "essen" enthalten können.
  kinder: [
    'kita',
    'kindergarten',
    'hort',
    'kindertagesstätte',
    'kindertagesstaette',
    'kinderbetreuung',
    'essengeld',
    'mittagessen kita',
    'verpflegung kita',
    'verpflegung kindergarten',
    'schulessen',
    'besseressen',
    'besser essen',
    'nordspatzen',
    'mischka',
    'tagesstätte',
    'tagesstaette',
  ],

  bewirtung: [
    'restaurant',
    'café',
    'cafe',
    'bistro',
    'abendessen',
    'bewirtung',
    'lieferando',
    'geschäftsessen',
    'geschaeftsessen',
  ],

  reisen: [
    'hotel',
    'airbnb',
    'booking',
    'bahn',
    'deutsche bahn',
    'db vertrieb',
    'flug',
    'reise',
    'übernachtung',
    'uebernachtung',
    'fahrkarte',
    'fahrticket',
    'deutschlandticket',
    'd-ticket',
    'dticket',
    'nahverkehr',
    'bus',
    'tram',
    'zug',
    'öpnv',
    'oepnv',
  ],

  fahrzeug: [
    'aral',
    'shell',
    'total',
    'esso',
    'jet',
    'star tankstelle',
    'tankstelle',
    'diesel',
    'benzin',
    'reifen',
    'werkstatt',
    'parken',
    'parkhaus',
  ],

  weiterbildung: [
    'kurs',
    'seminar',
    'coaching',
    'fortbildung',
    'weiterbildung',
    'training',
    'workshop',
  ],

  fachliteratur: [
    'fachbuch',
    'ebook',
    'e-book',
    'zeitschrift',
    'fachzeitschrift',
    'magazin',
    'report',
  ],

  miete: [
    'miete',
    'büromiete',
    'bueromiete',
    'coworking',
    'lager',
    'praxisraum',
    'studio',
  ],

  homeoffice: [
    'homeoffice',
    'arbeitszimmer',
    'schreibtisch',
    'bürostuhl',
    'buerostuhl',
    'schreibtischlampe',
  ],

  dienstleister: [
    'freelancer',
    'entwickler',
    'designer',
    'texter',
    'berater',
    'agentur',
    'subunternehmer',
  ],

  recht: [
    'anwalt',
    'rechtsanwalt',
    'kanzlei',
    'notar',
    'rechtsberatung',
    'dsgvo beratung',
  ],

  versicherung: [
    'haftpflicht',
    'versicherung',
    'berufshaftpflicht',
    'rechtsschutz',
    'krankenversicherung',
    'unfallversicherung',
    'krankenkasse',
    'aok',
    'barmer',
    'techniker krankenkasse',
  ],

  bank: [
    'paypal',
    'stripe',
    'sumup',
    'visa',
    'mastercard',
    'kontoführung',
    'kontofuehrung',
    'bankgebühr',
    'bankgebuehr',
    'transaktionsgebühr',
    'transaktionsgebuehr',
    'zinsen',
  ],

  mitgliedschaften: [
    'ihk',
    'hwk',
    'kammer',
    'mitgliedschaft',
    'verband',
    'vereinsbeitrag',
  ],

  geschenke: [
    'nanu-nana',
    'nanu nana',
    'geschenk',
    'geschenkartikel',
    'souvenir',
    'accessoire',
    'accessoires',
    'gutschein',
    'aufmerksamkeit',
    'präsent',
    'praesent',
    'spielwaren',
    'spielzeug',
  ],

  versand: [
    'dhl',
    'hermes',
    'ups',
    'dpd',
    'gls',
    'deutsche post',
    'porto',
    'briefmarke',
    'paket',
    'sendung',
  ],

  gesundheit: [
    'erste hilfe',
    'verbandskasten',
    'schutzbrille',
    'gehörschutz',
    'gehoerschutz',
    'arbeitsschutz',
    'ergonomie',
    'bildschirmbrille',
    'apotheke',
  ],

  material: [
    'verbrauchsmaterial',
    'baustoff',
    'holz',
    'farbe',
    'kabel',
    'kleinteile',
  ],

  steuern: [
    'finanzamt',
    'umsatzsteuer',
    'gewerbesteuer',
    'lohnsteuer',
    'steuerberater',
    'steuerbescheid',
    'steuerzahlung',
    'hansestadt',
    'landkreis',
    'behörde',
    'behoerde',
    'verwaltungsgebühr',
    'verwaltungsgebuehr',
  ],

  privat: [
    'netto',
    'aldi',
    'lidl',
    'rewe',
    'edeka',
    'penny',
    'norma',
    'kaufland',
    'rossmann',
    'lebensmittel',
    'privat',
  ],

  dekoration: [
    'butlers',
    'depot',
    'dekoration',
    'dekoartikel',
  ],

  inkasso: [
    'inkasso',
    'inkassoforderung',
    'forderungsschreiben',
    'forderungen management',
    'mahnverfahren',
    'vollstreckung',
    'gerichtsvollzieher',
    'coeo inkasso',
  ],

  sonstiges: [],
}

// ---------------------------------------------------------
// Automatische Kategorie-Erkennung
// ---------------------------------------------------------

export function detectCategory(text: string): CategoryId {
  const lower = String(text || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

  if (!lower) {
    return 'sonstiges'
  }

  const categoryIds = Object.keys(
    CATEGORY_KEYWORDS
  ) as CategoryId[]

  for (const categoryId of categoryIds) {
    const keywords = CATEGORY_KEYWORDS[categoryId]

    const match = keywords.some((keyword) =>
      lower.includes(keyword.toLowerCase())
    )

    if (match) {
      return categoryId
    }
  }

  return 'sonstiges'
}