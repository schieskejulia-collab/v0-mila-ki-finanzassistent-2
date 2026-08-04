export type MilaCategorySummary = {
  id: string
  name: string
  planned?: number
  spent: number
  remaining?: number
  status: "ok" | "warning" | "over"
}

export type MilaExpense = {
  id: string
  title: string
  amount: number
  date: string
  categoryId?: string
  categoryName?: string
  projectId?: string
  taxRelevant?: boolean
}

export type MilaIncome = {
  id: string
  title: string
  amount: number
  date: string
  projectId?: string
}

export type MilaObligation = {
  id: string
  title: string
  amount: number
  dueDate?: string
  paid?: boolean
}

export type MilaProject = {
  id: string
  name: string
  incomeTotal: number
  expenseTotal: number
  balance: number
}

export type MilaGoal = {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  monthlyTarget?: number
}

export type MilaReceipt = {
  id: string
  merchant?: string
  amount: number
  date?: string
  categoryId?: string
  taxRelevant: boolean
}

export type MilaContext = {
  month: string
  incomeTotal: number
  expenseTotal: number
  balance: number
  categories: MilaCategorySummary[]
  recentExpenses: MilaExpense[]
  openObligations: MilaObligation[]
  projects: MilaProject[]
  goals: MilaGoal[]
  taxRelevantReceipts: MilaReceipt[]
  healthScore: number
  warnings: string[]
  suggestions: string[]
}

function getCurrentMonthKey() {
  return new Date().toISOString().slice(0, 7)
}

function sumAmounts<T extends { amount: number }>(items: T[]) {
  return items.reduce((sum, item) => sum + Number(item.amount || 0), 0)
}

function calculateHealthScore(params: {
  incomeTotal: number
  expenseTotal: number
  categories: MilaCategorySummary[]
  openObligations: MilaObligation[]
  goals: MilaGoal[]
  taxRelevantReceipts: MilaReceipt[]
}) {
  let score = 70
  const balance = params.incomeTotal - params.expenseTotal

  if (params.incomeTotal <= 0) score -= 20
  if (balance > 0) score += 10
  if (balance < 0) score -= 20

  const overBudgetCount = params.categories.filter(
    (category) => category.status === "over"
  ).length
  score -= overBudgetCount * 5

  const unpaidObligations = params.openObligations.filter(
    (item) => !item.paid
  ).length
  score -= unpaidObligations * 4

  const activeGoals = params.goals.filter(
    (goal) => goal.targetAmount > goal.currentAmount
  ).length
  if (activeGoals > 0 && balance > 0) score += 5

  if (params.taxRelevantReceipts.length > 0) score += 3

  return Math.max(0, Math.min(100, score))
}

function buildWarnings(params: {
  incomeTotal: number
  expenseTotal: number
  categories: MilaCategorySummary[]
  openObligations: MilaObligation[]
}) {
  const warnings: string[] = []
  const balance = params.incomeTotal - params.expenseTotal

  if (params.incomeTotal <= 0) {
    warnings.push("Für diesen Monat sind noch keine Einnahmen erfasst.")
  }

  if (balance < 0) {
    warnings.push("Die Ausgaben liegen aktuell über den Einnahmen.")
  }

  const overCategories = params.categories.filter(
    (category) => category.status === "over"
  )

  if (overCategories.length > 0) {
    warnings.push(
      `Budget überschritten: ${overCategories.map((item) => item.name).join(", ")}.`
    )
  }

  const unpaid = params.openObligations.filter((item) => !item.paid)
  if (unpaid.length > 0) {
    warnings.push(`Es gibt noch ${unpaid.length} offene Verpflichtung(en).`)
  }

  return warnings
}

function buildSuggestions(params: {
  incomeTotal: number
  expenseTotal: number
  balance: number
  categories: MilaCategorySummary[]
  goals: MilaGoal[]
}) {
  const suggestions: string[] = []

  if (params.balance > 0) {
    suggestions.push(`Du bist aktuell ${params.balance.toFixed(2)} € im Plus.`)
  }

  const overCategory = params.categories.find(
    (category) => category.status === "over"
  )

  if (overCategory) {
    suggestions.push(
      `Prüfe die Kategorie "${overCategory.name}", dort ist das Budget überschritten.`
    )
  }

  const nextGoal = params.goals.find(
    (goal) => goal.currentAmount < goal.targetAmount
  )

  if (nextGoal && params.balance > 0) {
    const possibleSaving = Math.max(
      0,
      Math.min(params.balance, nextGoal.monthlyTarget || params.balance)
    )

    suggestions.push(
      `Du könntest ${possibleSaving.toFixed(2)} € für "${nextGoal.name}" zurücklegen.`
    )
  }

  if (suggestions.length === 0) {
    suggestions.push(
      "Noch nicht genug Daten für eine konkrete Empfehlung. Erfasse Einnahmen, Ausgaben oder Belege."
    )
  }

  return suggestions
}

async function loadMilaData() {
  /*
    Hier werden im nächsten Schritt die echten bestehenden Mila-Module angeschlossen.

    Wichtig:
    Keine zweite Datenstruktur bauen.
    Diese Stelle ist nur der Sammelpunkt.

    Später hier einsetzen:
    - Ausgaben laden
    - Einnahmen laden
    - Kategorien aus lib/categories.ts nutzen
    - Belege laden
    - Projekte laden
    - Ziele laden
    - Verpflichtungen laden
    - Steuerlogik anbinden
  */

  return {
    expenses: [] as MilaExpense[],
    income: [] as MilaIncome[],
    categories: [] as MilaCategorySummary[],
    obligations: [] as MilaObligation[],
    projects: [] as MilaProject[],
    goals: [] as MilaGoal[],
    receipts: [] as MilaReceipt[],
  }
}

export async function buildMilaContext(): Promise<MilaContext> {
  const data = await loadMilaData()

  const incomeTotal = sumAmounts(data.income)
  const expenseTotal = sumAmounts(data.expenses)
  const balance = incomeTotal - expenseTotal

  const taxRelevantReceipts = data.receipts.filter(
    (receipt) => receipt.taxRelevant
  )

  const healthScore = calculateHealthScore({
    incomeTotal,
    expenseTotal,
    categories: data.categories,
    openObligations: data.obligations,
    goals: data.goals,
    taxRelevantReceipts,
  })

  const warnings = buildWarnings({
    incomeTotal,
    expenseTotal,
    categories: data.categories,
    openObligations: data.obligations,
  })

  const suggestions = buildSuggestions({
    incomeTotal,
    expenseTotal,
    balance,
    categories: data.categories,
    goals: data.goals,
  })

  return {
    month: getCurrentMonthKey(),
    incomeTotal,
    expenseTotal,
    balance,
    categories: data.categories,
    recentExpenses: data.expenses.slice(0, 10),
    openObligations: data.obligations,
    projects: data.projects,
    goals: data.goals,
    taxRelevantReceipts,
    healthScore,
    warnings,
    suggestions,
  }
}