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

  const hidden =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname.startsWith('/demo') ||
    pathname.startsWith('/datenschutz') ||
    pathname.startsWith('/impressum') ||
    pathname.startsWith('/agb') ||
    pathname.startsWith('/widerruf') ||
    pathname.startsWith('/sicherheit')

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

    // Gleiche Seite neu laden: FinanceProvider und Supabase-Abfragen starten
    // sofort im Datenkontext des neu gewählten Mandanten.
    window.location.reload()
  }

  if (hidden) return null

  return (
    <div className="sticky top-0 z-40 px-4 pt-3">
      <div className="rounded-2xl border border-violet-100 bg-white/95 p-2 shadow-sm backdrop-blur">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="min-w-0 flex-1 rounded-xl bg-violet-50 px-3 py-2 text-left active:scale-[0.99]"
            aria-expanded={open}
          >
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-500">
              Aktiver Mandant
            </p>
            <div className="mt-0.5 flex items-center justify-between gap-2">
              <p className="truncate text-sm font-black text-slate-950">
                {activeClient?.name || 'Noch keinen ausgewählt'}
              </p>
              <span className="shrink-0 text-sm font-black text-violet-700">
                {open ? '▲' : '▼'}
              </span>
            </div>
          </button>

          <Link
            href="/mandanten"
            className="shrink-0 rounded-xl bg-violet-600 px-3 py-3 text-xs font-black text-white"
            aria-label="Mandanten verwalten"
          >
            Verwalten
          </Link>
        </div>

        {open && (
          <div className="mt-2 max-h-64 space-y-2 overflow-y-auto rounded-xl bg-slate-50 p-2">
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
                        : 'bg-white text-slate-800 shadow-sm'
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
