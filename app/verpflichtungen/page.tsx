'use client'

import { useEffect, useState } from 'react'

import { useFinance } from '@/lib/store'

import type { Obligation } from '@/lib/mila-obligations'

function money(value: number) {

  return Number(value || 0).toLocaleString('de-DE', {

    style: 'currency',

    currency: 'EUR',

  })

}

function dateDE(value?: string) {

  if (!value) return 'Kein Datum'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {

    return value

  }

  return date.toLocaleDateString('de-DE')

}

function dateTimeDE(value?: string) {

  if (!value) return ''

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {

    return value

  }

  return date.toLocaleString('de-DE', {

    day: '2-digit',

    month: '2-digit',

    year: 'numeric',

    hour: '2-digit',

    minute: '2-digit',

  })

}

function daysUntil(value?: string) {

  if (!value) return null

  const today = new Date()

  today.setHours(0, 0, 0, 0)

  const due = new Date(value)

  if (Number.isNaN(due.getTime())) {

    return null

  }

  due.setHours(0, 0, 0, 0)

  return Math.ceil(

    (due.getTime() - today.getTime()) /

      (1000 * 60 * 60 * 24)

  )

}

function priorityLabel(value?: string) {

  if (value === 'existenz') return '🔴 Existenz wichtig'

  if (value === 'wichtig') return '🟡 Wichtig'

  return '🟢 Normal'

}

function dueLabel(days: number | null) {

  if (days === null) return ''

  if (days < 0) {

    return `🚨 ${Math.abs(days)} Tag(e) überfällig`

  }

  if (days === 0) {

    return '🚨 Heute fällig'

  }

  if (days === 1) {

    return '⏰ Morgen fällig'

  }

  if (days <= 3) {

    return `⏰ In ${days} Tagen fällig`

  }

  return `📅 In ${days} Tagen fällig`

}

export default function VerpflichtungenPage() {

  const finance = useFinance()

  const obligations = finance.obligations || []

  const addObligation = finance.addObligation

  const deleteObligation = finance.deleteObligation

  const [title, setTitle] = useState('')

  const [partner, setPartner] = useState('')

  const [amount, setAmount] = useState('')

  const [dueDate, setDueDate] = useState('')

  const [note, setNote] = useState('')

  const [isSaving, setIsSaving] = useState(false)

  const [isDocumentScan, setIsDocumentScan] =

    useState(false)

  const [priority, setPriority] =

    useState<Obligation['priority']>('normal')

  useEffect(() => {

    const params = new URLSearchParams(

      window.location.search

    )

    const source = params.get('source') || ''

    if (source !== 'document-scan') {

      return

    }

    const scannedTitle =

      params.get('title') || ''

    const scannedCreditor =

      params.get('creditor') || ''

    const scannedAmount =

      params.get('amount') || ''

    const scannedDueDate =

      params.get('dueDate') || ''

    const scannedNote =

      params.get('note') || ''

    setIsDocumentScan(true)

    if (scannedTitle) {

      setTitle(scannedTitle)

    }

    if (scannedCreditor) {

      setPartner(scannedCreditor)

    }

    if (scannedAmount) {

      setAmount(

        scannedAmount.replace('.', ',')

      )

    }

    if (scannedDueDate) {

      setDueDate(

        scannedDueDate.slice(0, 10)

      )

    }

    if (scannedNote) {

      setNote(scannedNote)

    }

    setPriority('wichtig')

  }, [])

  function resetForm() {

    setTitle('')

    setPartner('')

    setAmount('')

    setDueDate('')

    setNote('')

    setPriority('normal')

    setIsDocumentScan(false)

    if (

      typeof window !== 'undefined' &&

      window.location.search

    ) {

      window.history.replaceState(

        {},

        '',

        '/verpflichtungen'

      )

    }

  }

  async function speichern() {

    if (isSaving) return

    const parsedAmount = Number(

      String(amount).replace(',', '.')

    )

    if (

      !title.trim() ||

      !Number.isFinite(parsedAmount) ||

      parsedAmount <= 0 ||

      !dueDate

    ) {

      alert(

        'Bitte Titel, gültigen Betrag und Fälligkeitsdatum eintragen.'

      )

      return

    }

    const normalizedPartner =

      partner.trim().toLowerCase()

    const exists = obligations.some(

      (old: any) => {

        const oldPartner = String(

          old.partner ||

            old.creditor ||

            ''

        )

          .trim()

          .toLowerCase()

        const oldDueDate =

          old.dueDate ||

          old.due_date ||

          ''

        return (

          oldPartner === normalizedPartner &&

          Number(old.amount || 0) ===

            parsedAmount &&

          oldDueDate === dueDate

        )

      }

    )

    if (exists) {

      alert(

        'Diese Verpflichtung kennt Mila bereits 🧾'

      )

      return

    }

    const item: Obligation = {

      id: crypto.randomUUID(),

      title: title.trim(),

      partner: partner.trim(),

      creditor: partner.trim() as any,

      amount: parsedAmount,

      type: 'rechnung',

      area: 'privat',

      dueDate,

      due_date: dueDate as any,

      status: 'offen',

      priority,

      reminderDays: [14, 3, 0],

      reminder_days: 3 as any,

      note: note.trim() || undefined,

    }

    setIsSaving(true)

    try {

      await addObligation(item)

      resetForm()

    } catch (error: any) {

      alert(

        'Verpflichtung konnte nicht gespeichert werden: ' +

          (error?.message ||

            'Unbekannter Fehler')

      )

    } finally {

      setIsSaving(false)

    }

  }

  return (

    <main className="mx-auto min-h-screen max-w-md space-y-5 p-6 pb-32">

      <h1 className="text-4xl font-black">

        🧾 Verpflichtungen

      </h1>

      {isDocumentScan && (

        <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4 text-sm font-bold text-violet-700">

          📄 Mila hat Daten aus deinem Dokument

          übernommen. Bitte prüfe sie kurz und

          speichere die Verpflichtung anschließend.

        </div>

      )}

      <section className="space-y-3 rounded-[2rem] bg-white p-5 shadow">

        <input

          className="w-full rounded-2xl border p-4"

          placeholder="Rechnung / Rate / Frist"

          value={title}

          onChange={(event) =>

            setTitle(event.target.value)

          }

        />

        <input

          className="w-full rounded-2xl border p-4"

          placeholder="Gläubiger / Anbieter"

          value={partner}

          onChange={(event) =>

            setPartner(event.target.value)

          }

        />

        <input

          className="w-full rounded-2xl border p-4"

          placeholder="Betrag"

          inputMode="decimal"

          value={amount}

          onChange={(event) =>

            setAmount(event.target.value)

          }

        />

        <input

          className="block w-full rounded-2xl border p-4"

          type="date"

          value={dueDate}

          onChange={(event) =>

            setDueDate(event.target.value)

          }

        />

        <select

          className="w-full rounded-2xl border p-4"

          value={priority}

          onChange={(event) =>

            setPriority(

              event.target

                .value as Obligation['priority']

            )

          }

        >

          <option value="existenz">

            🔴 Existenz wichtig

          </option>

          <option value="wichtig">

            🟡 Wichtig

          </option>

          <option value="normal">

            🟢 Normal

          </option>

        </select>

        <textarea

          className="min-h-24 w-full rounded-2xl border p-4"

          placeholder="Notiz – optional"

          value={note}

          onChange={(event) =>

            setNote(event.target.value)

          }

        />

        <button

          type="button"

          onClick={speichern}

          disabled={isSaving}

          className="w-full rounded-2xl bg-purple-600 py-4 font-black text-white disabled:opacity-50"

        >

          {isSaving

            ? 'Wird gespeichert...'

            : 'Verpflichtung speichern'}

        </button>

      </section>

      <section className="space-y-3">

        {obligations.length === 0 ? (

          <div className="rounded-3xl bg-purple-50 p-5 font-bold text-slate-700">

            Noch keine Verpflichtungen hinterlegt.

          </div>

        ) : (

          obligations.map((item: any) => {

            const status = String(

              item.status || 'offen'

            ).toLowerCase()

            const isPaid =

              status === 'bezahlt' ||

              status === 'erledigt'

            const itemDueDate =

              item.dueDate ||

              item.due_date ||

              ''

            const createdAt =

              item.createdAt ||

              item.created_at ||

              ''

            const paidAt =

              item.paidAt ||

              item.paid_at ||

              ''

            return (

              <article

                key={item.id}

                className={

                  isPaid

                    ? 'rounded-3xl bg-white p-5 shadow opacity-80'

                    : 'rounded-3xl bg-white p-5 shadow'

                }

              >

                <div className="flex items-start justify-between gap-3">

                  <div className="min-w-0">

                    <p className="break-words text-xl font-black">

                      {item.title}

                    </p>

                    <p className="break-words text-sm font-semibold text-slate-500">

                      {item.partner ||

                        item.creditor ||

                        'Kein Anbieter angegeben'}

                    </p>

                  </div>

                  {isPaid && (

                    <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">

                      ✅ Erledigt

                    </span>

                  )}

                </div>

                <p className="mt-2 text-2xl font-black text-purple-700">

                  {money(item.amount)}

                </p>

                <p className="text-sm text-slate-500">

                  Fällig: {dateDE(itemDueDate)}

                </p>

                <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">

                    {priorityLabel(

                      item.priority

                    )}

                  </span>

                  {!isPaid &&

                    itemDueDate && (

                      <span className="rounded-full bg-purple-50 px-3 py-1 text-purple-700">

                        {dueLabel(

                          daysUntil(

                            itemDueDate

                          )

                        )}

                      </span>

                    )}

                  <span

                    className={

                      isPaid

                        ? 'rounded-full bg-emerald-100 px-3 py-1 text-emerald-700'

                        : 'rounded-full bg-amber-50 px-3 py-1 text-amber-700'

                    }

                  >

                    {isPaid

                      ? '🟢 Bezahlt'

                      : '🟡 Offen'}

                  </span>

                </div>

                {(createdAt || paidAt) && (

                  <div className="mt-4 space-y-1 rounded-2xl bg-slate-50 p-3 text-xs font-semibold text-slate-500">

                    {createdAt && (

                      <p>

                        🕒 Erfasst:{' '}

                        {dateTimeDE(

                          createdAt

                        )}

                      </p>

                    )}

                    {paidAt && (

                      <p className="text-emerald-700">

                        ✅ Bezahlt:{' '}

                        {dateTimeDE(paidAt)}

                      </p>

                    )}

                  </div>

                )}

                {item.note && (

                  <p className="mt-4 whitespace-pre-line rounded-2xl bg-violet-50 p-3 text-sm text-slate-700">

                    {item.note}

                  </p>

                )}

                <div className="mt-4 flex flex-wrap gap-5">

                  {!isPaid && (

                    <button

                      type="button"

                      onClick={async () => {

                        try {

                          await finance.updateObligation(

                            item.id,

                            {

                              status:

                                'bezahlt',

                            }

                          )

                        } catch (

                          error: any

                        ) {

                          alert(

                            'Verpflichtung konnte nicht als bezahlt markiert werden: ' +

                              (error?.message ||

                                'Unbekannter Fehler')

                          )

                        }

                      }}

                      className="font-black text-emerald-600"

                    >

                      ✅ Bezahlt

                    </button>

                  )}

                  <button

                    type="button"

                    onClick={async () => {

                      const confirmed =

                        window.confirm(

                          'Diese Verpflichtung wirklich löschen?'

                        )

                      if (!confirmed) {

                        return

                      }

                      try {

                        await deleteObligation(

                          item.id

                        )

                      } catch (

                        error: any

                      ) {

                        alert(

                          'Verpflichtung konnte nicht gelöscht werden: ' +

                            (error?.message ||

                              'Unbekannter Fehler')

                        )

                      }

                    }}

                    className="font-black text-red-500"

                  >

                    Löschen

                  </button>

                </div>

              </article>

            )

          })

        )}

      </section>

    </main>

  )

}