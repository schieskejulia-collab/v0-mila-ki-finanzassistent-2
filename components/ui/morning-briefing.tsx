'use client'

import { useFinance } from '@/lib/store'

function money(value: number) {
  return value.toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  })
}

function number(value: any) {
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
  if (vatStatus === 'ermaessigt_7') return '7% USt.'
  return 'USt. unklar'
}

export function MorningBriefing() {
  const {
    userName,
    userStatus,
    industry,
    vatStatus,
    summary,
    incomes,
    expenses,
  } = useFinance()

  const name = userName?.trim() || ''
  const greeting = getGreeting()

  const incomeTotal = number(summary?.totalIncome)
  const expenseTotal = number(summary?.totalExpenses)
  const balance = number(summary?.balance)

  const openIncomes = incomes.filter((item: any) => {
    const status = String(item.status || '').toLowerCase()
    return status === 'offen' || status === 'ueberfaellig' || status === 'überfällig'
  })

  const overdueIncomes = incomes.filter((item: any) => {
    const status = String(item.status || '').toLowerCase()
    return status === 'ueberfaellig' || status === 'überfällig'
  })

  const softwareExpenses = expenses.filter((item: any) => {
    const text = `${item.title || ''} ${item.vendor || ''} ${item.category || ''}`.toLowerCase()
    return (
      text.includes('software') ||
      text.includes('ki') ||
      text.includes('chatgpt') ||
      text.includes('hosting') ||
      text.includes('cloud') ||
      text.includes('abo')
    )
  })

  const isBusiness =
    userStatus === 'freiberufler' ||
    userStatus === 'kleinunternehmer' ||
    userStatus === 'selbststaendig_gewerbe'

  const needsVatAttention =
    vatStatus === 'regelbesteuerung_19' || vatStatus === 'ermaessigt_7'

  let title = ''
let message = ''

const profit = incomeTotal - expenseTotal

const dataQuality =
  incomes.length + expenses.length

const reserveSuggestion =
  isBusiness && needsVatAttention
    ? incomeTotal * 0.25
    : isBusiness
    ? incomeTotal * 0.15
    : 0


if (overdueIncomes.length > 0) {
  title = 'Zuerst offene Zahlungen sichern'
  message = `Du hast ${overdueIncomes.length} überfällige Zahlung(en). Mila würde heute zuerst Eingänge, Fristen und deine Planung sortieren.`

} else if (openIncomes.length > 0) {
  title = 'Einnahmen im Blick behalten'
  message = `Du wartest noch auf ${openIncomes.length} Zahlung(en). Dein Geld ist geplant — Mila hilft dir nur, den Überblick zu behalten.`

} else if (balance < 0) {
  title = 'Heute Stabilität schaffen'
  message = `Dein Stand liegt bei ${money(balance)}. Mila würde zuerst feste Kosten, offene Beträge und mögliche Spielräume ansehen.`

} else if (dataQuality < 3) {
  title = '🌱 Mila lernt dich kennen'
  message = 'Die ersten Daten sind da. Nach weiteren Buchungen erkennt Mila Gewohnheiten, wiederkehrende Kosten und bessere Empfehlungen.'

} else if (isBusiness && profit > 0) {
  title = 'Dein Geschäft wirkt stabil'
  message = `Du hast ${money(profit)} Überschuss. Mila würde davon etwa ${money(
    reserveSuggestion
  )} als Orientierung für Rücklagen einplanen.`

} else if (softwareExpenses.length > 0) {
  title = '💻 Digitale Tools im Blick'
message = `Mila hat ${softwareExpenses.length} digitale Ausgabe(n) erkannt. Nicht jede Ausgabe ist ein Kostenpunkt – viele Tools sparen Zeit oder helfen dir bei deiner Arbeit.`
} else if (balance > 0) {
  title = '🌸 Gemeinsam schaffen wir Überblick'
  message = `Dein aktueller Spielraum liegt bei ${money(balance)}. Mila erkennt mit jeder Buchung besser deine Gewohnheiten, wiederkehrende Kosten und sinnvolle nächste Schritte.`

} else {
  title = 'Mila baut dein Finanzbild auf'
  message =
    'Trage weiter Einnahmen und Ausgaben ein. Mila erkennt mit der Zeit Muster und zeigt dir die wichtigsten nächsten Schritte.'
}

  return (
    <section className="rounded-[2rem] bg-white p-6 shadow-sm space-y-5">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.35em] text-purple-600">
          Heute für dich
        </p>

        <h1 className="mt-3 text-4xl font-black leading-tight text-slate-950">
          {greeting}
          {name ? `, ${name}` : ''} 🌸
        </h1>

        <p className="mt-2 text-sm font-bold text-slate-500">
          Status: {getProfileLabel(userStatus)}
          {industry ? ` (${industry})` : ''} · {getVatLabel(vatStatus)}
        </p>
      </div>

      <div className="rounded-3xl border border-purple-100 bg-purple-50 p-5">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-purple-700">
          🪬 Heute wichtig
        </p>

        <h2 className="mt-3 text-xl font-black text-slate-950">
          {title}
        </h2>

        <p className="mt-3 text-base font-semibold leading-relaxed text-slate-600">
          {message}
        </p>
      </div>
    </section>
  )
}