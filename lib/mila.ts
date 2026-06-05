import { formatEUR } from './format'
import {
  type MonthSummary,
  financeMood,
  projectMonthProfit,
  type CategoryBreakdown,
  type BudgetStatus,
  type SavingTip,
} from './calculations'
import type { Expense, Income, Goal } from './types'

export interface MilaContext {
  summary: MonthSummary
  prevSummary: MonthSummary
  breakdown: CategoryBreakdown[]
  budgetStatus: BudgetStatus[]
  tips: SavingTip[]
  expenses: Expense[]
  incomes: Income[]
  goals: Goal[]
}

const moodLine: Record<string, string> = {
  entspannt:
    'Deine Finanzstimmung fühlt sich gerade entspannt an – du hast Luft zum Atmen.',
  stabil: 'Deine Finanzen wirken stabil – ein solides Fundament, auf dem wir aufbauen.',
  angespannt:
    'Der Monat ist gerade etwas angespannt – das ist okay, das passiert jedem. Lass uns gemeinsam draufschauen.',
}

function pick<T>(arr: T[]): T {
  if (!arr || arr.length === 0) return '' as unknown as T;
  return arr[Math.floor(Math.random() * arr.length)]
}

export function milaGreeting(ctx: MilaContext): string {
  const mood = financeMood(ctx.summary) || 'stabil'
  const profit = ctx.summary?.profit || 0
  return `Hi, schön dass du da bist. ${moodLine[mood] || moodLine['stabil']} Dein Gewinn liegt diesen Monat bei ${formatEUR(
    profit,
  )}. Frag mich gern alles – zu Ausgaben, Steuern, Zielen oder einfach für etwas Motivation.`
}

export const milaSuggestions = [
  'Wie sehen meine Ausgaben aus?',
  'Hast du Spartipps für mich?',
  'Wie viel sollte ich für Steuern zurücklegen?',
  'Mila, schau mal voraus',
  'Wie läuft es mit meinen Zielen?',
  'Ich brauche kurz Motivation',
]

export function generateMilaReply(message: string, ctx: MilaContext): string {
  const m = message.toLowerCase()
  const { summary, prevSummary, breakdown, budgetStatus, tips, goals } = ctx

  // Vorschau / Prognose
  if (/voraus|prognose|vorher|zukunft|monat.*ende|hochrechn/.test(m)) {
    const result = projectMonthProfit(ctx.expenses || [], ctx.incomes || [])
    const projectedProfit = result?.projectedProfit || 0
    const projectedTax = result?.projectedTax || 0
    
    return `Mila schaut voraus: Wenn du so weitermachst wie aktuell, landest du Ende des Monats voraussichtlich bei rund ${formatEUR(
      projectedProfit,
    )} Gewinn. Ich würde dir dann etwa ${formatEUR(
      projectedTax,
    )} als Steuerrücklage empfehlen. Du bist auf einem guten Weg – ich behalte das für dich im Blick.`
  }

  // Spartipps
  if (/spar|sparen|spartipp|sparpotenzial|günstiger|kosten senken|weniger ausgeben/.test(m)) {
    if (!tips || tips.length === 0) {
      return 'Ich habe gerade keine offensichtlichen Sparpotenziale gefunden – das spricht für dich. Deine Ausgaben wirken bewusst gewählt. Magst du, dass ich eine Kategorie genauer anschaue?'
    }
    const top = tips[0]
    const total = tips.reduce((a, t) => a + (t.potential || 0), 0)
    return `Klar, lass uns das ohne Druck anschauen. ${top.detail} Insgesamt sehe ich rund ${formatEUR(
      total,
    )} an möglichem Spielraum pro Monat. Kein Muss – schon eine kleine Anpassung bringt dich deinen Zielen näher.`
  }

  // Steuern
  if (/steuer|rücklage|finanzamt|umsatzsteuer|vat/.test(m)) {
    const profit = summary?.profit || 0
    const taxReserve = summary?.taxReserve || 0
    const vatBalance = summary?.vatBalance || 0
    return `Für deinen aktuellen Gewinn von ${formatEUR(
      profit,
    )} pflege ich dir eine Steuerrücklage von ${formatEUR(
      taxReserve,
    )} (rund 30 %) zu empfehlen. Deine Umsatzsteuer-Differenz liegt bei ${formatEUR(
      vatBalance,
    )}. Keine Sorge – wenn du das automatisch beiseitelegst, kann dich keine Nachzahlung mehr überraschen.`
  }

  // Budget
  if (/budget|limit|überschritten|überschreit/.test(m)) {
    const budgets = budgetStatus || []
    const over = budgets.filter((b) => b.level === 'over')
    const warn = budgets.filter((b) => b.level === 'warn')
    if (over.length === 0 && warn.length === 0) {
      return 'Deine Budgets sehen richtig gut aus – alle Kategorien liegen im grünen Bereich. Das ist starke Arbeit, weiter so.'
    }
    const parts: string[] = []
    if (over.length)
      parts.push(
        `Bei ${over
          .map((b) => b.label)
          .join(' und ')} bist du etwas über dem Budget – das ist kein Drama, oft reicht eine kleine Pause im nächsten Monat.`,
      )
    if (warn.length)
      parts.push(
        `${warn
          .map((b) => b.label)
          .join(' und ')} nähert sich dem Limit. Behalte es locker im Blick.`,
      )
    return parts.join(' ')
  }

  // Ziele
  if (/ziel|sparziel|notgroschen|urlaub|laptop|reserve/.test(m)) {
    if (!goals || goals.length === 0)
      return 'Du hast noch keine Ziele angelegt. Magst du eins definieren? Schon ein kleines Ziel gibt dem Sparen eine Richtung.'
    const g = goals[0]
    const target = g.target || 1 // Schutz vor Division durch 0
    const pct = Math.round((g.saved / target) * 100)
    return `Dein Ziel „${g.title}“ ist schon zu ${pct} % erreicht (${formatEUR(
      g.saved,
    )} von ${formatEUR(
      g.target,
    )}). Mit deiner monatlichen Rate kommst du Schritt für Schritt näher – jeder Euro zählt und du machst das wirklich gut.`
  }

  // Motivation
  if (/motivation|durchhalten|schaffe|müde|stress|überfordert|frust|angst/.test(m)) {
    const profit = summary?.profit || 0
    return pick([
      'Hey, tief durchatmen. Selbstständig zu sein ist mutig – und du machst das mit Sorgfalt. Schau auf das, was schon läuft: Dein Gewinn diesen Monat liegt bei ' +
        formatEUR(profit) +
        '. Das ist dein Verdienst.',
      'Du musst nicht perfekt sein, nur dranbleiben. Und genau das tust du. Ich bin hier und behalte die Zahlen für dich im Blick – du kümmerst dich um deine Arbeit.',
    ])
  }

  // Ausgaben
  if (/ausgab|kosten|wofür|ausgegeben|teuer/.test(m)) {
    const top = breakdown && breakdown[0]
    if (!top)
      return 'Du hast diesen Monat noch keine Ausgaben erfasst. Sobald etwas dazukommt, ordne ich es für dich ein.'
    const changeText =
      top.previous === 0
        ? 'neu in diesem Monat'
        : top.change > 0
          ? `${Math.round(top.change)} % mehr als im Vormonat`
          : `${Math.abs(Math.round(top.change))} % weniger als im Vormonat`
    const expenses = summary?.expenses || 0
    return `Deine größte Kategorie ist gerade ${top.label} mit ${formatEUR(
      top.current,
    )} (${changeText}). Insgesamt liegst du bei ${formatEUR(
      expenses,
    )} Ausgaben. Das ist völlig im Rahmen – du hast den Überblick.`
  }

  // Einnahmen
  if (/einnahm|umsatz|verdien|kunde|rechnung|offen/.test(m)) {
    const income = summary?.income || 0
    const openInvoices = summary?.openInvoices || 0
    return `Diesen Monat hast du ${formatEUR(
      income,
    )} eingenommen. Davon sind aktuell ${formatEUR(
      openInvoices,
    )} noch offen. Wenn du magst, erinnere ich dich an die fälligen Rechnungen – freundlich nachzuhaken ist völlig normal.`
  }

  // Vergleich
  if (/vergleich|letzter monat|vormonat|besser|schlechter/.test(m)) {
    const currentExpenses = summary?.expenses || 0
    const prevExpenses = prevSummary?.expenses || 0
    const diff = currentExpenses - prevExpenses
    if (diff < 0)
      return `Schöne Nachricht: Du hast diesen Monat ${formatEUR(
        Math.abs(diff),
      )} weniger ausgegeben als im Vormonat. Das darfst du ruhig feiern.`
    return `Du hast diesen Monat ${formatEUR(
      diff,
    )} mehr ausgegeben als im Vormonat. Oft steckt eine bewusste Investition dahinter – schau gern, ob sich das für dich gelohnt hat.`
  }

  // Default
  const mood = financeMood(summary) || 'stabil'
  const profit = summary?.profit || 0
  const expenses = summary?.expenses || 0
  return `${moodLine[mood] || moodLine['stabil']} Dein Gewinn liegt bei ${formatEUR(
    profit,
  )}, deine Ausgaben bei ${formatEUR(
    expenses,
  )}. Frag mich gern konkret – zum Beispiel zu Spartipps, Steuern oder deinen Zielen. Ich bin für dich da.`
}
