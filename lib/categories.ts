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
export const CATEGORIES = {}

export const CATEGORY_KEYWORDS = {}

export function detectCategory(text: string) {
  return 'sonstiges'
}