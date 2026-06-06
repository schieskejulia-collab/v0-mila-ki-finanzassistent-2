import type { Expense, Income, Goal, Budget } from './types'

// ==========================================
// AB HIER: DIE NEUEN CORE-FUNKTIONEN FÜR MILA UND DASHBOARD
// ==========================================

// Das Profil für deinen ersten Testnutzer (Standard: angestellt für deinen Onkel!)
export const USER = {
  name: "Onkel Michael",
  status: "angestellt" // Hier steuern wir den Modus! (angestellt / selbstständig)
}

// Rechnet die rohen Arrays automatisch für das Dashboard zusammen
export function getTotals() {
  // Wir filtern nur die Einnahmen und Ausgaben für diesen Monat (iso(0, ...))
  const currentIncomes = demoIncomes.filter(i => i.date.includes(new Date().toISOString().substring(0, 7)))
  const currentExpenses = demoExpenses.filter(e => e.date.includes(new Date().toISOString().substring(0, 7)))

  const incomeSum = currentIncomes.reduce((sum, item) => sum + item.amount, 0)
  const expenseSum = currentExpenses.reduce((sum, item) => sum + item.amount, 0)
  const profitSum = incomeSum - expenseSum

  // Berechne offene Rechnungen
  const openSum = currentIncomes
    .filter(i => i.status === 'offen')
    .reduce((sum, item) => sum + item.amount, 0)

  return {
    income: incomeSum || 6729.00, // Fallback auf deine Demowerte, falls Monat leer
    expense: expenseSum || 1421.00,
    profit: profitSum || 5308.00,
    openInvoices: openSum || 2480.00
  }
}

// ==========================================
// AB HIER: DEINE BESTEHENDEN DEMO-DATEN (UNBERÜHRT)
// ==========================================

// Build ISO date strings relative to "today" so month logic always works.
function iso(monthOffset: number, day: number): string {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, day)
  return d.toISOString()
}

let counter = 0
const id = (p: string) => `${p}-${++counter}`

export const demoExpenses: Expense[] = [
  // --- This month ---
  { id: id('e'), amount: 900, category: 'miete', date: iso(0, 1), vendor: 'Coworking Lofts GmbH', vat: 171, notes: 'Atelier-Platz', hasReceipt: true, recurring: true },
  { id: id('e'), amount: 12, category: 'software', date: iso(0, 2), vendor: 'Figma', vat: 1.92, hasReceipt: true, recurring: true },
  { id: id('e'), amount: 24, category: 'software', date: iso(0, 3), vendor: 'Adobe Creative Cloud', vat: 3.83, hasReceipt: false, recurring: true },
  { id: id('e'), amount: 20, category: 'software', date: iso(0, 4), vendor: 'Notion', vat: 3.19, hasReceipt: true, recurring: true },
  { id: id('e'), amount: 33, category: 'software', date: iso(0, 5), vendor: 'Vercel Pro', vat: 5.27, hasReceipt: true, recurring: true },
  { id: id('e'), amount: 280, category: 'marketing', date: iso(0, 6), vendor: 'Meta Ads', vat: 44.7, notes: 'Kampagne Frühling', hasReceipt: true },
  { id: id('e'), amount: 64, category: 'buerobedarf', date: iso(0, 8), vendor: 'Manufactum', vat: 10.22, hasReceipt: false },
  { id: id('e'), amount: 149, category: 'weiterbildung', date: iso(0, 9), vendor: 'Online-Kurs UX', vat: 23.79, hasReceipt: true },
  { id: id('e'), amount: 38, category: 'reisen', date: iso(0, 11), vendor: 'Deutsche Bahn', vat: 2.49, notes: 'Kundentermin Berlin', hasReceipt: true },

  // --- Last month ---
  { id: id('e'), amount: 900, category: 'miete', date: iso(-1, 1), vendor: 'Coworking Lofts GmbH', vat: 171, hasReceipt: true, recurring: true },
  { id: id('e'), amount: 12, category: 'software', date: iso(-1, 2), vendor: 'Figma', vat: 1.92, hasReceipt: true, recurring: true },
  { id: id('e'), amount: 24, category: 'software', date: iso(-1, 3), vendor: 'Adobe Creative Cloud', vat: 3.83, hasReceipt: true, recurring: true },
  { id: id('e'), amount: 20, category: 'software', date: iso(-1, 4), vendor: 'Notion', vat: 3.19, hasReceipt: true, recurring: true },
  { id: id('e'), amount: 120, category: 'marketing', date: iso(-1, 7), vendor: 'Meta Ads', vat: 19.16, hasReceipt: true },
  { id: id('e'), amount: 45, category: 'buerobedarf', date: iso(-1, 10), vendor: 'Office Discount', vat: 7.18, hasReceipt: true },
  { id: id('e'), amount: 210, category: 'reisen', date: iso(-1, 14), vendor: 'Lufthansa', vat: 13.77, hasReceipt: true },

  // --- Two months ago ---
  { id: id('e'), amount: 900, category: 'miete', date: iso(-2, 1), vendor: 'Coworking Lofts GmbH', vat: 171, hasReceipt: true, recurring: true },
  { id: id('e'), amount: 56, category: 'software', date: iso(-2, 4), vendor: 'Diverse Abos', vat: 8.94, hasReceipt: true, recurring: true },
  { id: id('e'), amount: 90, category: 'marketing', date: iso(-2, 9), vendor: 'Canva Pro', vat: 14.37, hasReceipt: true },
]

export const demoIncomes: Income[] = [
  // This month
  { id: id('i'), amount: 2400, date: iso(0, 3), client: 'Studio Nordlicht', vat: 383.19, status: 'bezahlt', source: 'kunde' },
  { id: id('i'), amount: 1800, date: iso(0, 7), client: 'Brauer & Co.', vat: 287.39, status: 'bezahlt', source: 'kunde' },
  { id: id('i'), amount: 1500, date: iso(0, 10), client: 'GreenTech Startup', vat: 239.5, status: 'offen', dueDate: iso(0, 2), source: 'kunde' },
  { id: id('i'), amount: 980, date: iso(0, 12), client: 'Café Mira', vat: 156.47, status: 'offen', dueDate: iso(0, 28), source: 'kunde' },
  { id: id('i'), amount: 49, date: iso(0, 1), client: 'Template-Verkauf', vat: 7.82, status: 'bezahlt', source: 'sonstiges', recurring: true },

  // Last month
  { id: id('i'), amount: 2200, date: iso(-1, 5), client: 'Studio Nordlicht', vat: 351.26, status: 'bezahlt', source: 'kunde' },
  { id: id('i'), amount: 1600, date: iso(-1, 11), client: 'Brauer & Co.', vat: 255.46, status: 'bezahlt', source: 'kunde' },
  { id: id('i'), amount: 1200, date: iso(-1, 18), client: 'GreenTech Startup', vat: 191.6, status: 'bezahlt', source: 'kunde' },

  // Two months ago
  { id: id('i'), amount: 1900, date: iso(-2, 6), client: 'Studio Nordlicht', vat: 303.36, status: 'bezahlt', source: 'kunde' },
  { id: id('i'), amount: 1400, date: iso(-2, 15), client: 'Café Mira', vat: 223.53, status: 'bezahlt', source: 'kunde' },
]

export const demoGoals: Goal[] = [
  { id: id('g'), title: 'Notgroschen', icon: 'ShieldCheck', target: 9000, saved: 5400, monthlyContribution: 400 },
  { id: id('g'), title: 'Neuer Laptop', icon: 'Laptop', target: 2800, saved: 1750, monthlyContribution: 250 },
  { id: id('g'), title: 'Steuerreserve', icon: 'Landmark', target: 6000, saved: 3900, monthlyContribution: 500 },
  { id: id('g'), title: 'Urlaub Portugal', icon: 'Palmtree', target: 2000, saved: 620, monthlyContribution: 150 },
]

export const demoBudgets: Budget[] = [
  { category: 'miete', limit: 950, warnThreshold: 80 },
  { category: 'software', limit: 100, warnThreshold: 80 },
  { category: 'marketing', limit: 300, warnThreshold: 80 },
  { category: 'buerobedarf', limit: 80, warnThreshold: 80 },
  { category: 'reisen', limit: 150, warnThreshold: 80 },
  { category: 'weiterbildung', limit: 150, warnThreshold: 80 },
]
