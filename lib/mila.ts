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
  const largestExpenseText =
    context.insights.largestExpense
      ? [
          context.insights.largestExpense.title ||
            context.insights.largestExpense.vendor ||
            'Ausgabe',
          money(
            context.insights.largestExpense.amount
          ),
          context.insights.largestExpense.category
            ? `Kategorie: ${context.insights.largestExpense.category}`
            : '',
          context.insights.largestExpense.date
            ? `Datum: ${context.insights.largestExpense.date}`
            : '',
        ]
          .filter(Boolean)
          .join(', ')
      : 'keine Ausgabe erfasst'

  const largestIncomeText =
    context.insights.largestIncome
      ? [
          context.insights.largestIncome.title ||
            context.insights.largestIncome.client ||
            'Einnahme',
          money(
            context.insights.largestIncome.amount
          ),
          context.insights.largestIncome.client
            ? `Kunde: ${context.insights.largestIncome.client}`
            : '',
          context.insights.largestIncome.date
            ? `Datum: ${context.insights.largestIncome.date}`
            : '',
        ]
          .filter(Boolean)
          .join(', ')
      : 'keine Einnahme erfasst'

  const recurringText =
    context.recurring.length > 0
      ? context.recurring
          .map((entry: any) => {
            const label =
              entry.title ||
              entry.partner ||
              'Regelmäßige Zahlung'

            return `${label}, ${money(
              entry.amount
            )}, ${entry.frequency}`
          })
          .join(' | ')
      : 'keine sicher erkannten wiederkehrenden Zahlungen'

  const unusualExpensesText =
    context.insights.unusualExpenses.length > 0
      ? context.insights.unusualExpenses
          .map(
            (entry: any) =>
              `${
                entry.title ||
                entry.vendor ||
                'Ausgabe'
              }, ${money(entry.amount)}`
          )
          .join(' | ')
      : context.counts.expenses < 3
        ? 'zu wenige Ausgaben für eine verlässliche Ausreißeranalyse'
        : 'keine auffälligen Ausgaben erkannt'
  const monthlyComparison =
    context.insights
      .monthlyComparison

  const formatPercentage = (
    value: number | null
  ) => {
    if (value === null) {
      return 'nicht sinnvoll berechenbar, weil im Vormonat kein Vergleichswert vorhanden ist'
    }

    const rounded =
      Math.round(value * 10) / 10

    if (rounded === 0) {
      return 'unverändert'
    }

    return rounded > 0
      ? `um ${rounded.toLocaleString(
          'de-DE'
        )} % gestiegen`
      : `um ${Math.abs(
          rounded
        ).toLocaleString(
          'de-DE'
        )} % gesunken`
  }

  const categoryComparisonText =
    monthlyComparison.categoryChanges
      .length > 0
      ? monthlyComparison.categoryChanges
          .map((item: any) => {
            const direction =
              item.difference > 0
                ? 'mehr'
                : item.difference < 0
                  ? 'weniger'
                  : 'unverändert'

            return `${item.category}: aktuell ${money(
              item.current
            )}, zuvor ${money(
              item.previous
            )}, ${direction} um ${money(
              Math.abs(
                item.difference
              )
            )}`
          })
          .join(' | ')
      : 'keine Kategorien mit ausreichenden Vergleichsdaten'
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const getDaysUntil = (value: unknown) => {
    if (!value) return null

    const date = new Date(String(value))

    if (Number.isNaN(date.getTime())) {
      return null
    }

    date.setHours(0, 0, 0, 0)

    return Math.round(
      (date.getTime() -
        todayStart.getTime()) /
        86_400_000
    )
  }

  const obligationTimeline =
    context.obligations.upcoming
      .map((obligation: any) => ({
        ...obligation,
        daysUntil: getDaysUntil(
          obligation.dueDate
        ),
      }))
      .sort((a: any, b: any) => {
        const aDays =
          a.daysUntil ??
          Number.POSITIVE_INFINITY

        const bDays =
          b.daysUntil ??
          Number.POSITIVE_INFINITY

        return aDays - bDays
      })

  const overdueObligations =
    obligationTimeline.filter(
      (obligation: any) =>
        typeof obligation.daysUntil ===
          'number' &&
        obligation.daysUntil < 0
    )

  const dueTodayObligations =
    obligationTimeline.filter(
      (obligation: any) =>
        obligation.daysUntil === 0
    )

  const dueSoonObligations =
    obligationTimeline.filter(
      (obligation: any) =>
        typeof obligation.daysUntil ===
          'number' &&
        obligation.daysUntil > 0 &&
        obligation.daysUntil <= 7
    )

  const nextObligation =
    obligationTimeline[0] || null

  const expenseRatio =
    context.totals.incomeTotal > 0
      ? context.totals.expenseTotal /
        context.totals.incomeTotal
      : null

  const hasEnoughBasicData =
    context.counts.incomes +
      context.counts.expenses >=
    3

  const financialStrength = (() => {
    if (
      context.totals.balance > 0 &&
      expenseRatio !== null &&
      expenseRatio <= 0.4
    ) {
      return `Die aktuell stärkste Seite ist der positive Überschuss von ${money(
        context.totals.balance
      )}. Die erfassten Ausgaben beanspruchen nur einen kleinen Teil der Einnahmen.`
    }

    if (
      context.totals.balance > 0
    ) {
      return `Die aktuell stärkste Seite ist der positive Überschuss von ${money(
        context.totals.balance
      )}.`
    }

    if (
      overdueObligations.length === 0 &&
      context.obligations.openCount === 0
    ) {
      return 'Aktuell sind keine offenen oder überfälligen Verpflichtungen erfasst.'
    }

    if (context.financeScore > 0) {
      return `Der Finanzscore von ${context.financeScore}/100 liefert aktuell die stärkste positive Einordnung.`
    }

    return 'Für eine belastbare finanzielle Stärke fehlen derzeit noch ausreichend Buchungen.'
  })()

  const financialRisk = (() => {
    if (overdueObligations.length > 0) {
      const obligation =
        overdueObligations[0]

      return `${obligation.title || 'Eine Verpflichtung'} über ${money(
        Number(
          obligation.amount || 0
        )
      )} ist überfällig und hat aktuell die höchste Priorität.`
    }

    if (
      context.totals
        .overdueIncomeCount > 0
    ) {
      return `${context.totals.overdueIncomeCount} überfällige Einnahme${
        context.totals
          .overdueIncomeCount === 1
          ? ''
          : 'n'
      } sollten zuerst geprüft werden.`
    }

    if (
      context.totals
        .realisticAvailable < 0
    ) {
      return `Nach Berücksichtigung der offenen Verpflichtungen fehlen aktuell ${money(
        Math.abs(
          context.totals
            .realisticAvailable
        )
      )}.`
    }

    if (!hasEnoughBasicData) {
      return 'Das größte aktuelle Risiko ist keine bestimmte Ausgabe, sondern die noch geringe Datenmenge. Dadurch sind langfristige Muster noch nicht zuverlässig erkennbar.'
    }

    if (
      context.obligations.openCount > 0
    ) {
      return `Es sind offene Verpflichtungen über insgesamt ${money(
        context.totals
          .openObligation
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
Stelle nur dann eine Rückfrage,
wenn sie dem Nutzer wirklich weiterhilft.

Viele Antworten dürfen auch einfach
mit einer kurzen Zusammenfassung enden.
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
Wenn ein Finanzscore vorhanden ist:

- Erkläre sowohl die positiven als auch die negativen Einflussfaktoren.
- Nutze ausschließlich die Berechnungslogik der App.
- Bei offenen Verpflichtungen erwähne, dass sie den Score leicht reduzieren können.
- Bei überfälligen Verpflichtungen erkläre, dass sie stärker ins Gewicht fallen.
- Erfinde keine weiteren Faktoren.
ANALYSEVERHALTEN

Wenn nach Auffälligkeiten gefragt wird:

- Vergleiche zuerst die vorhandenen Einnahmen, Ausgaben und Verpflichtungen.
- Wenn keine Auffälligkeit existiert, sage das klar.
- Wenn sehr wenige Daten vorhanden sind, erkläre, dass die Analyse deshalb begrenzt ist.
- Nutze vorhandene Kategorien.
- Nutze wiederkehrende Zahlungen.
- Nutze offene Verpflichtungen.
- Nutze offene Einnahmen.
- Erfinde niemals Trends.

DATENGRENZEN

- Eine Zahlung darf nur als wiederkehrend bezeichnet werden, wenn sie im Feld recurring enthalten ist oder ausdrücklich als regelmäßig gespeichert wurde.
- Eine einzelne Rate oder Verpflichtung ist nicht automatisch wiederkehrend.
- Erfinde keine fehlende Notreserve und kein finanzielles Risiko, wenn dafür keine gespeicherten Daten vorliegen.
- Wenn zu wenige Buchungen für eine verlässliche Analyse vorhanden sind, sage das ausdrücklich.
- Sage bei einer Steuer-Rücklage „einplanen“, „bilden“ oder „zurücklegen“.
- Verwende für eine Steuer-Rücklage niemals das Wort „investieren“.
- Wenn nur eine Ausgabe vorhanden ist, nenne sie als größte vorhandene Ausgabe, aber bezeichne sie nicht automatisch als ungewöhnlich.
FINANZKONTEXT
Finanzscore:
${
  context.financeScore > 0
    ? `${context.financeScore}/100`
    : 'nicht verfügbar'
}
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
BERECHNETE ANALYSEWERTE

Größte erfasste Ausgabe:
${largestExpenseText}

Größte erfasste Einnahme:
${largestIncomeText}

Sicher erkannte wiederkehrende Zahlungen:
${recurringText}

Auffällige Ausgaben:
${unusualExpensesText}

Anzahl erfasster Ausgaben:
${context.counts.expenses}

Anzahl erfasster Einnahmen:
${context.counts.incomes}

REGELN FÜR ANALYSEFRAGEN

- Bei „größte Ausgabe“, „höchste Ausgabe“ oder „welche Ausgabe kostet am meisten“ nutze ausschließlich den Wert „Größte erfasste Ausgabe“.
- Formuliere unterschiedliche Fragen mit derselben Bedeutung inhaltlich gleich.
- Behaupte niemals, es seien keine Ausgaben vorhanden, wenn eine größte Ausgabe angegeben ist.
- Eine Zahlung ist nur wiederkehrend, wenn sie unter „Sicher erkannte wiederkehrende Zahlungen“ steht.
- Eine einzelne Rate ohne Wiederholungsmerkmal ist nicht automatisch monatlich.
- Bei weniger als drei Ausgaben darfst du keine belastbare Ausreißer- oder Trendanalyse behaupten.
- Eine größte Ausgabe ist nicht automatisch ungewöhnlich oder problematisch.
- Beurteile eine Ausgabe nicht als gut, schlecht oder unnötig, wenn dafür keine ausreichenden Daten vorliegen.
MONATSVERGLEICH

Aktueller Monat – Einnahmen:
${money(
  monthlyComparison.currentMonth.incomeTotal
)}

Aktueller Monat – Ausgaben:
${money(
  monthlyComparison.currentMonth.expenseTotal
)}

Vormonat – Einnahmen:
${money(
  monthlyComparison.previousMonth.incomeTotal
)}

Vormonat – Ausgaben:
${money(
  monthlyComparison.previousMonth.expenseTotal
)}

Veränderung der Einnahmen:
${formatPercentage(
  monthlyComparison.incomeChangePercent
)}

Veränderung der Ausgaben:
${formatPercentage(
  monthlyComparison.expenseChangePercent
)}

Kategorievergleich:
${categoryComparisonText}

REGELN FÜR MONATSVERGLEICHE

- Nutze bei Fragen nach diesem Monat oder dem Vormonat ausschließlich die Werte aus dem Abschnitt „MONATSVERGLEICH“.
- Erfinde keine Trends aus den Gesamtsummen.
- Eine prozentuale Veränderung darf nur genannt werden, wenn sie berechnet werden konnte.
- Wenn im Vormonat der Vergleichswert 0 war, nenne stattdessen die absoluten Beträge.
- Unterscheide klar zwischen Einnahmen und Ausgaben.
- Sage nicht pauschal, dass sich die finanzielle Lage verbessert oder verschlechtert hat, wenn nur sehr wenige Buchungen vorhanden sind.
- Bei wenigen Daten formuliere: „Der Vergleich zeigt die erfassten Buchungen, ist aber noch kein stabiler langfristiger Trend.“
- Eine Kategorie gilt nicht automatisch als problematisch, nur weil sie gestiegen ist.
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