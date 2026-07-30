'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  createFahrtenbuchId,
  fahrtenbuchLocalKey,
  todayAsInputValue,
  type FahrtenbuchEntry,
  type TripType,
} from '@/lib/fahrtenbuch'

type FormState = {
  tripDate: string
  startLocation: string
  destination: string
  purpose: string
  odometerStartKm: string
  odometerEndKm: string
  tripType: TripType
  businessPartner: string
  vehicle: string
  startTime: string
  endTime: string
  returnTrip: boolean
  route: string
  notes: string
}

function emptyForm(): FormState {
  return {
    tripDate: todayAsInputValue(),
    startLocation: '',
    destination: '',
    purpose: '',
    odometerStartKm: '',
    odometerEndKm: '',
    tripType: 'betrieblich',
    businessPartner: '',
    vehicle: '',
    startTime: '',
    endTime: '',
    returnTrip: false,
    route: '',
    notes: '',
  }
}

function readLocalEntries(userId?: string) {
  if (typeof window === 'undefined') return []

  try {
    const stored = window.localStorage.getItem(
      fahrtenbuchLocalKey(userId)
    )
    const parsed = stored ? JSON.parse(stored) : []
    return Array.isArray(parsed) ? (parsed as FahrtenbuchEntry[]) : []
  } catch {
    return []
  }
}

function writeLocalEntries(userId: string | undefined, entries: FahrtenbuchEntry[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(
    fahrtenbuchLocalKey(userId),
    JSON.stringify(entries)
  )
}

function formatDate(value: string) {
  if (!value) return ''
  const date = new Date(`${value.slice(0, 10)}T12:00:00`)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
}

function formatKm(value: number) {
  return `${Number(value || 0).toLocaleString('de-DE', {
    maximumFractionDigits: 2,
  })} km`
}

function parseKmInput(value: string) {
  const raw = String(value).trim().replace(/\s/g, '')
  if (!raw) return Number.NaN

  const normalized = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw

  return Number(normalized)
}

function tripTypeLabel(type: TripType) {
  if (type === 'privat') return 'Privat'
  if (type === 'arbeitsweg') return 'Arbeitsweg'
  return 'Betrieblich'
}

function sortEntries(entries: FahrtenbuchEntry[]) {
  return [...entries].sort((a, b) => {
    const dateDifference =
      new Date(b.trip_date).getTime() - new Date(a.trip_date).getTime()

    if (dateDifference !== 0) return dateDifference

    return (
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  })
}

export default function FahrtenbuchPage() {
  const [entries, setEntries] = useState<FahrtenbuchEntry[]>([])
  const [userId, setUserId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [form, setForm] = useState<FormState>(emptyForm)
  const [receiptPhoto, setReceiptPhoto] = useState<File | null>(null)

  async function loadEntries(uid: string) {
    setErrorMessage('')

    if (!uid) {
      setEntries(sortEntries(readLocalEntries()))
      setIsLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('fahrtenbuch')
      .select('*')
      .eq('user_id', uid)
      .order('trip_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Fahrtenbuch laden fehlgeschlagen:', error)
      setErrorMessage(
        'Das Fahrtenbuch ist noch nicht mit der Datenbank verbunden. Die SQL-Tabelle muss zuerst angelegt werden.'
      )
      setEntries([])
    } else {
      setEntries(sortEntries((data || []) as FahrtenbuchEntry[]))
    }

    setIsLoading(false)
  }

  useEffect(() => {
    let mounted = true

    async function loadSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!mounted) return

      const uid = session?.user?.id || ''
      setUserId(uid)
      await loadEntries(uid)
    }

    void loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id || ''
      setUserId(uid)
      setIsLoading(true)
      window.setTimeout(() => {
        if (mounted) void loadEntries(uid)
      }, 0)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const currentMonthStats = useMemo(() => {
    const now = new Date()
    const monthEntries = entries.filter((entry) => {
      const date = new Date(`${entry.trip_date.slice(0, 10)}T12:00:00`)
      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth()
      )
    })

    return {
      count: monthEntries.length,
      km: monthEntries.reduce(
        (total, entry) => total + Number(entry.distance_km || 0),
        0
      ),
    }
  }, [entries])

  const calculatedDistance = useMemo(() => {
    const start = parseKmInput(form.odometerStartKm)
    const end = parseKmInput(form.odometerEndKm)

    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
      return null
    }

    return end - start
  }, [form.odometerEndKm, form.odometerStartKm])

  function setField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((previous) => ({ ...previous, [field]: value }))
  }

  async function saveEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSaving) return

    const odometerStart = parseKmInput(form.odometerStartKm)
    const odometerEnd = parseKmInput(form.odometerEndKm)
    const distance = odometerEnd - odometerStart

    if (
      !form.tripDate ||
      !form.startLocation.trim() ||
      !form.destination.trim() ||
      !form.purpose.trim() ||
      !Number.isFinite(odometerStart) ||
      !Number.isFinite(odometerEnd) ||
      odometerStart < 0 ||
      odometerEnd < 0 ||
      odometerEnd < odometerStart ||
      !Number.isFinite(distance) ||
      distance <= 0
    ) {
      setErrorMessage(
        'Bitte Datum, Start, Ziel, Zweck sowie Anfangs- und Endkilometerstand korrekt eintragen.'
      )
      return
    }

    setIsSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    const now = new Date().toISOString()
    const entryId = createFahrtenbuchId()
    let receiptPhotoPath: string | null = null

    if (receiptPhoto && !userId) {
      setErrorMessage('Belegfotos kÃ¶nnen nur mit einem eingeloggten Konto gespeichert werden.')
      setIsSaving(false)
      return
    }

    if (receiptPhoto) {
      const extension = receiptPhoto.name.split('.').pop()?.toLowerCase() || 'jpg'
      receiptPhotoPath = `${userId}/${entryId}.${extension}`
    }

    const payload = {
      id: entryId,
      trip_date: form.tripDate,
      start_location: form.startLocation.trim(),
      destination: form.destination.trim(),
      purpose: form.purpose.trim(),
      distance_km: distance,
      odometer_start_km: odometerStart,
      odometer_end_km: odometerEnd,
      trip_type: form.tripType,
      business_partner: form.businessPartner.trim(),
      vehicle: form.vehicle.trim(),
      start_time: form.startTime || null,
      end_time: form.endTime || null,
      return_trip: form.returnTrip,
      route: form.route.trim(),
      notes: form.notes.trim(),
      receipt_photo_path: receiptPhotoPath,
    }

    try {
      if (receiptPhoto && receiptPhotoPath) {
        const { error: uploadError } = await supabase.storage
          .from('fahrtenbuch-belege')
          .upload(receiptPhotoPath, receiptPhoto, {
            contentType: receiptPhoto.type,
            upsert: false,
          })

        if (uploadError) throw uploadError
      }

      let savedEntry: FahrtenbuchEntry

      if (userId) {
        const { data, error } = await supabase
          .from('fahrtenbuch')
          .insert({ ...payload, user_id: userId })
          .select()
          .single()

        if (error) throw error
        savedEntry = data as FahrtenbuchEntry
      } else {
        savedEntry = {
          ...payload,
          id: createFahrtenbuchId(),
          created_at: now,
          updated_at: now,
        }
        writeLocalEntries(userId, [savedEntry, ...entries])
      }

      setEntries((previous) => sortEntries([savedEntry, ...previous]))
      setForm((previous) => ({
        ...emptyForm(),
        tripDate: previous.tripDate,
        tripType: previous.tripType,
        vehicle: previous.vehicle,
      }))
      setReceiptPhoto(null)
      setShowDetails(false)
      setSuccessMessage('Fahrt wurde gespeichert')
    } catch (error: any) {
      console.error('Fahrt speichern fehlgeschlagen:', error)
      if (receiptPhotoPath) {
        await supabase.storage.from('fahrtenbuch-belege').remove([receiptPhotoPath])
      }
      setErrorMessage(
        error?.message ||
          'Die Fahrt konnte nicht gespeichert werden. Bitte pr\u00fcfe zuerst die SQL-Tabelle.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteEntry(entry: FahrtenbuchEntry) {
    if (!window.confirm(`M\u00f6chtest du die Fahrt nach "${entry.destination}" l\u00f6schen?`)) {
      return
    }

    setErrorMessage('')

    try {
      if (userId) {
        if (entry.receipt_photo_path) {
          const { error: photoError } = await supabase.storage
            .from('fahrtenbuch-belege')
            .remove([entry.receipt_photo_path])

          if (photoError) throw photoError
        }

        const { error } = await supabase
          .from('fahrtenbuch')
          .delete()
          .eq('id', entry.id)
          .eq('user_id', userId)

        if (error) throw error
      } else {
        const nextEntries = entries.filter((item) => item.id !== entry.id)
        writeLocalEntries(userId, nextEntries)
      }

      setEntries((previous) =>
        previous.filter((item) => item.id !== entry.id)
      )
    } catch (error: any) {
      console.error('Fahrt loeschen fehlgeschlagen:', error)
      setErrorMessage(error?.message || 'Die Fahrt konnte nicht gel\u00f6scht werden.')
    }
  }

  async function openReceiptPhoto(path: string) {
    const { data, error } = await supabase.storage
      .from('fahrtenbuch-belege')
      .createSignedUrl(path, 300)

    if (error || !data?.signedUrl) {
      setErrorMessage('Das Belegfoto konnte nicht geÃ¶ffnet werden.')
      return
    }

    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <main className="mx-auto min-h-screen max-w-md space-y-4 p-4 pb-40 text-slate-950">
      <header className="rounded-[2rem] bg-white p-5 shadow-sm">
        <Link
          href="/buchungen"
          className="text-xs font-black uppercase tracking-[0.16em] text-violet-600"
        >
          &larr; Finanzen
        </Link>
        <div className="mt-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-500">
              Mila Modul
            </p>
            <h1 className="mt-2 text-3xl font-black">Fahrtenbuch</h1>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
              Gesch&#228;ftliche Fahrten, Arbeitswege und private Strecken sauber an einem Ort dokumentieren.
            </p>
          </div>
          <span className="text-4xl" aria-hidden="true">
            &#x1F697;
          </span>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-violet-600 p-4 text-white shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-100">
            Dieser Monat
          </p>
          <p className="mt-2 text-2xl font-black">{formatKm(currentMonthStats.km)}</p>
        </div>
        <div className="rounded-3xl bg-white p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
            Fahrten
          </p>
          <p className="mt-2 text-2xl font-black text-slate-950">
            {currentMonthStats.count}
          </p>
        </div>
      </section>

      <section className="rounded-[2rem] border border-violet-100 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-violet-500">
              Neue Fahrt
            </p>
            <h2 className="mt-1 text-xl font-black">Eintrag hinzuf&#252;gen</h2>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-2 text-[10px] font-black text-emerald-700">
            {userId ? 'Cloud gespeichert' : 'Ger\u00e4t gespeichert'}
          </span>
        </div>

        <form onSubmit={saveEntry} className="mt-4 space-y-3">
          <label className="block text-xs font-black text-slate-500">
            Datum
            <input
              type="date"
              value={form.tripDate}
              onChange={(event) => setField('tripDate', event.target.value)}
              className="mt-1 h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base font-bold text-slate-900 outline-none focus:border-violet-500"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-black text-slate-500">
              Start
              <input
                value={form.startLocation}
                onChange={(event) => setField('startLocation', event.target.value)}
                placeholder="z. B. Stendal"
                className="mt-1 h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none focus:border-violet-500"
              />
            </label>
            <label className="block text-xs font-black text-slate-500">
              Ziel
              <input
                value={form.destination}
                onChange={(event) => setField('destination', event.target.value)}
                placeholder="z. B. Kunde"
                className="mt-1 h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none focus:border-violet-500"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-black text-slate-500">
              Kilometerstand Start
              <input
                type="text"
                inputMode="decimal"
                value={form.odometerStartKm}
                onChange={(event) => setField('odometerStartKm', event.target.value)}
                placeholder="z. B. 12.345,6"
                className="mt-1 h-14 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-violet-500"
              />
            </label>
            <label className="block text-xs font-black text-slate-500">
              Kilometerstand Ende
              <input
                type="text"
                inputMode="decimal"
                value={form.odometerEndKm}
                onChange={(event) => setField('odometerEndKm', event.target.value)}
                placeholder="z. B. 12.369,1"
                className="mt-1 h-14 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-violet-500"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-violet-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-violet-500">
                Automatische Strecke
              </p>
              <p className="mt-1 text-lg font-black text-violet-800">
                {calculatedDistance === null ? 'Wird berechnet' : formatKm(calculatedDistance)}
              </p>
            </div>
            <label className="block text-xs font-black text-slate-500">
              Fahrtart
              <select
                value={form.tripType}
                onChange={(event) => setField('tripType', event.target.value as TripType)}
                className="mt-1 h-14 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-violet-500"
              >
                <option value="betrieblich">Betrieblich</option>
                <option value="arbeitsweg">Arbeitsweg</option>
                <option value="privat">Privat</option>
              </select>
            </label>
          </div>

          <label className="block text-xs font-black text-slate-500">
            Zweck der Fahrt
            <input
              value={form.purpose}
              onChange={(event) => setField('purpose', event.target.value)}
              placeholder="z. B. Kundentermin / Material holen"
              className="mt-1 h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none focus:border-violet-500"
            />
          </label>

          <label className="block text-xs font-black text-slate-500">
            Belegfoto / Tacho-Foto (optional)
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              capture="environment"
              onChange={(event) => {
                const file = event.target.files?.[0] || null
                if (file && file.size > 5 * 1024 * 1024) {
                  setReceiptPhoto(null)
                  setErrorMessage('Das Belegfoto darf hÃ¶chstens 5 MB groÃ sein.')
                  event.currentTarget.value = ''
                  return
                }
                setErrorMessage('')
                setReceiptPhoto(file)
              }}
              className="mt-1 block w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xs font-semibold text-slate-700 file:mr-3 file:rounded-xl file:border-0 file:bg-violet-100 file:px-3 file:py-2 file:text-xs file:font-black file:text-violet-700"
            />
            <span className="mt-1 block text-[11px] font-semibold text-slate-400">
              Optional: Foto vom Kilometerstand oder Beleg. Maximal 5 MB.
            </span>
          </label>

          <button
            type="button"
            onClick={() => setShowDetails((previous) => !previous)}
            className="w-full rounded-2xl bg-violet-50 py-3 text-xs font-black text-violet-700"
          >
            {showDetails ? 'Weniger Details ausblenden' : 'Weitere Angaben anzeigen'}
          </button>

          {showDetails && (
            <div className="space-y-3 rounded-2xl bg-slate-50 p-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-black text-slate-500">
                  Startzeit
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(event) => setField('startTime', event.target.value)}
                    className="mt-1 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900"
                  />
                </label>
                <label className="block text-xs font-black text-slate-500">
                  Endzeit
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(event) => setField('endTime', event.target.value)}
                    className="mt-1 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900"
                  />
                </label>
              </div>

              <label className="block text-xs font-black text-slate-500">
                Gesch&#228;ftspartner / Kunde
                <input
                  value={form.businessPartner}
                  onChange={(event) => setField('businessPartner', event.target.value)}
                  placeholder="Optional"
                  className="mt-1 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900"
                />
              </label>

              <label className="block text-xs font-black text-slate-500">
                Fahrzeug
                <input
                  value={form.vehicle}
                  onChange={(event) => setField('vehicle', event.target.value)}
                  placeholder="z. B. Privatwagen"
                  className="mt-1 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900"
                />
              </label>

              <label className="flex items-center gap-3 rounded-xl bg-white p-3 text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={form.returnTrip}
                  onChange={(event) => setField('returnTrip', event.target.checked)}
                  className="h-5 w-5 accent-violet-600"
                />
                R&#252;ckfahrt enthalten
              </label>

              <label className="block text-xs font-black text-slate-500">
                Route / Zwischenstopps
                <input
                  value={form.route}
                  onChange={(event) => setField('route', event.target.value)}
                  placeholder="Optional"
                  className="mt-1 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900"
                />
              </label>

              <label className="block text-xs font-black text-slate-500">
                Notiz
                <textarea
                  value={form.notes}
                  onChange={(event) => setField('notes', event.target.value)}
                  placeholder="Optional"
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-violet-500"
                />
              </label>
            </div>
          )}

          {errorMessage && (
            <p className="rounded-2xl bg-rose-50 p-3 text-xs font-bold leading-relaxed text-rose-700">
              {errorMessage}
            </p>
          )}

          {successMessage && (
            <p className="rounded-2xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700">
              {successMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="w-full rounded-2xl bg-violet-600 py-4 text-base font-black text-white shadow-sm transition active:scale-[0.99] disabled:cursor-wait disabled:opacity-60"
          >
            {isSaving ? 'Wird gespeichert ...' : 'Fahrt speichern'}
          </button>
        </form>

        <p className="mt-3 text-[11px] font-semibold leading-relaxed text-slate-400">
          Mila unterst&#252;tzt dich bei der Dokumentation. Ob ein Fahrtenbuch steuerlich anerkannt wird, h&#228;ngt von Vollst&#228;ndigkeit und den Anforderungen des Finanzamts ab.
        </p>
      </section>

      <section className="rounded-[2rem] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
              Verlauf
            </p>
            <h2 className="mt-1 text-xl font-black">Deine Fahrten</h2>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-2 text-[10px] font-black text-slate-600">
            {entries.length}{' '}Eintr&#228;ge
          </span>
        </div>

        {isLoading ? (
          <p className="mt-5 text-sm font-semibold text-slate-500">Fahrtenbuch wird geladen ...</p>
        ) : entries.length === 0 ? (
          <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-center">
            <p className="text-3xl">&#x1F6E3;&#xFE0F;</p>
            <p className="mt-2 text-sm font-black text-slate-700">Noch keine Fahrten</p>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              Deine gespeicherten Fahrten erscheinen hier chronologisch.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {entries.map((entry) => (
              <article
                key={entry.id}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-900">
                      {entry.start_location} &rarr; {entry.destination}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {formatDate(entry.trip_date)} &middot; {entry.purpose}
                    </p>
                    {entry.odometer_start_km != null && entry.odometer_end_km != null && (
                      <p className="mt-1 text-[11px] font-semibold text-slate-400">
                        Tacho {formatKm(entry.odometer_start_km)} -&gt; {formatKm(entry.odometer_end_km)}
                      </p>
                    )}
                    {entry.receipt_photo_path && (
                      <button
                        type="button"
                        onClick={() => void openReceiptPhoto(entry.receipt_photo_path as string)}
                        className="mt-2 text-[11px] font-black text-violet-700 underline"
                      >
                        Belegfoto &ouml;ffnen
                      </button>
                    )}
                  </div>
                  <p className="shrink-0 text-sm font-black text-violet-700">
                    {formatKm(entry.distance_km)}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black text-slate-600">
                    {tripTypeLabel(entry.trip_type)}
                  </span>
                  <button
                    type="button"
                    onClick={() => void deleteEntry(entry)}
                    className="text-[11px] font-black text-rose-600"
                  >
                    L&#246;schen
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
