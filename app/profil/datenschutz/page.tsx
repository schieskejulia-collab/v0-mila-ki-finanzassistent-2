'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ProfilDatenschutzPage() {
  const [message, setMessage] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  async function getAccessToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession()

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
      headers: {
        Authorization: `Bearer ${token}`,
      },
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
      'Willst du deine Mila-Daten wirklich löschen? Dieser Schritt kann nicht einfach rückgängig gemacht werden.'
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
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ confirm: 'MILA_DATEN_LOESCHEN' }),
    })

    const result = await response.json().catch(() => null)

    if (!response.ok) {
      setMessage(result?.error ?? 'Löschung konnte nicht ausgeführt werden.')
      setIsBusy(false)
      return
    }

    setMessage('Löschung wurde ausgeführt. Bitte prüfe, ob dein Konto zusätzlich entfernt werden soll.')
    setIsBusy(false)
  }

  return (
    <main className="min-h-screen bg-[#fbf9ff] px-5 py-8 text-slate-950">
      <section className="mx-auto max-w-md space-y-5">
        <div className="rounded-[2rem] border border-violet-100 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-600">Konto</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight">Meine Daten</h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Hier kannst du deine Mila-Daten exportieren oder die Löschung deiner gespeicherten Nutzerdaten auslösen.
          </p>
        </div>

        <button
          type="button"
          onClick={exportData}
          disabled={isBusy}
          className="w-full rounded-3xl bg-violet-600 px-5 py-4 text-sm font-black text-white shadow-sm disabled:opacity-60"
        >
          Daten exportieren
        </button>

        <button
          type="button"
          onClick={deleteData}
          disabled={isBusy}
          className="w-full rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-black text-red-700 disabled:opacity-60"
        >
          Meine Mila-Daten löschen
        </button>

        {message && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">
            {message}
          </div>
        )}

        <div className="rounded-2xl bg-slate-50 p-4 text-xs leading-5 text-slate-600">
          Hinweis: Die technische Datenlöschung löscht nutzerbezogene Tabellen soweit möglich. Das Auth-Konto
          kann je nach Supabase-Konfiguration zusätzlich per Admin-Funktion gelöscht werden.
        </div>
      </section>
    </main>
  )
}