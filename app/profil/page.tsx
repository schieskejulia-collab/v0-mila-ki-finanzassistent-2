'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useFinance } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import { clearMilaLocalData } from '@/lib/privacy'
const USER_TYPES = [
  {
    key: 'angestellt',
    label: 'Angestellt',
    info: 'Fester Job. Mila achtet besonders auf Steuerklasse, Arbeitsmittel, Fahrtkosten und Weiterbildung.',
  },
  {
    key: 'freiberufler',
    label: 'Freelancer / Freiberufler',
    info: 'Projektbasiert oder freiberuflich. Mila achtet besonders auf Rücklagen, Software, Fortbildung und Reisekosten.',
  },
  {
    key: 'kleinunternehmer',
    label: 'Kleinunternehmer',
    info: 'Keine Umsatzsteuer auf Rechnungen, aber Einkommensteuer auf Gewinn kann trotzdem relevant sein.',
  },
  {
    key: 'selbststaendig_gewerbe',
    label: 'Selbstständig / Gewerbe',
    info: 'Gewerblich tätig. Mila achtet auf Rücklagen, Umsatzsteuer, Gewerbesteuer und Betriebsausgaben.',
  },
] as const

const INDUSTRIES = [
  ['digital', '🤖 Digital / KI / Automatisierung'],
  ['kreativ', '🎨 Kreativ / Medien'],
  ['beratung', '💼 Beratung'],
  ['handwerk', '🧰 Handwerk'],
  ['gesundheit', '🌱 Gesundheit & Pflege'],
  ['gastro', '🍽️ Gastronomie'],
  ['handel', '🛒 Handel / E-Commerce'],
  ['dienstleistung', '🧹 Dienstleistung'],
  ['bildung', '🎓 Bildung / Coaching'],
  ['sonstiges', '✨ Sonstiges'],
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

  const handleLogout = async () => {
    await logout()
    router.replace('/login')
  }

  const handleDeleteAccount = async () => {
    const firstConfirm = confirm(
      'Möchtest du dein Mila-Konto und deine Cloud-Daten wirklich dauerhaft löschen?'
    )

    if (!firstConfirm) return

    const secondConfirm = confirm(
      'Letzte Sicherheitsfrage: Das kann nicht rückgängig gemacht werden. Wirklich löschen?'
    )

    if (!secondConfirm) return

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.access_token) {
      alert('Bitte melde dich erneut an, bevor du dein Konto löschst.')
      return
    }

    const response = await fetch('/api/account/delete', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    })

    const result = await response.json().catch(() => null)

    if (!response.ok || !result?.success) {
      alert(
        result?.error ||
          'Konto-Löschung ist gerade nicht möglich.'
      )
      return
    }

    clearMilaLocalData()
    await supabase.auth.signOut()
    alert('Dein Mila-Konto und deine Cloud-Daten wurden gelöscht.')
    router.replace('/login')
  }

  const handleStartCheckout = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.access_token) {
      alert('Bitte melde dich erneut an, bevor du Mila Premium aktivierst.')
      return
    }

    const response = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    })

    const result = await response.json().catch(() => null)

    if (!response.ok || !result?.url) {
      alert(
        result?.error ||
          'Stripe Checkout konnte gerade nicht geöffnet werden.'
      )
      return
    }

    window.location.href = result.url
  }

  const [taxClass, setTaxClass] = useState('1')
  const [federalState, setFederalState] = useState('')
  const [churchTax, setChurchTax] = useState('nein')
  const [children, setChildren] = useState('0')
  const [married, setMarried] = useState('nein')
  const [annualGross, setAnnualGross] = useState('')
  const [annualProfit, setAnnualProfit] = useState('')
  const [assemblyWork, setAssemblyWork] = useState('nein')
  const [vatStatus, setVatStatus] = useState('kleinunternehmer')
  const [subscriptionStatus, setSubscriptionStatus] = useState('loading')
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null)
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false)
  const missing: string[] = []
  if (userStatus !== 'angestellt' && !vatStatus) missing.push('Umsatzsteuerstatus')
  if (!userName) missing.push('Name')
  if (userStatus === 'angestellt' && !taxClass) missing.push('Steuerklasse')
  if (!federalState) missing.push('Bundesland')
  if (!annualGross && userStatus === 'angestellt') missing.push('Jahresbrutto')
  if (!annualProfit && userStatus !== 'angestellt') missing.push('Jahresgewinn')

  const completeness = Math.max(20, 100 - missing.length * 15)
useEffect(() => {
  const saved = localStorage.getItem('mila_profile')
  if (!saved) return

  try {
    const profile = JSON.parse(saved)
setUserName(profile.userName || '')
    setUserStatus(profile.userStatus || 'freelancer')
    setIndustry(profile.industry || 'webdesign')
    setAnnualGross(profile.annualGross || '')
    setAnnualProfit(profile.annualProfit || '')
    setVatStatus(profile.vatStatus || 'kleinunternehmer')
    setFederalState(profile.federalState || 'Sachsen-Anhalt')
    setChurchTax(profile.churchTax || 'nein')
    setMarried(profile.married || 'nein')
    setChildren(profile.children || '')
    setAssemblyWork(profile.assemblyWork || 'nein')
  } catch (error) {
    console.error('Fehler beim Laden des Profils', error)
  }
}, [])

useEffect(() => {
  let cancelled = false

  async function loadSubscription() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      if (!cancelled) setSubscriptionStatus('inactive')
      return
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .select('status, current_period_end, cancel_at_period_end')
      .eq('user_id', user.id)
      .maybeSingle()

    if (cancelled) return

    if (error) {
      console.error('Premium-Status konnte nicht geladen werden', error)
      setSubscriptionStatus('inactive')
      return
    }

    setSubscriptionStatus(data?.status || 'inactive')
    setSubscriptionEnd(data?.current_period_end || null)
    setCancelAtPeriodEnd(data?.cancel_at_period_end === true)
  }

  void loadSubscription()

  return () => {
    cancelled = true
  }
}, [])

useEffect(() => {
  localStorage.setItem(
    'mila_profile',
    JSON.stringify({
      userName,
      userStatus,
      industry,
      annualGross,
      annualProfit,
      vatStatus,
      federalState,
      churchTax,
      married,
      children,
      assemblyWork,
    })
  )
}, [
  userName,
  userStatus,
  industry,
  annualGross,
  annualProfit,
  vatStatus,
  federalState,
  churchTax,
  married,
  children,
  assemblyWork,
])

  const premiumActive =
    subscriptionStatus === 'active' || subscriptionStatus === 'trialing'

  const premiumEndText = subscriptionEnd
    ? new Date(subscriptionEnd).toLocaleDateString('de-DE')
    : ''
  return (
    <main className="min-h-screen space-y-5 bg-[#fbf9ff] p-4 pb-40 text-slate-950">
      <section className="rounded-[2rem] bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-500">
          Profil
        </p>

        <h1 className="mt-3 text-3xl font-black tracking-tight">
          Dein Mila-Profil
        </h1>

        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
          Je besser dein Profil ausgefüllt ist, desto genauer kann Mila Rücklagen,
          Hinweise und Erinnerungen einschätzen.
        </p>
      </section>

      <section className="rounded-[2rem] bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
          Datenqualität
        </p>

        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-violet-600"
            style={{ width: `${completeness}%` }}
          />
        </div>

        <p className="mt-2 text-sm font-black text-slate-700">
          {completeness}% vollständig
        </p>

        {missing.length > 0 && (
          <p className="mt-2 text-xs font-semibold text-slate-500">
            Fehlt noch: {missing.join(', ')}
          </p>
        )}
      </section>

      <section className="rounded-[2rem] bg-white p-5 shadow-sm">
        <label className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
          Name
        </label>

        <input
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="Dein Name"
          className="mt-2 w-full rounded-2xl border border-violet-100 bg-white p-4 text-lg font-bold outline-none"
        />
      </section>

      <section className="rounded-[2rem] bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
          Nutzertyp
        </p>

        <div className="mt-4 space-y-3">
          {USER_TYPES.map((item) => {
            const isSelected = userStatus === item.key

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setUserStatus(item.key)}
                className={
                  isSelected
                    ? 'w-full rounded-2xl bg-violet-600 p-4 text-left text-white shadow-sm'
                    : 'w-full rounded-2xl bg-violet-50 p-4 text-left text-slate-700'
                }
              >
                <p className="font-black">
                  {isSelected ? '🔘 ' : '⚪ '}
                  {item.label}
                </p>

                <p
                  className={
                    isSelected
                      ? 'mt-1 text-xs font-semibold text-white/80'
                      : 'mt-1 text-xs font-semibold text-slate-500'
                  }
                >
                  {item.info}
                </p>
              </button>
            )
          })}
        </div>
      </section>

      <section className="rounded-[2rem] bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
          Branche
        </p>

        <select
          value={industry}
          onChange={(e) => setIndustry(e.target.value as any)}
          className="mt-3 w-full rounded-2xl border border-violet-100 bg-white p-4 text-sm font-bold text-slate-700 outline-none"
        >
          {INDUSTRIES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </section>

      <section className="rounded-[2rem] bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
          Steuerprofil
        </p>

        <div className="mt-4 space-y-3">
          {userStatus === 'angestellt' && (
            <>
              <select
                value={taxClass}
                onChange={(e) => setTaxClass(e.target.value)}
                className="w-full rounded-2xl border border-violet-100 bg-white p-4 text-sm font-bold outline-none"
              >
                <option value="1">Steuerklasse I</option>
                <option value="2">Steuerklasse II</option>
                <option value="3">Steuerklasse III</option>
                <option value="4">Steuerklasse IV</option>
                <option value="5">Steuerklasse V</option>
                <option value="6">Steuerklasse VI</option>
              </select>

              <input
                value={annualGross}
                onChange={(e) => setAnnualGross(e.target.value)}
                inputMode="decimal"
                placeholder="Jahresbrutto z.B. 38000"
                className="w-full rounded-2xl border border-violet-100 bg-white p-4 text-sm font-bold outline-none"
              />
            </>
          )}

          {userStatus !== 'angestellt' && (
            <input
              value={annualProfit}
              onChange={(e) => setAnnualProfit(e.target.value)}
              inputMode="decimal"
              placeholder="Geschätzter Jahresgewinn"
              className="w-full rounded-2xl border border-violet-100 bg-white p-4 text-sm font-bold outline-none"
            />
          )}
{userStatus !== 'angestellt' && (
  <select
    value={vatStatus}
    onChange={(e) => setVatStatus(e.target.value)}
    className="w-full rounded-2xl border border-violet-100 bg-white p-4 text-sm font-bold outline-none"
  >
    <option value="kleinunternehmer">Kleinunternehmer (§19 UStG)</option>
    <option value="regelbesteuerung_19">Regelbesteuerung 19%</option>
    <option value="ermaessigt_7">Ermäßigter Satz 7%</option>
  </select>
)}

          <input
            value={federalState}
            onChange={(e) => setFederalState(e.target.value)}
            placeholder="Bundesland"
            className="w-full rounded-2xl border border-violet-100 bg-white p-4 text-sm font-bold outline-none"
          />

          <select
            value={churchTax}
            onChange={(e) => setChurchTax(e.target.value)}
            className="w-full rounded-2xl border border-violet-100 bg-white p-4 text-sm font-bold outline-none"
          >
            <option value="nein">Keine Kirchensteuer</option>
            <option value="ja">Kirchensteuerpflichtig</option>
          </select>

          <select
            value={married}
            onChange={(e) => setMarried(e.target.value)}
            className="w-full rounded-2xl border border-violet-100 bg-white p-4 text-sm font-bold outline-none"
          >
            <option value="nein">Nicht verheiratet</option>
            <option value="ja">Verheiratet</option>
          </select>

          <input
            value={children}
            onChange={(e) => setChildren(e.target.value)}
            inputMode="numeric"
            placeholder="Kinderanzahl"
            className="w-full rounded-2xl border border-violet-100 bg-white p-4 text-sm font-bold outline-none"
          />

          <select
            value={assemblyWork}
            onChange={(e) => setAssemblyWork(e.target.value)}
            className="w-full rounded-2xl border border-violet-100 bg-white p-4 text-sm font-bold outline-none"
          >
            <option value="nein">Keine Montage/Außendienst</option>
            <option value="ja">Montage/Außendienst vorhanden</option>
          </select>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-slate-500">
          Diese Angaben verbessern Milas Einschätzung. Sie ersetzen keine
          Steuerberatung und werden aktuell nur für Orientierung genutzt.
        </p>
      </section>
<button
  onClick={() => {
    localStorage.setItem(
      'mila-profile-saved',
      new Date().toISOString()
    )

    alert('✅ Dein Mila-Profil wurde gespeichert')
  }}
  className="
    w-full rounded-[2rem]
    bg-gradient-to-r from-purple-600 to-violet-500
    p-5
    text-xl
    font-black
    text-white
    shadow-lg
  "
>
  💾 Profil speichern
</button>
      <section className="rounded-[2rem] bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-500">
          Mila Premium
        </p>

        {subscriptionStatus === 'loading' ? (
          <p className="mt-3 text-sm font-semibold text-slate-500">
            Premium-Status wird geprüft …
          </p>
        ) : premiumActive ? (
          <div className="mt-3 rounded-2xl bg-emerald-50 p-4 text-emerald-700">
            <p className="font-black">✅ Mila Premium ist aktiv</p>
            <p className="mt-1 text-sm font-semibold">
              {cancelAtPeriodEnd
                ? premiumEndText
                  ? `Dein Zugang läuft bis zum ${premiumEndText}.`
                  : 'Dein Zugang läuft zum Ende des aktuellen Zeitraums aus.'
                : premiumEndText
                  ? `Nächste Verlängerung: ${premiumEndText}.`
                  : 'Dein Premium-Zugang ist freigeschaltet.'}
            </p>
          </div>
        ) : (
          <>
            <h2 className="mt-3 text-xl font-black tracking-tight">
              Premium aktivieren
            </h2>

            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
              {subscriptionStatus === 'past_due'
                ? 'Die letzte Zahlung konnte nicht verarbeitet werden. Bitte öffne den Checkout erneut.'
                : 'Starte Mila Premium für Berichte, Auswertungen und kommende Komfortfunktionen.'}
            </p>

            <button
              type="button"
              onClick={handleStartCheckout}
              className="mt-4 w-full rounded-2xl bg-violet-600 py-4 text-sm font-black text-white shadow-sm"
            >
              Mila Premium für 2,99 € / Monat aktivieren
            </button>
          </>
        )}
      </section>
      <section className="rounded-[2rem] bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-rose-500">
          Datenschutz
        </p>

        <h2 className="mt-3 text-xl font-black tracking-tight">
          Deine Daten behalten die Kontrolle bei dir
        </h2>

        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
          Du kannst lokale Mila-Daten von diesem Gerät entfernen. Deine
          Cloud-Daten in Supabase werden dadurch nicht gelöscht.
        </p>

        <button
          type="button"
          onClick={() => {
            const confirmed = confirm(
              'Möchtest du die lokalen Mila-Daten auf diesem Gerät wirklich löschen? Cloud-Daten bleiben bestehen.'
            )

            if (!confirmed) return

            clearMilaLocalData()
            alert('Lokale Mila-Daten wurden auf diesem Gerät gelöscht.')
            window.location.reload()
          }}
          className="mt-4 w-full rounded-2xl bg-rose-50 py-4 text-sm font-black text-rose-600"
        >
          Lokale Gerätedaten löschen
        </button>

        <p className="mt-3 text-xs font-semibold leading-relaxed text-slate-400">
          Für vollständige Cloud-Löschung braucht Mila serverseitig den
          Supabase-Admin-Key in Vercel. Dieser Key darf niemals im Browser oder
          als NEXT_PUBLIC-Variable landen.
        </p>

        <button
          type="button"
          onClick={handleDeleteAccount}
          className="mt-4 w-full rounded-2xl border border-rose-100 bg-white py-4 text-sm font-black text-rose-700"
        >
          Konto & Cloud-Daten dauerhaft löschen
        </button>
      </section>

      <section className="rounded-[2rem] bg-white p-5 shadow-sm">
  <button
    type="button"
    onClick={async () => {
      if (
        confirm(
          'Möchtest du dich wirklich abmelden?'
        )
      ) {
        await handleLogout()
      }
    }}
    className="w-full rounded-2xl bg-rose-50 py-4 text-sm font-black text-rose-600"
  >
    Abmelden
  </button>
</section>
    </main>
  )
}