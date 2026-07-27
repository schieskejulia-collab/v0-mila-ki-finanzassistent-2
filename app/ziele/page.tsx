'use client'

import { useState } from 'react'
import { useFinance } from '@/lib/store'
import type { MilaGoal } from '@/lib/mila-goals'

function money(value: number) {
  return Number(value || 0).toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  })
}

function numberFromInput(value: string) {
  const normalized = String(value || '')
    .replace(/\./g, '')
    .replace(',', '.')

  const parsed = Number(normalized)

  return Number.isFinite(parsed) ? parsed : 0
}

function calculatePercent(saved: number, target: number) {
  if (target <= 0) return 0

  return Math.min(
    100,
    Math.max(0, Math.round((saved / target) * 100))
  )
}

export default function ZielePage() {
  const finance = useFinance()

  const goals = finance.goals || []

  const addGoal = finance.addGoal
  const updateGoal = finance.updateGoal
  const deleteGoal = finance.deleteGoal

  const [title, setTitle] = useState('')
  const [target, setTarget] = useState('')
  const [saved, setSaved] = useState('')
  const [dueDate, setDueDate] = useState('')

  const [savingAmounts, setSavingAmounts] = useState<
    Record<string, string>
  >({})

  function resetForm() {
    setTitle('')
    setTarget('')
    setSaved('')
    setDueDate('')
  }

  async function createGoal() {
    const targetNumber = numberFromInput(target)
    const savedNumber = numberFromInput(saved)

    if (!title.trim()) {
      alert('Bitte gib deinem Ziel einen Namen.')
      return
    }

    if (targetNumber <= 0) {
      alert('Bitte gib einen gültigen Zielbetrag ein.')
      return
    }

    if (savedNumber < 0) {
      alert('Der bereits gesparte Betrag darf nicht negativ sein.')
      return
    }

    const duplicateExists = goals.some(
      (goal: MilaGoal) =>
        goal.title.trim().toLowerCase() ===
        title.trim().toLowerCase()
    )

    if (duplicateExists) {
      alert('Dieses Ziel gibt es bereits.')
      return
    }

    const newGoal: MilaGoal = {
      id: crypto.randomUUID(),
      title: title.trim(),
      target: targetNumber,
      saved: Math.min(savedNumber, targetNumber),
      dueDate: dueDate || undefined,
    }

    try {
  await addGoal(newGoal)
  resetForm()
  alert('✅ Ziel wurde gespeichert')
} catch (error: any) {
  alert(
    `❌ Ziel konnte nicht gespeichert werden: ${
      error?.message || JSON.stringify(error)
    }`
  )
}
  }

  function addSaving(goal: MilaGoal) {
    const value = numberFromInput(
      savingAmounts[goal.id] || ''
    )

    if (value <= 0) {
      alert('Bitte gib einen gültigen Betrag ein.')
      return
    }

    const newSaved = Math.min(
      goal.target,
      Number(goal.saved || 0) + value
    )

    updateGoal(goal.id, newSaved)

    setSavingAmounts((previous) => ({
      ...previous,
      [goal.id]: '',
    }))
  }

  function removeGoal(goal: MilaGoal) {
    const confirmed = window.confirm(
      `Ziel „${goal.title}“ wirklich löschen?`
    )

    if (!confirmed) return

    deleteGoal(goal.id)
  }

  return (
    <main className="mx-auto min-h-screen max-w-md space-y-6 bg-[#F8F9FC] p-5 pb-32">
      <section>
        <p className="text-xs font-black uppercase tracking-[0.3em] text-purple-600">
          Deine Zukunft
        </p>

        <h1 className="mt-2 text-4xl font-black text-slate-950">
          🎯 Ziele
        </h1>

        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
          Lege fest, wofür du sparen möchtest. Mila zeigt dir,
          wie weit du bereits gekommen bist.
        </p>
      </section>

      <section className="space-y-4 rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-purple-600">
            Neues Ziel
          </p>

          <h2 className="mt-1 text-2xl font-black text-slate-950">
            Wofür möchtest du sparen?
          </h2>
        </div>

        <input
          type="text"
          value={title}
          onChange={(event) =>
            setTitle(event.target.value)
          }
          placeholder="Zum Beispiel: Neuer Laptop"
          className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-base font-semibold outline-none transition focus:border-purple-400"
        />

        <input
          type="text"
          inputMode="decimal"
          value={target}
          onChange={(event) =>
            setTarget(event.target.value)
          }
          placeholder="Zielbetrag"
          className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-base font-semibold outline-none transition focus:border-purple-400"
        />

        <input
          type="text"
          inputMode="decimal"
          value={saved}
          onChange={(event) =>
            setSaved(event.target.value)
          }
          placeholder="Bereits gespart – optional"
          className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-base font-semibold outline-none transition focus:border-purple-400"
        />

        <div>
          <label className="mb-2 block text-xs font-black uppercase tracking-[0.15em] text-slate-400">
            Wunschdatum – optional
          </label>

          <input
            type="date"
            value={dueDate}
            onChange={(event) =>
              setDueDate(event.target.value)
            }
            className="block w-full max-w-full rounded-2xl border border-slate-200 bg-white p-4 text-base font-semibold outline-none transition focus:border-purple-400"
          />
        </div>

        <button
          type="button"
          onClick={createGoal}
          className="w-full rounded-2xl bg-purple-600 py-4 text-base font-black text-white shadow-md shadow-purple-100 transition active:scale-[0.99]"
        >
          Ziel speichern
        </button>
      </section>

      <section className="space-y-4">
        {goals.length === 0 ? (
          <div className="rounded-[2rem] border border-purple-100 bg-purple-50 p-5">
            <p className="text-lg font-black text-purple-900">
              🌱 Noch kein Ziel angelegt
            </p>

            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
              Starte mit einem Ziel, das dir wirklich wichtig ist.
              Auch kleine Beträge zählen.
            </p>
          </div>
        ) : (
          goals.map((goal: MilaGoal) => {
            const targetValue = Number(goal.target || 0)
            const savedValue = Number(goal.saved || 0)

            const percent = calculatePercent(
              savedValue,
              targetValue
            )

            const remaining = Math.max(
              0,
              targetValue - savedValue
            )

            const completed = remaining <= 0

            return (
              <article
                key={goal.id}
                className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-2xl font-black text-slate-950">
                      {goal.title}
                    </p>

                    {goal.dueDate && (
                      <p className="mt-1 text-xs font-bold text-slate-400">
                        Wunschdatum:{' '}
                        {new Date(
                          `${goal.dueDate}T00:00:00`
                        ).toLocaleDateString('de-DE')}
                      </p>
                    )}
                  </div>

                  <span
                    className={
                      completed
                        ? 'shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700'
                        : 'shrink-0 rounded-full bg-purple-100 px-3 py-1 text-xs font-black text-purple-700'
                    }
                  >
                    {completed
                      ? '✅ Erreicht'
                      : `${percent} %`}
                  </span>
                </div>

                <div className="mt-5 h-4 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500 transition-all"
                    style={{
                      width: `${percent}%`,
                    }}
                  />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-purple-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-purple-500">
                      Gespart
                    </p>

                    <p className="mt-1 text-xl font-black text-purple-800">
                      {money(savedValue)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                      Ziel
                    </p>

                    <p className="mt-1 text-xl font-black text-slate-800">
                      {money(targetValue)}
                    </p>
                  </div>
                </div>

                {!completed ? (
                  <>
                    <p className="mt-4 text-sm font-bold text-slate-600">
                      Noch {money(remaining)} bis zum Ziel.
                    </p>

                    <div className="mt-4 flex gap-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={
                          savingAmounts[goal.id] || ''
                        }
                        onChange={(event) =>
                          setSavingAmounts(
                            (previous) => ({
                              ...previous,
                              [goal.id]:
                                event.target.value,
                            })
                          )
                        }
                        placeholder="Betrag hinzufügen"
                        className="min-w-0 flex-1 rounded-2xl border border-slate-200 p-3 font-semibold outline-none focus:border-purple-400"
                      />

                      <button
                        type="button"
                        onClick={() => addSaving(goal)}
                        className="shrink-0 rounded-2xl bg-emerald-600 px-4 font-black text-white"
                      >
                        + Sparen
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="mt-4 rounded-2xl bg-emerald-50 p-4">
                    <p className="font-black text-emerald-700">
                      🎉 Ziel erreicht
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-600">
                      Du hast dieses Ziel vollständig finanziert.
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => removeGoal(goal)}
                  className="mt-5 font-black text-rose-500"
                >
                  Ziel löschen
                </button>
              </article>
            )
          })
        )}
      </section>
    </main>
  )
}