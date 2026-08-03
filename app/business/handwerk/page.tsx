'use client'

import { useMemo, useState } from 'react'
import { calculateAtlasEmployeeCost } from '@/lib/business/atlas-costs'

const euro = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
})

export default function HandwerkAtlasPage() {
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [monthlyGross, setMonthlyGross] = useState('3200')
  const [employerCostPercent, setEmployerCostPercent] = useState('22')
  const [vacationDays, setVacationDays] = useState('30')
  const [sickDays, setSickDays] = useState('8')
  const [badWeatherDays, setBadWeatherDays] = useState('0')
  const [productiveHours, setProductiveHours] = useState('1450')

  const result = useMemo(
    () =>
      calculateAtlasEmployeeCost({
        monthlyGross: Number(monthlyGross),
        employerCostPercent: Number(employerCostPercent),
        annualVacationDays: Number(vacationDays),
        annualSickDays: Number(sickDays),
        annualBadWeatherDays: Number(badWeatherDays),
        annualProductiveHours: Number(productiveHours),
      }),
    [
      monthlyGross,
      employerCostPercent,
      vacationDays,
      sickDays,
      badWeatherDays,
      productiveHours,
    ]
  )

  const fieldClass =
    'mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-violet-500'

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-28 pt-8 text-slate-950">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-violet-600">
          Atlas / Handwerk
        </p>

        <h1 className="mt-2 text-3xl font-black tracking-tight">
          Echte Mitarbeiterkosten sichtbar machen
        </h1>

        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
          Atlas rechnet nicht nur das Bruttogehalt, sondern auch
          Arbeitgeberkosten und planbare Ausfallzeiten in die produktive
          Stunde ein.
        </p>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black">
            Mitarbeiter anlegen
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-bold">
              Name
              <input
                className={fieldClass}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="z. B. Max Mustermann"
              />
            </label>

            <label className="text-sm font-bold">
              Rolle
              <input
                className={fieldClass}
                value={role}
                onChange={(event) => setRole(event.target.value)}
                placeholder="z. B. Geselle"
              />
            </label>

            <label className="text-sm font-bold">
              Monatsbrutto in Euro
              <input
                className={fieldClass}
                inputMode="decimal"
                type="number"
                value={monthlyGross}
                onChange={(event) =>
                  setMonthlyGross(event.target.value)
                }
              />
            </label>

            <label className="text-sm font-bold">
              Arbeitgeberkosten in Prozent
              <input
                className={fieldClass}
                inputMode="decimal"
                type="number"
                value={employerCostPercent}
                onChange={(event) =>
                  setEmployerCostPercent(event.target.value)
                }
              />
            </label>

            <label className="text-sm font-bold">
              Urlaubstage pro Jahr
              <input
                className={fieldClass}
                inputMode="numeric"
                type="number"
                value={vacationDays}
                onChange={(event) =>
                  setVacationDays(event.target.value)
                }
              />
            </label>

            <label className="text-sm font-bold">
              Krankheitstage als Reserve
              <input
                className={fieldClass}
                inputMode="numeric"
                type="number"
                value={sickDays}
                onChange={(event) =>
                  setSickDays(event.target.value)
                }
              />
            </label>

            <label className="text-sm font-bold">
              Schlechtwettertage als Reserve
              <input
                className={fieldClass}
                inputMode="numeric"
                type="number"
                value={badWeatherDays}
                onChange={(event) =>
                  setBadWeatherDays(event.target.value)
                }
              />
            </label>

            <label className="text-sm font-bold">
              Produktive Stunden pro Jahr
              <input
                className={fieldClass}
                inputMode="numeric"
                type="number"
                value={productiveHours}
                onChange={(event) =>
                  setProductiveHours(event.target.value)
                }
              />
            </label>
          </div>
        </section>

        <section className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-3xl bg-violet-600 p-5 text-white sm:col-span-2">
            <p className="text-sm font-bold text-violet-100">
              Gesamtkosten pro Monat
            </p>

            <p className="mt-2 text-3xl font-black">
              {euro.format(result.monthlyTotalCost)}
            </p>

            <p className="mt-2 text-sm text-violet-100">
              {name || 'Mitarbeiter'}
              {role ? ` / ${role}` : ''}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-bold text-slate-500">
              Produktive Stunde
            </p>

            <p className="mt-2 text-2xl font-black text-slate-950">
              {euro.format(result.productiveHourlyCost)}
            </p>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-black">
            Aufschlüsselung
          </h2>

          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span>Bruttogehalt</span>
              <strong>{euro.format(result.monthlyGross)}</strong>
            </div>

            <div className="flex justify-between gap-4">
              <span>Arbeitgeberkosten</span>
              <strong>
                {euro.format(result.monthlyEmployerCosts)}
              </strong>
            </div>

            <div className="flex justify-between gap-4">
              <span>Urlaub, Krankheit, Wetter</span>
              <strong>
                {euro.format(result.monthlyAbsenceReserve)}
              </strong>
            </div>

            <div className="flex justify-between gap-4 border-t border-slate-200 pt-3 font-black">
              <span>Atlas-Gesamtkosten</span>
              <strong>
                {euro.format(result.monthlyTotalCost)}
              </strong>
            </div>
          </div>
        </section>

        <p className="mt-5 text-xs leading-5 text-slate-500">
          Hinweis: Die Werte sind eine betriebliche Planungshilfe und
          ersetzen keine Lohnabrechnung oder steuerliche Beratung.
        </p>
      </div>
    </main>
  )
}