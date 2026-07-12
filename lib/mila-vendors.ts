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
  name: string
  type: MilaVendorType
  keywords: string[]
}

export const MILA_VENDORS: MilaVendor[] = [
  // Software, Abos und Cloud
  { name: 'ChatGPT', type: 'software', keywords: ['chatgpt', 'openai'] },
  { name: 'Claude', type: 'software', keywords: ['claude', 'anthropic'] },
  { name: 'Gemini', type: 'software', keywords: ['gemini', 'google ai'] },
  {
    name: 'Adobe',
    type: 'software',
    keywords: ['adobe', 'creative cloud'],
  },
  { name: 'Canva', type: 'software', keywords: ['canva'] },
  { name: 'Figma', type: 'software', keywords: ['figma'] },
  { name: 'Netflix', type: 'software', keywords: ['netflix'] },
  { name: 'Spotify', type: 'software', keywords: ['spotify'] },
  {
    name: 'Microsoft',
    type: 'software',
    keywords: ['microsoft', 'office365', 'office 365', 'ms365'],
  },
  {
    name: 'Apple',
    type: 'software',
    keywords: ['apple', 'icloud', 'itunes'],
  },
  { name: 'Dropbox', type: 'software', keywords: ['dropbox'] },
  { name: 'Notion', type: 'software', keywords: ['notion'] },
  { name: 'Slack', type: 'software', keywords: ['slack'] },
  { name: 'Zoom', type: 'software', keywords: ['zoom'] },
  { name: '1Password', type: 'software', keywords: ['1password'] },
  { name: 'GitHub', type: 'software', keywords: ['github'] },
  {
    name: 'JetBrains',
    type: 'software',
    keywords: ['jetbrains', 'intellij'],
  },
  { name: 'Shopify', type: 'software', keywords: ['shopify'] },
  { name: 'Wix', type: 'software', keywords: ['wix'] },
  {
    name: 'Squarespace',
    type: 'software',
    keywords: ['squarespace'],
  },
  { name: 'WeTransfer', type: 'software', keywords: ['wetransfer'] },
  { name: 'Miro', type: 'software', keywords: ['miro'] },
  { name: 'Asana', type: 'software', keywords: ['asana'] },
  { name: 'Trello', type: 'software', keywords: ['trello'] },
  { name: 'Monday', type: 'software', keywords: ['monday.com', 'monday'] },

  // Onlinehandel
  { name: 'Amazon', type: 'onlinehandel', keywords: ['amazon', 'amzn'] },
  { name: 'Temu', type: 'onlinehandel', keywords: ['temu'] },
  { name: 'eBay', type: 'onlinehandel', keywords: ['ebay'] },
  { name: 'Otto', type: 'onlinehandel', keywords: ['otto'] },
  { name: 'Zalando', type: 'onlinehandel', keywords: ['zalando'] },
  { name: 'H&M', type: 'onlinehandel', keywords: ['h&m', 'hm.com'] },
  { name: 'IKEA', type: 'onlinehandel', keywords: ['ikea'] },
  {
    name: 'MediaMarkt',
    type: 'onlinehandel',
    keywords: ['mediamarkt', 'media markt'],
  },
  { name: 'Saturn', type: 'onlinehandel', keywords: ['saturn'] },
  {
    name: 'Rewe Online',
    type: 'onlinehandel',
    keywords: ['rewe online'],
  },
  {
    name: 'Lidl Online',
    type: 'onlinehandel',
    keywords: ['lidl online'],
  },

  // Versicherungen und Krankenkassen
  { name: 'AOK', type: 'versicherung', keywords: ['aok'] },
  {
    name: 'Techniker Krankenkasse',
    type: 'versicherung',
    keywords: ['techniker krankenkasse', 'techniker kk'],
  },
  { name: 'Barmer', type: 'versicherung', keywords: ['barmer'] },
  { name: 'DAK', type: 'versicherung', keywords: ['dak'] },
  { name: 'Allianz', type: 'versicherung', keywords: ['allianz'] },
  { name: 'HUK', type: 'versicherung', keywords: ['huk', 'huk24'] },
  { name: 'Debeka', type: 'versicherung', keywords: ['debeka'] },
  { name: 'AXA', type: 'versicherung', keywords: ['axa'] },
  {
    name: 'Signal Iduna',
    type: 'versicherung',
    keywords: ['signal iduna'],
  },
  { name: 'Gothaer', type: 'versicherung', keywords: ['gothaer'] },

  // Behörden
  { name: 'Finanzamt', type: 'behoerde', keywords: ['finanzamt'] },
  { name: 'Jobcenter', type: 'behoerde', keywords: ['jobcenter'] },
  {
    name: 'Familienkasse',
    type: 'behoerde',
    keywords: ['familienkasse'],
  },
  {
    name: 'Bundesagentur für Arbeit',
    type: 'behoerde',
    keywords: [
      'bundesagentur für arbeit',
      'arbeitsagentur',
      'agentur für arbeit',
    ],
  },
  {
    name: 'Stadtverwaltung',
    type: 'behoerde',
    keywords: ['stadtverwaltung', 'rathaus'],
  },

  // Banken und Zahlungsanbieter
  { name: 'Sparkasse', type: 'bank', keywords: ['sparkasse'] },
  { name: 'Volksbank', type: 'bank', keywords: ['volksbank'] },
  { name: 'Commerzbank', type: 'bank', keywords: ['commerzbank'] },
  {
    name: 'Deutsche Bank',
    type: 'bank',
    keywords: ['deutsche bank'],
  },
  { name: 'N26', type: 'bank', keywords: ['n26'] },
  { name: 'DKB', type: 'bank', keywords: ['dkb'] },
  { name: 'ING', type: 'bank', keywords: ['ing diba', 'ing-diBa'] },
  { name: 'Revolut', type: 'bank', keywords: ['revolut'] },
  { name: 'PayPal', type: 'bank', keywords: ['paypal'] },

  // Telefon und Internet
  { name: 'Telekom', type: 'telefon', keywords: ['telekom'] },
  { name: 'Vodafone', type: 'telefon', keywords: ['vodafone'] },
  {
    name: 'O2',
    type: 'telefon',
    keywords: ['telefonica', 'o2 germany'],
  },
  { name: '1&1', type: 'telefon', keywords: ['1&1', '1und1'] },
  { name: 'Congstar', type: 'telefon', keywords: ['congstar'] },

  // Energie
  { name: 'E.ON', type: 'energie', keywords: ['e.on', 'eon'] },
  { name: 'Vattenfall', type: 'energie', keywords: ['vattenfall'] },
  { name: 'EnBW', type: 'energie', keywords: ['enbw'] },
  { name: 'Stadtwerke', type: 'energie', keywords: ['stadtwerke'] },

  // Einkommen und Arbeit
  { name: 'Upwork', type: 'einkommen', keywords: ['upwork'] },
  { name: 'Fiverr', type: 'einkommen', keywords: ['fiverr'] },
  {
    name: 'Freelance.de',
    type: 'einkommen',
    keywords: ['freelance.de'],
  },
  {
    name: 'Gehalt',
    type: 'einkommen',
    keywords: ['gehalt', 'lohnabrechnung', 'lohnzahlung'],
  },
  {
    name: 'Honorar',
    type: 'einkommen',
    keywords: ['honorar', 'honorarzahlung'],
  },
  {
    name: 'Steuererstattung',
    type: 'einkommen',
    keywords: ['steuererstattung', 'elster auszahlung'],
  },

  // Sonstiges
  {
    name: 'Deutsche Bahn',
    type: 'sonstiges',
    keywords: ['deutsche bahn', 'db vertrieb', 'bahn.de'],
  },
  {
    name: 'DHL',
    type: 'sonstiges',
    keywords: ['dhl', 'deutsche post'],
  },
  { name: 'Tierarzt', type: 'sonstiges', keywords: ['tierarzt'] },
  { name: 'Apotheke', type: 'sonstiges', keywords: ['apotheke'] },
  {
    name: 'Fitnessstudio',
    type: 'sonstiges',
    keywords: ['fitnessstudio', 'fitness center', 'gym'],
  },
]