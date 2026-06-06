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
import { getTotals, USER } from "./demo-data" // Absolut präzise korrigiert!
import OpenAI from "openai"

// 1. ECHTES KI-GEHIRN (Groq-Client initialisieren)
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || "", 
  baseURL: "https://groq.com",
})

// 2. DEINE SAUBERE PERSÖNLICHKEIT (Mit Weiche für Angestellte/Selbstständige)
export function getMilaPersonality(status: string = "selbstständig"): string {
  let statusText = ""
  if (status === "angestellt") {
    statusText = `
- Dein Fokus liegt auf Werbungskosten, Sonderausgaben und dem privaten Haushaltsbuch.
- Erkläre dem Nutzer bei Belegen (Sprit, Arbeitsmittel, Fachbücher, Homeoffice), wie er sich das Geld am Jahresende über die Steuererklärung vom Finanzamt zurückholt.
- Tracke Abos und Fixkosten. Erkenne Muster (z. B. "Du gibst diesen Monat auffällig viel für Streaming aus").
- Wenn Ausgaben vom Chef erstattet werden können (Reisekosten), sag ihm, dass du es im Ordner "Geld vom Chef" parkst.`
  } else {
    statusText = `
- Dein Fokus liegt auf Betriebsausgaben, Umsatzsteuer und Business-Wachstum.
- Erkläre sofort im Chat, was voll absetzbar ist, was nur anteilig (z. B. Bewirtung zu 70 %) und was gar nicht.
- Achte auf die spezifische Nische des Nutzers, erkenne Umsatzmuster und erinnere proaktiv an fehlende geschäftliche Rechnungen.`
  }

  return `
Du bist Mila – eine warme, ruhige, klare Finanzbegleiterin.
Du sprichst einfach, menschlich und ohne Fachwörter.
Du beruhigst, sortierst und gibst kleine, machbare Schritte.
Aktueller Nutzer-Typ: ${status.toUpperCase()}

Dein Stil:
– warm, ruhig, freundlich
– kurze, klare Sätze
– kein Druck, keine Panik
– Orientierung statt Belehrung
${statusText}

WICHTIG: Antworte immer direkt als Mila. Nutze keine Einleitungen wie "Als KI-Assistent..." oder Ähnliches. Antworte warmherzig und halte dich kurz.
`
}

/**
 * 3. LIVE-CHAT HOOK FÜR DIE ROUTE
 * Schickt den Chat live zu Groq und nutzt deine Daten als Kontext
 */
export async function getMilaReplyLive(message: string, ctx: MilaContext, userStatus: string = "selbstständig", userName: string = "Nutzer"): Promise<string> {
  const finanzKontext = `
Aktuelle Finanzdaten des Nutzers (${userName}):
- Einnahmen gesamt: ${formatEUR(ctx.summary?.income || 0)}
- Ausgaben gesamt: ${formatEUR(ctx.summary?.expenses || 0)}
- Aktueller Gewinn/Überschuss: ${formatEUR(ctx.summary?.profit || 0)}
`

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: getMilaPersonality(userStatus) },
        { role: "system", content: finanzKontext },
        { role: "user", content: message }
      ],
      temperature: 0.6,
    })

    return response.choices?.message?.content || "Ich habe kurz den Faden verloren. Frag mich einfach nochmal, ich bin da."
  } catch (error) {
    console.error("Groq-API Fehler, weiche auf lokalen Fallback aus:", error)
    return generateMilaReply(message, ctx)
  }
}

// --- AB HIER BLEIBT DEIN ALTER CODE ALS SICHERHEITSNETZ UNBERÜHRT ---

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
  if (!arr || arr.length === 0) return '' as unknown as T
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
  'Ich braくちゃ kurz Motivation',
]

export function generateMilaReply(message: string, ctx: MilaContext): string {
  const m = message.toLowerCase()
  const { summary, prevSummary, breakdown, budgetStatus, tips, goals } = ctx

  if (/voraus|prognose|vorher|zukunft|monat.*ende|hochrechn/.test(m)) {
    const result = projectMonthProfit(ctx.expenses || [], ctx.incomes || [])
    const projectedProfit = result?.projectedProfit || 0
    const projectedTax = result?.projectedTax || 0
    return `Mila schaut voraus: Wenn du so weitermachst wie aktuell, landest du Ende des Monats voraussichtlich bei rund ${formatEUR(projectedProfit)} Gewinn. Ich würde dir dann etwa ${formatEUR(projectedTax)} als Steuerrücklage empfehlen.`
  }

  if (/spar|sparen|spartipp|sparpotenzial|günstiger|kosten senken|weniger ausgeben/.test(m)) {
    if (!tips || tips.length === 0) return 'Ich habe gerade keine offensichtlichen Sparpotenziale gefunden.'
    const top = tips
    const total = tips.reduce((a, t) => a + (t.potential || 0), 0)
    return `Klar, lass uns das ohne Druck anschauen. ${top.detail} Insgesamt sehe ich rund ${formatEUR(total)} an möglichem Spielraum.`
  }

  if (/steuer|rücklage|finanzamt|umsatzsteuer|vat/.test(m)) {
    const profit = summary?.profit || 0
    const taxReserve = summary?.taxReserve || 0
    return `Für deinen aktuellen Gewinn von ${formatEUR(profit)} empfehle ich dir eine Steuerrücklage von ${formatEUR(taxReserve)} (rund 30 %).`
  }

  if (/budget|limit|überschritten|überschreit/.test(m)) {
    const budgets = budgetStatus || []
    const over = budgets.filter((b) => b.level === 'over')
    if (over.length === 0) return 'Deine Budgets sehen richtig gut aus.'
    return `Bei ${over.map((b) => b.label).join(' und ')} bist du etwas über dem Budget.`
  }

  const mood = financeMood(summary) || 'stabil'
  return `${moodLine[mood]} Dein Gewinn liegt bei ${formatEUR(summary?.profit || 0)}. Frag mich gern alles!`
}
