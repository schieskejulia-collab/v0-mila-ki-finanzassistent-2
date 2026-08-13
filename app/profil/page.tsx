'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useFinance } from '@/lib/store'

const USER_TYPES = [
  {
    key: 'freiberufler',
    label: 'Freelancer / Freiberufler',
  },
  {
    key: 'kleinunternehmer',
    label: 'Kleinunternehmer',
  },
  {
    key: 'selbststaendig_gewerbe',
    label: 'Selbstständig / Gewerbe',
  },
  {
    key: 'angestellt',
    label: 'Angestellt',
  },
] as const

const INDUSTRIES = [
  ['digital', 'Digital / KI / Automatisierung'],
  ['kreativ', 'Kreativ / Medien'],
  ['beratung', 'Beratung'],
  ['handwerk', 'Handwerk'],
  ['gesundheit', 'Gesundheit & Pflege'],
  ['gastro', 'Gastronomie'],
  ['handel', 'Handel / E-Commerce'],
  ['dienstleistung', 'Dienstleistung'],
  ['bildung', 'Bildung / Coaching'],
  ['sonstiges', 'Sonstiges'],
] as const

export default function ProfilPage() {
  const router = useRouter()

  const {
    userName,
    setUserName,
    userStatus,
    setUserStatus,
    industry,
    setIndustry,
    logout,
  } = useFinance()

  useEffect(() => {
    const saved =
      localStorage.getItem(
        'mila_workspace_profile'
      )

    if (!saved) return

    try {
      const profile =
        JSON.parse(saved)

      setUserName(
        profile.userName || ''
      )
      setUserStatus(
        profile.userStatus ||
          'freiberufler'
      )
      setIndustry(
        profile.industry ||
          'dienstleistung'
      )
    } catch {
      // Ungültige lokale Alt-Daten werden ignoriert.
    }
  }, [
    setIndustry,
    setUserName,
    setUserStatus,
  ])

  useEffect(() => {
    localStorage.setItem(
      'mila_workspace_profile',
      JSON.stringify({
        userName,
        userStatus,
        industry,
      })
    )
  }, [
    userName,
    userStatus,
    industry,
  ])

  async function handleLogout() {
    await logout()
    router.replace('/login')
  }

  return (
    <main className="mx-auto min-h-screen max-w-md space-y-5 bg-[#fbf9ff] p-6 pb-40 text-slate-950">
      <header>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">
          Arbeitsplatz
        </p>

        <h1 className="mt-2 text-3xl font-black">
          Profil
        </h1>

        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
          Grunddaten für deinen Mila-Arbeitsbereich. Steuerliche
          Selbsteinschätzungen und Premium-Abos gehören nicht mehr in diesen
          Workflow.
        </p>
      </header>

      <section className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm">
        <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
          Name
        </label>

        <input
          value={userName}
          onChange={(event) =>
            setUserName(
              event.target.value
            )
          }
          placeholder="Name"
          className="mt-2 w-full rounded-2xl border border-violet-100 p-4 font-bold outline-none focus:ring-2 focus:ring-violet-500"
        />
      </section>

      <section className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
          Arbeitskontext
        </p>

        <select
          value={userStatus}
          onChange={(event) =>
            setUserStatus(
              event.target.value as any
            )
          }
          className="mt-3 w-full rounded-2xl border border-violet-100 p-4 font-bold outline-none focus:ring-2 focus:ring-violet-500"
        >
          {USER_TYPES.map(
            (item) => (
              <option
                key={item.key}
                value={item.key}
              >
                {item.label}
              </option>
            )
          )}
        </select>

        <select
          value={industry}
          onChange={(event) =>
            setIndustry(
              event.target.value as any
            )
          }
          className="mt-3 w-full rounded-2xl border border-violet-100 p-4 font-bold outline-none focus:ring-2 focus:ring-violet-500"
        >
          {INDUSTRIES.map(
            ([value, label]) => (
              <option
                key={value}
                value={value}
              >
                {label}
              </option>
            )
          )}
        </select>
      </section>

      <section className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-600">
          Datenschutz
        </p>

        <h2 className="mt-2 text-xl font-black">
          Meine Daten verwalten
        </h2>

        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
          Datenexport und Löschfunktionen findest du im separaten
          Datenschutzbereich.
        </p>

        <Link
          href="/profil/datenschutz"
          className="mt-4 inline-flex rounded-2xl bg-violet-600 px-4 py-3 text-sm font-black text-white"
        >
          Datenschutz öffnen
        </Link>
      </section>

      <button
        type="button"
        onClick={handleLogout}
        className="w-full rounded-2xl border border-slate-200 bg-white py-4 font-black text-slate-700"
      >
        Abmelden
      </button>
    </main>
  )
}