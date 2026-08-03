'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type AtlasJob = {
  id: string
  title: string
  customer_name: string | null
  status: string
  estimated_hours: number
  material_cost: number
  travel_cost: number
  offer_total: number
  created_at: string
}

const euro = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
})

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-base text-slate-950 outline-none transition focus:border-violet-600 focus:ring-2 focus:ring-violet-100'

export default function HandwerkAuftraegePage() {
  const [title, setTitle] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [estimatedHours, setEstimatedHours] = useState('')
  const [hourlyRate, setHourlyRate] = useState('')
  const [materialCost, setMaterialCost] = useState('')
  const [travelCost, setTravelCost] = useState('')
  const [riskPercent, setRiskPercent] = useState('10')
  const [status, setStatus] = useState('angebot')
  const [jobs, setJobs] = useState<AtlasJob[]>([])
  const [loadingJobs, setLoadingJobs] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const loadJobs = useCallback(async () => {
    setLoadingJobs(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setJobs([])
      setLoadingJobs(false)
      return
    }

    const { data, error } = await supabase
      .from('atlas_jobs')
      .select(
        'id, title, customer_name, status, estimated_hours, material_cost, travel_cost, offer_total, created_at'
      )
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Atlas-Auftraege konnten nicht geladen werden', error)
      setJobs([])
    } else {
      setJobs((data || []) as AtlasJob[])
    }

    setLoadingJobs(false)
  }, [])

  useEffect(() => {
    void loadJobs()
  }, [loadJobs])

  const calculation = useMemo(() => {
    const hours = Math.max(0, Number(estimatedHours) || 0)
    const rate = Math.max(0, Number(hourlyRate) || 0)
    const materials = Math.max(0, Number(materialCost) || 0)
    const travel = Math.max(0, Number(travelCost) || 0)
    const risk = Math.max(0, Number(riskPercent) || 0)
    const labor = hours * rate
    const subtotal = labor + materials + travel
    const riskAmount = subtotal * (risk / 100)
    const offerTotal = subtotal + riskAmount

    return {
      hours,
      rate,
      materials,
      travel,
      risk,
      labor,
      subtotal,
      riskAmount,
      offerTotal,
    }
  }, [estimatedHours, hourlyRate, materialCost, travelCost, riskPercent])

  async function handleSave() {
    setMessage('')

    if (!title.trim()) {
      setMessage('Bitte einen Auftragstitel eingeben.')
      return
    }

    if (!estimatedHours || !hourlyRate) {
      setMessage('Bitte Stunden und internen Stundensatz eintragen.')
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

    const { error } = await supabase.from('atlas_jobs').insert({
      user_id: user.id,
      title: title.trim(),
      customer_name: customerName.trim() || null,
      status,
      estimated_hours: calculation.hours,
      material_cost: calculation.materials,
      travel_cost: calculation.travel,
      offer_total: calculation.offerTotal,
      notes: `Interner Stundensatz: ${calculation.rate.toFixed(2)} EUR. Risikoaufschlag: ${calculation.risk} Prozent.`,
    })

    if (error) {
      console.error('Atlas-Auftrag konnte nicht gespeichert werden', error)
      setMessage('Speichern war nicht moeglich. Bitte spaeter erneut versuchen.')
    } else {
      setMessage(`${title.trim()} wurde gespeichert.`)
      await loadJobs()
    }

    setSaving(false)
  }

  async function handleDelete(id: string, jobTitle: string) {
    const confirmed = window.confirm(`${jobTitle} wirklich loeschen?`)

    if (!confirmed) return

    setMessage('')

    const { error } = await supabase
      .from('atlas_jobs')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Atlas-Auftrag konnte nicht geloescht werden', error)
      setMessage('Loeschen war nicht moeglich. Bitte spaeter erneut versuchen.')
      return
    }

    setMessage(`${jobTitle} wurde geloescht.`)
    await loadJobs()
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-52 pt-6 text-slate-950">
      <div className="mx-auto max-w-xl">
        <header className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">
              Atlas / Handwerk
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight">
              Auftraege und Angebote
            </h1>
          </div>

          <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">
            Kalkulation
          </span>
        </header>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          Stunden, Material, Fahrt und Risiko zu einem realistischen Angebot
          zusammenfuehren.
        </p>

        <section className="mt-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="font-black">Neuen Auftrag kalkulieren</h2>
            <p className="mt-1 text-xs text-slate-500">
              Der interne Stundensatz bleibt fuer Kunden unsichtbar.
            </p>
          </div>

          <div className="mt-4 space-y-3">
            <label className="block text-sm font-bold">
              Auftrag oder Leistung
              <input
                className={inputClass}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="z. B. Badezimmer sanieren"
              />
            </label>

            <label className="block text-sm font-bold">
              Kunde
              <input
                className={inputClass}
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="z. B. Familie Mueller"
              />
            </label>

            <label className="block text-sm font-bold">
              Status
              <select
                className={inputClass}
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="angebot">Angebot</option>
                <option value="geplant">Geplant</option>
                <option value="laufend">Laufend</option>
                <option value="abgeschlossen">Abgeschlossen</option>
              </select>
            </label>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <h3 className="text-sm font-black text-slate-700">
              Kalkulationswerte
            </h3>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="text-sm font-bold">
                Stunden
                <input
                  className={inputClass}
                  inputMode="decimal"
                  type="number"
                  value={estimatedHours}
                  onChange={(event) => setEstimatedHours(event.target.value)}
                  placeholder="40"
                />
              </label>

              <label className="text-sm font-bold">
                Interner Stundensatz
                <input
                  className={inputClass}
                  inputMode="decimal"
                  type="number"
                  value={hourlyRate}
                  onChange={(event) => setHourlyRate(event.target.value)}
                  placeholder="36.18"
                />
              </label>

              <label className="text-sm font-bold">
                Materialkosten
                <input
                  className={inputClass}
                  inputMode="decimal"
                  type="number"
                  value={materialCost}
                  onChange={(event) => setMaterialCost(event.target.value)}
                  placeholder="1200"
                />
              </label>

              <label className="text-sm font-bold">
                Fahrtkosten
                <input
                  className={inputClass}
                  inputMode="decimal"
                  type="number"
                  value={travelCost}
                  onChange={(event) => setTravelCost(event.target.value)}
                  placeholder="80"
                />
              </label>

              <label className="col-span-2 text-sm font-bold">
                Risikoaufschlag in Prozent
                <input
                  className={inputClass}
                  inputMode="decimal"
                  type="number"
                  value={riskPercent}
                  onChange={(event) => setRiskPercent(event.target.value)}
                  placeholder="10"
                />
              </label>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-slate-100 p-4">
              <p className="text-xs font-bold text-slate-500">Arbeitskosten</p>
              <p className="mt-2 text-xl font-black">
                {euro.format(calculation.labor)}
              </p>
            </div>

            <div className="rounded-lg bg-violet-600 p-4 text-white">
              <p className="text-xs font-bold text-violet-100">
                Angebotssumme
              </p>
              <p className="mt-2 text-xl font-black">
                {euro.format(calculation.offerTotal)}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full rounded-lg bg-violet-600 px-4 py-3 text-sm font-black text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Speichert...' : 'Auftrag speichern'}
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
                Atlas-Daten
              </p>
              <h2 className="mt-1 text-lg font-black">Gespeicherte Auftraege</h2>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
              {jobs.length}
            </span>
          </div>

          {loadingJobs ? (
            <p className="mt-4 text-sm text-slate-500">Lade Auftraege...</p>
          ) : jobs.length === 0 ? (
            <p className="mt-4 text-sm leading-6 text-slate-500">
              Noch keine Auftraege gespeichert.
            </p>
          ) : (
            <div className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between gap-4 py-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-black">{job.title}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {job.customer_name || 'Kein Kunde hinterlegt'}
                      {' / '}
                      {job.status}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-sm font-black text-slate-950">
                      {euro.format(job.offer_total)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {job.estimated_hours} Stunden
                    </p>
                    <button
                      type="button"
                      onClick={() => handleDelete(job.id, job.title)}
                      className="mt-2 text-xs font-black text-rose-600"
                    >
                      Loeschen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="mt-4 text-xs leading-5 text-slate-500">
          Planungshilfe fuer Angebote. Ersetzt keine steuerliche oder rechtliche
          Beratung.
        </p>
      </div>
    </main>
  )
}