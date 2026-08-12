'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ProfilDatenschutzPage() {
  const [message, setMessage] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  async function getAccessToken() {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? null
  }

  async function exportData() {
    setIsBusy(true)
    setMessage(null)
    const token = await getAccessToken()

    if (!token) {
      setMessage('Du bist nicht angemeldet.')
      setIsBusy(false)
      return
    }

    const response = await fetch('/api/privacy/export', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })

    if (!response.ok) {
      setMessage('Export konnte nicht erstellt werden.')
      setIsBusy(false)
      return
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'mila-datenexport.json'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)

    setMessage('Dein Datenexport wurde erstellt.')
    setIsBusy(false)
  }

  async function deleteData() {
    const confirmed = window.confirm(
      'Willst du deine gespeicherten Mila-Nutzerdaten und zuordenbaren Mandanten-Uploads wirklich löschen? Dein Login-Konto bleibt dabei bestehen.'
    )
    if (!confirmed) return

    setIsBusy(true)
    setMessage(null)
    const token = await getAccessToken()

    if (!token) {
      setMessage('Du bist nicht angemeldet.')
      setIsBusy(false)
      return
    }

    const response = await fetch('/api/privacy/delete', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: 'MILA_DATEN_LOESCHEN' }),
    })

    const result = await response.json().catch(() => null)
    if (!response.ok) {
      setMessage(result?.error ?? 'Löschung konnte nicht ausgeführt werden.')
      setIsBusy(false)
      return
    }

    setMessage(
      Array.isArray(result?.skipped) && result.skipped.length > 0
        ? 'Die Löschung wurde ausgeführt, aber einzelne optionale Tabellen konnten nicht verarbeitet werden. Bitte den technischen Bericht prüfen.'
        : 'Gespeicherte Mila-Nutzerdaten und zuordenbare Mandanten-Uploads wurden gelöscht. Dein Login-Konto bleibt bestehen.'
    )
    setIsBusy(false)
  }

  async function deleteAccount() {
    const first = window.confirm(
      'Willst du dein Mila-Konto vollständig löschen? Dabei werden Nutzerdaten, zuordenbare Uploads und anschließend das Login-Konto entfernt.'
    )
    if (!first) return

    const typed = window.prompt('Zur Bestätigung bitte LÖSCHEN eingeben.')
    if (typed !== 'LÖSCHEN') {
      setMessage('Kontolöschung abgebrochen – Bestätigung stimmte nicht überein.')
      return
    }

    setIsBusy(true)
    setMessage(null)
    const token = await getAccessToken()
    if (!token) {
      setMessage('Du bist nicht angemeldet.')
      setIsBusy(false)
      return
    }

    const response = await fetch('/api/account/delete', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    const result = await response.json().catch(() => null)

    if (!response.ok) {
      setMessage(result?.error ?? 'Das Konto konnte nicht vollständig gelöscht werden.')
      setIsBusy(false)
      return
    }

    await supabase.auth.signOut()
    window.localStorage.clear()
    window.location.href = '/login'
  }

  return (
    <main className="min-h-screen bg-[#fbf9ff] px-5 py-8 text-slate-950">
      <section className="mx-auto max-w-md space-y-5">
        <div className="rounded-[2rem] border border-violet-100 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-600">Konto & Datenschutz</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight">Meine Daten</h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Hier kannst du deine gespeicherten Mila-Daten exportieren, Nutzerdaten löschen oder dein Konto vollständig entfernen.
          </p>
        </div>

        <section className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm">
          <h2 className="font-black">Datenkopie</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Erstellt eine JSON-Kopie der über dein Nutzerkonto zugänglichen Mila-Daten.</p>
          <button type="button" onClick={exportData} disabled={isBusy} className="mt-4 w-full rounded-2xl bg-violet-600 px-5 py-4 text-sm font-black text-white disabled:opacity-60">
            Daten exportieren
          </button>
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <h2 className="font-black text-amber-900">Nutzerdaten löschen</h2>
          <p className="mt-2 text-sm leading-6 text-amber-900/80">Löscht gespeicherte Nutzerdaten und zuordenbare Mandanten-Uploads. Das Login-Konto bleibt bestehen.</p>
          <button type="button" onClick={deleteData} disabled={isBusy} className="mt-4 w-full rounded-2xl border border-amber-300 bg-white px-5 py-4 text-sm font-black text-amber-800 disabled:opacity-60">
            Meine Mila-Daten löschen
          </button>
        </section>

        <section className="rounded-3xl border border-red-200 bg-red-50 p-5 shadow-sm">
          <h2 className="font-black text-red-800">Konto vollständig löschen</h2>
          <p className="mt-2 text-sm leading-6 text-red-700">Entfernt nach einer zweiten Bestätigung auch dein Supabase-Login-Konto. Dieser Schritt ist nicht rückgängig zu machen.</p>
          <button type="button" onClick={deleteAccount} disabled={isBusy} className="mt-4 w-full rounded-2xl bg-red-600 px-5 py-4 text-sm font-black text-white disabled:opacity-60">
            Konto vollständig löschen
          </button>
        </section>

        {message && <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">{message}</div>}

        <div className="rounded-2xl bg-slate-50 p-4 text-xs leading-5 text-slate-600">
          Löschungen betreffen technisch zuordenbare Mila-Daten. Gesetzliche Aufbewahrungspflichten oder Daten, die bei eigenständig Verantwortlichen verarbeitet werden, können davon getrennt zu beurteilen sein.
        </div>
      </section>
    </main>
  )
}
