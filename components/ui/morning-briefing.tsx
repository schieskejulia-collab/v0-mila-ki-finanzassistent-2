'use client'

import { CalendarDays, CheckCircle2, Heart } from 'lucide-react'
import { useFinance } from '@/lib/store'

function money(value: unknown) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '0,00 €'

  return amount.toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  })
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 11) return 'Guten Morgen'
  if (hour < 18) return 'Hallo'
  return 'Guten Abend'
}

function dueDate(item: any) {
  return String(item?.dueDate || item?.due_date || item?.paymentDate || item?.payment_date || '')
}

function dayDistance(value: string) {
  if (!value) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  date.setHours(0, 0, 0, 0)

  return Math.round((date.getTime() - today.getTime()) / 86_400_000)
}

function dateLabel(value: string) {
  const distance = dayDistance(value)
  if (distance === null) return ''
  if (distance === 0) return 'heute'
  if (distance === 1) return 'morgen'
  if (distance === -1) return 'gestern'
  if (distance > 1 && distance <= 7) return `in ${distance} Tagen`

  return new Date(value).toLocaleDateString('de-DE')
}

export function MorningBriefing() {
  const { userName, incomes = [], obligations = [], documents = [] } = useFinance()
  const name = String(userName || '').trim().split(/\s+/)[0]

  const openObligations = obligations
    .filter((item: any) => !['bezahlt', 'erledigt', 'paid'].includes(String(item?.status || '').toLowerCase()))
    .map((item: any) => ({ item, days: dayDistance(dueDate(item)) }))
    .filter((entry: any) => entry.days !== null)
    .sort((a: any, b: any) => a.days - b.days)

  const nextIncome = incomes
    .map((item: any) => ({ item, days: dayDistance(dueDate(item)) }))
    .filter((entry: any) => entry.days !== null && entry.days >= 0)
    .sort((a: any, b: any) => a.days - b.days)[0]

  const urgent = openObligations.find((entry: any) => entry.days <= 0)
  const comingUp = openObligations.find((entry: any) => entry.days > 0 && entry.days <= 7)

  let title = 'Heute musst du nichts erledigen.'
  let message = 'Deine nächsten Einträge sind im Blick. Du darfst den Kopf für andere Dinge frei haben.'
  let tone: 'calm' | 'attention' | 'soon' = 'calm'

  if (urgent) {
    title = 'Eine Sache braucht deine Aufmerksamkeit.'
    message = `${urgent.item?.title || 'Eine Zahlung'} über ${money(urgent.item?.amount)} war ${dateLabel(dueDate(urgent.item))} fällig.`
    tone = 'attention'
  } else if (comingUp) {
    title = 'Eine Sache kommt bald auf dich zu.'
    message = `${comingUp.item?.title || 'Eine Zahlung'} über ${money(comingUp.item?.amount)} ist ${dateLabel(dueDate(comingUp.item))} fällig. Heute reicht es, das zu wissen.`
    tone = 'soon'
  } else if (incomes.length + obligations.length + documents.length === 0) {
    title = 'Wir fangen ganz in Ruhe an.'
    message = 'Trag zuerst nur das ein, was dir gerade am meisten im Kopf herumgeht. Den Rest sortieren wir danach.'
  }

  return (
    <section>
      <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-600">Dein Morning Briefing</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
        {getGreeting()}{name ? `, ${name}` : ''} 🌸
      </h1>
      <p className="mt-2 max-w-lg text-sm font-semibold leading-6 text-slate-500">
        Du musst nicht alles im Kopf behalten. Mila zeigt dir, was heute wichtig ist.
      </p>

      <div className={`mt-5 rounded-[1.8rem] border p-5 shadow-sm ${tone === 'attention' ? 'border-rose-100 bg-rose-50/80' : tone === 'soon' ? 'border-amber-100 bg-amber-50/80' : 'border-emerald-100 bg-emerald-50/70'}`}>
        <div className="flex items-start gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${tone === 'attention' ? 'bg-rose-100 text-rose-600' : tone === 'soon' ? 'bg-amber-100 text-amber-700' : 'bg-white text-emerald-600'}`}>
            {tone === 'calm' ? <CheckCircle2 className="h-5 w-5" /> : <Heart className="h-5 w-5" />}
          </span>
          <div>
            <h2 className="text-lg font-black text-slate-950">{title}</h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{message}</p>
          </div>
        </div>
      </div>

      {nextIncome && (
        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <CalendarDays className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-black text-violet-700">Kommt als Nächstes</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-600">
              {nextIncome.item?.title || nextIncome.item?.source || 'Eine Zahlung'} · {money(nextIncome.item?.amount)} · {dateLabel(dueDate(nextIncome.item))}
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
