'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { FileText, Link2, Plus, CheckCircle2 } from 'lucide-react'
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
    const parsed = JSON.parse(window.localStorage.getItem(CLIENTS_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function toClient(row: any): MilaClient {
  return {
    id: String(row.id),
    name: String(row.name || 'Akte'),
    contact: String(row.contact || ''),
    note: String(row.note || ''),
    createdAt: String(row.created_at || new Date().toISOString()),
  }
}

export default function AktenPage() {
  const [clients, setClients] = useState<MilaClient[]>([])
  const [activeClientId, setActiveClientId] = useState('')
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [context, setContext] = useState('')
  const [linkStatus, setLinkStatus] = useState('')

  useEffect(() => {
    setActiveClientId(window.localStorage.getItem(ACTIVE_CLIENT_KEY) || '')
    const local = readLocalClients()
    setClients(local)

    async function load() {
      const { data, error } = await supabase.from('clients').select('id,name,contact,note,created_at').order('created_at', { ascending: false })
      if (error || !data) return
      const next = data.map(toClient)
      setClients(next)
      window.localStorage.setItem(CLIENTS_KEY, JSON.stringify(next))
    }
    void load()
  }, [])

  const activeClient = useMemo(() => clients.find((client) => client.id === activeClientId) || null, [clients, activeClientId])

  function persist(next: MilaClient[]) {
    setClients(next)
    window.localStorage.setItem(CLIENTS_KEY, JSON.stringify(next))
  }

  async function addClient() {
    const cleanName = name.trim()
    if (!cleanName) {
      window.alert('Bitte einen Namen für die Akte eingeben.')
      return
    }
    const id = crypto.randomUUID()
    const createdAt = new Date().toISOString()
    const client: MilaClient = { id, name: cleanName, contact: contact.trim(), note: context.trim(), createdAt }

    const { error } = await supabase.from('clients').insert({
      id,
      name: client.name,
      contact: client.contact || null,
      note: client.note || null,
      created_at: createdAt,
    })

    if (error) {
      window.alert(`Akte konnte nicht gespeichert werden: ${error.message}`)
      return
    }

    persist([client, ...clients])
    window.localStorage.setItem(ACTIVE_CLIENT_KEY, id)
    setActiveClientId(id)
    setName('')
    setContact('')
    setContext('')
  }

  function selectClient(client: MilaClient) {
    window.localStorage.setItem(ACTIVE_CLIENT_KEY, client.id)
    setActiveClientId(client.id)
  }

  async function createPortalLink() {
    if (!activeClient) return
    setLinkStatus('Link wird erstellt …')
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) {
      setLinkStatus('Für den sicheren Upload-Link fehlt gerade die technische Sitzung.')
      return
    }
    const response = await fetch('/api/client-portal/link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ clientId: activeClient.id }),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok || !payload?.url) {
      setLinkStatus(payload?.error || 'Link konnte nicht erstellt werden.')
      return
    }
    try {
      if (navigator.share) {
        await navigator.share({ title: `Unterlagen für ${activeClient.name}`, text: 'Hier können Unterlagen sicher eingereicht werden:', url: payload.url })
        setLinkStatus('Link geteilt ✓')
      } else {
        await navigator.clipboard.writeText(payload.url)
        setLinkStatus('Link kopiert ✓')
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') setLinkStatus('Teilen abgebrochen.')
      else window.prompt('Upload-Link kopieren:', payload.url)
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-md space-y-5 px-4 pb-32 pt-5 text-slate-950">
      <header className="px-1">
        <Link href="/mehr" className="text-sm font-black text-slate-500">← Mehr</Link>
        <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-violet-600">Akten</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">Wer gehört hierher?</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
          Kein globales Berufsprofil. Mila bekommt den nötigen Kontext direkt aus der jeweiligen Akte.
        </p>
      </header>

      {activeClient && (
        <section className="rounded-[2rem] bg-violet-600 p-5 text-white">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-white/70">Aktive Akte</p>
          <h2 className="mt-2 text-2xl font-black">{activeClient.name}</h2>
          {activeClient.note && <p className="mt-2 text-sm font-semibold leading-6 text-white/80">{activeClient.note}</p>}
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => void createPortalLink()} className="flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-3 text-xs font-black text-violet-700"><Link2 className="h-4 w-4" /> Upload-Link</button>
            <Link href="/dokumente" className="flex items-center justify-center gap-2 rounded-2xl bg-violet-500 px-3 py-3 text-xs font-black text-white"><FileText className="h-4 w-4" /> Mappe</Link>
          </div>
          {linkStatus && <p className="mt-3 text-center text-xs font-bold text-white/80">{linkStatus}</p>}
        </section>
      )}

      <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-600">Neue Akte</p>
        <h2 className="mt-1 text-xl font-black">Drei Angaben reichen zum Start.</h2>
        <div className="mt-4 space-y-3">
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name / Firma" className="w-full rounded-2xl border border-slate-200 p-4 text-sm font-semibold outline-none focus:border-violet-400" />
          <input value={contact} onChange={(event) => setContact(event.target.value)} placeholder="Kontakt, optional" className="w-full rounded-2xl border border-slate-200 p-4 text-sm font-semibold outline-none focus:border-violet-400" />
          <textarea value={context} onChange={(event) => setContext(event.target.value)} placeholder="Was macht die Person/Firma? z. B. Malerbetrieb, Angestellter, Agentur, Kleinunternehmen …" className="min-h-24 w-full rounded-2xl border border-slate-200 p-4 text-sm font-semibold outline-none focus:border-violet-400" />
          <button type="button" onClick={() => void addClient()} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 py-4 font-black text-white"><Plus className="h-5 w-5" /> Akte anlegen</button>
        </div>
      </section>

      <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Vorhandene Akten</p>
        <div className="mt-4 space-y-2">
          {clients.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">Noch keine Akte angelegt.</p>
          ) : clients.map((client) => {
            const active = client.id === activeClientId
            return (
              <button key={client.id} type="button" onClick={() => selectClient(client)} className={`flex w-full items-center gap-3 rounded-2xl p-4 text-left ${active ? 'bg-violet-50 ring-1 ring-violet-200' : 'bg-slate-50'}`}>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-violet-600 text-white' : 'bg-white text-slate-400'}`}><CheckCircle2 className="h-5 w-5" /></div>
                <div className="min-w-0"><p className="truncate text-sm font-black">{client.name}</p><p className="mt-1 truncate text-xs font-semibold text-slate-500">{client.note || client.contact || 'Kontext noch nicht ergänzt'}</p></div>
              </button>
            )
          })}
        </div>
      </section>
    </main>
  )
}
