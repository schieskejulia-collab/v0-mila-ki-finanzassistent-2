import type { CategoryId } from './categories'

export type TaxHint = 'likely' | 'depends' | 'private' | 'unknown'

export type MerchantInfo = {
  name: string
  category: CategoryId
  taxHint: TaxHint
  aliases: string[]
}

/**
 * Finale normalize()-Version
 */
export function normalize(str: string) {
  return String(str || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '')
    .trim()
}

/**
 * Rohdaten aller Händler
 */
const RAW_MERCHANTS: Record<
  string,
  Omit<MerchantInfo, 'aliases' | 'name'> & { aliases?: string[] }
> = {
  // Supermärkte / privat
  aldi: { category: 'privat', taxHint: 'private' },
  'aldi nord': { category: 'privat', taxHint: 'private' },
  'aldi süd': { category: 'privat', taxHint: 'private' },
  lidl: { category: 'privat', taxHint: 'private' },
  rewe: { category: 'privat', taxHint: 'private' },
  edeka: { category: 'privat', taxHint: 'private' },
  kaufland: { category: 'privat', taxHint: 'private' },
  netto: { category: 'privat', taxHint: 'private' },
  penny: { category: 'privat', taxHint: 'private' },
  marktkauf: { category: 'privat', taxHint: 'private' },
  globus: { category: 'privat', taxHint: 'private' },

  // Drogerie
  dm: { category: 'privat', taxHint: 'private' },
  rossmann: { category: 'privat', taxHint: 'private' },
  müller: { category: 'privat', taxHint: 'private' },
  douglas: { category: 'privat', taxHint: 'private' },

  // Kleidung
  deichmann: { category: 'privat', taxHint: 'private' },
  kik: { category: 'privat', taxHint: 'private' },
  'c&a': { category: 'privat', taxHint: 'private' },
  'h&m': { category: 'privat', taxHint: 'private' },
  zara: { category: 'privat', taxHint: 'private' },
  takko: { category: 'privat', taxHint: 'private' },

  // Baumarkt / Material
  obi: { category: 'werkzeug', taxHint: 'depends' },
  bauhaus: { category: 'werkzeug', taxHint: 'depends' },
  hornbach: { category: 'werkzeug', taxHint: 'depends' },
  toom: { category: 'werkzeug', taxHint: 'depends' },
  hagebau: { category: 'werkzeug', taxHint: 'depends' },
  würth: { category: 'werkzeug', taxHint: 'likely' },

  // Möbel / Homeoffice
  ikea: { category: 'homeoffice', taxHint: 'depends' },
  roller: { category: 'homeoffice', taxHint: 'depends' },
  porta: { category: 'homeoffice', taxHint: 'depends' },
  xxxlutz: { category: 'homeoffice', taxHint: 'depends' },
  poco: { category: 'homeoffice', taxHint: 'depends' },

  // Elektronik / Hardware
  mediamarkt: { category: 'hardware', taxHint: 'depends' },
  'media markt': { category: 'hardware', taxHint: 'depends' },
  saturn: { category: 'hardware', taxHint: 'depends' },
  cyberport: { category: 'hardware', taxHint: 'depends' },
  gravis: { category: 'hardware', taxHint: 'depends' },
  apple: { category: 'hardware', taxHint: 'depends' },
  samsung: { category: 'hardware', taxHint: 'depends' },

  // Versand
  'deutsche post': { category: 'versand', taxHint: 'likely' },
  dhl: { category: 'versand', taxHint: 'likely' },
  hermes: { category: 'versand', taxHint: 'likely' },
  ups: { category: 'versand', taxHint: 'likely' },
  gls: { category: 'versand', taxHint: 'likely' },
  dpd: { category: 'versand', taxHint: 'likely' },

  // Reisen / Fahrt
  'deutsche bahn': { category: 'reisen', taxHint: 'depends' },
  db: { category: 'reisen', taxHint: 'depends' },
  flixbus: { category: 'reisen', taxHint: 'depends' },
  flixtrain: { category: 'reisen', taxHint: 'depends' },
  'booking.com': { category: 'reisen', taxHint: 'depends' },
  airbnb: { category: 'reisen', taxHint: 'depends' },

  // Tankstelle / Fahrzeug
  aral: { category: 'fahrzeug', taxHint: 'depends' },
  shell: { category: 'fahrzeug', taxHint: 'depends' },
  esso: { category: 'fahrzeug', taxHint: 'depends' },
  jet: { category: 'fahrzeug', taxHint: 'depends' },
  hem: { category: 'fahrzeug', taxHint: 'depends' },
  total: { category: 'fahrzeug', taxHint: 'depends' },
  avia: { category: 'fahrzeug', taxHint: 'depends' },
  atu: { category: 'fahrzeug', taxHint: 'depends' },
  euromaster: { category: 'fahrzeug', taxHint: 'depends' },

  // Bewirtung
  mcdonalds: { category: 'bewirtung', taxHint: 'depends' },
  "mcdonald's": { category: 'bewirtung', taxHint: 'depends' },
  'burger king': { category: 'bewirtung', taxHint: 'depends' },
  subway: { category: 'bewirtung', taxHint: 'depends' },
  starbucks: { category: 'bewirtung', taxHint: 'depends' },
  nordsee: { category: 'bewirtung', taxHint: 'depends' },
  vapiano: { category: 'bewirtung', taxHint: 'depends' },
  kfc: { category: 'bewirtung', taxHint: 'depends' },
  lieferando: { category: 'bewirtung', taxHint: 'depends' },

  // Online / Material
  amazon: {
    category: 'material',
    taxHint: 'depends',
    aliases: [
      'amazon eu',
      'amazon.de',
      'amazon marketplace',
      'amazon digital',
    ],
  },
  'amazon marketplace': { category: 'material', taxHint: 'depends' },
  ebay: { category: 'material', taxHint: 'depends' },
  etsy: { category: 'material', taxHint: 'depends' },
  otto: { category: 'material', taxHint: 'depends' },

  // Telekommunikation
  telekom: { category: 'telefon', taxHint: 'depends' },
  vodafone: { category: 'telefon', taxHint: 'depends' },
  o2: { category: 'telefon', taxHint: 'depends' },
  '1&1': { category: 'telefon', taxHint: 'depends' },
  congstar: { category: 'telefon', taxHint: 'depends' },

  // Banken / Zahlungsanbieter
  sparkasse: { category: 'bank', taxHint: 'unknown' },
  volksbank: { category: 'bank', taxHint: 'unknown' },
  commerzbank: { category: 'bank', taxHint: 'unknown' },
  'deutsche bank': { category: 'bank', taxHint: 'unknown' },
  ing: { category: 'bank', taxHint: 'unknown' },
  paypal: { category: 'bank', taxHint: 'depends' },
  stripe: { category: 'bank', taxHint: 'depends' },
  sumup: { category: 'bank', taxHint: 'depends' },

  // Gesundheit
  apotheke: { category: 'gesundheit', taxHint: 'depends' },
  fielmann: { category: 'gesundheit', taxHint: 'depends' },
  apollo: { category: 'gesundheit', taxHint: 'depends' },
  sanitätshaus: { category: 'gesundheit', taxHint: 'depends' },

  // Büro / Weiterbildung / Bücher
  staples: { category: 'material', taxHint: 'depends' },
  'office discount': { category: 'material', taxHint: 'depends' },
  thalia: { category: 'fachliteratur', taxHint: 'depends' },
  hugendubel: { category: 'fachliteratur', taxHint: 'depends' },

  // Geschenke / Sonstiges
  'nanu nana': {
    category: 'geschenke',
    taxHint: 'depends',
    aliases: [
      'nanu-nana',
      'nanunana',
      'nanu',
      'nanu nana gmbh',
    ],
  },
  tedi: { category: 'sonstiges', taxHint: 'depends' },
  action: { category: 'sonstiges', taxHint: 'depends' },
  depot: { category: 'geschenke', taxHint: 'depends' },

  // Haustier / Sport
  fressnapf: { category: 'privat', taxHint: 'private' },
  zooplus: { category: 'privat', taxHint: 'private' },
  decathlon: { category: 'privat', taxHint: 'depends' },
  intersport: { category: 'privat', taxHint: 'depends' },
  sportcheck: { category: 'privat', taxHint: 'depends' },

  // Software / SaaS / Hosting
  openai: { category: 'software', taxHint: 'likely' },
  chatgpt: { category: 'software', taxHint: 'likely' },
  github: { category: 'software', taxHint: 'likely' },
  vercel: { category: 'software', taxHint: 'likely' },
  cloudflare: { category: 'software', taxHint: 'likely' },
  supabase: { category: 'software', taxHint: 'likely' },
  groq: { category: 'software', taxHint: 'likely' },
  anthropic: { category: 'software', taxHint: 'likely' },
  claude: { category: 'software', taxHint: 'likely' },
  gemini: { category: 'software', taxHint: 'likely' },
  'google workspace': { category: 'software', taxHint: 'likely' },
  microsoft: { category: 'software', taxHint: 'likely' },
  notion: { category: 'software', taxHint: 'likely' },
  figma: { category: 'software', taxHint: 'likely' },

  ionos: { category: 'software', taxHint: 'likely' },
  hetzner: { category: 'software', taxHint: 'likely' },
  namecheap: { category: 'software', taxHint: 'likely' },
  'all-inkl': { category: 'software', taxHint: 'likely' },
  hostinger: { category: 'software', taxHint: 'likely' },

  canva: { category: 'software', taxHint: 'likely' },
  adobe: { category: 'software', taxHint: 'likely' },
  zoom: { category: 'software', taxHint: 'likely' },
  slack: { category: 'software', taxHint: 'likely' },
  make: { category: 'software', taxHint: 'likely' },
  zapier: { category: 'software', taxHint: 'likely' },
  n8n: { category: 'software', taxHint: 'likely' },
}

/**
 * Normalisierte Händlerliste
 */
export const MERCHANTS: MerchantInfo[] = Object.entries(RAW_MERCHANTS).map(
  ([rawName, info]) => {
    const normalizedName = normalize(rawName)
    const aliasList = info.aliases?.map(normalize) ?? []

    return {
      name: normalizedName,
      category: info.category,
      taxHint: info.taxHint,
      aliases: [normalizedName, ...aliasList],
    }
  }
)

/**
 * Finale Matching-Funktion
 */
export function findMerchantInfo(vendor: string) {
  const normalizedVendor = normalize(vendor)

  return MERCHANTS.find((merchant) =>
    merchant.aliases.some((alias) => normalizedVendor.includes(alias))
  )
}
