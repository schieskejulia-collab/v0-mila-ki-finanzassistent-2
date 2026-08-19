'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ChevronDown, ChevronUp, FolderOpen } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type MilaClient = { id: string; name: string }

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
      const next = data.map((row: any) => ({ id: String(row.id), name: String(row.name || 'Akte') }))
      setClients(next)
      window.localStorage.setItem(CLIENTS_KEY, JSON.stringify(next))
    }

    void refreshClients()
  }, [hidden, pathname])

  const activeClient = useMemo(
    () => clients.find((client) => client.id === activeClientId) || null,
    [clients, activeClientId],
  )

  function switchClient(client: MilaClient) {
    window.localStorage.setItem(ACTIVE_CLIENT_KEY, client.id)
    setActiveClientId(client.id)
    setOpen(false)
    window.location.reload()
  }

  if (hidden) return null

  return (
    <div className="sticky top-0 z-40 px-4 pt-2">
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex h-11 w-full items-center justify-between rounded-2xl border border-violet-100 bg-white/95 px-4 text-left shadow-sm backdrop-blur"
          aria-expanded={open}
        >
          <div className="flex min-w-0 items-center gap-2">
            <FolderOpen className="h-4 w-4 shrink-0 text-violet-600" />
            <span className="truncate text-sm font-black text-slate-900">{activeClient?.name || 'Akte auswählen'}</span>
          </div>
          {open ? <ChevronUp className="h-4 w-4 shrink-0 text-violet-600" /> : <ChevronDown className="h-4 w-4 shrink-0 text-violet-600" />}
        </button>

        {open && (
          <div className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-50 max-h-72 space-y-2 overflow-y-auto rounded-2xl border border-violet-100 bg-white p-2 shadow-xl">
            {clients.length === 0 ? (
              <div className="p-2">
                <p className="text-sm font-semibold text-slate-500">Noch keine Akte vorhanden.</p>
              </div>
            ) : (
              clients.map((client) => {
                const selected = client.id === activeClientId
                return (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => switchClient(client)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-black ${selected ? 'bg-violet-600 text-white' : 'bg-slate-50 text-slate-800'}`}
                  >
                    <span className="truncate">{client.name}</span>
                    {selected && <span className="ml-3 shrink-0 text-[10px] uppercase tracking-wider">aktiv</span>}
                  </button>
                )
              })
            )}

            <Link
              href="/mandanten"
              onClick={() => setOpen(false)}
              className="flex w-full items-center justify-center rounded-xl border border-violet-100 bg-white px-3 py-3 text-sm font-black text-violet-700"
            >
              Akten verwalten
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
