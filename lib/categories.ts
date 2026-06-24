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
export interface Category {
  id: CategoryId
  label: string
  icon: string
  color: string
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
export const CATEGORY_KEYWORDS = {}

export function detectCategory(text: string) {
  return 'sonstiges'
}