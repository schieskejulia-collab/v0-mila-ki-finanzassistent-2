'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type MilaClient = {
  id: string
  name: string
}

const CLIENTS_KEY = 'mila-clients-v1'
const ACTIVE_CLIENT_KEY = 'mila-active-client-v1'

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
    setClients(cached)
    setActiveClientId(window.localStorage.getItem(ACTIVE_CLIENT_KEY) || '')

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

    window.localStorage.setItem(ACTIVE_CLIENT_KEY, client.id)
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
          text: `Hier können Unterlagen und Antworten sicher übermittelt werden:`,
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
    <div className="sticky top-0 z-40 px-4 pt-2">
      <div className="relative rounded-2xl border border-violet-100 bg-white/95 p-2 shadow-sm backdrop-blur">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="min-w-0 flex-1 rounded-xl bg-violet-50 px-3 py-2 text-left active:scale-[0.99]"
            aria-expanded={open}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-violet-500">
                  Mandant
                </p>
                <p className="truncate text-sm font-black text-slate-950">
                  {activeClient?.name || 'Noch keinen ausgewählt'}
                </p>
              </div>
              <span className="shrink-0 text-xs font-black text-violet-700">
                {open ? '▲' : '▼'}
              </span>
            </div>
          </button>

          <Link
            href="/mandanten"
            className="shrink-0 rounded-xl border border-violet-100 bg-white px-3 py-3 text-[11px] font-black text-violet-700"
            aria-label="Mandanten verwalten"
          >
            Verwalten
          </Link>
        </div>

        {activeClient && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Link
              href="/rueckfragen"
              className="rounded-xl bg-violet-50 px-3 py-2.5 text-center text-[11px] font-black text-violet-700"
            >
              💬 Rückfrage
            </Link>
            <button
              type="button"
              onClick={() => void sharePortalLink()}
              className="rounded-xl bg-violet-600 px-3 py-2.5 text-center text-[11px] font-black text-white"
            >
              🔗 Upload-Link
            </button>
          </div>
        )}

        {portalStatus && (
          <p className="mt-2 text-center text-[10px] font-bold text-slate-500">{portalStatus}</p>
        )}

        {open && (
          <div className="absolute left-2 right-2 top-[calc(100%+0.4rem)] z-50 max-h-64 space-y-2 overflow-y-auto rounded-2xl border border-violet-100 bg-white p-2 shadow-xl">
            {clients.length === 0 ? (
              <div className="p-2">
                <p className="text-sm font-semibold text-slate-500">
                  Noch keine Mandanten vorhanden.
                </p>
                <Link
                  href="/mandanten"
                  className="mt-2 inline-flex text-sm font-black text-violet-700"
                >
                  Mandant anlegen →
                </Link>
              </div>
            ) : (
              clients.map((client) => {
                const selected = client.id === activeClientId

                return (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => switchClient(client)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-black ${
                      selected
                        ? 'bg-violet-600 text-white'
                        : 'bg-slate-50 text-slate-800'
                    }`}
                  >
                    <span className="truncate">{client.name}</span>
                    <span className="ml-3 shrink-0 text-xs">
                      {selected ? 'Aktiv' : 'Wechseln'}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}
