'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Link2, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type MilaClient = {
  id: string
  name: string
}

const CLIENTS_KEY = 'mila-clients-v1'
const ACTIVE_CLIENT_KEY = 'mila-active-client-v1'
const ACTIVE_CLIENT_COOKIE = 'mila_active_client'

function readCachedClients(): MilaClient[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(CLIENTS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item) => item?.id && item?.name)
      .map((item) => ({ id: String(item.id), name: String(item.name) }))
  } catch {
    return []
  }
}

function persistActiveClient(id: string) {
  if (typeof window === 'undefined') return
  if (id) {
    window.localStorage.setItem(ACTIVE_CLIENT_KEY, id)
    document.cookie = `${ACTIVE_CLIENT_COOKIE}=${encodeURIComponent(id)}; Path=/; SameSite=Lax; Max-Age=2592000`
  } else {
    window.localStorage.removeItem(ACTIVE_CLIENT_KEY)
    document.cookie = `${ACTIVE_CLIENT_COOKIE}=; Path=/; SameSite=Lax; Max-Age=0`
  }
}

export function ClientSwitcher() {
  const pathname = usePathname()
  const [clients, setClients] = useState<MilaClient[]>([])
  const [activeClientId, setActiveClientId] = useState('')
  const [open, setOpen] = useState(false)
  const [portalStatus, setPortalStatus] = useState('')

  const hidden =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname.startsWith('/demo') ||
    pathname.startsWith('/datenschutz') ||
    pathname.startsWith('/impressum') ||
    pathname.startsWith('/agb') ||
    pathname.startsWith('/widerruf') ||
    pathname.startsWith('/sicherheit') ||
    pathname.startsWith('/mandanten') ||
    pathname.startsWith('/mandant-upload')

  useEffect(() => {
    if (hidden) return

    const cached = readCachedClients()
    const storedId = window.localStorage.getItem(ACTIVE_CLIENT_KEY) || ''
    setClients(cached)
    setActiveClientId(storedId)
    persistActiveClient(storedId)

    async function refreshClients() {
      const { data, error } = await supabase
        .from('clients')
        .select('id,name')
        .order('created_at', { ascending: false })

      if (error || !data) return

      const next = data.map((row: any) => ({
        id: String(row.id),
        name: String(row.name || 'Mandant'),
      }))

      setClients(next)
      window.localStorage.setItem(CLIENTS_KEY, JSON.stringify(next))

      if (!storedId && next[0]?.id) {
        persistActiveClient(next[0].id)
        setActiveClientId(next[0].id)
      }
    }

    void refreshClients()
  }, [hidden, pathname])

  const activeClient = useMemo(
    () => clients.find((client) => client.id === activeClientId) || null,
    [clients, activeClientId]
  )

  function switchClient(client: MilaClient) {
    if (client.id === activeClientId) {
      setOpen(false)
      return
    }
    persistActiveClient(client.id)
    setActiveClientId(client.id)
    setOpen(false)
    window.location.reload()
  }

  async function sharePortalLink() {
    if (!activeClient) {
      window.alert('Bitte zuerst einen Mandanten auswählen.')
      return
    }

    setPortalStatus('Link wird erstellt …')
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token

    if (!accessToken) {
      setPortalStatus('Bitte neu anmelden.')
      return
    }

    const response = await fetch('/api/client-portal/link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ clientId: activeClient.id }),
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok || !data?.url) {
      setPortalStatus(data?.error || 'Link konnte nicht erstellt werden.')
      return
    }

    try {
      if (navigator.share) {
        await navigator.share({
          title: `Mila Upload-Link · ${activeClient.name}`,
          text: 'Hier können Unterlagen und Antworten sicher übermittelt werden:',
          url: data.url,
        })
        setPortalStatus('Link geteilt ✓')
        return
      }
      await navigator.clipboard.writeText(data.url)
      setPortalStatus('Link kopiert ✓')
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        setPortalStatus('Teilen abgebrochen.')
        return
      }
      window.prompt('Mandanten-Link kopieren:', data.url)
      setPortalStatus('Link erstellt ✓')
    }
  }

  if (hidden) return null

  return (
    <div className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/96 px-3 py-2 backdrop-blur lg:hidden">
      <div className="relative mx-auto flex max-w-md items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="min-w-0 flex-1 rounded-2xl bg-slate-50 px-4 py-2.5 text-left active:scale-[0.99]"
          aria-expanded={open}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Aktive Akte</p>
              <p className="truncate text-sm font-black text-slate-950">{activeClient?.name || 'Akte auswählen'}</p>
            </div>
            {open ? <ChevronUp className="h-4 w-4 shrink-0 text-violet-600" /> : <ChevronDown className="h-4 w-4 shrink-0 text-violet-600" />}
          </div>
        </button>

        <Link href="/rueckfragen" aria-label="Rückfragen" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm">
          <MessageCircle className="h-5 w-5" />
        </Link>
        <button type="button" aria-label="Upload-Link" onClick={() => void sharePortalLink()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-md shadow-violet-200">
          <Link2 className="h-5 w-5" />
        </button>

        {open && (
          <div className="absolute left-0 right-0 top-[calc(100%+0.45rem)] z-50 max-h-72 space-y-2 overflow-y-auto rounded-2xl border border-violet-100 bg-white p-2 shadow-xl">
            {clients.length === 0 ? (
              <div className="p-3">
                <p className="text-sm font-semibold text-slate-500">Noch keine Akten vorhanden.</p>
                <Link href="/mandanten" className="mt-2 inline-flex text-sm font-black text-violet-700">Akte anlegen →</Link>
              </div>
            ) : clients.map((client) => {
              const selected = client.id === activeClientId
              return (
                <button key={client.id} type="button" onClick={() => switchClient(client)} className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-black ${selected ? 'bg-violet-600 text-white' : 'bg-slate-50 text-slate-800'}`}>
                  <span className="truncate">{client.name}</span>
                  <span className="ml-3 shrink-0 text-[10px]">{selected ? 'Aktiv' : 'Öffnen'}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
      {portalStatus && <p className="mt-1 text-center text-[10px] font-bold text-slate-500">{portalStatus}</p>}
    </div>
  )
}
