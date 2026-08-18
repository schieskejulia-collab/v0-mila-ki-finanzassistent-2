import {
  calculateFinanceScore,
  calculatePayments,
  calculateTrafficLight,
} from '@/lib/calculations'
import { getMilaAssistantFindings } from '@/lib/mila-assistant'
import { getMilaDailyInsight } from '@/lib/mila-daily-insight'
import { getMilaFinanceAnalysis } from '@/lib/mila-finance-analysis'
import { getMilaForecast } from '@/lib/mila-forecast'
import { estimateTaxProfile } from '@/lib/tax-profile'
import {
  daysUntil,
  findRecurringExpenses,
  formatEuro,
  getGreeting,
  getObligationBuckets,
  getOpenObligations,
  getSoftwareExpenses,
} from '@/lib/dashboard-helpers'

function isSafelyDeductibleExpense(expense: any) {
  const category = String(expense?.category || '').trim().toLowerCase()
  if (!category) return false

  const unresolvedOrPrivateMarkers = [
    'privat',
    'nicht absetzbar',
    'ungeprüft',
    'ungeprueft',
    'unklar',
    'gemischt',
    'sonstiges',
    'prüfen',
    'pruefen',
  ]

  return !unresolvedOrPrivateMarkers.some((marker) => category.includes(marker))
}

export function buildDashboardModel(data: any) {
  const {
    summary,
    expenses = [],
    incomes = [],
    obligations = [],
    documents = [],
    goals = [],
    userName,
    userStatus,
    vatStatus,
    taxClass,
    annualGross,
    annualProfit,
    federalState,
    churchTax,
    married,
    children,
    assemblyWork,
  } = data

  const payments = calculatePayments(incomes)
  const openCount = payments.openCount
  const overdueCount = payments.overdueCount
  const totalOpenAmount = payments.openAmount

  const openObligations = getOpenObligations(obligations)
  const openObligationAmount = openObligations.reduce(
    (sum: number, item: any) => sum + Number(item.amount || 0),
    0
  )

  const availableAfterObligations =
    Number(summary.balance || 0) - openObligationAmount

  const buckets = getObligationBuckets(openObligations)
  const recurringExpenses = findRecurringExpenses(expenses)
  const softwareExpenses = getSoftwareExpenses(expenses)

  const taxProfile = estimateTaxProfile({
    userType: assemblyWork ? 'montagearbeiter' : userStatus,
    annualGrossSalary: Number(annualGross || 0),
    estimatedAnnualProfit: Number(annualProfit || 0),
    annualRevenueGross: Number(summary.totalIncomes || 0),
    vatStatus,
    federalState,
    churchTax,
    taxClass,
    isMarried: married,
    hasChildren: Number(children || 0) > 0,
    assemblyWork,
  })

  // Nur fachlich bereits eindeutig zugeordnete Kategorien fließen in Milas
  // grobe Rücklagenrechnung ein. Unklare, gemischte oder private Ausgaben
  // bleiben Cashflow, werden aber nicht automatisch als steuerlich abziehbar behandelt.
  const deductibleExpenses = expenses
    .filter(isSafelyDeductibleExpense)
    .reduce(
      (sum: number, expense: any) => sum + Number(expense?.amount || 0),
      0
    )

  const estimatedTaxableProfit = Math.max(
    0,
    Number(summary.totalIncomes || 0) - deductibleExpenses
  )

  const reserveRate =
    taxProfile.reserveRateMax > 0
      ? (taxProfile.reserveRateMin +
          taxProfile.reserveRateMax) /
        2
      : 0.125

  const taxReserve = estimatedTaxableProfit * reserveRate
  const availableAfterReserve = availableAfterObligations - taxReserve

  const financeScore = calculateFinanceScore({
    balance: summary.balance,
    totalIncomes: summary.totalIncomes,
    totalExpenses: summary.totalExpenses,
    openCount,
    overdueCount,
  })

  const baseTrafficLight = calculateTrafficLight(
    financeScore,
    summary.balance
  )

  const trafficLight =
    baseTrafficLight.level === 'danger'
      ? {
          status: baseTrafficLight.status,
          color: 'bg-rose-50 border-rose-200 text-rose-900',
          dot: 'bg-rose-500',
        }
      : baseTrafficLight.level === 'warning'
        ? {
            status: baseTrafficLight.status,
            color: 'bg-amber-50 border-amber-200 text-amber-900',
            dot: 'bg-amber-500',
          }
        : {
            status: baseTrafficLight.status,
            color: 'bg-emerald-50 border-emerald-200 text-emerald-900',
            dot: 'bg-emerald-500',
          }

  const milaMood = getMood({
    overdueObligations: buckets.overdue,
    overdueCount,
    dueSoonObligations: buckets.dueSoon,
    openCount,
    balance: summary.balance,
    availableAfterObligations,
    financeScore,
  })

  const todayTask = getTodayTask({
    overdueObligations: buckets.overdue,
    dueSoonObligations: buckets.dueSoon,
    openCount,
    totalOpenAmount,
    taxReserve,
  })

  const nextObligation = [...openObligations]
    .filter((item: any) => item.dueDate || item.due_date)
    .sort((a: any, b: any) => {
      const aTime = new Date(a.dueDate || a.due_date).getTime()
      const bTime = new Date(b.dueDate || b.due_date).getTime()
      return aTime - bTime
    })[0]

  const financeAnalysis = getMilaFinanceAnalysis({
    expenses,
    incomes,
    obligations,
    taxReserve,
  })

  const dailyInsight = getMilaDailyInsight({
    expenses,
    incomes,
    obligations,
    goals,
    taxReserve,
    availableAfterObligations,
  })

  const forecast = getMilaForecast(incomes, expenses)
  const assistantFindings = getMilaAssistantFindings({
    documents,
    obligations: openObligations,
  })
  const kanzleiHandoff = getKanzleiHandoff({
    expenses,
    documents,
    openObligations,
    assistantFindings,
  })

  return {
    greeting: getGreeting(),
    userName: userName || 'Julia',
    summary,
    goals,
    obligations,
    openObligations,
    openObligationAmount,
    availableAfterObligations,
    availableAfterReserve,
    taxReserve,
    financeScore,
    trafficLight,
    milaMood,
    todayTask,
    nextObligation,
    buckets,
    openCount,
    overdueCount,
    totalOpenAmount,
    recurringExpenses,
    softwareExpenses,
    assistantFindings,
    financeAnalysis,
    dailyInsight,
    forecast,
    kanzleiHandoff,
  }
}

function getKanzleiHandoff(input: any) {
  const {
    expenses = [],
    documents = [],
    openObligations = [],
    assistantFindings = [],
  } = input

  const missingReceiptCount = expenses.filter((expense: any) => {
    return expense?.hasReceipt === false || expense?.has_receipt === false
  }).length

  const openQuestionCount = documents.filter((document: any) => {
    const status = String(document?.status || '').toLowerCase()
    const note = String(document?.note || '').toLowerCase()

    return (
      status === 'neu' ||
      note.includes('unklar') ||
      note.includes('rückfrage') ||
      note.includes('rueckfrage') ||
      note.includes('prüfen') ||
      note.includes('pruefen')
    )
  }).length

  const highFindingCount = assistantFindings.filter((finding: any) => {
    return finding?.priority === 'high'
  }).length

  const issueCount =
    missingReceiptCount +
    openQuestionCount +
    openObligations.length +
    highFindingCount

  const completion = Math.max(15, Math.min(100, 100 - issueCount * 12))
  const nextAction = getKanzleiNextAction({
    missingReceiptCount,
    openQuestionCount,
    openObligationCount: openObligations.length,
  })

  return {
    documentCount: documents.length,
    missingReceiptCount,
    openQuestionCount,
    openObligationCount: openObligations.length,
    highFindingCount,
    completion,
    nextAction,
  }
}

function getKanzleiNextAction(input: any) {
  const {
    missingReceiptCount,
    openQuestionCount,
    openObligationCount,
  } = input

  if (missingReceiptCount > 0) {
    return {
      title: 'Belege nachfordern',
      message:
        'Es gibt Buchungen ohne Beleg. Sammle zuerst die fehlenden Nachweise, bevor die Monatsmappe rausgeht.',
      href: '/buchungen',
      cta: 'Fehlende Belege prüfen',
    }
  }

  if (openQuestionCount > 0) {
    return {
      title: 'Rückfragen klären',
      message:
        'Einige Dokumente brauchen noch Kontext. Mila hält sie sichtbar, damit die Kanzlei später weniger nachfragen muss.',
      href: '/dokumente',
      cta: 'Dokumente öffnen',
    }
  }

  if (openObligationCount > 0) {
    return {
      title: 'Offene Pflichten prüfen',
      message:
        'Vor der Übergabe sollten offene Zahlungen, Fristen oder Bescheide einmal angeschaut werden.',
      href: '/verpflichtungen',
      cta: 'Pflichten prüfen',
    }
  }

  return {
    title: 'Übergabe wirkt vorbereitet',
    message:
      'Die Monatsmappe sieht organisatorisch ordentlich aus. Export oder Kanzlei-Weitergabe kann der nächste Schritt sein.',
    href: '/dokumente',
    cta: 'Monatsmappe ansehen',
  }
}

function getMood(input: any) {
  const {
    overdueObligations,
    overdueCount,
    dueSoonObligations,
    openCount,
    balance,
    availableAfterObligations,
    financeScore,
  } = input

  if (overdueObligations.length > 0 || overdueCount > 0) {
    return {
      label: 'Heute aufmerksam',
      message: 'Es gibt überfällige Zahlungen. Kläre heute nur die wichtigste zuerst.',
      color: 'border-rose-200 bg-rose-50 text-rose-900',
      dot: 'bg-rose-500',
      emoji: '🔴',
    }
  }

  if (dueSoonObligations.length > 0 || openCount > 0) {
    return {
      label: 'Heute im Blick behalten',
      message: 'Eine Zahlung oder ein offener Eingang steht an. Noch ist alles überschaubar.',
      color: 'border-amber-200 bg-amber-50 text-amber-900',
      dot: 'bg-amber-500',
      emoji: '🟡',
    }
  }

  if (Number(balance || 0) > 0 && availableAfterObligations >= 0 && financeScore >= 70) {
    return {
      label: 'Heute entspannt',
      message:
        '🌸 Heute besteht kein akuter Handlungsbedarf. Deine Finanzen wirken aktuell stabil.',
      color: 'border-emerald-200 bg-emerald-50 text-emerald-900',
      dot: 'bg-emerald-500',
      emoji: '🟢',
    }
  }

  if (Number(balance || 0) < 0 || availableAfterObligations < 0) {
    return {
      label: 'Heute vorsichtig',
      message: 'Dein Spielraum ist knapp. Größere Ausgaben würde Mila heute vermeiden.',
      color: 'border-rose-200 bg-rose-50 text-rose-900',
      dot: 'bg-rose-500',
      emoji: '🔴',
    }
  }

  return {
    label: 'Heute noch sortieren',
    message: 'Mit weiteren Buchungen wird Milas Einschätzung genauer.',
    color: 'border-violet-200 bg-violet-50 text-violet-900',
    dot: 'bg-violet-500',
    emoji: '🟣',
  }
}

function getTodayTask(input: any) {
  const {
    overdueObligations,
    dueSoonObligations,
    openCount,
    totalOpenAmount,
    taxReserve,
  } = input

  if (overdueObligations.length > 0) {
    const item = overdueObligations[0]
    return {
      title: item.title || 'Überfällige Verpflichtung prüfen',
      message: `${formatEuro(Number(item.amount || 0))} sind überfällig. Prüfe diese Zahlung zuerst.`,
      href: '/verpflichtungen',
      tone: 'danger' as const,
    }
  }

  if (dueSoonObligations.length > 0) {
    const item = [...dueSoonObligations].sort((a: any, b: any) => {
      return (
        new Date(a.dueDate || a.due_date || '').getTime() -
        new Date(b.dueDate || b.due_date || '').getTime()
      )
    })[0]

    const days = daysUntil(item.dueDate || item.due_date)
    const dueText = days === 0 ? 'heute' : days === 1 ? 'morgen' : `in ${days} Tagen`

    return {
      title: 'Nächste Zahlung',
      message: `Rate über ${formatEuro(
        Number(item.amount || 0)
      )} wird ${dueText} fällig.`,
      href: '/verpflichtungen',
      tone: 'warning' as const,
    }
  }

  if (openCount > 0) {
    return {
      title: 'Offenen Zahlungseingang prüfen',
      message: `Du wartest noch auf ${formatEuro(totalOpenAmount)}. Prüfe heute einen Eingang.`,
      href: '/buchungen',
      tone: 'info' as const,
    }
  }

  if (taxReserve > 0) {
    return {
      title: 'Heute etwas zurücklegen',
      message: `Lege heute ${formatEuro(
        taxReserve
      )} für deine Steuer zurück.`,
      href: '/buchungen',
      tone: 'good' as const,
    }
  }

  return null
}
