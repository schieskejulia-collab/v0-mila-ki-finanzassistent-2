import { formatEUR } from './format'
import {
  type MonthSummary,
  type CategoryBreakdown,
  type BudgetStatus,
  type SavingTip,
} from './calculations'
import type { Expense, Income, Goal } from './types'
import OpenAI from "openai"

// --- KI CLIENT ---
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
})

// --- MILA PERSÖNLICHKEIT ---
export function getMilaPersonality(status: string = "selbstständig"): string {
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

WICHTIG: Antworte immer direkt als Mila.
`
}

// --- LIVE CHAT ---
export async function getMilaReplyLive(
  message: string,
  ctx: MilaContext,
  userStatus: string = "selbstständig",
  userName: string = "Nutzer"
): Promise<string> {

  const finanzKontext = `
Aktuelle Finanzdaten des Nutzers (${userName}):
- Einnahmen gesamt: ${formatEUR(ctx.summary?.income || 0)}
- Ausgaben gesamt: ${formatEUR(ctx.summary?.expenses || 0)}
- Aktueller Gewinn: ${formatEUR(ctx.summary?.profit || 0)}
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

    return response.choices[0]?.message?.content ||
      "Ich habe kurz den Faden verloren. Sag es mir nochmal, ich bin da."
  } catch (error) {
    console.error("Groq Fehler:", error)
    return generateMilaReply(message, ctx)
  }
}

// --- FALLBACK LOGIK ---
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

export function generateMilaReply(message: string, ctx: MilaContext): string {
  const m = message.toLowerCase()
  const { summary, tips } = ctx

  if (/steuer|rücklage/.test(m)) {
    return `Für deinen aktuellen Gewinn von ${formatEUR(summary.profit)} empfehle ich dir rund 30 % Steuerrücklage.`
  }

  if (/spar|tipp/.test(m)) {
    if (!tips?.length) return "Ich sehe gerade keine Sparpotenziale."
    const total = tips.reduce((a, t) => a + (t.potential || 0), 0)
    return `Ich sehe etwa ${formatEUR(total)} Sparpotenzial.`
  }

  return `Dein aktueller Gewinn liegt bei ${formatEUR(summary.profit)}. Frag mich gern weiter.`
}
