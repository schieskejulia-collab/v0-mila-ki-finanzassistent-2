'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  FolderOpen,
  Home,
  Inbox,
  PlusCircle,
  UserRound,
  Zap,
  Search,
  Files,
} from 'lucide-react'

const navItems = [
  { href: '/', label: 'Start', icon: Home },
  { href: '/jetzt', label: 'JETZT', icon: Zap },
  { href: '/eingang', label: 'Eingang', icon: Inbox },
  { href: '/neue-buchungen', label: 'Erfassen', icon: PlusCircle },
  { href: '/dokumente', label: 'Mappe', icon: FolderOpen },
  { href: '/profil', label: 'Profil', icon: UserRound },
]

const desktopItems = [
  { href: '/', label: 'Start', icon: Home },
  { href: '/dokumente', label: 'Akten', icon: Files },
  { href: '/eingang', label: 'Eingang', icon: Inbox },
  { href: '/jetzt', label: 'Vorgänge', icon: Zap },
  { href: '/dokumente', label: 'Mappe', icon: FolderOpen },
  { href: '/suche', label: 'Suche', icon: Search },
]

function active(pathname: string, href: string) {
  return href === '/'
    ? pathname === '/'
    : pathname === href || pathname.startsWith(`${href}/`)
}

export function BottomNav() {
  const pathname = usePathname()

  if (
    pathname === '/login' ||
    pathname === '/angebot' ||
    pathname === '/kontakt' ||
    pathname === '/akquise'
  ) {
    return null
  }

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[220px] border-r border-slate-200/80 bg-white lg:flex lg:flex-col">
        <div className="flex h-20 items-center gap-3 px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-lg">🌸</div>
          <span className="text-xl font-black tracking-tight text-slate-950">Mila</span>
        </div>

        <nav className="flex-1 px-3 py-2">
          <div className="space-y-1">
            {desktopItems.map((item, index) => {
              const Icon = item.icon
              const isActive = active(pathname, item.href)
              return (
                <Link
                  key={`${item.href}-${index}`}
                  href={item.href}
                  className={
                    isActive
                      ? 'flex items-center gap-3 rounded-xl bg-violet-50 px-4 py-3 text-sm font-bold text-violet-700'
                      : 'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-950'
                  }
                >
                  <Icon className="h-4.5 w-4.5" strokeWidth={2} />
                  {item.label}
                </Link>
              )
            })}
          </div>

          <div className="my-5 border-t border-slate-100" />
          <p className="px-4 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            Akten / Kontakte
          </p>
          <div className="mt-2 rounded-xl bg-violet-50 px-4 py-3 text-sm font-bold text-violet-700">
            Tester A
          </div>
        </nav>

        <div className="border-t border-slate-100 p-3">
          <Link
            href="/profil"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            <UserRound className="h-4.5 w-4.5" />
            Einstellungen
          </Link>
        </div>
      </aside>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-3 lg:hidden">
        <nav className="pointer-events-auto flex w-full max-w-md items-center justify-between rounded-[2rem] border border-violet-100 bg-white/95 px-2 py-2 shadow-xl backdrop-blur">
          {navItems.map((item) => {
            const isActive = active(pathname, item.href)
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  isActive
                    ? 'flex min-w-0 flex-1 flex-col items-center justify-center rounded-3xl bg-violet-600 px-1 py-2 text-white'
                    : 'flex min-w-0 flex-1 flex-col items-center justify-center rounded-3xl px-1 py-2 text-slate-500'
                }
              >
                <Icon className="h-5 w-5" strokeWidth={2.2} />
                <span className="mt-1 truncate text-[8px] font-black">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </>
  )
}

export default BottomNav
