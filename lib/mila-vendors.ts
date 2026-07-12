export type MilaVendorType =
  | 'software'
  | 'versicherung'
  | 'behoerde'
  | 'einkommen'
  | 'onlinehandel'
  | 'bank'
  | 'energie'
  | 'telefon'
  | 'sonstiges'

export type MilaVendor = {
  keywords: string[]
  name: string
  type: MilaVendorType
}

export const MILA_VENDORS: MilaVendor[] = [
  {
    name: 'ChatGPT',
    type: 'software',
    keywords: ['chatgpt', 'openai'],
  },

  {
    name: 'Claude',
    type: 'software',
    keywords: ['claude', 'anthropic'],
  },

  {
    name: 'Gemini',
    type: 'software',
    keywords: ['gemini', 'google ai'],
  },

  {
    name: 'Adobe',
    type: 'software',
    keywords: ['adobe'],
  },

  {
    name: 'Canva',
    type: 'software',
    keywords: ['canva'],
  },

  {
    name: 'Figma',
    type: 'software',
    keywords: ['figma'],
  },

  {
    name: 'Netflix',
    type: 'software',
    keywords: ['netflix'],
  },

  {
    name: 'Spotify',
    type: 'software',
    keywords: ['spotify'],
  },

  {
    name: 'Amazon',
    type: 'onlinehandel',
    keywords: ['amazon'],
  },

  {
    name: 'Temu',
    type: 'onlinehandel',
    keywords: ['temu'],
  },

  {
    name: 'eBay',
    type: 'onlinehandel',
    keywords: ['ebay'],
  },

  {
    name: 'AOK',
    type: 'versicherung',
    keywords: ['aok'],
  },

  {
    name: 'TK',
    type: 'versicherung',
    keywords: ['techniker', 'tk'],
  },

  {
    name: 'Barmer',
    type: 'versicherung',
    keywords: ['barmer'],
  },

  {
    name: 'Allianz',
    type: 'versicherung',
    keywords: ['allianz'],
  },

  {
    name: 'HUK',
    type: 'versicherung',
    keywords: ['huk'],
  },

  {
    name: 'Finanzamt',
    type: 'behoerde',
    keywords: ['finanzamt'],
  },

  {
    name: 'Jobcenter',
    type: 'behoerde',
    keywords: ['jobcenter'],
  },

  {
    name: 'Familienkasse',
    type: 'behoerde',
    keywords: ['familienkasse'],
  },

  {
    name: 'Sparkasse',
    type: 'bank',
    keywords: ['sparkasse'],
  },

  {
    name: 'Volksbank',
    type: 'bank',
    keywords: ['volksbank'],
  },

  {
    name: 'Telekom',
    type: 'telefon',
    keywords: ['telekom'],
  },

  {
    name: 'Vodafone',
    type: 'telefon',
    keywords: ['vodafone'],
  },

  {
    name: 'E.ON',
    type: 'energie',
    keywords: ['eon'],
  },
]