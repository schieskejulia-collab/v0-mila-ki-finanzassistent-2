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

  if (overdueIncomes.length > 0) {
    title = 'Zahlungseingang prüfen'
    message = `Du hast ${overdueIncomes.length} überfällige Einnahme(n). Mila würde diese zuerst prüfen, bevor du neue Ausgaben planst.`
  } else if (openIncomes.length > 0) {
    title = 'Offene Einnahmen im Blick behalten'
    message = `Du hast ${openIncomes.length} offene Einnahme(n). Dein Fokus sollte heute darauf liegen, Zahlungseingänge und Fristen ruhig nachzuhalten.`
  } else if (balance < 0) {
    title = 'Liquidität zuerst stabilisieren'
    message = `Dein aktueller Stand liegt bei ${money(balance)}. Mila würde heute keine neuen Verpflichtungen planen, sondern Einnahmen, Fristen und notwendige Ausgaben sortieren.`
  } else if (isBusiness && needsVatAttention && incomeTotal > 0) {
    title = 'Rücklagen bewusst im Blick behalten'
    message = `Du hast ${money(incomeTotal)} Einnahmen und ${money(expenseTotal)} Ausgaben erfasst. Bei deinem Profil ist Rücklage wichtig — nicht aus Angst, sondern damit dich später nichts überrascht.`
  } else if (softwareExpenses.length > 0) {
    title = 'Digitale Kosten gesammelt prüfen'
    message = `Mila erkennt digitale Kosten oder Tools. Diese können beruflich relevant sein, sollten aber gesammelt geprüft werden statt einzeln Stress zu machen.`
  } else if (balance > 0) {
    title = 'Solider Spielraum vorhanden'
    message = `Du hast aktuell ${money(balance)} rechnerischen Spielraum. Ein guter Moment, um Rücklagen, nächste Zahlungen und neue Buchungen sauber zu sortieren.`
  } else {
    title = 'Heute ruhig sortieren'
    message = 'Noch sind wenig Daten vorhanden. Mila kann besser helfen, sobald Einnahmen, Ausgaben, Fristen und Profil sauber gepflegt sind.'
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