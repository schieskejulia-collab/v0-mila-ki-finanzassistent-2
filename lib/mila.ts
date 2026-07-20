import { Expense, Income } from './store'
import { getEntryCategory } from './mila-classifier'

/* 3) Danach kommt dein bisheriger Code */
type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type MilaContextData = {
  expenses?: Expense[]
  incomes?: Income[]
  obligations?: any[]
  userName?: string
  userStatus?: string
  systemInstruction?: string
  summary?: any
  budgetStatus?: any
  milaFeedback?: string
  financeScore?: number
  taxReserve?: number
}

function money(value: number) {
  return value.toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  })
}

function toNumber(value: any) {
  const parsed = Number(String(value ?? '').replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : 0
}

function compactEntry(entry: any) {
  return {
    title: entry.title || '',
    vendor: entry.vendor || '',
    client: entry.client || '',
    amount: toNumber(entry.amount),
    date: entry.date || '',
    category: entry.category || '',
    status: entry.status || '',
    note: entry.note || '',
  }
}

function buildFinancialContext(contextData?: MilaContextData) {
  const expenses = contextData?.expenses ?? []
  const incomes = contextData?.incomes ?? []
  const obligations = contextData?.obligations ?? []
  const summary = contextData?.summary ?? {}

  const expenseTotal =
    toNumber(summary.totalExpenses) ||
    expenses.reduce((sum, e) => sum + toNumber(e.amount), 0)

  const incomeTotal =
    toNumber(summary.totalIncomes) ||
    incomes.reduce((sum, i) => sum + toNumber(i.amount), 0)

  const balance =
    typeof summary.balance !== 'undefined'
      ? toNumber(summary.balance)
      : incomeTotal - expenseTotal

  const openIncomes = incomes.filter((income: any) => {
    const status = String(income.status || '').toLowerCase()
    return status === 'offen' || status === 'pending'
  })

  const openObligations = obligations.filter((item: any) => {
    const status = String(item.status || '').toLowerCase()
    return status !== 'bezahlt' && status !== 'paid'
  })

  const upcomingObligations = openObligations.slice(0, 8).map((item: any) => ({
    title: item.title || '',
    partner: item.partner || item.creditor || '',
    amount: toNumber(item.amount),
    dueDate: item.dueDate || item.due_date || '',
    priority: item.priority || 'normal',
    status: item.status || 'offen',
  }))

  const openIncomeTotal = openIncomes.reduce(
    (sum, income) => sum + toNumber(income.amount),
    0
  )

  const recentExpenses = expenses.slice(0, 12).map(compactEntry)
  const recentIncomes = incomes.slice(0, 12).map(compactEntry)

  const categoryTotals: Record<string, number> = {}

  const detectedCategories = expenses.map((expense: any) =>
    getEntryCategory(expense)
  )

  const autoCategoryTotals: Record<string, number> = {}

  detectedCategories.forEach((cat) => {
    autoCategoryTotals[cat] = (autoCategoryTotals[cat] || 0) + 1
  })

  const topAutoCategories = Object.entries(autoCategoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, count]) => ({ category, count }))

  expenses.forEach((expense: any) => {
    const category = expense.category || 'sonstiges'
    categoryTotals[category] =
      (categoryTotals[category] || 0) + toNumber(expense.amount)
  })

  const topCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([category, total]) => ({ category, total }))

  const vendorGroups: Record<string, { count: number; total: number }> = {}

  expenses.forEach((expense: any) => {
    const vendor = String(expense.vendor || expense.title || '').trim()
    if (!vendor) return

    const key = vendor.toLowerCase()
    if (!vendorGroups[key]) vendorGroups[key] = { count: 0, total: 0 }

    vendorGroups[key].count += 1
    vendorGroups[key].total += toNumber(expense.amount)
  })

  const recurring = Object.entries(vendorGroups)
    .filter(([, data]) => data.count >= 2)
    .slice(0, 6)
    .map(([vendor, data]) => ({
      vendor,
      count: data.count,
      total: data.total,
      monthlyEstimate: data.total / data.count,
    }))

  const taxRate =
    contextData?.userStatus === 'angestellt'
      ? 0.1
      : contextData?.userStatus === 'kleinunternehmer'
      ? 0
      : 0

  const taxReserve = balance > 0 ? balance * taxRate : 0
  const freeAfterReserve = balance > 0 ? balance - taxReserve : 0

  const autoCategories = {
    detectedCategories,
    topAutoCategories,
  }

  return {
    user: {
      name: contextData?.userName || 'Julia',
      status: contextData?.userStatus || 'freelancer',
    },
    totals: {
      incomeTotal,
      expenseTotal,
      balance,
      taxReserve,
      freeAfterReserve,
      openIncomeCount: openIncomes.length,
      openIncomeTotal,
    },
    counts: {
      incomes: incomes.length,
      expenses: expenses.length,
    },
    topCategories,
    recurring,
    obligations: {
      openCount: openObligations.length,
      upcoming: upcomingObligations,
    },
    recentIncomes,
    recentExpenses,
    budgetStatus: contextData?.budgetStatus ?? [],
    milaFeedback: contextData?.milaFeedback || '',
    autoCategories,
  }
}

async function callGroqChat(messages: ChatMessage[]) {
  const apiKey = process.env.GROQ_API_KEY

  if (!apiKey) {
    console.error('❌ GROQ_API_KEY fehlt in den Umgebungsvariablen!')
    return 'Mila ist noch nicht vollständig verbunden. Der API-Schlüssel fehlt.'
  }

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.35,
        max_tokens: 260,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('Groq Chat Fehler:', data)
      return 'Mila hat gerade Schwierigkeiten beim Antworten. Bitte versuch es gleich nochmal.'
    }

    return (
      data.choices?.[0]?.message?.content ||
      'Ich konnte gerade keine sinnvolle Antwort erzeugen.'
    )
  } catch (err) {
    console.error('Netzwerkfehler zu Groq:', err)
    return 'Die Verbindung zu Mila ist gerade unterbrochen.'
  }
}
export async function getMilaChatResponse(
  userMessage: string,
  history: ChatMessage[] = [],
  contextData?: MilaContextData
) {
  const safeHistory: ChatMessage[] = Array.isArray(history)
    ? history
        .filter(
          (message) =>
            (message.role === 'user' ||
              message.role === 'assistant') &&
            typeof message.content === 'string'
        )
        .map((message) => ({
          role: message.role,
          content: message.content.slice(0, 1200),
        }))
        .slice(-8)
    : []

  const context = buildFinancialContext(contextData)

  const cleanName = String(
    contextData?.userName ||
      context.user?.name ||
      ''
  ).trim()

  const personLabel = cleanName || 'die Person'

  const upcomingObligations =
    context.obligations.upcoming
      .map(
        (obligation: any) =>
          `${obligation.title || 'Verpflichtung'}${
            obligation.partner
              ? ` bei ${obligation.partner}`
              : ''
          }, ${money(
            Number(obligation.amount || 0)
          )}, fällig ${
            obligation.dueDate ||
            'ohne eingetragenes Datum'
          }`
      )
      .join(' | ') || 'keine'

  const topCategories =
    context.topCategories
      .map((item: any) => item.category)
      .filter(Boolean)
      .slice(0, 3)
      .join(', ') || 'noch nicht genug Daten'

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `
Du bist Mila 🌸, eine persönliche Finanzbegleiterin.

Name:
${cleanName || 'nicht angegeben'}

Status:
${context.user.status || 'nicht angegeben'}

${contextData?.systemInstruction || ''}

SPRACHE UND TON

- Sprich warm, ruhig, direkt und natürlich.
- Beginne nicht automatisch mit „Hallo ${personLabel}“.
- Verwende den Namen nur gelegentlich, nicht in jeder Antwort.
- Klinge wie eine aufmerksame Begleiterin, nicht wie ein Behördenschreiben oder eine allgemeine KI.
- Vermeide monotone Satzanfänge wie „Du hast ...“ in mehreren Sätzen hintereinander.
- Nutze Formulierungen wie:
  „Ich sehe gerade ...“
  „Im Moment fällt auf ...“
  „Heute würde ich zuerst ...“
  „Das gibt dir aktuell etwas Luft.“
- Sage nicht ständig „Keine Sorge“. Beruhige nur, wenn die Daten tatsächlich keinen akuten Grund zur Panik zeigen.

ANTWORTLÄNGE

- Antworte normalerweise in höchstens 6 bis 8 Sätzen.
- Nutze keine langen nummerierten Listen.
- Stelle höchstens eine Rückfrage.
- Wiederhole nicht unnötig alle vorhandenen Zahlen.
- Nutze nur die Werte, die für die konkrete Frage wichtig sind.

DATENREGELN

- Nutze ausschließlich Daten aus dem Finanzkontext und dem Chatverlauf.
- Erfinde niemals Beträge, Fristen, Kunden, Kategorien, Rücklagen oder Bewertungen.
- Wenn Angaben fehlen, sage klar und knapp, welche Information fehlt.
- Formuliere Unsicherheit nur dann, wenn die Daten wirklich fehlen.
- Ist ein Wert vorhanden, erkläre ihn klar und selbstbewusst.

RÜCKLAGEN

Unterscheide immer zwischen:

1. empfohlener Steuer-Rücklage,
2. tatsächlich bereits zurückgelegtem Geld,
3. Notreserve,
4. frei verfügbarem Betrag.

Die Zahl im Feld „Steuer-Rücklage“ ist eine Empfehlung und nicht automatisch bereits angespart.

Sage deshalb nicht:
„Du hast keine Rücklage.“

Sage stattdessen beispielsweise:
„Aktuell ist noch keine tatsächlich angesparte Rücklage erfasst.“
oder:
„Mila empfiehlt derzeit eine Steuer-Rücklage von ...“

VERPFLICHTUNGEN UND FRISTEN

- Prüfe zuerst überfällige Verpflichtungen.
- Danach heute fällige Verpflichtungen.
- Danach bald fällige Verpflichtungen.
- Sprich ruhig und ohne Angst zu erzeugen.
- Sage nicht pauschal „Du musst das heute bezahlen“, wenn die Zahlung erst später fällig ist.
- Verwende lieber:
  „im Blick behalten“
  „einplanen“
  „priorisieren“
  „rechtzeitig vorbereiten“
- Bei kleinen, noch nicht fälligen Beträgen darfst du nicht unnötig Dringlichkeit erzeugen.

OFFENE EINNAHMEN

Wenn offene oder überfällige Einnahmen vorhanden sind:

- erwähne sie, wenn sie für die Frage relevant sind,
- priorisiere überfällige Einnahmen vor allgemeinen Spartipps,
- schlage höchstens einen konkreten nächsten Schritt vor.

EMOTIONALE LOGIK

Bei Sorgen:

- Prüfe zuerst die tatsächlichen Zahlen.
- Beruhige nur auf Grundlage dieser Daten.
- Nenne anschließend genau einen machbaren nächsten Schritt.
- Frage danach höchstens einmal, was die Person konkret belastet.

Bei Überforderung:

- Reduziere die Situation auf den nächsten sinnvollen Schritt.
- Verlange nicht, alles gleichzeitig zu lösen.

Bei Mutbedarf:

- Sei bestärkend, aber realistisch.
- Erfinde keine positive Entwicklung, die nicht aus den Daten hervorgeht.

FINANZSCORE

Wenn nach dem Finanzscore gefragt wird:

- Nutze den vorhandenen Score aus dem Kontext.
- Erkläre konkret, welche vorhandenen Daten ihn positiv oder negativ beeinflussen.
- Sage nicht, dass der Score durch eine fehlende Rücklage gedrückt wird, sofern die Berechnungslogik das nicht ausdrücklich belegt.
- Formuliere lieber:
  „Der gute Wert entsteht vor allem durch ...“
  „Abzüge entstehen aktuell durch ...“
- Erfinde keine Bestandteile der Score-Berechnung.

FINANZKONTEXT

Einnahmen:
${money(context.totals.incomeTotal)}

Ausgaben:
${money(context.totals.expenseTotal)}

Überschuss:
${money(context.totals.balance)}

Empfohlene Steuer-Rücklage:
${money(context.totals.taxReserve)}

Offene Einnahmen:
${context.totals.openIncomeCount} über insgesamt ${money(
        context.totals.openIncomeTotal
      )}

Offene Verpflichtungen:
${context.obligations.openCount}

Nächste Verpflichtungen:
${upcomingObligations}

Häufige Kategorien:
${topCategories}

ZIEL

Die Person soll:

- Klarheit gewinnen,
- weniger Stress empfinden,
- den nächsten sinnvollen Schritt erkennen,
- sich begleitet statt bewertet fühlen.

Du gibst Orientierung, aber keine verbindliche Steuer-, Rechts- oder Anlageberatung.
      `.trim(),
    },

    ...safeHistory,

    {
      role: 'user',
      content: userMessage,
    },
  ]

  return await callGroqChat(messages)
}