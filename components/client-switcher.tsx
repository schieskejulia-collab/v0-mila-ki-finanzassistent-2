'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  FileText,
  FolderKanban,
  FolderOpen,
  HelpCircle,
  Home,
  Inbox,
  ListTodo,
  Plus,
  Search,
  Settings,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

type MilaClient = { id: string; name: string }

const CLIENTS_KEY = 'mila-clients-v1'
const ACTIVE_CLIENT_KEY = 'mila-active-client-v1'

const navItems = [
  { href: '/', label: 'Start', icon: Home, paths: ['/'] },
  { href: '/mandanten', label: 'Akten', icon: FolderKanban, paths: ['/mandanten'] },
  { href: '/eingang', label: 'Eingang', icon: Inbox, paths: ['/eingang', '/stapel', '/neue-buchungen'] },
  { href: '/jetzt', label: 'Vorgänge', icon: ListTodo, paths: ['/jetzt', '/rueckfragen'] },
  { href: '/dokumente', label: 'Mappe', icon: FolderOpen, paths: ['/dokumente'] },
  { href: '/dokumente?ansicht=dokumente', label: 'Suche', icon: Search, paths: [] },
]

function pathMatches(pathname: string, paths: string[]) {
  return paths.some((path) => path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`))
}

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

  const hidden =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname.startsWith('/demo') ||
    pathname.startsWith('/datenschutz') ||
    pathname.startsWith('/impressum') ||
    pathname.startsWith('/agb') ||
    pathname.startsWith('/widerruf') ||
    pathname.startsWith('/sicherheit') ||
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
    window.location.href = '/'
  }

  if (hidden) return null

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-violet-100 bg-white/95 px-4 py-5 backdrop-blur md:flex">
      <Link href="/" className="flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-violet-600 text-lg text-white shadow-sm">🌸</div>
        <span className="text-xl font-black tracking-tight">Mila</span>
      </Link>

      <nav className="mt-7 space-y-1.5">
        {navItems.map((item) => {
          const active = pathMatches(pathname, item.paths)
          const Icon = item.icon
          return (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold transition ${active ? 'bg-violet-50 text-violet-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}
            >
              <Icon className="h-5 w-5" strokeWidth={2} />
              <span>{item.label}</span>
              {item.label === 'Eingang' && <span className="ml-auto h-2 w-2 rounded-full bg-violet-500" />}
            </Link>
          )
        })}
      </nav>

      <div className="mt-7 min-h-0 flex-1">
        <p className="px-3 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Akten / Kontakte</p>
        <div className="mt-2 max-h-[34vh] space-y-1 overflow-y-auto pr-1">
          {clients.slice(0, 8).map((client) => {
            const selected = client.id === activeClientId
            return (
              <button
                key={client.id}
                type="button"
                onClick={() => switchClient(client)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${selected ? 'bg-violet-50 text-violet-700' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <FileText className="h-4 w-4 shrink-0" />
                <span className="truncate">{client.name}</span>
                {selected && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-600" />}
              </button>
            )
          })}

          {clients.length === 0 && (
            <p className="px-3 py-2 text-xs font-semibold text-slate-400">Noch keine Akte.</p>
          )}
        </div>

        <Link href="/mandanten" className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-black text-violet-700 hover:bg-violet-50">
          <Plus className="h-4 w-4" /> Weitere Akte hinzufügen
        </Link>

        {activeClient && (
          <p className="mt-2 truncate px-3 text-[10px] font-semibold text-slate-400">Aktiv: {activeClient.name}</p>
        )}
      </div>

      <div className="space-y-1 border-t border-slate-100 pt-3">
        <Link href="/wissen" className="flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50">
          <HelpCircle className="h-4 w-4" /> Hilfe
        </Link>
        <Link href="/mehr" className="flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50">
          <Settings className="h-4 w-4" /> Einstellungen
        </Link>
      </div>
    </aside>
  )
}
