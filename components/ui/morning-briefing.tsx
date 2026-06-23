'use client'

import { useFinance } from '../../lib/store'

function formatEuro(value: number) {

  return value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })

}

function getGreeting() {

  const hour = new Date().getHours()

  if (hour < 11) return 'Guten Morgen'

  if (hour < 17) return 'Guten Tag'

  return 'Guten Abend'

}

function getStatus(value: any) {

  return String(value || '').toLowerCase()

}

export function MorningBriefing() {

  const { summary, expenses, incomes, userName } = useFinance()

  const openIncomes = incomes.filter((i) => getStatus(i.status) === 'offen')

  const overdueIncomes = incomes.filter((i) => getStatus(i.status) === 'ueberfaellig')

  const openIncomeTotal = openIncomes.reduce((sum, i) => sum + Number(i.amount || 0), 0)

  const overdueTotal = overdueIncomes.reduce((sum, i) => sum + Number(i.amount || 0), 0)

  const balance = Number(summary.balance || 0)

  const taxReserve = balance > 0 ? balance * 0.3 : 0

  const mainTask =

    overdueIncomes.length > 0

      ? `Prüfe zuerst ${overdueIncomes.length} überfällige Einnahme(n) über ${formatEuro(overdueTotal)}.`

      : openIncomes.length > 0

      ? `Prüfe heute ${openIncomes.length} offene Einnahme(n) über ${formatEuro(openIncomeTotal)}.`

      : expenses.length === 0 && incomes.length === 0

      ? 'Starte mit deiner ersten Buchung, damit Mila dich besser begleiten kann.'

      : 'Heute reicht ein kurzer Blick auf Rücklagen und neue Buchungen.'

  const anchorText =

    balance < 0

      ? 'Die Zahlen sind gerade angespannt. Das ist ein Zustand, keine Endstation.'

      : openIncomes.length > 0

      ? 'Geld verdienen ist wichtig. Bezahlt werden auch. Wir gehen das ruhig Schritt für Schritt an.'

      : 'Du musst nicht alles auf einmal lösen. Mila zeigt dir den nächsten sinnvollen Schritt.'

  return (

    <section className="rounded-[2rem] bg-white p-5 shadow-sm">

      <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-500">

        Mila Morning Briefing

      </p>

      <h2 className="mt-3 text-2xl font-black text-slate-950">

        {getGreeting()}, {userName || 'Julia'} 🌸

      </h2>

      <div className="mt-4 rounded-[2rem] bg-violet-600 p-5 text-white">

        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">

          Heute wichtig

        </p>

        <p className="mt-2 text-lg font-black leading-snug">{mainTask}</p>

      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">

        <div className="rounded-2xl bg-emerald-50 p-4">

          <p className="text-[10px] font-black uppercase text-emerald-700">

            Überschuss

          </p>

          <p className="mt-1 text-xl font-black text-emerald-800">

            {formatEuro(balance)}

          </p>

        </div>

        <div className="rounded-2xl bg-amber-50 p-4">

          <p className="text-[10px] font-black uppercase text-amber-700">

            Rücklage

          </p>

          <p className="mt-1 text-xl font-black text-amber-800">

            {formatEuro(taxReserve)}

          </p>

        </div>

        <div className="rounded-2xl bg-violet-50 p-4">

          <p className="text-[10px] font-black uppercase text-violet-700">

            Offen

          </p>

          <p className="mt-1 text-xl font-black text-violet-800">

            {openIncomes.length}

          </p>

          <p className="mt-1 text-xs font-bold text-slate-600">

            {formatEuro(openIncomeTotal)}

          </p>

        </div>

        <div className="rounded-2xl bg-rose-50 p-4">

          <p className="text-[10px] font-black uppercase text-rose-700">

            Überfällig

          </p>

          <p className="mt-1 text-xl font-black text-rose-800">

            {overdueIncomes.length}

          </p>

          <p className="mt-1 text-xs font-bold text-slate-600">

            {formatEuro(overdueTotal)}

          </p>

        </div>

      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 p-4">

        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">

          🪬 Mila-Anker

        </p>

        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-700">

          {anchorText}

        </p>

      </div>

      <p className="mt-4 text-xs leading-relaxed text-slate-500">

        Mila gibt dir Orientierung, erinnert dich an Wichtiges und hilft dir, den nächsten Schritt zu erkennen. Keine Steuerberatung.

      </p>

    </section>

  )

}