'use client'

import { useFinance } from '@/lib/store'

type MorningBriefingProps = {
  taxReserve?: number
  financeScore?: number
  availableAfterObligations?: number
}

function money(value: number) {
  return Number(value || 0).toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  })
}

function number(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeStatus(value: unknown) {
  return String(value || '').trim().toLowerCase()
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 11) return 'Guten Morgen'
  if (hour < 18) return 'Guten Tag'
  return 'Guten Abend'
}

function getProfileLabel(userStatus: string) {
  if (userStatus === 'freiberufler') return 'Freiberufler'
  if (userStatus === 'kleinunternehmer') return 'Kleinunternehmer'
  if (userStatus === 'selbststaendig_gewerbe') return 'Selbstständig'
  if (userStatus === 'angestellt') return 'Angestellt'
  if (userStatus === 'minijob') return 'Minijob'
  if (userStatus === 'montagearbeiter') return 'Montage'
  return 'Profil'
}

function getVatLabel(vatStatus: string) {
  if (vatStatus === 'kleinunternehmer') return 'Kleinunternehmer'
  if (vatStatus === 'regelbesteuerung_19') return 'Regelbest.'
  if (vatStatus === 'ermaessigt_7') return '7 % USt.'
  return 'USt. unklar'
}

function getDueDate(item: any) {
  return String(item?.dueDate || item?.due_date || '')
}

function formatDate(value: string) {
  if (!value) return 'ohne eingetragenes Datum'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('de-DE')
}

function daysUntil(value: string) {
  if (!value) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(value)
  if (Number.isNaN(due.getTime())) return null
  due.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function getPriorityWeight(value: unknown) {
  const priority = normalizeStatus(value)
  if (priority === 'existenz') return 0
  if (priority === 'hoch' || priority === 'wichtig') return 1
  if (priority === 'niedrig') return 3
  return 2
}

export function MorningBriefing({
  taxReserve = 0,
  financeScore = 0,
  availableAfterObligations,
}: MorningBriefingProps) {
  const {
    userName,
    userStatus,
    industry,
    vatStatus,
    summary,
    incomes = [],
    expenses = [],
    obligations = [],
  } = useFinance()

  const name = userName?.trim() || ''
  const greeting = getGreeting()
  const incomeTotal = number(summary?.totalIncomes ?? summary?.totalIncome)
  const expenseTotal = number(summary?.totalExpenses)
  const balance = number(summary?.balance ?? incomeTotal - expenseTotal)

  const openIncomes = incomes.filter((item: any) => {
    const status = normalizeStatus(item.status)
    return ['offen', 'pending', 'unbezahlt', 'ueberfaellig', 'überfällig', 'overdue'].includes(status)
  })

  const overdueIncomes = openIncomes.filter((item: any) => {
    const status = normalizeStatus(item.status)
    return ['ueberfaellig', 'überfällig', 'overdue'].includes(status)
  })

  const openIncomeAmount = openIncomes.reduce(
    (sum: number, item: any) => sum + number(item.amount),
    0,
  )

  const openObligations = obligations.filter((item: any) => {
    const status = normalizeStatus(item.status || 'offen')
    return !['bezahlt', 'paid', 'erledigt', 'completed'].includes(status)
  })

  const openObligationAmount = openObligations.reduce(
    (sum: number, item: any) => sum + number(item.amount),
    0,
  )

  const realisticAvailable =
    typeof availableAfterObligations === 'number'
      ? availableAfterObligations
      : balance - openObligationAmount

  const afterReserve = realisticAvailable - number(taxReserve)

  const obligationEntries = openObligations
    .map((item: any) => ({
      item,
      days: daysUntil(getDueDate(item)),
      priority: getPriorityWeight(item.priority),
    }))
    .filter(
      (entry): entry is { item: any; days: number; priority: number } =>
        entry.days !== null,
    )
    .sort((a, b) => (a.days !== b.days ? a.days - b.days : a.priority - b.priority))

  const obligationsWithoutDate = openObligations.filter(
    (item: any) => daysUntil(getDueDate(item)) === null,
  )
  const overdueObligations = obligationEntries.filter((entry) => entry.days < 0)
  const dueTodayObligations = obligationEntries.filter((entry) => entry.days === 0)
  const dueSoonObligations = obligationEntries.filter(
    (entry) => entry.days > 0 && entry.days <= 7,
  )

  const dataQuality = incomes.length + expenses.length + obligations.length

  let title = ''
  let message = ''
  let nextStep = ''
  let insight = ''

  if (overdueObligations.length > 0) {
    const next = overdueObligations[0].item
    title = '🚨 Eine Zahlung braucht zuerst deine Aufmerksamkeit'
    message = `${next.title || 'Eine Verpflichtung'} über ${money(number(next.amount))} war am ${formatDate(getDueDate(next))} fällig.`
    nextStep = 'Prüfe heute nur diesen einen Eintrag. Danach musst du nicht sofort alles Weitere lösen.'
    insight = `Nach allen derzeit offenen Verpflichtungen liegt der rechnerische Saldo bei ${money(realisticAvailable)}.`
  } else if (dueTodayObligations.length > 0) {
    const next = dueTodayObligations[0].item
    title = '🧾 Heute ist eine Sache wichtig'
    message = `${next.title || 'Eine Verpflichtung'} über ${money(number(next.amount))} wird heute fällig.`
    nextStep = 'Behalte diese Zahlung heute zuerst im Blick. Alles andere kann danach sortiert werden.'
    insight = `Nach allen offenen Verpflichtungen liegt der rechnerische Saldo bei ${money(realisticAvailable)}.`
  } else if (overdueIncomes.length > 0) {
    title = '⚠️ Ein Zahlungseingang braucht Aufmerksamkeit'
    message = `Du wartest auf ${overdueIncomes.length} überfällige Zahlung${overdueIncomes.length === 1 ? '' : 'en'}.`
    nextStep = 'Prüfe heute genau einen offenen Eingang und entscheide dann, ob ein freundliches Nachfassen sinnvoll ist.'
    insight = `Insgesamt sind aktuell ${money(openIncomeAmount)} als offene Einnahmen erfasst.`
  } else if (dueSoonObligations.length > 0) {
    const next = dueSoonObligations[0]
    const dueText = next.days === 1 ? 'morgen' : `in ${next.days} Tagen`
    title = '📅 Die nächste Zahlung ist bereits im Blick'
    message = `${next.item.title || 'Eine Verpflichtung'} über ${money(number(next.item.amount))} wird ${dueText} fällig.`
    nextStep = 'Du musst sie heute noch nicht erledigen. Es reicht, den Betrag rechtzeitig einzuplanen.'
    insight = `Nach allen offenen Verpflichtungen liegt der rechnerische Saldo bei ${money(realisticAvailable)}.`
  } else if (balance < 0 && openObligations.length === 0) {
    title = '🧭 Der aktuelle Mandanten-Saldo ist noch negativ'

    if (incomeTotal <= 0 && expenseTotal > 0) {
      message = `Für den ausgewählten Mandanten sind derzeit ${money(expenseTotal)} Ausgaben erfasst, aber noch keine Einnahmen.`
      nextStep = 'Mila behandelt das nicht als offene Schuld. Prüfe nur, ob Einnahmen fehlen oder ob die vorhandenen Einträge so beabsichtigt sind.'
    } else {
      message = `Die erfassten Ausgaben übersteigen die erfassten Einnahmen aktuell um ${money(Math.abs(balance))}.`
      nextStep = 'Prüfe zuerst, ob alle Einnahmen und Ausgaben vollständig erfasst sind. Mila erzeugt daraus keine zusätzliche Verpflichtung.'
    }

    insight = 'Diese Zahl ist nur der Saldo aus den aktuell erfassten Einnahmen und Ausgaben dieses Mandanten – keine Prognose und keine automatisch erkannte Schuld.'
  } else if (realisticAvailable < 0) {
    title = '🧭 Heute zuerst Stabilität schaffen'
    message = `Nach den derzeit offenen Verpflichtungen liegt der rechnerische Saldo bei ${money(realisticAvailable)}.`
    nextStep = 'Sortiere die offenen Einträge zuerst nach Fälligkeit und Wichtigkeit. Nicht alles muss gleichzeitig gelöst werden.'
    insight = 'Mila bewertet nur die aktuell eingetragenen Daten. Fehlende oder zukünftige Einnahmen sind darin noch nicht berücksichtigt.'
  } else if (openIncomes.length > 0) {
    title = '💰 Offene Einnahmen sind im Blick'
    message = `Du wartest noch auf ${openIncomes.length} Zahlung${openIncomes.length === 1 ? '' : 'en'} über insgesamt ${money(openIncomeAmount)}.`
    nextStep = 'Prüfe nur, ob bei einem Eingang bereits ein konkretes Zahlungsdatum hinterlegt ist.'
    insight = `Der aktuelle Saldo nach offenen Verpflichtungen liegt bei ${money(realisticAvailable)}.`
  } else if (dataQuality < 3) {
    title = '🌱 Mila lernt die Daten dieses Mandanten kennen'
    message = 'Die ersten Daten sind vorhanden. Für verlässliche Muster und Monatsvergleiche braucht Mila noch ein paar weitere echte Vorgänge.'
    nextStep = 'Erfasse als Nächstes einfach die nächste echte Einnahme, Ausgabe oder Unterlage.'
    insight = 'Schon wenige zusätzliche Vorgänge verbessern Sortierung, Vergleiche und Hinweise deutlich.'
  } else if (taxReserve > 0 && afterReserve >= 0) {
    title = '✨ Die finanzielle Basis wirkt aktuell ruhig'
    message = `Nach offenen Verpflichtungen und der rechnerischen Steuer-Rücklage bleiben derzeit ${money(afterReserve)}.`
    nextStep = 'Heute ist nichts überfällig oder unmittelbar fällig. Du kannst den Überblick so stehen lassen.'
    insight = financeScore > 0
      ? `Der Finanzscore liegt derzeit bei ${financeScore}/100.`
      : `Der aktuelle Überschuss liegt bei ${money(balance)}.`
  } else if (balance > 0) {
    title = '✨ Aktueller finanzieller Spielraum'
    message = `Der aktuelle Überschuss liegt bei ${money(balance)}. Nach offenen Verpflichtungen bleiben rechnerisch ${money(realisticAvailable)}.`
    nextStep = 'Heute besteht kein akuter Handlungsdruck. Behalte nur die nächsten Fälligkeiten im Blick.'
    insight = taxReserve > 0
      ? `Als rechnerische Steuer-Rücklage sind derzeit ${money(taxReserve)} eingeplant.`
      : 'Eine tatsächlich angesparte Notreserve ist aktuell nicht separat erfasst.'
  } else {
    title = '🌸 Gemeinsam schaffen wir Überblick'
    message = 'Aktuell lässt sich noch kein klarer finanzieller Spielraum erkennen.'
    nextStep = 'Erfasse als Nächstes eine echte Einnahme, Ausgabe oder Unterlage. Mila ordnet sie anschließend für dich ein.'
    insight = 'Du musst nicht alles auf einmal nachtragen. Ein Vorgang nach dem anderen reicht.'
  }

  if (
    obligationsWithoutDate.length > 0 &&
    overdueObligations.length === 0 &&
    dueTodayObligations.length === 0
  ) {
    insight = `${obligationsWithoutDate.length} offene Verpflichtung${obligationsWithoutDate.length === 1 ? ' hat' : 'en haben'} noch kein eingetragenes Fälligkeitsdatum.`
  }

  return (
    <section className="space-y-5 rounded-[2rem] bg-white p-6 shadow-sm">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.35em] text-purple-600">
          Heute für dich
        </p>

        <h1 className="mt-3 text-4xl font-black leading-tight text-slate-950">
          {greeting}{name ? `, ${name}` : ''} 🌸
        </h1>

        <p className="mt-3 text-sm font-bold text-slate-500">
          Status: {getProfileLabel(userStatus)}{industry ? ` (${industry})` : ''} · {getVatLabel(vatStatus)}
        </p>
      </div>

      <div className="rounded-3xl border border-purple-100 bg-gradient-to-br from-pink-50 via-white to-violet-50 p-5">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-purple-700">
          🌸 Mila sagt heute
        </p>

        <h2 className="mt-3 text-xl font-black text-slate-950">{title}</h2>

        <p className="mt-3 text-base font-semibold leading-relaxed text-slate-700">
          {message}
        </p>

        <div className="mt-4 rounded-2xl border border-white/80 bg-white/70 p-4">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-pink-600">
            Dein nächster Schritt
          </p>
          <p className="mt-2 text-sm font-bold leading-relaxed text-slate-700">
            {nextStep}
          </p>
        </div>

        <div className="mt-3 rounded-2xl bg-purple-100/60 p-4">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-purple-700">
            Mila Insight
          </p>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-700">
            {insight}
          </p>
        </div>
      </div>
    </section>
  )
}
