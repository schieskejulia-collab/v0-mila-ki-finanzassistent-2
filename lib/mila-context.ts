import { CATEGORIES, getCategoryLabel } from "@/lib/categories"
import { calculateFinanceScore } from "@/lib/calculations"
import { requireSupabaseUser } from "@/lib/supabase-server"

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

function isCurrentMonth(dateValue: unknown, monthKey: string) {
  return String(dateValue || "").startsWith(monthKey)
}

function toNumber(value: unknown) {
  const parsed = Number(String(value ?? "").replace(",", "."))
  return Number.isFinite(parsed) ? parsed : 0
}

function sumAmounts<T extends { amount: number }>(items: T[]) {
  return items.reduce((sum, item) => sum + toNumber(item.amount), 0)
}

function isTaxRelevantCategory(categoryId?: string) {
  const normalized = String(categoryId || "").toLowerCase()

  return Boolean(normalized && normalized !== "privat")
}

function normalizeExpense(row: any): MilaExpense {
  const categoryId = String(row?.category || "sonstiges").toLowerCase()

  return {
    id: String(row?.id || crypto.randomUUID()),
    title: String(row?.title || row?.vendor || "Ausgabe"),
    amount: toNumber(row?.amount),
    date: String(row?.date || row?.created_at || ""),
    categoryId,
    categoryName: getCategoryLabel(categoryId),
    projectId: row?.project_id || row?.projectId || undefined,
    taxRelevant: isTaxRelevantCategory(categoryId),
  }
}

function normalizeIncome(row: any): MilaIncome {
  return {
    id: String(row?.id || crypto.randomUUID()),
    title: String(row?.title || row?.client || "Einnahme"),
    amount: toNumber(row?.amount),
    date: String(row?.date || row?.created_at || ""),
    projectId: row?.project_id || row?.projectId || undefined,
  }
}

function normalizeObligation(row: any): MilaObligation {
  const status = String(row?.status || "").toLowerCase()

  return {
    id: String(row?.id || crypto.randomUUID()),
    title: String(row?.title || row?.partner || row?.creditor || "Verpflichtung"),
    amount: toNumber(row?.amount),
    dueDate: row?.due_date || row?.dueDate || undefined,
    paid: status === "bezahlt" || status === "erledigt" || status === "paid",
  }
}

function normalizeGoal(row: any): MilaGoal {
  return {
    id: String(row?.id || crypto.randomUUID()),
    name: String(row?.title || row?.name || "Ziel"),
    targetAmount: toNumber(row?.target || row?.targetAmount),
    currentAmount: toNumber(row?.saved || row?.currentAmount),
    monthlyTarget: row?.monthlyContribution
      ? toNumber(row.monthlyContribution)
      : undefined,
  }
}

function buildCategorySummaries(expenses: MilaExpense[]): MilaCategorySummary[] {
  const grouped = new Map<string, number>()

  for (const expense of expenses) {
    const categoryId = expense.categoryId || "sonstiges"
    grouped.set(categoryId, (grouped.get(categoryId) || 0) + expense.amount)
  }

  return Array.from(grouped.entries()).map(([categoryId, spent]) => ({
    id: categoryId,
    name:
      CATEGORIES[categoryId as keyof typeof CATEGORIES]?.label ||
      getCategoryLabel(categoryId),
    spent,
    status: "ok",
  }))
}

function buildTaxRelevantReceipts(expenses: MilaExpense[]): MilaReceipt[] {
  return expenses
    .filter((expense) => expense.taxRelevant)
    .map((expense) => ({
      id: expense.id,
      merchant: expense.title,
      amount: expense.amount,
      date: expense.date,
      categoryId: expense.categoryId,
      taxRelevant: true,
    }))
}

function buildWarnings(params: {
  incomeTotal: number
  expenseTotal: number
  openObligations: MilaObligation[]
  isAuthenticated: boolean
}) {
  const warnings: string[] = []
  const balance = params.incomeTotal - params.expenseTotal

  if (!params.isAuthenticated) {
    warnings.push("MilaContext ist bereit. Für echte Finanzdaten muss die Anfrage mit Login-Token kommen.")
  }

  if (params.isAuthenticated && params.incomeTotal <= 0) {
    warnings.push("Für diesen Monat sind noch keine Einnahmen erfasst.")
  }

  if (balance < 0) {
    warnings.push("Die Ausgaben liegen aktuell über den Einnahmen.")
  }

  const unpaid = params.openObligations.filter((item) => !item.paid)
  if (unpaid.length > 0) {
    warnings.push(`Es gibt noch ${unpaid.length} offene Verpflichtung(en).`)
  }

  return warnings
}

function buildSuggestions(params: {
  balance: number
  categories: MilaCategorySummary[]
  goals: MilaGoal[]
  isAuthenticated: boolean
}) {
  const suggestions: string[] = []

  if (!params.isAuthenticated) {
    suggestions.push("Verbinde als Nächstes Dashboard oder Chat mit /api/mila/context und sende den Supabase-Login-Token mit.")
    return suggestions
  }

  if (params.balance > 0) {
    suggestions.push(`Du bist aktuell ${params.balance.toFixed(2)} € im Plus.`)
  }

  const biggestCategory = [...params.categories].sort(
    (a, b) => b.spent - a.spent
  )[0]

  if (biggestCategory) {
    suggestions.push(
      `Deine größte Ausgabenkategorie ist aktuell "${biggestCategory.name}" mit ${biggestCategory.spent.toFixed(2)} €.`
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
    suggestions.push("Noch nicht genug Daten für eine konkrete Empfehlung. Erfasse Einnahmen, Ausgaben oder Belege.")
  }

  return suggestions
}

async function loadMilaData(req: Request) {
  const auth = await requireSupabaseUser(req)

  if (auth.error || !auth.user) {
    return {
      isAuthenticated: false,
      expenses: [] as MilaExpense[],
      income: [] as MilaIncome[],
      obligations: [] as MilaObligation[],
      goals: [] as MilaGoal[],
    }
  }

  const { client, user } = auth

  const [
    expensesResult,
    incomesResult,
    obligationsResult,
    goalsResult,
  ] = await Promise.all([
    client
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),

    client
      .from("incomes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),

    client
      .from("obligations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),

    client
      .from("goals")
      .select("*")
      .eq("user_id", user.id),
  ])

  if (expensesResult.error) {
    console.error("MilaContext expenses error:", expensesResult.error)
  }

  if (incomesResult.error) {
    console.error("MilaContext incomes error:", incomesResult.error)
  }

  if (obligationsResult.error) {
    console.error("MilaContext obligations error:", obligationsResult.error)
  }

  if (goalsResult.error) {
    console.error("MilaContext goals error:", goalsResult.error)
  }

  return {
    isAuthenticated: true,
    expenses: (expensesResult.data || []).map(normalizeExpense),
    income: (incomesResult.data || []).map(normalizeIncome),
    obligations: (obligationsResult.data || []).map(normalizeObligation),
    goals: (goalsResult.data || []).map(normalizeGoal),
  }
}

export async function buildMilaContext(req: Request): Promise<MilaContext> {
  const month = getCurrentMonthKey()
  const data = await loadMilaData(req)

  const monthlyExpenses = data.expenses.filter((expense) =>
    isCurrentMonth(expense.date, month)
  )

  const monthlyIncome = data.income.filter((income) =>
    isCurrentMonth(income.date, month)
  )

  const incomeTotal = sumAmounts(monthlyIncome)
  const expenseTotal = sumAmounts(monthlyExpenses)
  const balance = incomeTotal - expenseTotal
  const categories = buildCategorySummaries(monthlyExpenses)
  const openObligations = data.obligations.filter((item) => !item.paid)
  const taxRelevantReceipts = buildTaxRelevantReceipts(monthlyExpenses)

  const openCount = data.income.filter((income: any) => {
    const status = String(income?.status || "").toLowerCase()
    return status === "offen" || status === "pending" || status === "unbezahlt"
  }).length

  const overdueCount = openObligations.filter((item) => {
    if (!item.dueDate) return false
    return new Date(item.dueDate).getTime() < new Date().setHours(0, 0, 0, 0)
  }).length

  const healthScore = calculateFinanceScore({
    balance,
    totalIncomes: incomeTotal,
    totalExpenses: expenseTotal,
    openCount,
    overdueCount,
  })

  const warnings = buildWarnings({
    incomeTotal,
    expenseTotal,
    openObligations,
    isAuthenticated: data.isAuthenticated,
  })

  const suggestions = buildSuggestions({
    balance,
    categories,
    goals: data.goals,
    isAuthenticated: data.isAuthenticated,
  })

  return {
    month,
    incomeTotal,
    expenseTotal,
    balance,
    categories,
    recentExpenses: monthlyExpenses.slice(0, 10),
    openObligations,
    projects: [],
    goals: data.goals,
    taxRelevantReceipts,
    healthScore,
    warnings,
    suggestions,
  }
}