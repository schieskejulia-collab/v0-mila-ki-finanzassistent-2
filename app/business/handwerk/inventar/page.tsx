'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type AtlasInventoryItem = {
  id: string
  name: string
  category: string | null
  quantity: number
  purchase_value: number
  current_value: number
  location: string | null
  maintenance_due: string | null
  notes: string | null
  created_at: string
}

const euro = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
})

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-base text-slate-950 outline-none transition focus:border-violet-600 focus:ring-2 focus:ring-violet-100'

function getMaintenanceStatus(date: string | null) {
  if (!date) {
    return {
      label: 'Kein Wartungstermin',
      className: 'bg-slate-100 text-slate-600',
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const maintenanceDate = new Date(`${date}T00:00:00`)
  const daysUntil = Math.ceil(
    (maintenanceDate.getTime() - today.getTime()) / 86400000
  )

  if (daysUntil < 0) {
    return {
      label: 'Wartung faellig',
      className: 'bg-rose-100 text-rose-700',
    }
  }

  if (daysUntil <= 30) {
    return {
      label: 'Wartung bald faellig',
      className: 'bg-amber-100 text-amber-700',
    }
  }

  return {
    label: `Wartung am ${maintenanceDate.toLocaleDateString('de-DE')}`,
    className: 'bg-emerald-100 text-emerald-700',
  }
}

export default function HandwerkInventarPage() {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [purchaseValue, setPurchaseValue] = useState('')
  const [currentValue, setCurrentValue] = useState('')
  const [location, setLocation] = useState('')
  const [maintenanceDue, setMaintenanceDue] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<AtlasInventoryItem[]>([])
  const [loadingItems, setLoadingItems] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const loadItems = useCallback(async () => {
    setLoadingItems(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setItems([])
      setLoadingItems(false)
      return
    }

    const { data, error } = await supabase
      .from('atlas_inventory')
      .select(
        'id, name, category, quantity, purchase_value, current_value, location, maintenance_due, notes, created_at'
      )
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Atlas-Inventar konnte nicht geladen werden', error)
      setItems([])
    } else {
      setItems((data || []) as AtlasInventoryItem[])
    }

    setLoadingItems(false)
  }, [])

  useEffect(() => {
    void loadItems()
  }, [loadItems])

  async function handleSave() {
    setMessage('')

    if (!name.trim()) {
      setMessage('Bitte eine Bezeichnung eingeben.')
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

    const { error } = await supabase.from('atlas_inventory').insert({
      user_id: user.id,
      name: name.trim(),
      category: category.trim() || null,
      quantity: Math.max(0, Number(quantity) || 0),
      purchase_value: Math.max(0, Number(purchaseValue) || 0),
      current_value: Math.max(0, Number(currentValue) || 0),
      location: location.trim() || null,
      maintenance_due: maintenanceDue || null,
      notes: notes.trim() || null,
    })

    if (error) {
      console.error('Atlas-Inventar konnte nicht gespeichert werden', error)
      setMessage('Speichern war nicht moeglich. Bitte spaeter erneut versuchen.')
    } else {
      setMessage(`${name.trim()} wurde gespeichert.`)
      setName('')
      setCategory('')
      setQuantity('1')
      setPurchaseValue('')
      setCurrentValue('')
      setLocation('')
      setMaintenanceDue('')
      setNotes('')
      await loadItems()
    }

    setSaving(false)
  }

  async function handleDelete(id: string, itemName: string) {
    const confirmed = window.confirm(`${itemName} wirklich loeschen?`)

    if (!confirmed) return

    setMessage('')

    const { error } = await supabase
      .from('atlas_inventory')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Atlas-Inventar konnte nicht geloescht werden', error)
      setMessage('Loeschen war nicht moeglich. Bitte spaeter erneut versuchen.')
      return
    }

    setMessage(`${itemName} wurde geloescht.`)
    await loadItems()
  }

  const totalCurrentValue = items.reduce(
    (total, item) => total + item.quantity * item.current_value,
    0
  )

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-52 pt-6 text-slate-950">
      <div className="mx-auto max-w-xl">
        <header className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">
              Atlas / Handwerk
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight">
              Inventar &amp; Betriebsmittel
            </h1>
          </div>

          <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">
            Bestand
          </span>
        </header>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          Maschinen, Werkzeuge und Fahrzeuge mit Wert, Standort und Wartung im
          Blick behalten.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link
            href="/business/handwerk"
            className="flex items-center justify-center rounded-lg bg-violet-100 px-4 py-3 text-sm font-black text-violet-700 transition hover:bg-violet-200"
          >
            Mitarbeiterkosten
          </Link>
          <Link
            href="/business/handwerk/auftraege"
            className="flex items-center justify-center rounded-lg bg-violet-100 px-4 py-3 text-sm font-black text-violet-700 transition hover:bg-violet-200"
          >
            Auftraege &amp; Angebote
          </Link>
        </div>

        <section className="mt-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="font-black">Betriebsmittel anlegen</h2>
            <p className="mt-1 text-xs text-slate-500">
              Werte eingeben und anschliessend speichern.
            </p>
          </div>

          <div className="mt-4 space-y-3">
            <label className="block text-sm font-bold">
              Bezeichnung
              <input
                className={inputClass}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="z. B. Transporter oder Bohrmaschine"
              />
            </label>

            <label className="block text-sm font-bold">
              Kategorie
              <input
                className={inputClass}
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder="z. B. Fahrzeug, Werkzeug oder Maschine"
              />
            </label>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <h3 className="text-sm font-black text-slate-700">
              Wert und Bestand
            </h3>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="text-sm font-bold">
                Anzahl
                <input
                  className={inputClass}
                  inputMode="decimal"
                  type="number"
                  min="0"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  placeholder="1"
                />
              </label>

              <label className="text-sm font-bold">
                Kaufwert pro Einheit
                <input
                  className={inputClass}
                  inputMode="decimal"
                  type="number"
                  min="0"
                  value={purchaseValue}
                  onChange={(event) => setPurchaseValue(event.target.value)}
                  placeholder="2500"
                />
              </label>

              <label className="text-sm font-bold">
                Aktueller Wert pro Einheit
                <input
                  className={inputClass}
                  inputMode="decimal"
                  type="number"
                  min="0"
                  value={currentValue}
                  onChange={(event) => setCurrentValue(event.target.value)}
                  placeholder="1800"
                />
              </label>

              <label className="text-sm font-bold">
                Standort
                <input
                  className={inputClass}
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="z. B. Werkstatt oder Fahrzeug 1"
                />
              </label>
            </div>
          </div>

          <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
            <label className="block text-sm font-bold">
              Naechster Wartungstermin
              <input
                className={inputClass}
                type="date"
                value={maintenanceDue}
                onChange={(event) => setMaintenanceDue(event.target.value)}
              />
            </label>

            <label className="block text-sm font-bold">
              Notizen
              <textarea
                className={`${inputClass} min-h-24 resize-y`}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="z. B. TUEV, Seriennummer oder Besonderheiten"
              />
            </label>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full rounded-lg bg-violet-600 px-4 py-3 text-sm font-black text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Speichert...' : 'Betriebsmittel speichern'}
            </button>

            {message ? (
              <p className="text-center text-sm font-bold text-slate-600">
                {message}
              </p>
            ) : null}
          </div>
        </section>

        <section className="mt-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-600">
                Atlas-Daten
              </p>
              <h2 className="mt-1 text-lg font-black">Gespeichertes Inventar</h2>
            </div>

            <div className="text-right">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                {items.length}
              </span>
              <p className="mt-2 text-xs font-bold text-slate-500">
                {euro.format(totalCurrentValue)} aktueller Wert
              </p>
            </div>
          </div>

          {loadingItems ? (
            <p className="mt-4 text-sm text-slate-500">Lade Inventar...</p>
          ) : items.length === 0 ? (
            <p className="mt-4 text-sm leading-6 text-slate-500">
              Noch kein Inventar gespeichert.
            </p>
          ) : (
            <div className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
              {items.map((item) => {
                const maintenance = getMaintenanceStatus(item.maintenance_due)
                const totalItemValue = item.quantity * item.current_value

                return (
                  <div key={item.id} className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate font-black">{item.name}</p>
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {item.category || 'Keine Kategorie'}
                          {item.location ? ` | ${item.location}` : ''}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-sm font-black text-slate-950">
                          {euro.format(totalItemValue)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Anzahl: {item.quantity}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-black ${maintenance.className}`}
                      >
                        {maintenance.label}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleDelete(item.id, item.name)}
                        className="text-xs font-black text-rose-600"
                      >
                        Loeschen
                      </button>
                    </div>

                    {item.notes ? (
                      <p className="mt-3 text-xs leading-5 text-slate-500">
                        {item.notes}
                      </p>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <p className="mt-4 text-xs leading-5 text-slate-500">
          Betriebliches Inventar fuer die Planung. Ersetzt keine steuerliche
          oder rechtliche Beratung.
        </p>
      </div>
    </main>
  )
}
