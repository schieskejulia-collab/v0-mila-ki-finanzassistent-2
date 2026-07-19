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
  return String(item.dueDate || item.due_date || '')
}

function daysUntil(value: string) {
  if (!value) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const due = new Date(value)

  if (Number.isNaN(due.getTime())) {
    return null
  }

  due.setHours(0, 0, 0, 0)

  return Math.round(
    (due.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24)
  )
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

  /*
   * In älteren Store-Versionen hieß das Feld totalIncome,
   * in neueren totalIncomes. Mila unterstützt deshalb beide.
   */
  const incomeTotal = number(
    summary?.totalIncomes ?? summary?.totalIncome
  )

  const expenseTotal = number(summary?.totalExpenses)

  const balance = number(
    summary?.balance ?? incomeTotal - expenseTotal
  )

  const openIncomes = incomes.filter((item: any) => {
    const status = String(item.status || '').toLowerCase()

    return (
      status === 'offen' ||
      status === 'ueberfaellig' ||
      status === 'überfällig'
    )
  })

  const overdueIncomes = incomes.filter((item: any) => {
    const status = String(item.status || '').toLowerCase()

    return (
      status === 'ueberfaellig' ||
      status === 'überfällig'
    )
  })

  const openObligations = obligations.filter((item: any) => {
    const status = String(item.status || 'offen').toLowerCase()

    return (
      status !== 'bezahlt' &&
      status !== 'erledigt'
    )
  })

  const openObligationAmount = openObligations.reduce(
    (sum: number, item: any) =>
      sum + number(item.amount),
    0
  )

  const realisticAvailable =
    typeof availableAfterObligations === 'number'
      ? availableAfterObligations
      : balance - openObligationAmount

  const obligationEntries = openObligations
    .map((item: any) => ({
      item,
      days: daysUntil(getDueDate(item)),
    }))
    .filter(
      (
        entry
      ): entry is {
        item: any
        days: number
      } => entry.days !== null
    )
    .sort((a, b) => a.days - b.days)

  const overdueObligations = obligationEntries.filter(
    (entry) => entry.days < 0
  )

  const dueTodayObligations = obligationEntries.filter(
    (entry) => entry.days === 0
  )

  const dueSoonObligations = obligationEntries.filter(
    (entry) =>
      entry.days > 0 &&
      entry.days <= 3
  )

  const afterReserve =
    realisticAvailable - number(taxReserve)

  const dataQuality =
    incomes.length +
    expenses.length +
    obligations.length

  let title = ''
  let message = ''

  if (overdueObligations.length > 0) {
    const next = overdueObligations[0].item

    title = '🚨 Eine Zahlung braucht zuerst deine Aufmerksamkeit'

    message = `${next.title || 'Eine Verpflichtung'} über ${money(
      number(next.amount)
    )} ist bereits überfällig. Schau sie dir zuerst an – danach ist für heute genug getan.`

  } else if (dueTodayObligations.length > 0) {
    const next = dueTodayObligations[0].item

    title = '🧾 Heute ist eine Sache wichtig'

    message = `${next.title || 'Eine Verpflichtung'} über ${money(
      number(next.amount)
    )} wird heute fällig. Nach allen offenen Verpflichtungen bleiben dir voraussichtlich ${money(
      realisticAvailable
    )}.`

  } else if (dueSoonObligations.length > 0) {
    const next = dueSoonObligations[0]
    const dueText =
      next.days === 1
        ? 'morgen'
        : `in ${next.days} Tagen`

    title = '📅 Die nächste Zahlung ist schon im Blick'

    message = `${next.item.title || 'Eine Verpflichtung'} über ${money(
      number(next.item.amount)
    )} wird ${dueText} fällig. Aktuell bleiben nach offenen Verpflichtungen ${money(
      realisticAvailable
    )} verfügbar.`

  } else if (overdueIncomes.length > 0) {
    title = '⚠️ Offene Einnahmen zuerst klären'

    message = `Du wartest auf ${overdueIncomes.length} überfällige Zahlung${
      overdueIncomes.length === 1 ? '' : 'en'
    }. Nimm dir heute nur eine davon vor und prüfe, ob du nachfassen solltest.`

  } else if (openIncomes.length > 0) {
    title = '💰 Zahlungseingänge im Blick behalten'

    message = `Du wartest noch auf ${openIncomes.length} Zahlung${
      openIncomes.length === 1 ? '' : 'en'
    }. Mila behält die offenen Eingänge für dich im Blick.`

  } else if (realisticAvailable < 0) {
    title = '🧭 Heute zuerst Stabilität schaffen'

    message = `Nach deinen offenen Verpflichtungen fehlen aktuell ${money(
      Math.abs(realisticAvailable)
    )}. Sortiere zuerst nach Frist und Wichtigkeit – nicht alles gleichzeitig.`

  } else if (dataQuality < 3) {
    title = '🌱 Mila lernt dich kennen'

    message =
      'Die ersten Daten sind da. Mit jeder weiteren Buchung erkennt Mila deine Gewohnheiten, regelmäßigen Kosten und sinnvolle nächste Schritte besser.'

  } else if (taxReserve > 0 && afterReserve >= 0) {
    title = '✨ Deine finanzielle Basis wirkt stabil'

    message = `Nach offenen Verpflichtungen und deiner empfohlenen Steuer-Rücklage bleiben voraussichtlich ${money(
      afterReserve
    )} frei verfügbar. Dein Finanzscore liegt aktuell bei ${financeScore}/100.`

  } else if (balance > 0) {
    title = '✨ Dein finanzieller Spielraum'

    message = `Dein aktueller Überschuss liegt bei ${money(
      balance
    )}. Nach offenen Verpflichtungen bleiben davon voraussichtlich ${money(
      realisticAvailable
    )}.`

  } else {
    title = '🌸 Gemeinsam schaffen wir Überblick'

    message =
      'Trage deine ersten Einnahmen, Ausgaben oder Verpflichtungen ein. Mila zeigt dir danach Schritt für Schritt, was gerade wichtig ist.'
  }
const milaTodayMessage = (() => {
  if (overdueObligations.length > 0) {
    return 'Heute zählt nur der nächste Schritt: Prüfe zuerst die überfällige Zahlung. Danach darfst du den Rest für heute liegen lassen.'
  }

  if (dueTodayObligations.length > 0) {
    return `Heute wird eine Verpflichtung fällig. Wenn du sie erledigst, bleiben dir danach voraussichtlich ${money(
      realisticAvailable
    )} verfügbar.`
  }

  if (dueSoonObligations.length > 0) {
    return `Die nächste Zahlung ist bereits eingeplant. Aktuell bleiben dir nach offenen Verpflichtungen ${money(
      realisticAvailable
    )} verfügbar.`
  }

  if (overdueIncomes.length > 0) {
    return 'Heute wäre ein guter Zeitpunkt, genau einen überfälligen Zahlungseingang zu prüfen. Einer reicht.'
  }

  if (openIncomes.length > 0) {
    return 'Deine offenen Einnahmen sind im Blick. Prüfe heute nur, ob bei einer Zahlung ein freundliches Nachfassen sinnvoll ist.'
  }

  if (realisticAvailable < 0) {
    return 'Dein Spielraum ist gerade knapp. Heute geht es nicht um Perfektion, sondern darum, Zahlungen nach Frist und Wichtigkeit zu sortieren.'
  }

  if (taxReserve > 0 && afterReserve >= 0) {
    return `Alle dringenden Verpflichtungen sind erledigt. Wenn du ${money(
      taxReserve
    )} als Rücklage einplanst, bleiben dir noch ${money(
      afterReserve
    )} frei verfügbar.`
  }

  if (balance > 0) {
    return `Deine finanzielle Lage wirkt heute ruhig. Von deinem aktuellen Überschuss bleiben nach offenen Verpflichtungen ${money(
      realisticAvailable
    )}.`
  }

  return 'Heute musst du nicht alles lösen. Jede neue Buchung hilft Mila, deine finanzielle Lage genauer einzuordnen.'
})()
  return (
   return (
  <section className="space-y-5 rounded-[2rem] bg-white p-6 shadow-sm">
    <div>
      <p className="text-xs font-black uppercase tracking-[0.35em] text-purple-600">
        Heute für dich
      </p>

      <h1 className="mt-3 text-4xl font-black leading-tight text-slate-950">
        {greeting}
        {name ? `, ${name}` : ''} 🌸
      </h1>

      <p className="mt-3 text-sm font-bold text-slate-500">
        Status: {getProfileLabel(userStatus)}
        {industry ? ` (${industry})` : ''} ·{' '}
        {getVatLabel(vatStatus)}
      </p>
    </div>

    <div className="rounded-3xl border border-purple-100 bg-gradient-to-br from-pink-50 via-white to-violet-50 p-5">
      <p className="text-xs font-black uppercase tracking-[0.25em] text-purple-700">
        🌸 Mila sagt heute
      </p>

      <h2 className="mt-3 text-xl font-black text-slate-950">
        {title}
      </h2>

      <p className="mt-3 text-base font-semibold leading-relaxed text-slate-700">
        {message}
      </p>

      <div className="mt-4 rounded-2xl border border-white/80 bg-white/70 p-4">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-pink-600">
          Dein nächster Schritt
        </p>

        <p className="mt-2 text-sm font-bold leading-relaxed text-slate-700">
          {milaTodayMessage}
        </p>
      </div>
    </div>
  </section>
)
}