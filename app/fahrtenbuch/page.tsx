'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  createFahrtenbuchId,
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
    notes: '',
  }
}

function formatKm(value: number) {
  return `${Number(value || 0).toLocaleString('de-DE', {
    maximumFractionDigits: 2,
  })} km`
}

function formatDate(value: string) {
  if (!value) return ''

  const date = new Date(
    `${value.slice(0, 10)}T12:00:00`
  )

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('de-DE')
}

function parseKmInput(value: string) {
  const raw = String(value)
    .trim()
    .replace(/\s/g, '')

  if (!raw) return Number.NaN

  const normalized = raw.includes(',')
    ? raw
        .replace(/\./g, '')
        .replace(',', '.')
    : raw

  return Number(normalized)
}

function tripTypeLabel(type: TripType) {
  if (type === 'privat') return 'Privat'
  if (type === 'arbeitsweg') {
    return 'Arbeitsweg'
  }
  return 'Betrieblich'
}

function sortEntries(
  entries: FahrtenbuchEntry[]
) {
  return [...entries].sort(
    (a, b) =>
      new Date(b.trip_date).getTime() -
      new Date(a.trip_date).getTime()
  )
}

export default function FahrtenbuchPage() {
  const [entries, setEntries] =
    useState<FahrtenbuchEntry[]>([])
  const [userId, setUserId] = useState('')
  const [isLoading, setIsLoading] =
    useState(true)
  const [isSaving, setIsSaving] =
    useState(false)
  const [errorMessage, setErrorMessage] =
    useState('')
  const [successMessage, setSuccessMessage] =
    useState('')
  const [receiptPhoto, setReceiptPhoto] =
    useState<File | null>(null)
  const [form, setForm] =
    useState<FormState>(emptyForm)

  async function loadEntries(uid: string) {
    setErrorMessage('')

    if (!uid) {
      setEntries([])
      setIsLoading(false)
      return
    }

    const { data, error } =
      await supabase
        .from('fahrtenbuch')
        .select('*')
        .eq('user_id', uid)
        .order('trip_date', {
          ascending: false,
        })

    if (error) {
      setErrorMessage(
        error.message ||
          'Fahrten konnten nicht geladen werden.'
      )
      setEntries([])
    } else {
      setEntries(
        sortEntries(
          (data || []) as FahrtenbuchEntry[]
        )
      )
    }

    setIsLoading(false)
  }

  useEffect(() => {
    let mounted = true

    async function loadSession() {
      const {
        data: { session },
      } =
        await supabase.auth.getSession()

      if (!mounted) return

      const uid =
        session?.user?.id || ''

      setUserId(uid)
      await loadEntries(uid)
    }

    void loadSession()

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          const uid =
            session?.user?.id || ''

          setUserId(uid)
          setIsLoading(true)
          void loadEntries(uid)
        }
      )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const currentMonthStats =
    useMemo(() => {
      const now = new Date()

      const monthEntries =
        entries.filter((entry) => {
          const date = new Date(
            `${entry.trip_date.slice(0, 10)}T12:00:00`
          )

          return (
            date.getFullYear() ===
              now.getFullYear() &&
            date.getMonth() ===
              now.getMonth()
          )
        })

      return {
        count: monthEntries.length,
        km: monthEntries.reduce(
          (total, entry) =>
            total +
            Number(
              entry.distance_km || 0
            ),
          0
        ),
      }
    }, [entries])

  function setField<
    K extends keyof FormState
  >(
    field: K,
    value: FormState[K]
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }))
  }

  async function saveEntry(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (isSaving) return

    if (!userId) {
      setErrorMessage(
        'Bitte melde dich an, bevor du Fahrten speicherst.'
      )
      return
    }

    const odometerStart =
      parseKmInput(
        form.odometerStartKm
      )

    const odometerEnd =
      parseKmInput(
        form.odometerEndKm
      )

    const distance =
      odometerEnd - odometerStart

    if (
      !form.tripDate ||
      !form.startLocation.trim() ||
      !form.destination.trim() ||
      !form.purpose.trim() ||
      !Number.isFinite(
        odometerStart
      ) ||
      !Number.isFinite(
        odometerEnd
      ) ||
      odometerStart < 0 ||
      odometerEnd < odometerStart ||
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

    const entryId =
      createFahrtenbuchId()

    let receiptPhotoPath:
      | string
      | null = null

    try {
      if (receiptPhoto) {
        const extension =
          receiptPhoto.name
            .split('.')
            .pop()
            ?.toLowerCase() ||
          'jpg'

        receiptPhotoPath =
          `${userId}/${entryId}.${extension}`

        const { error: uploadError } =
          await supabase.storage
            .from(
              'fahrtenbuch-belege'
            )
            .upload(
              receiptPhotoPath,
              receiptPhoto,
              {
                contentType:
                  receiptPhoto.type,
                upsert: false,
              }
            )

        if (uploadError) {
          throw uploadError
        }
      }

      const payload = {
        id: entryId,
        user_id: userId,
        trip_date: form.tripDate,
        start_location:
          form.startLocation.trim(),
        destination:
          form.destination.trim(),
        purpose:
          form.purpose.trim(),
        distance_km: distance,
        odometer_start_km:
          odometerStart,
        odometer_end_km:
          odometerEnd,
        trip_type: form.tripType,
        business_partner:
          form.businessPartner.trim(),
        vehicle:
          form.vehicle.trim(),
        notes: form.notes.trim(),
        receipt_photo_path:
          receiptPhotoPath,
      }

      const { data, error } =
        await supabase
          .from('fahrtenbuch')
          .insert(payload)
          .select()
          .single()

      if (error) throw error

      setEntries((previous) =>
        sortEntries([
          data as FahrtenbuchEntry,
          ...previous,
        ])
      )

      setForm((previous) => ({
        ...emptyForm(),
        tripDate:
          previous.tripDate,
        tripType:
          previous.tripType,
        vehicle:
          previous.vehicle,
      }))

      setReceiptPhoto(null)
      setSuccessMessage(
        'Fahrt wurde gespeichert.'
      )
    } catch (error: any) {
      if (receiptPhotoPath) {
        await supabase.storage
          .from(
            'fahrtenbuch-belege'
          )
          .remove([
            receiptPhotoPath,
          ])
      }

      setErrorMessage(
        error?.message ||
          'Die Fahrt konnte nicht gespeichert werden.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteEntry(
    entry: FahrtenbuchEntry
  ) {
    if (
      !window.confirm(
        `Fahrt nach "${entry.destination}" löschen?`
      )
    ) {
      return
    }

    try {
      if (
        entry.receipt_photo_path
      ) {
        const { error: photoError } =
          await supabase.storage
            .from(
              'fahrtenbuch-belege'
            )
            .remove([
              entry.receipt_photo_path,
            ])

        if (photoError) {
          throw photoError
        }
      }

      const { error } =
        await supabase
          .from('fahrtenbuch')
          .delete()
          .eq('id', entry.id)
          .eq('user_id', userId)

      if (error) throw error

      setEntries((previous) =>
        previous.filter(
          (item) =>
            item.id !== entry.id
        )
      )
    } catch (error: any) {
      setErrorMessage(
        error?.message ||
          'Die Fahrt konnte nicht gelöscht werden.'
      )
    }
  }

  async function openReceiptPhoto(
    path: string
  ) {
    const { data, error } =
      await supabase.storage
        .from(
          'fahrtenbuch-belege'
        )
        .createSignedUrl(
          path,
          300
        )

    if (
      error ||
      !data?.signedUrl
    ) {
      setErrorMessage(
        'Das Belegfoto konnte nicht geöffnet werden.'
      )
      return
    }

    window.open(
      data.signedUrl,
      '_blank',
      'noopener,noreferrer'
    )
  }

  if (isLoading) {
    return (
      <main className="mx-auto min-h-screen max-w-md p-6">
        <p className="text-sm font-bold text-slate-500">
          Fahrten werden geladen ...
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto min-h-screen max-w-md space-y-5 p-6 pb-40 text-slate-950">
      <header>
        <Link
          href="/"
          className="text-sm font-semibold text-slate-500"
        >
          ← Zurück
        </Link>

        <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-violet-600">
          Arbeitsnachweis
        </p>

        <h1 className="mt-2 text-3xl font-black">
          Fahrtenbuch
        </h1>

        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
          Fahrten und zugehörige Belege strukturiert dokumentieren.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-violet-600 p-4 text-white">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-100">
            Dieser Monat
          </p>

          <p className="mt-2 text-2xl font-black">
            {formatKm(
              currentMonthStats.km
            )}
          </p>
        </div>

        <div className="rounded-3xl bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
            Fahrten
          </p>

          <p className="mt-2 text-2xl font-black">
            {
              currentMonthStats.count
            }
          </p>
        </div>
      </section>

      {errorMessage && (
        <section className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
          {errorMessage}
        </section>
      )}

      {successMessage && (
        <section className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
          {successMessage}
        </section>
      )}

      <form
        onSubmit={saveEntry}
        className="space-y-3 rounded-3xl border border-violet-100 bg-white p-5 shadow-sm"
      >
        <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-600">
          Neue Fahrt
        </p>

        <input
          type="date"
          value={form.tripDate}
          onChange={(event) =>
            setField(
              'tripDate',
              event.target.value
            )
          }
          className="w-full rounded-2xl border border-violet-100 p-4"
        />

        <input
          value={form.startLocation}
          onChange={(event) =>
            setField(
              'startLocation',
              event.target.value
            )
          }
          placeholder="Start"
          className="w-full rounded-2xl border border-violet-100 p-4"
        />

        <input
          value={form.destination}
          onChange={(event) =>
            setField(
              'destination',
              event.target.value
            )
          }
          placeholder="Ziel"
          className="w-full rounded-2xl border border-violet-100 p-4"
        />

        <input
          value={form.purpose}
          onChange={(event) =>
            setField(
              'purpose',
              event.target.value
            )
          }
          placeholder="Zweck / Anlass"
          className="w-full rounded-2xl border border-violet-100 p-4"
        />

        <div className="grid grid-cols-2 gap-2">
          <input
            value={
              form.odometerStartKm
            }
            onChange={(event) =>
              setField(
                'odometerStartKm',
                event.target.value
              )
            }
            inputMode="decimal"
            placeholder="KM Start"
            className="w-full rounded-2xl border border-violet-100 p-4"
          />

          <input
            value={
              form.odometerEndKm
            }
            onChange={(event) =>
              setField(
                'odometerEndKm',
                event.target.value
              )
            }
            inputMode="decimal"
            placeholder="KM Ende"
            className="w-full rounded-2xl border border-violet-100 p-4"
          />
        </div>

        <select
          value={form.tripType}
          onChange={(event) =>
            setField(
              'tripType',
              event.target
                .value as TripType
            )
          }
          className="w-full rounded-2xl border border-violet-100 p-4"
        >
          <option value="betrieblich">
            Betrieblich
          </option>
          <option value="arbeitsweg">
            Arbeitsweg
          </option>
          <option value="privat">
            Privat
          </option>
        </select>

        <input
          value={
            form.businessPartner
          }
          onChange={(event) =>
            setField(
              'businessPartner',
              event.target.value
            )
          }
          placeholder="Kunde / Geschäftspartner (optional)"
          className="w-full rounded-2xl border border-violet-100 p-4"
        />

        <input
          value={form.vehicle}
          onChange={(event) =>
            setField(
              'vehicle',
              event.target.value
            )
          }
          placeholder="Fahrzeug (optional)"
          className="w-full rounded-2xl border border-violet-100 p-4"
        />

        <textarea
          value={form.notes}
          onChange={(event) =>
            setField(
              'notes',
              event.target.value
            )
          }
          placeholder="Notiz"
          className="min-h-24 w-full rounded-2xl border border-violet-100 p-4"
        />

        <div>
          <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
            Belegfoto optional
          </label>

          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) =>
              setReceiptPhoto(
                event.target.files?.[0] ||
                  null
              )
            }
            className="mt-2 block w-full text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="w-full rounded-2xl bg-violet-600 py-4 font-black text-white disabled:opacity-50"
        >
          {isSaving
            ? 'Speichere ...'
            : 'Fahrt speichern'}
        </button>
      </form>

      <section className="space-y-3">
        {entries.length === 0 ? (
          <div className="rounded-3xl bg-violet-50 p-5">
            <p className="font-black">
              Noch keine Fahrten
            </p>
          </div>
        ) : (
          entries.map((entry) => (
            <article
              key={entry.id}
              className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"
            >
              <div className="flex justify-between gap-3">
                <div>
                  <p className="font-black">
                    {
                      entry.destination
                    }
                  </p>

                  <p className="text-sm text-slate-500">
                    {formatDate(
                      entry.trip_date
                    )}{' '}
                    ·{' '}
                    {tripTypeLabel(
                      entry.trip_type
                    )}
                  </p>
                </div>

                <p className="font-black text-violet-700">
                  {formatKm(
                    Number(
                      entry.distance_km ||
                        0
                    )
                  )}
                </p>
              </div>

              <p className="mt-3 text-sm font-semibold text-slate-600">
                {entry.start_location}
                {' → '}
                {entry.destination}
              </p>

              <p className="mt-2 text-sm text-slate-500">
                {entry.purpose}
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                {entry.receipt_photo_path && (
                  <button
                    type="button"
                    onClick={() =>
                      openReceiptPhoto(
                        entry.receipt_photo_path!
                      )
                    }
                    className="text-sm font-black text-violet-700"
                  >
                    Beleg öffnen
                  </button>
                )}

                <button
                  type="button"
                  onClick={() =>
                    deleteEntry(
                      entry
                    )
                  }
                  className="text-sm font-black text-red-500"
                >
                  Löschen
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  )
}