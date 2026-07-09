// Mila Zentrale Kategorien
// -----------------------------
// CATEGORY TYPES
// -----------------------------

export type CategoryId =
  | 'software'
  | 'hardware'
  | 'werkzeug'
  | 'arbeitskleidung'
  | 'telefon'
  | 'marketing'
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
  | 'sonstiges'
| 'inkasso'
  | 'bekleidung'
  | 'dekoration'

export interface Category {
  id: CategoryId
  label: string
  icon: string
  color: string
}
export function getCategoryLabel(categoryId: CategoryId) {
  return CATEGORIES[categoryId]?.label ?? 'Sonstiges'
}
export const CATEGORIES: Partial<Record<CategoryId, Category>> = {
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
bekleidung: {
  id: 'bekleidung',
  label: 'Bekleidung / Privat',
  icon: 'Shirt',
  color: 'var(--chart-4)',
},

dekoration: {
  id: 'dekoration',
  label: 'Dekoration',
  icon: 'Sparkles',
  color: 'var(--chart-5)',
},

sonstiges: {

  id: 'sonstiges',
  label: 'Sonstiges',
  icon: 'Tag',
  color: 'var(--chart-5)',

},
inkasso: {
  label: '⚖️ Inkasso / Forderung',
},
}
export const CATEGORY_LIST = Object.values(CATEGORIES)
export const CATEGORY_KEYWORDS = {
  software: [
    'adobe',
    'openai',
    'chatgpt',
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
  ],

  werkzeug: [
    'würth',
    'obi',
    'hornbach',
    'toom',
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
  'ernstings family'
],

  telefon: [
    'vodafone',
    'telekom',
    'o2',
    'telefon',
    'internet',
    'mobilfunk',
  ],

  marketing: [
    'facebook',
    'instagram',
    'linkedin',
    'google ads',
    'werbung',
    'marketing',
  ],
  bewirtung: [
    'restaurant',
    'café',
    'cafe',
    'bistro',
    'essen',
    'mittagessen',
    'abendessen',
    'bewirtung',
    'lieferando',
  ],

  reisen: [
  'hotel',
  'airbnb',
  'booking',
  'bahn',
  'deutsche bahn',
  'db',
  'flug',
  'reise',
  'übernachtung',

  'fahrkarte',
  'fahrticket',
  'ticket',
  'dticket',
  'd-ticket',
  'deutschlandticket',
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
    'star',
    'tankstelle',
    'diesel',
    'benzin',
    'reifen',
    'werkstatt',
    'parken',
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
    'buch',
    'ebook',
    'fachbuch',
    'zeitschrift',
    'magazin',
    'report',
  ],

  miete: [
    'miete',
    'büro',
    'coworking',
    'lager',
    'raum',
    'praxis',
    'studio',
  ],
  homeoffice: [
    'homeoffice',
    'arbeitszimmer',
    'schreibtisch',
    'bürostuhl',
    'lampe',
    'strom',
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
    'vertrag',
    'agb',
    'datenschutz',
    'dsgvo',
    'notar',
  ],

  versicherung: [
    'haftpflicht',
    'versicherung',
    'berufshaftpflicht',
    'rechtsschutz',
    'krankenversicherung',
    'unfallversicherung',
  ],

  bank: [
   'paypal',
'stripe',
'sumup',
'visa',
'mastercard',
'kontoführung',
'gebühr',
'transaktion',
'zinsen',
  ],

  mitgliedschaften: [
    'ihk',
    'hwk',
    'kammer',
    'mitgliedschaft',
    'verband',
    'verein',
  ],


  versand: [
    'dhl',
    'hermes',
    'ups',
    'dpd',
    'porto',
    'briefmarke',
    'paket',
'ups',

'gls',

'post',

'porto',

'brief',

'paket',

'sendung',
  ],
  gesundheit: [
    'erste hilfe',
    'verbandskasten',
    'schutzbrille',
    'gehörschutz',
    'arbeitsschutz',
    'ergonomie',
    'bildschirmbrille',
  ],

  material: [
    'material',
    'verbrauchsmaterial',
    'holz',
    'farbe',
    'kabel',
    'schrauben',
    'kleinteile',
    'baustoff',
  ],

  steuern: [
    'finanzamt',
    'umsatzsteuer',
    'gewerbesteuer',
    'lohnsteuer',
    'steuerberater',
    'steuer',
'mahnung',
'bescheid',
'hansestadt',
'stadt',
'landkreis',
'amt',
'behörde',
'behoerde',
'gebühr',
'gebuehr',
  ],

  privat: [
    'netto',
    'aldi',
    'lidl',
    'rewe',
    'edeka',
    'privat',
    'lebensmittel',
'kita',
'kindergarten',
'hort',
'kindertagesstätte',
'kindertagesstaette',
'kinderbetreuung',
'nordspatzen',
'netto',

'rewe',

'edeka',

'penny',

'norma',

'kaufland',

'rossmann',
  ],

dekoration: [
  'butlers',
  'depot',
  'idee',
],

geschenke: [
  'nanu-nana',
  'geschenk',
  'geschenkartikel',
  'souvenir',
  'accessoire',
  'accessoires',
  'gutschein',
  'aufmerksamkeit',
  'präsent',
'spielwaren',
'spielzeug',
],

  sonstiges: [],
}

export function detectCategory(text: string): CategoryId {
  const lower = text.toLowerCase()

  for (const categoryId of Object.keys(CATEGORY_KEYWORDS) as CategoryId[]) {
    const keywords = CATEGORY_KEYWORDS[categoryId]

    if (keywords.some((keyword) => lower.includes(keyword.toLowerCase()))) {
      return categoryId
    }
  }

  return 'sonstiges'
}