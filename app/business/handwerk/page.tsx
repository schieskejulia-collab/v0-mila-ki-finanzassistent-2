'use client'

import { useMemo, useState } from 'react'
import { calculateAtlasEmployeeCost } from '@/lib/business/atlas-costs'
import { supabase } from '@/lib/supabase'

const euro = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
})

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-base text-slate-950 outline-none transition focus:border-violet-600 focus:ring-2 focus:ring-violet-100'

export default function HandwerkAtlasPage() {
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [monthlyGross, setMonthlyGross] = useState('')
  const [employerCostPercent, setEmployerCostPercent] = useState('')
  const [vacationDays, setVacationDays] = useState('')
  const [sickDays, setSickDays] = useState('')
  const [badWeatherDays, setBadWeatherDays] = useState('0')
  const [productiveHours, setProductiveHours] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

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

  const hasCalculation =
    Number(monthlyGross) > 0 && Number(productiveHours) > 0

  async function handleSave() {
    setMessage('')

    if (!name.trim()) {
      setMessage('Bitte einen Mitarbeiternamen eingeben.')
      return
    }

    if (
      !monthlyGross ||
      !employerCostPercent ||
      !vacationDays ||
      !sickDays ||
      !productiveHours
    ) {
      setMessage('Bitte alle Kostenwerte ausfuellen.')
      return
    }

    setSaving(true)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setMessage('Bitte zuerst bei Mila anmelden.')
      setSaving(false)
      return
    }

    const { error } = await supabase
      .from('atlas_employees')
      .insert({
        user_id: user.id,
        name: name.trim(),
        role: role.trim() || null,
        monthly_gross: Number(monthlyGross),
        employer_cost_percent: Number(employerCostPercent),
        annual_vacation_days: Number(vacationDays),
        annual_sick_days: Number(sickDays),
        annual_bad_weather_days: Number(badWeatherDays) || 0,
        annual_productive_hours: Number(productiveHours),
      })

    if (error) {
      console.error('Atlas-Mitarbeiter konnte nicht gespeichert werden', error)
      setMessage('Speichern war nicht moeglich. Bitte spaeter erneut versuchen.')
    } else {
      setMessage(`${name.trim()} wurde gespeichert.`)
    }

    setSaving(false)
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-36 pt-6 text-slate-950">
      <div className="mx-auto max-w-xl">
        <header className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">
              Atlas / Handwerk
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight">
              Mitarbeiterkosten
            </h1>
          </div>
          <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">
            Kostencheck
          </span>
        </header>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          Ermittele die echten Kosten pro Monat und pro produktiver Stunde.
        </p>

        <section className="mt-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="font-black">Mitarbeiter</h2>
              <p className="mt-1 text-xs text-slate-500">
                Werte eingeben und anschliessend speichern.
              </p>
            </div>
            <span className="text-xl">ð§°</span>
          </div>

          <div className="mt-4 space-y-3">
            <label className="block text-sm font-bold">
              Name
              <input
                className={inputClass}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="z. B. Max Mustermann"
              />
            </label>

            <label className="block text-sm font-bold">
              Rolle oder Qualifikation
              <input
                className={inputClass}
                value={role}
                onChange={(event) => setRole(event.target.value)}
                placeholder="z. B. Geselle"
              />
            </label>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <h3 className="text-sm font-black text-slate-700">
              Kosten und Kapazitaet
            </h3>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="text-sm font-bold">
                Monatsbrutto
                <input
                  className={inputClass}
                  inputMode="decimal"
                  type="number"
                  value={monthlyGross}
                  onChange={(event) => setMonthlyGross(event.target.value)}
                  placeholder="3200"
                />
              </label>

              <label className="text-sm font-bold">
                Arbeitgeberkosten %
                <input
                  className={inputClass}
                  inputMode="decimal"
                  type="number"
                  value={employerCostPercent}
                  onChange={(event) =>
                    setEmployerCostPercent(event.target.value)
                  }
                  placeholder="22"
                />
              </label>

              <label className="text-sm font-bold">
                Urlaubstage
                <input
                  className={inputClass}
                  inputMode="numeric"
                  type="number"
                  value={vacationDays}
                  onChange={(event) => setVacationDays(event.target.value)}
                  placeholder="30"
                />
              </label>

              <label className="text-sm font-bold">
                Krankheitstage
                <input
                  className={inputClass}
                  inputMode="numeric"
                  type="number"
                  value={sickDays}
                  onChange={(event) => setSickDays(event.target.value)}
                  placeholder="8"
                />
              </label>

              <label className="text-sm font-bold">
                Schlechtwettertage
                <input
                  className={inputClass}
                  inputMode="numeric"
                  type="number"
                  value={badWeatherDays}
                  onChange={(event) => setBadWeatherDays(event.target.value)}
                  placeholder="0"
                />
              </label>

              <label className="text-sm font-bold">
                Produktive Stunden
                <input
                  className={inputClass}
                  inputMode="numeric"
                  type="number"
                  value={productiveHours}
                  onChange={(event) => setProductiveHours(event.target.value)}
                  placeholder="1450"
                />
              </label>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full rounded-lg bg-violet-600 px-4 py-3 text-sm font-black text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Speichert...' : 'Mitarbeiter speichern'}
            </button>

            {message ? (
              <p className="text-center text-sm font-bold text-slate-600">
                {message}
              </p>
            ) : null}
          </div>
        </section>

        <section className="mt-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-600">
                Ergebnis
              </p>
              <h2 className="mt-1 text-lg font-black">
                Kostenuebersicht
              </h2>
            </div>
            <span className="text-xs font-bold text-slate-500">
              {name || 'Noch kein Mitarbeiter'}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-violet-600 p-4 text-white">
              <p className="text-xs font-bold text-violet-100">Pro Monat</p>
              <p className="mt-2 text-2xl font-black">
                {hasCalculation ? euro.format(result.monthlyTotalCost) : '-'}
              </p>
            </div>

            <div className="rounded-lg bg-slate-100 p-4">
              <p className="text-xs font-bold text-slate-500">
                Pro produktiver Stunde
              </p>
              <p className="mt-2 text-2xl font-black">
                {hasCalculation ? euro.format(result.productiveHourlyCost) : '-'}
              </p>
            </div>
          </div>

          <div className="mt-4 divide-y divide-slate-100 border-t border-slate-100 text-sm">
            <div className="flex justify-between gap-4 py-3">
              <span>Bruttogehalt</span>
              <strong>{hasCalculation ? euro.format(result.monthlyGross) : '-'}</strong>
            </div>

            <div className="flex justify-between gap-4 py-3">
              <span>Arbeitgeberkosten</span>
              <strong>
                {hasCalculation ? euro.format(result.monthlyEmployerCosts) : '-'}
              </strong>
            </div>

            <div className="flex justify-between gap-4 py-3">
              <span>Ausfallreserve</span>
              <strong>
                {hasCalculation ? euro.format(result.monthlyAbsenceReserve) : '-'}
              </strong>
            </div>
          </div>
        </section>

        <p className="mt-4 text-xs leading-5 text-slate-500">
          Planungshilfe fuer den Betrieb. Ersetzt keine Lohnabrechnung oder
          steuerliche Beratung.
        </p>
      </div>
    </main>
  )
}