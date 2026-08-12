'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

type MilaClient = {
  id: string
  name: string
  contact?: string
  note?: string
  createdAt: string
}

const CLIENTS_KEY = 'mila-clients-v1'
const ACTIVE_CLIENT_KEY = 'mila-active-client-v1'

function readClients(): MilaClient[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(CLIENTS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default function MandantenPage() {
  const [clients, setClients] = useState<MilaClient[]>([])
  const [activeClientId, setActiveClientId] = useState('')
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    const savedClients = readClients()
    const savedActive = window.localStorage.getItem(ACTIVE_CLIENT_KEY) || ''
    setClients(savedClients)
    setActiveClientId(savedActive)
  }, [])

  const activeClient = useMemo(
    () => clients.find((client) => client.id === activeClientId) || null,
    [clients, activeClientId]
  )

  function persist(nextClients: MilaClient[]) {
    setClients(nextClients)
    window.localStorage.setItem(CLIENTS_KEY, JSON.stringify(nextClients))
  }

  function addClient() {
    const cleanName = name.trim()
    if (!cleanName) {
      window.alert('Bitte einen Mandantennamen eingeben.')
      return
    }

    const client: MilaClient = {
      id: globalThis.crypto?.randomUUID?.() || `client-${Date.now()}`,
      name: cleanName,
      contact: contact.trim(),
      note: note.trim(),
      createdAt: new Date().toISOString(),
    }

    const nextClients = [client, ...clients]
    persist(nextClients)
    setActiveClientId(client.id)
    window.localStorage.setItem(ACTIVE_CLIENT_KEY, client.id)
    setName('')
    setContact('')
    setNote('')
  }

  function selectClient(client: MilaClient) {
    setActiveClientId(client.id)
    window.localStorage.setItem(ACTIVE_CLIENT_KEY, client.id)
  }

  function deleteClient(client: MilaClient) {
    const confirmed = window.confirm(
      `${client.name} wirklich aus der Mandantenliste entfernen? In diesem ersten Schritt werden noch keine Belege oder Dokumente gelöscht.`
    )
    if (!confirmed) return

    const nextClients = clients.filter((item) => item.id !== client.id)
    persist(nextClients)

    if (activeClientId === client.id) {
      setActiveClientId('')
      window.localStorage.removeItem(ACTIVE_CLIENT_KEY)
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-md space-y-5 p-5 pb-32 text-slate-950">
      <header>
        <Link href="/" className="text-sm font-semibold text-slate-500">
          ← Arbeitsplatz
        </Link>
        <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-violet-600">
          Mobile Mandantenzentrale
        </p>
        <h1 className="mt-2 text-3xl font-black">Mandanten</h1>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
          Lege deine Mandanten an und wähle eindeutig aus, für wen du gerade arbeitest.
        </p>
      </header>

      {activeClient && (
        <section className="rounded-3xl bg-violet-600 p-5 text-white shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-white/70">
            Aktiver Mandant
          </p>
          <h2 className="mt-2 text-2xl font-black">{activeClient.name}</h2>
          <p className="mt-2 text-sm font-semibold text-white/80">
            Dieser Mandant ist für die nächsten Arbeitsschritte ausgewählt.
          </p>
          <Link
            href="/dokumente"
            className="mt-4 inline-flex rounded-2xl bg-white px-4 py-3 text-sm font-black text-violet-700"
          >
            Mandantenmappe öffnen →
          </Link>
        </section>
      )}

      <section className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-600">
          Mandant anlegen
        </p>
        <div className="mt-4 space-y-3">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Name / Betrieb *"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base font-semibold outline-none focus:border-violet-400"
          />
          <input
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            placeholder="Ansprechpartner oder Kontakt (optional)"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base font-semibold outline-none focus:border-violet-400"
          />
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Kurze Notiz (optional)"
            rows={3}
            className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-base font-semibold outline-none focus:border-violet-400"
          />
          <button
            type="button"
            onClick={addClient}
            className="w-full rounded-2xl bg-violet-600 px-4 py-4 text-base font-black text-white"
          >
            Mandant anlegen
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3 px-1">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
              Deine Mandanten
            </p>
            <h2 className="mt-1 text-xl font-black">{clients.length} angelegt</h2>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">
            Ziel: 5+ mobil
          </span>
        </div>

        {clients.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-violet-200 bg-violet-50 p-5 text-sm font-semibold leading-relaxed text-slate-600">
            Noch keine Mandanten angelegt. Für den Test kannst du später zwei fiktive Betriebe anlegen; echte Daten brauchen wir dafür noch nicht.
          </div>
        ) : (
          clients.map((client) => {
            const selected = client.id === activeClientId
            return (
              <article
                key={client.id}
                className={`rounded-3xl border p-5 shadow-sm ${
                  selected
                    ? 'border-violet-300 bg-violet-50'
                    : 'border-slate-100 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-black">{client.name}</p>
                    {client.contact && (
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        {client.contact}
                      </p>
                    )}
                  </div>
                  {selected && (
                    <span className="rounded-full bg-violet-600 px-3 py-1 text-xs font-black text-white">
                      Aktiv
                    </span>
                  )}
                </div>

                {client.note && (
                  <p className="mt-3 rounded-2xl bg-white/80 p-3 text-sm font-semibold leading-relaxed text-slate-600">
                    {client.note}
                  </p>
                )}

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => selectClient(client)}
                    className={`rounded-xl px-3 py-3 text-sm font-black ${
                      selected
                        ? 'bg-white text-violet-700 ring-1 ring-violet-200'
                        : 'bg-violet-600 text-white'
                    }`}
                  >
                    {selected ? 'Ausgewählt' : 'Auswählen'}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteClient(client)}
                    className="rounded-xl bg-white px-3 py-3 text-sm font-black text-red-500 ring-1 ring-red-100"
                  >
                    Entfernen
                  </button>
                </div>
              </article>
            )
          })
        )}
      </section>

      <section className="rounded-3xl border border-amber-100 bg-amber-50 p-5">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">
          Schritt 1
        </p>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
          Die Auswahl funktioniert bereits mobil. Dokumente und Buchungen werden in diesem Schritt bewusst noch nicht automatisch umgehängt. Als Nächstes verbinden wir den aktiven Mandanten sicher mit den Daten.
        </p>
      </section>
    </main>
  )
}
