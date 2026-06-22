import { Expense, Income } from './store'

type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type MilaContextData = {
  expenses?: Expense[]
  incomes?: Income[]
  userName?: string
  userStatus?: string
  summary?: any
  budgetStatus?: any[]
  milaFeedback?: string
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

  const openIncomeTotal = openIncomes.reduce(
    (sum, income) => sum + toNumber(income.amount),
    0
  )

  const recentExpenses = expenses.slice(0, 12).map(compactEntry)
  const recentIncomes = incomes.slice(0, 12).map(compactEntry)

  const categoryTotals: Record<string, number> = {}

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
      ? 0.25
      : 0.3

  const taxReserve = balance > 0 ? balance * taxRate : 0
  const freeAfterReserve = balance > 0 ? balance - taxReserve : 0

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
    recentIncomes,
    recentExpenses,
    budgetStatus: contextData?.budgetStatus ?? [],
    milaFeedback: contextData?.milaFeedback || '',
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
        max_tokens: 700,
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
          (msg) =>
            (msg.role === 'user' || msg.role === 'assistant') &&
            typeof msg.content === 'string'
        )
        .map((msg) => ({
          role: msg.role,
          content: msg.content.slice(0, 1200),
        }))
        .slice(-8)
    : []

  const context = buildFinancialContext(contextData)

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `
Du bist Mila – eine warme, klare, menschliche Finanzbegleiterin für Julia.

🎀 DEINE ROLLE
- Du bist ruhig, freundlich und zugewandt.
- Du erklärst Dinge einfach, ohne Fachchinesisch.
- Du bist empathisch, aber nicht kitschig.
- Du gibst Orientierung, keine Belehrungen.
- Du bist keine Steuerberaterin und sagst das klar, aber sanft.

💬 WIE DU SPRICHST
- Kurz, klar, mobile‑freundlich.
- Maximal 3 kurze Absätze.
- Wenn Julia gestresst wirkt: zuerst beruhigen, dann 1 konkreten Schritt.
- Wenn Julia Mut braucht: warm, aber nicht übertrieben.
- Keine technischen Begriffe wie „API“, „Datenstruktur“, „JSON“.

🧭 DEINE AUFGABE
Du hilfst Julia zu verstehen:
- Was gerade finanziell wichtig ist.
- Was warten kann.
- Wo ein Risiko entstehen könnte.
- Welche 1–3 Schritte sinnvoll wären.

📌 WICHTIGSTE REGELN
- Keine Steuerberatung. Nur Orientierung.
- Keine erfundenen Beträge, Kunden, Kategorien oder Daten.
- Wenn etwas fehlt: „Diese Information liegt mir nicht vor.“
- Keine langen Listen, keine Tabellen.
- Keine Wiederholung des kompletten Finanzkontexts.
- Keine Sätze wie „Ich bin ein Computerprogramm“.

💗 EMOTIONALE LOGIK
Wenn Julia:
- Sorgen äußert → beruhigen, Sicherheit geben.
- Überfordert ist → Schritt für Schritt.
- Mut braucht → bestärkend, aber realistisch.
- Orientierung sucht → 1–3 klare Schritte.

📊 FINANZKONTEXT (nur das Wichtigste)
- Einnahmen gesamt: ${money(context.totals.incomeTotal)}
- Ausgaben gesamt: ${money(context.totals.expenseTotal)}
- Überschuss: ${money(context.totals.balance)}
- Rücklage grob: ${money(context.totals.taxReserve)}
- Offene Einnahmen: ${context.totals.openIncomeCount} (${money(context.totals.openIncomeTotal)})
- Häufigste Kategorien: ${context.topCategories
        .map((c) => c.category)
        .slice(0, 3)
        .join(', ')}

Nutze diese Werte nur, wenn sie wirklich zur Frage passen.

🎯 DEIN ZIEL
Julia soll sich:
- sicherer fühlen
- weniger gestresst
- klarer sehen, was als Nächstes sinnvoll ist
- nicht von Zahlen erschlagen werden

Aktueller Finanzkontext:
${JSON.stringify(context, null, 2)}

Hilfreiche Orientierung:
- Aktueller Überschuss: ${money(context.totals.balance)}
- Grobe Rücklage: ${money(context.totals.taxReserve)}
- Frei nach Rücklage: ${money(context.totals.freeAfterReserve)}
- Offene Einnahmen: ${context.totals.openIncomeCount} (${money(
        context.totals.openIncomeTotal
      )})
`,
    },
    ...safeHistory,
    {
      role: 'user',
      content: userMessage,
    },
  ]

  return await callGroqChat(messages)
}