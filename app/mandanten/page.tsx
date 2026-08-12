'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type MilaClient = {
  id: string
  name: string
  contact?: string
  note?: string
  createdAt: string
}

const CLIENTS_KEY = 'mila-clients-v1'
const ACTIVE_CLIENT_KEY = 'mila-active-client-v1'

function readLocalClients(): MilaClient[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(CLIENTS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function toClient(row: any): MilaClient {
  return {
    id: row.id,
    name: row.name,
    contact: row.contact || '',
    note: row.note || '',
    createdAt: row.created_at || new Date().toISOString(),
  }
}

export default function MandantenPage() {
  const [clients, setClients] = useState<MilaClient[]>([])
  const [activeClientId, setActiveClientId] = useState('')
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [linkStatus, setLinkStatus] = useState<Record<string, string>>({})

  useEffect(() => {
    async function loadClients() {
      const savedActive = window.localStorage.getItem(ACTIVE_CLIENT_KEY) || ''
      setActiveClientId(savedActive)

      const { data, error } = await supabase
        .from('clients')
        .select('id,name,contact,note,created_at')
        .order('created_at', { ascending: false })

      if (!error && data) {
        const remoteClients = data.map(toClient)
        setClients(remoteClients)
        window.localStorage.setItem(CLIENTS_KEY, JSON.stringify(remoteClients))
        setLoading(false)
        return
      }

      setClients(readLocalClients())
      setLoading(false)
    }

    void loadClients()
  }, [])

  const activeClient = useMemo(
    () => clients.find((client) => client.id === activeClientId) || null,
    [clients, activeClientId]
  )

  function persistLocal(nextClients: MilaClient[]) {
    setClients(nextClients)
    window.localStorage.setItem(CLIENTS_KEY, JSON.stringify(nextClients))
  }

  async function addClient() {
    const cleanName = name.trim()
    if (!cleanName) {
      window.alert('Bitte einen Mandantennamen eingeben.')
      return
    }

    const id = globalThis.crypto?.randomUUID?.() || `client-${Date.now()}`
    const createdAt = new Date().toISOString()
    const client: MilaClient = {
      id,
      name: cleanName,
      contact: contact.trim(),
      note: note.trim(),
      createdAt,
    }

    const { error } = await supabase.from('clients').insert({
      id,
      name: client.name,
      contact: client.contact || null,
      note: client.note || null,
      created_at: createdAt,
    })

    if (error) {
      window.alert(`Mandant konnte noch nicht dauerhaft gespeichert werden: ${error.message}`)
      return
    }

    const nextClients = [client, ...clients]
    persistLocal(nextClients)
    setActiveClientId(client.id)
    window.localStorage.setItem(ACTIVE_CLIENT_KEY, client.id)
    setName('')
    setContact('')
    setNote('')
  }

  function selectClient(client: MilaClient) {
    window.localStorage.setItem(ACTIVE_CLIENT_KEY, client.id)
    setActiveClientId(client.id)
    window.location.assign('/')
  }

  async function createPortalLink(client: MilaClient) {
    setLinkStatus((current) => ({ ...current, [client.id]: 'Erstelle Link …' }))

    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    if (!accessToken) {
      setLinkStatus((current) => ({ ...current, [client.id]: 'Bitte neu anmelden.' }))
      return
    }

    const response = await fetch('/api/client-portal/link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ clientId: client.id }),
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok || !data?.url) {
      setLinkStatus((current) => ({
        ...current,
        [client.id]: data?.error || 'Link konnte nicht erstellt werden.',
      }))
      return
    }

    try {
      await navigator.clipboard.writeText(data.url)
      setLinkStatus((current) => ({ ...current, [client.id]: 'Link kopiert ✓' }))
    } catch {
      window.prompt('Mandanten-Link kopieren:', data.url)
      setLinkStatus((current) => ({ ...current, [client.id]: 'Link erstellt ✓' }))
    }
  }

  async function deleteClient(client: MilaClient) {
    const confirmed = window.confirm(
      `${client.name} wirklich aus der Mandantenliste entfernen? Die bereits zugeordneten Unterlagen werden dabei nicht gelöscht.`
    )
    if (!confirmed) return

    const { error } = await supabase.from('clients').delete().eq('id', client.id)
    if (error) {
      window.alert(`Mandant konnte nicht entfernt werden: ${error.message}`)
      return
    }

    const nextClients = clients.filter((item) => item.id !== client.id)
    persistLocal(nextClients)

    if (activeClientId === client.id) {
      setActiveClientId('')
      window.localStorage.removeItem(ACTIVE_CLIENT_KEY)
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-md space-y-5 p-5 pb-32 text-slate-950">
      <header>
        <Link href="/" className="text-sm font-semibold text-slate-500">← Arbeitsplatz</Link>
        <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-violet-600">Mobile Mandantenzentrale</p>
        <h1 className="mt-2 text-3xl font-black">Mandanten</h1>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
          Mandanten auswählen, Rückfragen verwalten und sichere Upload-Links teilen.
        </p>
      </header>

      {activeClient && (
        <section className="rounded-3xl bg-violet-600 p-5 text-white shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-white/70">Aktiver Mandant</p>
          <h2 className="mt-2 text-2xl font-black">{activeClient.name}</h2>
          <p className="mt-2 text-sm font-semibold text-white/80">Neue Buchungen, Dokumente und Rückfragen werden diesem Mandanten zugeordnet.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link href="/dokumente" className="rounded-2xl bg-white px-4 py-3 text-center text-sm font-black text-violet-700">Mappe öffnen</Link>
            <Link href="/rueckfragen" className="rounded-2xl bg-violet-500 px-4 py-3 text-center text-sm font-black text-white">Rückfragen</Link>
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-600">Mandant anlegen</p>
        <div className="mt-4 space-y-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name / Betrieb *" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base font-semibold outline-none focus:border-violet-400" />
          <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Ansprechpartner oder Kontakt (optional)" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base font-semibold outline-none focus:border-violet-400" />
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Kurze Notiz (optional)" rows={3} className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-base font-semibold outline-none focus:border-violet-400" />
          <button type="button" onClick={() => void addClient()} className="w-full rounded-2xl bg-violet-600 px-4 py-4 text-base font-black text-white">Mandant anlegen</button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3 px-1">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Deine Mandanten</p>
            <h2 className="mt-1 text-xl font-black">{loading ? 'Lädt …' : `${clients.length} angelegt`}</h2>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">Ziel: 5+ mobil</span>
        </div>

        {!loading && clients.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-violet-200 bg-violet-50 p-5 text-sm font-semibold leading-relaxed text-slate-600">
            Noch keine Mandanten angelegt. Für den Test kannst du zwei fiktive Betriebe anlegen; echte Daten brauchen wir dafür nicht.
          </div>
        ) : (
          clients.map((client) => {
            const selected = client.id === activeClientId
            return (
              <article key={client.id} className={`rounded-3xl border p-5 shadow-sm ${selected ? 'border-violet-300 bg-violet-50' : 'border-slate-100 bg-white'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-black">{client.name}</p>
                    {client.contact && <p className="mt-1 text-sm font-semibold text-slate-500">{client.contact}</p>}
                  </div>
                  {selected && <span className="rounded-full bg-violet-600 px-3 py-1 text-xs font-black text-white">Aktiv</span>}
                </div>
                {client.note && <p className="mt-3 rounded-2xl bg-white/80 p-3 text-sm font-semibold leading-relaxed text-slate-600">{client.note}</p>}

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => selectClient(client)} className={`rounded-xl px-3 py-3 text-sm font-black ${selected ? 'bg-white text-violet-700 ring-1 ring-violet-200' : 'bg-violet-600 text-white'}`}>{selected ? 'Neu laden' : 'Auswählen'}</button>
                  <button type="button" onClick={() => void createPortalLink(client)} className="rounded-xl bg-white px-3 py-3 text-sm font-black text-violet-700 ring-1 ring-violet-200">Upload-Link</button>
                </div>

                {linkStatus[client.id] && (
                  <p className="mt-2 text-center text-xs font-bold text-slate-500">{linkStatus[client.id]}</p>
                )}

                <button type="button" onClick={() => void deleteClient(client)} className="mt-3 w-full rounded-xl bg-white px-3 py-3 text-sm font-black text-red-500 ring-1 ring-red-100">Entfernen</button>
              </article>
            )
          })
        )}
      </section>

      <section className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Sicherer Ablauf</p>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
          Der Mandant erhält nur seinen persönlichen Upload-Link. Er bekommt keinen Zugriff auf deinen Mila-Arbeitsplatz oder andere Mandanten.
        </p>
      </section>
    </main>
  )
}
