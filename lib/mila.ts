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

function buildFinancialContext(
  contextData?: MilaContextData
) {
  const expenses = Array.isArray(
    contextData?.expenses
  )
    ? contextData.expenses
    : []

  const incomes = Array.isArray(
    contextData?.incomes
  )
    ? contextData.incomes
    : []

  const obligations = Array.isArray(
    contextData?.obligations
  )
    ? contextData.obligations
    : []

  const summary =
    contextData?.summary || {}

  const expenseTotal =
    typeof summary.totalExpenses !==
    'undefined'
      ? toNumber(
          summary.totalExpenses
        )
      : expenses.reduce(
          (sum, expense) =>
            sum +
            toNumber(expense.amount),
          0
        )

  const incomeTotal =
    typeof summary.totalIncomes !==
    'undefined'
      ? toNumber(
          summary.totalIncomes
        )
      : incomes.reduce(
          (sum, income) =>
            sum +
            toNumber(income.amount),
          0
        )

  const balance =
    typeof summary.balance !==
    'undefined'
      ? toNumber(summary.balance)
      : incomeTotal - expenseTotal

  const normalizeStatus = (
    value: unknown
  ) =>
    String(value || '')
      .trim()
      .toLowerCase()

  const openIncomes = incomes.filter(
    (income: any) => {
      const status =
        normalizeStatus(income.status)

      return (
        status === 'offen' ||
        status === 'pending' ||
        status === 'überfällig' ||
        status === 'ueberfaellig'
      )
    }
  )

  const overdueIncomes =
    openIncomes.filter(
      (income: any) => {
        const status =
          normalizeStatus(
            income.status
          )

        return (
          status === 'überfällig' ||
          status === 'ueberfaellig'
        )
      }
    )

  const openObligations =
    obligations.filter(
      (item: any) => {
        const status =
          normalizeStatus(
            item.status
          )

        return (
          status !== 'bezahlt' &&
          status !== 'paid' &&
          status !== 'erledigt'
        )
      }
    )

  const getDueTime = (
    item: any
  ) => {
    const value =
      item?.dueDate ||
      item?.due_date ||
      ''

    if (!value) {
      return Number.POSITIVE_INFINITY
    }

    const timestamp =
      new Date(value).getTime()

    return Number.isFinite(timestamp)
      ? timestamp
      : Number.POSITIVE_INFINITY
  }

  const priorityWeight: Record<
    string,
    number
  > = {
    existenz: 0,
    hoch: 1,
    wichtig: 1,
    normal: 2,
    niedrig: 3,
  }

  const sortedObligations = [
    ...openObligations,
  ].sort((a: any, b: any) => {
    const dateDifference =
      getDueTime(a) -
      getDueTime(b)

    if (dateDifference !== 0) {
      return dateDifference
    }

    const aPriority =
      priorityWeight[
        normalizeStatus(a.priority)
      ] ?? 2

    const bPriority =
      priorityWeight[
        normalizeStatus(b.priority)
      ] ?? 2

    return aPriority - bPriority
  })

  const upcomingObligations =
    sortedObligations
      .slice(0, 8)
      .map((item: any) => ({
        title:
          item.title ||
          'Verpflichtung',

        partner:
          item.partner ||
          item.creditor ||
          '',

        amount: toNumber(
          item.amount
        ),

        dueDate:
          item.dueDate ||
          item.due_date ||
          '',

        priority:
          item.priority ||
          'normal',

        status:
          item.status ||
          'offen',
      }))

  const openObligationTotal =
    openObligations.reduce(
      (sum, item: any) =>
        sum +
        toNumber(item.amount),
      0
    )

  const realisticAvailable =
    balance -
    openObligationTotal

  const openIncomeTotal =
    openIncomes.reduce(
      (sum, income: any) =>
        sum +
        toNumber(income.amount),
      0
    )

  const userStatus = String(
    contextData?.userStatus ||
      'freelancer'
  ).toLowerCase()

  const providedTaxReserve =
    toNumber(
      contextData?.taxReserve
    )

  const fallbackReserveRate =
    userStatus === 'angestellt'
      ? 0
      : 0.125

  const taxReserve =
    providedTaxReserve > 0
      ? providedTaxReserve
      : balance > 0
        ? balance *
          fallbackReserveRate
        : 0

  const freeAfterReserve =
    Math.max(
      0,
      realisticAvailable -
        taxReserve
    )

  const financeScore =
    toNumber(
      contextData?.financeScore ??
        contextData?.budgetStatus
          ?.score ??
        summary?.score
    )

  const recentExpenses =
    expenses
      .slice(0, 12)
      .map(compactEntry)

  const recentIncomes =
    incomes
      .slice(0, 12)
      .map(compactEntry)

  const categoryTotals: Record<
    string,
    number
  > = {}

  expenses.forEach(
    (expense: any) => {
      const category = String(
        expense.category ||
          getEntryCategory(
            expense
          ) ||
          'sonstiges'
      )

      categoryTotals[category] =
        (categoryTotals[
          category
        ] || 0) +
        toNumber(expense.amount)
    }
  )

  const topCategories =
    Object.entries(
      categoryTotals
    )
      .sort(
        (a, b) =>
          b[1] - a[1]
      )
      .slice(0, 6)
      .map(
        ([category, total]) => ({
          category,
          total,
        })
      )

  const vendorGroups: Record<
    string,
    {
      name: string
      count: number
      total: number
    }
  > = {}

  expenses.forEach(
    (expense: any) => {
      const vendor = String(
        expense.vendor ||
          expense.title ||
          ''
      ).trim()

      if (!vendor) return

      const key =
        vendor.toLowerCase()

      if (!vendorGroups[key]) {
        vendorGroups[key] = {
          name: vendor,
          count: 0,
          total: 0,
        }
      }

      vendorGroups[key].count += 1
      vendorGroups[key].total +=
        toNumber(
          expense.amount
        )
    }
  )

    const hasRecurringMarker = (item: any) => {
    const frequency = String(
      item.frequency ||
        item.interval ||
        item.recurrence ||
        item.repeat ||
        ''
    )
      .trim()
      .toLowerCase()

    return (
      item.recurring === true ||
      item.isRecurring === true ||
      item.repeat === true ||
      frequency === 'monatlich' ||
      frequency === 'monthly' ||
      frequency === 'wöchentlich' ||
      frequency === 'weekly' ||
      frequency === 'jährlich' ||
      frequency === 'yearly'
    )
  }

  const repeatedExpenseGroups = Object.values(vendorGroups)
    .filter((data) => data.count >= 2)
    .map((data) => ({
      type: 'expense',
      title: data.name,
      partner: data.name,
      count: data.count,
      total: data.total,
      amount: data.total / data.count,
      frequency: 'aus mehreren Buchungen erkannt',
      source: 'pattern',
    }))

  const explicitlyRecurringExpenses = expenses
    .filter(hasRecurringMarker)
    .map((expense: any) => ({
      type: 'expense',
      title:
        expense.title ||
        expense.vendor ||
        'Regelmäßige Ausgabe',
      partner:
        expense.vendor ||
        expense.partner ||
        '',
      count: 1,
      total: toNumber(expense.amount),
      amount: toNumber(expense.amount),
      frequency:
        expense.frequency ||
        expense.interval ||
        expense.recurrence ||
        'regelmäßig',
      source: 'explicit',
    }))

  const explicitlyRecurringObligations = obligations
    .filter(hasRecurringMarker)
    .map((obligation: any) => ({
      type: 'obligation',
      title:
        obligation.title ||
        'Regelmäßige Verpflichtung',
      partner:
        obligation.partner ||
        obligation.creditor ||
        '',
      count: 1,
      total: toNumber(obligation.amount),
      amount: toNumber(obligation.amount),
      frequency:
        obligation.frequency ||
        obligation.interval ||
        obligation.recurrence ||
        'regelmäßig',
      source: 'explicit',
    }))

  const recurringMap = new Map<string, any>()

  ;[
    ...repeatedExpenseGroups,
    ...explicitlyRecurringExpenses,
    ...explicitlyRecurringObligations,
  ].forEach((entry) => {
    const key = [
      entry.type,
      String(entry.title || '').toLowerCase(),
      String(entry.partner || '').toLowerCase(),
      toNumber(entry.amount),
    ].join('|')

    if (!recurringMap.has(key)) {
      recurringMap.set(key, entry)
    }
  })

  const recurring = Array.from(recurringMap.values())
    .sort(
      (a, b) =>
        toNumber(b.total) -
        toNumber(a.total)
    )
    .slice(0, 8)

  const largestExpenseEntry =
    expenses.length > 0
      ? [...expenses].sort(
          (a: any, b: any) =>
            toNumber(b.amount) -
            toNumber(a.amount)
        )[0]
      : null

  const largestIncomeEntry =
    incomes.length > 0
      ? [...incomes].sort(
          (a: any, b: any) =>
            toNumber(b.amount) -
            toNumber(a.amount)
        )[0]
      : null

  const largestExpense = largestExpenseEntry
    ? compactEntry(largestExpenseEntry)
    : null

  const largestIncome = largestIncomeEntry
    ? compactEntry(largestIncomeEntry)
    : null

  const averageExpense =
    expenses.length > 0
      ? expenseTotal / expenses.length
      : 0
  const parseEntryDate = (entry: any) => {
    const rawDate =
      entry?.date ||
      entry?.createdAt ||
      entry?.created_at ||
      ''

    if (!rawDate) return null

    const parsedDate = new Date(rawDate)

    return Number.isNaN(parsedDate.getTime())
      ? null
      : parsedDate
  }

  const now = new Date()

  const currentMonthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  )

  const nextMonthStart = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    1
  )

  const previousMonthStart = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1
  )

  const isInsidePeriod = (
    entry: any,
    start: Date,
    end: Date
  ) => {
    const date = parseEntryDate(entry)

    return Boolean(
      date &&
        date >= start &&
        date < end
    )
  }

  const currentMonthExpenses =
    expenses.filter((expense: any) =>
      isInsidePeriod(
        expense,
        currentMonthStart,
        nextMonthStart
      )
    )

  const previousMonthExpenses =
    expenses.filter((expense: any) =>
      isInsidePeriod(
        expense,
        previousMonthStart,
        currentMonthStart
      )
    )

  const currentMonthIncomes =
    incomes.filter((income: any) =>
      isInsidePeriod(
        income,
        currentMonthStart,
        nextMonthStart
      )
    )

  const previousMonthIncomes =
    incomes.filter((income: any) =>
      isInsidePeriod(
        income,
        previousMonthStart,
        currentMonthStart
      )
    )

  const sumEntries = (entries: any[]) =>
    entries.reduce(
      (sum, entry) =>
        sum + toNumber(entry.amount),
      0
    )

  const currentMonthExpenseTotal =
    sumEntries(currentMonthExpenses)

  const previousMonthExpenseTotal =
    sumEntries(previousMonthExpenses)

  const currentMonthIncomeTotal =
    sumEntries(currentMonthIncomes)

  const previousMonthIncomeTotal =
    sumEntries(previousMonthIncomes)

  const calculatePercentageChange = (
    currentValue: number,
    previousValue: number
  ) => {
    if (previousValue === 0) {
      return currentValue === 0
        ? 0
        : null
    }

    return (
      ((currentValue - previousValue) /
        previousValue) *
      100
    )
  }

  const expenseChangePercent =
    calculatePercentageChange(
      currentMonthExpenseTotal,
      previousMonthExpenseTotal
    )

  const incomeChangePercent =
    calculatePercentageChange(
      currentMonthIncomeTotal,
      previousMonthIncomeTotal
    )

  const buildCategoryTotals = (
    entries: any[]
  ) => {
    const totals: Record<
      string,
      number
    > = {}

    entries.forEach((entry: any) => {
      const category = String(
        entry.category ||
          getEntryCategory(entry) ||
          'Sonstiges'
      )

      totals[category] =
        (totals[category] || 0) +
        toNumber(entry.amount)
    })

    return totals
  }

  const currentCategoryTotals =
    buildCategoryTotals(
      currentMonthExpenses
    )

  const previousCategoryTotals =
    buildCategoryTotals(
      previousMonthExpenses
    )

  const categoryNames =
    Array.from(
      new Set([
        ...Object.keys(
          currentCategoryTotals
        ),
        ...Object.keys(
          previousCategoryTotals
        ),
      ])
    )

  const categoryChanges = categoryNames
    .map((category) => {
      const current =
        currentCategoryTotals[
          category
        ] || 0

      const previous =
        previousCategoryTotals[
          category
        ] || 0

      return {
        category,
        current,
        previous,
        difference:
          current - previous,
        percentage:
          calculatePercentageChange(
            current,
            previous
          ),
      }
    })
    .sort(
      (a, b) =>
        Math.abs(b.difference) -
        Math.abs(a.difference)
    )
    .slice(0, 6)

  const hasMonthlyComparisonData =
    currentMonthExpenses.length > 0 ||
    previousMonthExpenses.length > 0 ||
    currentMonthIncomes.length > 0 ||
    previousMonthIncomes.length > 0
  const unusualExpenses =
    expenses.length >= 3 && averageExpense > 0
      ? expenses
          .filter(
            (expense: any) =>
              toNumber(expense.amount) >=
              averageExpense * 2
          )
          .map(compactEntry)
          .sort(
            (a, b) =>
              b.amount - a.amount
          )
          .slice(0, 5)
      : []
  return {
    user: {
      name:
        contextData?.userName ||
        '',

      status:
        contextData?.userStatus ||
        'freelancer',
    },

    totals: {
      incomeTotal,
      expenseTotal,
      balance,
      taxReserve,
      realisticAvailable,
      freeAfterReserve,
      openIncomeCount:
        openIncomes.length,
      overdueIncomeCount:
        overdueIncomes.length,
      openIncomeTotal,
      openObligationTotal,
    },

    financeScore,

    counts: {
      incomes: incomes.length,
      expenses: expenses.length,
      obligations:
        obligations.length,
    },

        topCategories,
    recurring,

        insights: {
      largestExpense,
      largestIncome,
      unusualExpenses,
      averageExpense,

      dataIsLimited:
        expenses.length < 3 ||
        incomes.length < 2,

      monthlyComparison: {
        hasData:
          hasMonthlyComparisonData,

        currentMonth: {
          expenseTotal:
            currentMonthExpenseTotal,

          incomeTotal:
            currentMonthIncomeTotal,

          expenseCount:
            currentMonthExpenses.length,

          incomeCount:
            currentMonthIncomes.length,
        },

        previousMonth: {
          expenseTotal:
            previousMonthExpenseTotal,

          incomeTotal:
            previousMonthIncomeTotal,

          expenseCount:
            previousMonthExpenses.length,

          incomeCount:
            previousMonthIncomes.length,
        },

        expenseChangePercent,
        incomeChangePercent,
        categoryChanges,
      },
    },

obligations: {
      openCount:
        openObligations.length,
      openTotal:
        openObligationTotal,
      upcoming:
        upcomingObligations,
    },

    recentIncomes,
    recentExpenses,

    budgetStatus:
      contextData?.budgetStatus ??
      null,

    milaFeedback:
      contextData?.milaFeedback ||
      '',
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
  console.error('Groq Chat Fehler:', {
    status: res.status,
    message: data?.error?.message,
    type: data?.error?.type,
    code: data?.error?.code,
  })

  if (res.status === 429) {
    return 'Ich beantworte jede Frage sorgfältig. 🌸
Gib mir bitte nur einen kurzen Moment, dann geht es direkt weiter.'
  }

  if (res.status === 413 || res.status === 400) {
    return 'Unser Gespräch ist gerade etwas zu umfangreich geworden. Setze den Chat bitte einmal zurück und versuch es erneut. 🌸'
  }

  return 'Meine KI-Verbindung hat die Anfrage gerade abgelehnt. Bitte versuch es gleich noch einmal. 🌸'
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
function detectMilaIntent(userMessage: string) {
  const question = String(userMessage || '')
    .trim()
    .toLowerCase()

  const includesAny = (
    words: string[]
  ) =>
    words.some((word) =>
      question.includes(word)
    )

  const wantsScore = includesAny([
    'score',
    'finanzscore',
    'bewertung',
    'punkte',
  ])

  const wantsMonthlyComparison =
    includesAny([
      'monat',
      'vormonat',
      'monatsvergleich',
      'letzten monat',
      'diesem monat',
      'vergleich',
      'entwicklung',
      'trend',
      'gestiegen',
      'gesunken',
    ])

  const wantsExpenses = includesAny([
    'ausgabe',
    'ausgaben',
    'kosten',
    'kategorie',
    'teuer',
    'größte ausgabe',
    'höchste ausgabe',
    'ungewöhnlich',
    'auffällig',
    'spare',
    'sparen',
  ])

  const wantsIncomes = includesAny([
    'einnahme',
    'einnahmen',
    'verdient',
    'umsatz',
    'kunde',
    'kunden',
    'zahlungseingang',
    'zahlungseingänge',
    'offene einnahme',
    'überfällige einnahme',
  ])

  const wantsObligations =
    includesAny([
      'verpflichtung',
      'verpflichtungen',
      'rechnung',
      'rechnungen',
      'fällig',
      'fälligkeit',
      'bezahlen',
      'zahlung',
      'dringend',
      'priorität',
      'zuerst beachten',
      'heute erledigen',
    ])

  const wantsRecurring = includesAny([
    'wiederkehrend',
    'regelmäßig',
    'abo',
    'abonnement',
    'monatliche zahlung',
    'fixkosten',
  ])

  const wantsReserve = includesAny([
    'rücklage',
    'steuerrücklage',
    'steuer-rücklage',
    'notreserve',
    'notgroschen',
    'frei verfügbar',
    'verfügbar',
    'puffer',
  ])

  const wantsRisk = includesAny([
    'risiko',
    'gefährlich',
    'problem',
    'kritisch',
    'sorge',
    'sorgen',
    'angst',
    'überfordert',
    'dringendes',
  ])

  const wantsStrength = includesAny([
    'stärke',
    'gut',
    'positiv',
    'läuft gut',
    'stabil',
  ])

  const wantsOverview = includesAny([
    'wie geht es mir',
    'wie stehe ich',
    'finanzielle situation',
    'finanziell',
    'was fällt dir auf',
    'überblick',
    'einschätzung',
    'was sollte ich',
    'was ist wichtig',
  ])

  const isEmotional = includesAny([
    'sorge',
    'sorgen',
    'angst',
    'überfordert',
    'panik',
    'stress',
    'mut',
    'beruhige',
  ])

  const noSpecificIntent =
    !wantsScore &&
    !wantsMonthlyComparison &&
    !wantsExpenses &&
    !wantsIncomes &&
    !wantsObligations &&
    !wantsRecurring &&
    !wantsReserve &&
    !wantsRisk &&
    !wantsStrength &&
    !wantsOverview

  return {
    question,
    wantsScore,
    wantsMonthlyComparison,
    wantsExpenses,
    wantsIncomes,
    wantsObligations,
    wantsRecurring,
    wantsReserve,
    wantsRisk,
    wantsStrength,
    wantsOverview,
    isEmotional,
    noSpecificIntent,
  }
}

function formatPercentageChange(
  value: number | null | undefined
) {
  if (
    value === null ||
    typeof value === 'undefined'
  ) {
    return 'nicht berechenbar, weil im Vormonat kein Vergleichswert vorhanden ist'
  }

  const rounded =
    Math.round(Number(value) * 10) / 10

  if (!Number.isFinite(rounded)) {
    return 'nicht berechenbar'
  }

  if (rounded === 0) {
    return 'unverändert'
  }

  if (rounded > 0) {
    return `um ${rounded.toLocaleString(
      'de-DE'
    )} % gestiegen`
  }

  return `um ${Math.abs(
    rounded
  ).toLocaleString(
    'de-DE'
  )} % gesunken`
}

function buildMilaDynamicContext(
  context: ReturnType<
    typeof buildFinancialContext
  >,
  intent: ReturnType<
    typeof detectMilaIntent
  >
) {
  const blocks: string[] = []

  /*
   * Eine kleine Grundübersicht wird immer
   * mitgeschickt. So kann Mila auch auf
   * allgemeine Fragen sinnvoll antworten.
   */
  blocks.push(`
BASISDATEN
Einnahmen: ${money(
    context.totals.incomeTotal
  )}
Ausgaben: ${money(
    context.totals.expenseTotal
  )}
Saldo: ${money(
    context.totals.balance
  )}
Offene Einnahmen: ${
    context.totals.openIncomeCount
  } über ${money(
    context.totals.openIncomeTotal
  )}
Offene Verpflichtungen: ${
    context.obligations.openCount
  } über ${money(
    context.totals.openObligationTotal
  )}
Realistisch verfügbar nach offenen Verpflichtungen: ${money(
    context.totals.realisticAvailable
  )}
  `.trim())

  if (
    intent.wantsScore ||
    intent.wantsOverview ||
    intent.wantsStrength ||
    intent.wantsRisk
  ) {
    blocks.push(`
FINANZSCORE
Aktueller Score: ${
      context.financeScore > 0
        ? `${context.financeScore}/100`
        : 'nicht verfügbar'
    }

Berechnungslogik:
- Startwert 50
- Einnahmen vorhanden: +15
- Positiver Saldo: +10
- Negativer Saldo: -25
- Niedrige Ausgabenquote kann den Score erhöhen
- Offene Einnahmen reduzieren den Score leicht
- Überfällige Einnahmen reduzieren ihn stärker
    `.trim())
  }

  if (
    intent.wantsObligations ||
    intent.wantsOverview ||
    intent.wantsRisk
  ) {
    const obligationsText =
      context.obligations.upcoming
        .map((item: any) => {
          const title =
            item.title ||
            'Verpflichtung'

          const partner =
            item.partner
              ? ` bei ${item.partner}`
              : ''

          const dueDate =
            item.dueDate ||
            'ohne eingetragenes Datum'

          return `${title}${partner}, ${money(
            Number(item.amount || 0)
          )}, fällig ${dueDate}, Priorität ${
            item.priority || 'normal'
          }`
        })
        .join(' | ') ||
      'keine offenen Verpflichtungen'

    blocks.push(`
VERPFLICHTUNGEN
${obligationsText}
    `.trim())
  }

  if (
    intent.wantsExpenses ||
    intent.wantsOverview
  ) {
    const largestExpense =
      context.insights.largestExpense

    const largestExpenseText =
      largestExpense
        ? `${largestExpense.title ||
            largestExpense.vendor ||
            'Ausgabe'}, ${money(
            largestExpense.amount
          )}${
            largestExpense.category
              ? `, Kategorie ${largestExpense.category}`
              : ''
          }${
            largestExpense.date
              ? `, Datum ${largestExpense.date}`
              : ''
          }`
        : 'keine Ausgabe erfasst'

    const unusualExpensesText =
      context.insights
        .unusualExpenses.length > 0
        ? context.insights.unusualExpenses
            .map(
              (item: any) =>
                `${
                  item.title ||
                  item.vendor ||
                  'Ausgabe'
                }, ${money(item.amount)}`
            )
            .join(' | ')
        : context.counts.expenses < 3
          ? 'zu wenige Ausgaben für eine verlässliche Ausreißeranalyse'
          : 'keine auffälligen Ausgaben erkannt'

    const categoriesText =
      context.topCategories.length > 0
        ? context.topCategories
            .map(
              (item: any) =>
                `${item.category}: ${money(
                  item.total
                )}`
            )
            .join(' | ')
        : 'noch keine Kategorien vorhanden'

    blocks.push(`
AUSGABENANALYSE
Größte erfasste Ausgabe: ${largestExpenseText}
Auffällige Ausgaben: ${unusualExpensesText}
Kategorien: ${categoriesText}
Anzahl Ausgaben: ${
      context.counts.expenses
    }

Wichtig:
Eine größte Ausgabe ist nicht automatisch ungewöhnlich oder problematisch.
Bei weniger als drei Ausgaben ist keine belastbare Ausreißeranalyse möglich.
    `.trim())
  }

  if (
    intent.wantsIncomes ||
    intent.wantsOverview
  ) {
    const largestIncome =
      context.insights.largestIncome

    const largestIncomeText =
      largestIncome
        ? `${largestIncome.title ||
            largestIncome.client ||
            'Einnahme'}, ${money(
            largestIncome.amount
          )}${
            largestIncome.client
              ? `, Kunde ${largestIncome.client}`
              : ''
          }${
            largestIncome.date
              ? `, Datum ${largestIncome.date}`
              : ''
          }`
        : 'keine Einnahme erfasst'

    blocks.push(`
EINNAHMENANALYSE
Größte erfasste Einnahme: ${largestIncomeText}
Offene Einnahmen: ${
      context.totals.openIncomeCount
    }
Überfällige Einnahmen: ${
      context.totals
        .overdueIncomeCount
    }
Offener Gesamtbetrag: ${money(
      context.totals.openIncomeTotal
    )}
Anzahl Einnahmen: ${
      context.counts.incomes
    }
    `.trim())
  }

  if (intent.wantsRecurring) {
    const recurringText =
      context.recurring.length > 0
        ? context.recurring
            .map((item: any) => {
              const title =
                item.title ||
                item.partner ||
                'Regelmäßige Zahlung'

              return `${title}, ${money(
                Number(item.amount || 0)
              )}, ${
                item.frequency ||
                'regelmäßig'
              }`
            })
            .join(' | ')
        : 'keine sicher erkannten wiederkehrenden Zahlungen'

    blocks.push(`
WIEDERKEHRENDE ZAHLUNGEN
${recurringText}

Nur Zahlungen aus diesem Abschnitt dürfen als wiederkehrend bezeichnet werden.
Eine einzelne Rate ist nicht automatisch regelmäßig.
    `.trim())
  }

  if (
    intent.wantsReserve ||
    intent.wantsOverview
  ) {
    blocks.push(`
RÜCKLAGEN UND FREIER BETRAG
Empfohlene Steuer-Rücklage: ${money(
      context.totals.taxReserve
    )}
Nach offenen Verpflichtungen verfügbar: ${money(
      context.totals.realisticAvailable
    )}
Nach offenen Verpflichtungen und empfohlener Steuer-Rücklage verfügbar: ${money(
      context.totals.freeAfterReserve
    )}

Die Steuer-Rücklage ist eine Empfehlung und nicht automatisch bereits angespart.
Eine tatsächlich angesparte Notreserve ist in den Daten nicht separat erfasst.
    `.trim())
  }

  if (
    intent.wantsMonthlyComparison
  ) {
    const comparison =
      context.insights
        .monthlyComparison

    const categories =
      comparison.categoryChanges
        .length > 0
        ? comparison.categoryChanges
            .map((item: any) => {
              const difference =
                Number(
                  item.difference || 0
                )

              return `${item.category}: aktuell ${money(
                item.current
              )}, Vormonat ${money(
                item.previous
              )}, Unterschied ${money(
                difference
              )}`
            })
            .join(' | ')
        : 'keine ausreichenden Kategorievergleiche'

    blocks.push(`
MONATSVERGLEICH
Aktueller Monat:
- Einnahmen: ${money(
      comparison.currentMonth
        .incomeTotal
    )}
- Ausgaben: ${money(
      comparison.currentMonth
        .expenseTotal
    )}
- Anzahl Einnahmen: ${
      comparison.currentMonth
        .incomeCount
    }
- Anzahl Ausgaben: ${
      comparison.currentMonth
        .expenseCount
    }

Vormonat:
- Einnahmen: ${money(
      comparison.previousMonth
        .incomeTotal
    )}
- Ausgaben: ${money(
      comparison.previousMonth
        .expenseTotal
    )}
- Anzahl Einnahmen: ${
      comparison.previousMonth
        .incomeCount
    }
- Anzahl Ausgaben: ${
      comparison.previousMonth
        .expenseCount
    }

Veränderung Einnahmen: ${formatPercentageChange(
      comparison.incomeChangePercent
    )}
Veränderung Ausgaben: ${formatPercentageChange(
      comparison.expenseChangePercent
    )}

Kategorievergleich:
${categories}

Bei wenigen Buchungen ist der Vergleich noch kein stabiler langfristiger Trend.
    `.trim())
  }

  if (
    intent.wantsRisk ||
    intent.wantsStrength ||
    intent.wantsOverview
  ) {
    const hasLimitedData =
      context.counts.expenses < 3 ||
      context.counts.incomes < 2

    blocks.push(`
GESAMTEINSCHÄTZUNG
Datenlage: ${
      hasLimitedData
        ? 'noch begrenzt'
        : 'für eine erste Einschätzung ausreichend'
    }

Positive Faktoren:
- Saldo: ${money(
      context.totals.balance
    )}
- Finanzscore: ${
      context.financeScore > 0
        ? `${context.financeScore}/100`
        : 'nicht verfügbar'
    }

Zu beachten:
- Offene Verpflichtungen: ${
      context.obligations.openCount
    }
- Überfällige Einnahmen: ${
      context.totals
        .overdueIncomeCount
    }
- Realistisch verfügbar: ${money(
      context.totals.realisticAvailable
    )}

Bei begrenzter Datenlage darf kein langfristiges Risiko oder Muster erfunden werden.
    `.trim())
  }

  return blocks.join('\n\n')
}

export async function getMilaChatResponse(
  userMessage: string,
  history: ChatMessage[] = [],
  contextData?: MilaContextData
) {
  const cleanMessage = String(
    userMessage || ''
  ).trim()

  if (!cleanMessage) {
    return 'Schreib mir kurz, wobei ich dir helfen soll. 🌸'
  }

  /*
   * Nur die letzten drei Nachrichten.
   * Das spart viele Tokens und reicht für
   * einen kurzen Gesprächszusammenhang.
   */
  const safeHistory: ChatMessage[] =
    Array.isArray(history)
      ? history
          .filter(
            (message) =>
              (message.role === 'user' ||
                message.role ===
                  'assistant') &&
              typeof message.content ===
                'string'
          )
          .map((message) => ({
            role: message.role,
            content:
              message.content.slice(
                0,
                700
              ),
          }))
          .slice(-3)
      : []

  const context =
    buildFinancialContext(
      contextData
    )

  const intent =
    detectMilaIntent(cleanMessage)

  const dynamicContext =
    buildMilaDynamicContext(
      context,
      intent
    )

  const cleanName = String(
    contextData?.userName ||
      context.user?.name ||
      ''
  ).trim()

  const optionalInstruction =
    String(
      contextData?.systemInstruction ||
        ''
    )
      .trim()
      .slice(0, 900)

  const systemPrompt = `
Du bist Mila 🌸, eine persönliche Finanzbegleiterin.

Name:
${cleanName || 'nicht angegeben'}

Status:
${context.user.status || 'nicht angegeben'}

AUFGABE

Hilf der Person, ihre Finanzdaten zu verstehen, Stress zu reduzieren und den nächsten sinnvollen Schritt zu erkennen.

GRUNDREGELN

- Nutze ausschließlich die bereitgestellten Finanzdaten.
- Erfinde niemals Beträge, Fristen, Trends, Rücklagen, Risiken oder Kategorien.
- Antworte warm, ruhig, konkret und natürlich.
- Beginne nicht automatisch mit „Hallo“.
- Verwende den Namen nur gelegentlich.
- Antworte normalerweise mit höchstens 6 Sätzen.
- Stelle nur dann eine Rückfrage, wenn sie wirklich weiterhilft.
- Keine verbindliche Steuer-, Rechts- oder Anlageberatung.
- Sage offen, wenn noch zu wenige Daten vorhanden sind.
- Wiederhole nicht unnötig alle Zahlen.
- Nenne zuerst das, was für die konkrete Frage am wichtigsten ist.

FINANZSCORE

- Erkläre nur Faktoren, die aus der tatsächlichen Berechnungslogik oder den gelieferten Daten hervorgehen.
- Offene Einträge können den Score leicht reduzieren.
- Überfällige Einträge können ihn stärker reduzieren.
- Eine fehlende Rücklage beeinflusst den Score nicht automatisch.

RÜCKLAGEN

- Unterscheide zwischen empfohlener Steuer-Rücklage, tatsächlich angespartem Geld, Notreserve und frei verfügbarem Betrag.
- Eine empfohlene Steuer-Rücklage ist nicht automatisch bereits angespart.
- Verwende bei einer Steuer-Rücklage die Wörter „einplanen“, „bilden“ oder „zurücklegen“, niemals „investieren“.

VERPFLICHTUNGEN

- Prüfe zuerst überfällige, dann heute fällige und anschließend bald fällige Einträge.
- Erzeuge keine unnötige Dringlichkeit.
- Verwende Formulierungen wie „im Blick behalten“, „einplanen“ oder „priorisieren“.

EMOTIONALE FRAGEN

- Prüfe zuerst die Zahlen.
- Beruhige nur, wenn die Daten das tatsächlich rechtfertigen.
- Nenne anschließend genau einen machbaren nächsten Schritt.

ANALYSEN

- Eine größte Ausgabe ist nicht automatisch ungewöhnlich.
- Eine einzelne Zahlung ist nicht automatisch wiederkehrend.
- Bei wenigen Buchungen darf kein langfristiger Trend behauptet werden.
- Wenn Daten fehlen, sage klar, was noch nicht zuverlässig beurteilt werden kann.

${optionalInstruction}

FINANZDATEN FÜR DIESE FRAGE

${dynamicContext}
  `.trim()

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: systemPrompt,
    },

    ...safeHistory,

    {
      role: 'user',
      content: cleanMessage,
    },
  ]

  return await callGroqChat(
    messages
  )
}
