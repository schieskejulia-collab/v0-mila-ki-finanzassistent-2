import type { MilaDocument } from './mila-documents'
import type { Obligation } from './mila-obligations'

function iso(dayOffset: number) {
  const date = new Date()
  date.setDate(date.getDate() + dayOffset)
  return date.toISOString().slice(0, 10)
}

export const demoPilotBusiness = {
  name: 'Malerbetrieb Schneider',
  month: 'Juli',
  handoffCompletion: 88,
}

export const demoPilotDocuments: MilaDocument[] = [
  {
    id: 'demo-doc-1',
    title: 'Rechnung Farben Grosshandel',
    partner: 'BauColor Grosshandel',
    amount: 486.2,
    type: 'rechnung',
    status: 'geprueft',
    documentDate: iso(-12),
    keepUntil: iso(365),
    note: 'Materialeinkauf fuer Auftrag Kita Sonnenschein. Zahlungsnachweis liegt vor.',
    createdAt: iso(-10),
  },
  {
    id: 'demo-doc-2',
    title: 'Tankbeleg Transporter',
    partner: 'Shell Stendal',
    amount: 91.44,
    type: 'beleg',
    status: 'neu',
    documentDate: iso(-8),
    keepUntil: iso(365),
    note: 'Rueckfrage offen: Welcher Auftrag oder welche Baustelle gehoerte zu dieser Fahrt?',
    createdAt: iso(-8),
  },
  {
    id: 'demo-doc-3',
    title: 'Leasingrate Firmenwagen',
    partner: 'Autohaus Altmark',
    amount: 328,
    type: 'vertrag',
    status: 'geprueft',
    documentDate: iso(-18),
    dueDate: iso(4),
    keepUntil: iso(365),
    note: 'Wiederkehrende Verpflichtung erkannt. In Pflichten vorgemerkt.',
    createdAt: iso(-18),
  },
  {
    id: 'demo-doc-4',
    title: 'Quittung Baumarkt',
    partner: 'HORNBACH',
    amount: 63.79,
    type: 'beleg',
    status: 'neu',
    documentDate: iso(-5),
    keepUntil: iso(365),
    note: 'Unklar: Pinsel und Folie koennen Auftrag oder Lager sein. Bitte kurz Kontext ergaenzen.',
    createdAt: iso(-5),
  },
  {
    id: 'demo-doc-5',
    title: 'Bescheid Berufsgenossenschaft',
    partner: 'BG BAU',
    amount: 214.5,
    type: 'bescheid',
    status: 'geprueft',
    documentDate: iso(-2),
    dueDate: iso(9),
    keepUntil: iso(365),
    note: 'Frist erkannt und als offene Pflicht markiert.',
    createdAt: iso(-2),
  },
]

export const demoPilotExpenses = [
  {
    id: 'demo-exp-1',
    title: 'Farbrollen und Abdeckfolie',
    vendor: 'HORNBACH',
    amount: 63.79,
    date: iso(-5),
    category: 'material',
    hasReceipt: false,
    note: 'Beleg fehlt noch in der Mappe.',
  },
  {
    id: 'demo-exp-2',
    title: 'Diesel Transporter',
    vendor: 'Shell Stendal',
    amount: 91.44,
    date: iso(-8),
    category: 'fahrtkosten',
    hasReceipt: true,
    note: 'Kontext zur Baustelle fehlt noch.',
  },
  {
    id: 'demo-exp-3',
    title: 'Farbe und Grundierung',
    vendor: 'BauColor Grosshandel',
    amount: 486.2,
    date: iso(-12),
    category: 'material',
    hasReceipt: true,
    note: 'Auftrag Kita Sonnenschein.',
  },
]

export const demoPilotObligations: Obligation[] = [
  {
    id: 'demo-obl-1',
    title: 'Leasingrate Firmenwagen',
    partner: 'Autohaus Altmark',
    amount: 328,
    type: 'vertrag',
    area: 'business',
    dueDate: iso(4),
    due_date: iso(4),
    status: 'offen',
    priority: 'normal',
    reminderDays: [14, 3, 0],
    reminder_days: 3,
    note: 'Wiederkehrende Zahlung fuer die Kanzlei-Mappe sichtbar.',
  },
  {
    id: 'demo-obl-2',
    title: 'BG BAU Beitrag',
    partner: 'BG BAU',
    amount: 214.5,
    type: 'rechnung',
    area: 'business',
    dueDate: iso(9),
    due_date: iso(9),
    status: 'offen',
    priority: 'wichtig',
    reminderDays: [14, 3, 0],
    reminder_days: 3,
    note: 'Bescheid liegt vor, Zahlung noch offen.',
  },
]
