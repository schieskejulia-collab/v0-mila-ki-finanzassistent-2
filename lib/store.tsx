'use client'

import { useFinance } from '@/lib/store'

const STATUS_DETAILS = [
  {
    key: 'angestellt',
    label: 'Angestellt',
    info: 'Fester Job. Mila achtet besonders auf Steuerklasse, Arbeitsmittel, Fahrtkosten und Weiterbildung.',
  },
  {
    key: 'freelancer',
    label: 'Freelancer / Freiberufler',
    info: 'Projektbasiert oder freiberuflich. Mila achtet besonders auf Rücklagen, Software, Fortbildung und Reisekosten.',
  },
  {
    key: 'kleinunternehmer',
    label: 'Kleinunternehmer',
    info: 'Keine Umsatzsteuer auf Rechnungen, aber Einkommensteuer auf Gewinn kann trotzdem relevant sein.',
  },
  {
    key: 'selbstständig',
    label: 'Selbstständig / Gewerbe',
    info: 'Gewerblich tätig. Mila achtet auf Rücklagen, Umsatzsteuer, Gewerbesteuer und Betriebsausgaben.',
  },
] as const

const INDUSTRIES = [
  ['webdesigner', '🎨 Webdesigner'],
  ['fotograf', '📸 Fotograf'],
  ['coach', '🎓 Coach'],
  ['handwerker', '🧰 Handwerker'],
  ['restaurant', '🍽️ Gastronomie'],
  ['ecommerce', '🛒 E-Commerce'],
  ['berater', '💼 Berater'],
  ['sonstiges', '✨ Sonstiges'],
] as const

export default function ProfilPage() {
  const {
    userName,
    setUserName,
    userStatus,
    setUserStatus,
    industry,
    setIndustry,
    taxClass,
    setTaxClass,
    annualGross,
    setAnnualGross,
    annualProfit,
    setAnnualProfit,
    vatStatus,
    setVatStatus,
    federalState,
    setFederalState,
    churchTax,
    setChurchTax,
    married,
    setMarried,
    children,
    setChildren,
    assemblyWork,
    setAssemblyWork,
    logout,
  } = useFinance()

  // Validierung für die Fortschrittsanzeige
  const missing: string[] = []
  if (userStatus !== 'angestellt' && !vatStatus) missing.push('Umsatzsteuerstatus')
  if (!userName) missing.push('Name')
  if (userStatus === 'angestellt' && !taxClass) missing.push('Steuerklasse')
  if (!federalState) missing.push('Bundesland')
  if (!annualGross && userStatus === 'angestellt') missing.push('Jahresbrutto')
  if (!annualProfit && userStatus !== 'angestellt') missing.push('Jahresgewinn')

  const completeness = Math.max(20, 100 - missing.length * 15)

  return (
    <main className="min-h-screen space-y-5 bg-[#fbf9ff] p-4 pb-40 text-slate-950">
      <section className="rounded-[2rem] bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-500">
          Profil
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">Dein Mila-Profil</h1>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
          Je besser dein Profil ausgefüllt ist, desto genauer kann Mila Rücklagen, Hinweise und Erinnerungen einschätzen.
        </p>
      </section>

      <section className="rounded-[2rem] bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Datenqualität</p>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-violet-600" style={{ width: `${completeness}%` }} />
        </div>
        <p className="mt-2 text-sm font-black text-slate-700">{completeness}% vollständig</p>
        {missing.length > 0 && (
          <p className="mt-2 text-xs font-semibold text-slate-500">Fehlt noch: {missing.join(', ')}</p>
        )}
      </section>

      <section className="rounded-[2rem] bg-white p-5 shadow-sm">
        <label className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Name</label>
        <input
          value={userName || ''}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="Dein Name"
          className="mt-2 w-full rounded-2xl border border-violet-100 bg-white p-4 text-lg font-bold outline-none"
        />
      </section>

      <section className="rounded-[2rem] bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Nutzertyp</p>
        <div className="mt-4 space-y-3">
          {STATUS_DETAILS.map((item) => {
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
                <p className="font-black">{isSelected ? '🔘 ' : '⚪ '}{item.label}</p>
                <p className={isSelected ? 'mt-1 text-xs font-semibold text-white/80' : 'mt-1 text-xs font-semibold text-slate-500'}>
                  {item.info}
                </p>
              </button>
            )
          })}
        </div>
      </section>

      <section className="rounded-[2rem] bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Branche</p>
        <select
          value={industry || 'sonstiges'}
          onChange={(e) => setIndustry(e.target.value as any)}
          className="mt-3 w-full rounded-2xl border border-violet-100 bg-white p-4 text-sm font-bold text-slate-700 outline-none"
        >
          {INDUSTRIES.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </section>

      <section className="rounded-[2rem] bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Steuerprofil</p>
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
          Diese Angaben verbessern Milas Einschätzung. Sie ersetzen keine Steuerberatung und werden aktuell nur für Orientierung genutzt.
        </p>
      </section>

      <section className="rounded-[2rem] bg-white p-5 shadow-sm">
        <button
          type="button"
          onClick={() => {
            if (confirm('Möchtest du dich wirklich abmelden? Lokale Daten können zurückgesetzt werden.')) {
              logout()
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
