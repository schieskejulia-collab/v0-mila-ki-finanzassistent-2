const VENDOR_ALIASES: Record<string, string> = {
  // Telekom
  'tkom': 'telekom',
  't com': 'telekom',
  't-com': 'telekom',
  'telekom deutschland': 'telekom',
  'telekom ag': 'telekom',
  'dtag': 'telekom',

  // Vodafone
  'vodafon': 'vodafone',
  'voda fone': 'vodafone',

  // Amazon
  'amzon': 'amazon',
  'amazn': 'amazon',
  'amzn': 'amazon',

  // Sparkasse
  'sparkase': 'sparkasse',
  'spar kasse': 'sparkasse',

  // E.ON
  'e on': 'eon',

  // Jobcenter
  'job center': 'jobcenter',

  // Finanzamt
  'finanz amt': 'finanzamt',

  // TK
  'techniker krankenkasse': 'techniker krankenkasse',
  'techniker kk': 'techniker krankenkasse',

  // AOK
  'a ok': 'aok',
}

export function normalizeVendorText(text: string): string {
  let normalized = text
    .toLowerCase()
    .replace(/[^a-z0-9äöüß]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  for (const [alias, target] of Object.entries(VENDOR_ALIASES)) {
    if (normalized.includes(alias)) {
      normalized = normalized.replace(alias, target)
    }
  }

  return normalized
}