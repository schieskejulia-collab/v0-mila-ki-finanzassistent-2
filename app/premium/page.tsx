'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const PREMIUM_FEATURES = [
  {
    icon: '🧠',
    title: 'Mehr Mila-Intelligenz',
    text: 'Ausführlichere Analysen, Zusammenhänge und persönliche Hinweise.',
  },
  {
    icon: '🔎',
    title: 'Dokumente verstehen',
    text: 'Belege und Finanzdokumente mit Mila prüfen und einordnen.',
  },
  {
    icon: '📊',
    title: 'Muster erkennen',
    text: 'Entwicklungen, Ausreißer und wiederkehrende Belastungen früher sehen.',
  },
  {
    icon: '✨',
    title: 'Neue Premium-Funktionen',
    text: 'Zukünftige Erweiterungen werden automatisch für Premium freigeschaltet.',
  },
]

export default function PremiumPage() {
  const router = useRouter()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const startCheckout = async () => {
  setIsLoading(true)
  setError('')

  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError) {
      throw sessionError
    }

    if (!session?.access_token) {
      throw new Error('Bitte melde dich zuerst an.')
    }

    const response = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data?.error || 'Stripe Checkout konnte nicht gestartet werden.'
      )
    }

    if (!data?.url) {
      throw new Error('Stripe hat keine Checkout-Adresse zurückgegeben.')
    }

    window.location.href = data.url
  } catch (checkoutError) {
    console.error('Checkout-Fehler:', checkoutError)

    setError(
      checkoutError instanceof Error
        ? checkoutError.message
        : 'Beim Starten des Checkouts ist ein Fehler aufgetreten.'
    )

    setIsLoading(false)
  }
}

  return (
    <main className="min-h-screen bg-[#fbf9ff] px-4 pb-16 pt-4 text-slate-950">
      <div className="mx-auto max-w-xl space-y-5">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-slate-600 shadow-sm"
        >
          <span aria-hidden="true">←</span>
          Zurück
        </button>

        <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-violet-700 via-violet-600 to-fuchsia-500 p-6 text-white shadow-xl shadow-violet-200">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-white/70">
                Mila Premium
              </p>

              <h1 className="mt-3 text-4xl font-black tracking-tight">
                Mehr Klarheit.
                <br />
                Mehr Mila.
              </h1>
            </div>

            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-3xl backdrop-blur">
              ✨
            </div>
          </div>

          <p className="mt-4 max-w-md text-sm font-semibold leading-relaxed text-white/80">
            Mila begleitet dich noch genauer, erkennt mehr Zusammenhänge und
            wächst mit deinen finanziellen Zielen.
          </p>

          <div className="mt-6 flex items-end gap-2">
            <span className="text-5xl font-black tracking-tight">2,99 €</span>
            <span className="pb-2 text-sm font-bold text-white/70">
              pro Monat
            </span>
          </div>

          <p className="mt-2 text-xs font-semibold text-white/65">
            Monatlich kündbar · Sicherer Checkout über Stripe
          </p>
        </section>

        <section className="rounded-[2rem] bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-500">
            Das steckt drin
          </p>

          <div className="mt-4 space-y-3">
            {PREMIUM_FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="flex gap-4 rounded-2xl bg-violet-50 p-4"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
                  {feature.icon}
                </div>

                <div>
                  <h2 className="font-black text-slate-900">
                    {feature.title}
                  </h2>

                  <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                    {feature.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-violet-100 bg-white p-5 shadow-sm">
          <div className="rounded-2xl bg-emerald-50 p-4">
            <p className="font-black text-emerald-800">
              🧪 Momentan läuft alles im Testmodus
            </p>

            <p className="mt-1 text-xs font-semibold leading-relaxed text-emerald-700">
              Es wird kein echtes Geld abgebucht. Wir testen zuerst den
              vollständigen Ablauf.
            </p>
          </div>

          {error && (
            <div className="mt-4 rounded-2xl bg-red-50 p-4">
              <p className="text-sm font-black text-red-700">
                Checkout konnte nicht gestartet werden
              </p>

              <p className="mt-1 break-words text-xs font-semibold text-red-600">
                {error}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={startCheckout}
            disabled={isLoading}
            className="mt-5 w-full rounded-2xl bg-violet-600 px-5 py-4 text-base font-black text-white shadow-lg shadow-violet-200 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading
              ? 'Stripe wird geöffnet …'
              : 'Mila Premium testen'}
          </button>

          <button
            type="button"
            onClick={() => router.push('/')}
            className="mt-3 w-full rounded-2xl bg-slate-100 px-5 py-4 text-sm font-black text-slate-600"
          >
            Erst einmal kostenlos weitermachen
          </button>
        </section>

        <p className="px-4 text-center text-xs font-semibold leading-relaxed text-slate-400">
          Mila unterstützt dich bei der finanziellen Organisation. Sie ersetzt
          keine individuelle Steuer-, Rechts- oder Finanzberatung.
        </p>
      </div>
    </main>
  )
}