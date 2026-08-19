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
  ChevronRight,
} from 'lucide-react'

const navItems = [
  { href: '/', label: 'Start', icon: Home },
  { href: '/jetzt', label: 'Vorgänge', icon: Zap },
  { href: '/eingang', label: 'Eingang', icon: Inbox },
  { href: '/neue-buchungen', label: 'Neu', icon: PlusCircle },
  { href: '/dokumente', label: 'Mappe', icon: FolderOpen },
]

const desktopItems = [
  { href: '/', label: 'Start', icon: Home },
  { href: '/dokumente', label: 'Akten', icon: Files },
  { href: '/eingang', label: 'Eingang', icon: Inbox },
  { href: '/jetzt', label: 'Vorgänge', icon: Zap },
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
  ) return null

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[208px] border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <div className="px-5 pb-4 pt-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-sm font-black text-white">M</div>
            <div>
              <span className="block text-lg font-black tracking-tight text-slate-950">Mila</span>
              <span className="block text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">Arbeitsplatz</span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2">
          <div className="space-y-1">
            {desktopItems.map((item) => {
              const Icon = item.icon
              const isActive = active(pathname, item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    isActive
                      ? 'flex items-center gap-3 rounded-xl bg-slate-950 px-3.5 py-2.5 text-sm font-black text-white'
                      : 'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-950'
                  }
                >
                  <Icon className="h-4 w-4" strokeWidth={2} />
                  {item.label}
                </Link>
              )
            })}
          </div>

          <div className="my-5 border-t border-slate-100" />
          <p className="px-2 text-[8px] font-black uppercase tracking-[0.18em] text-slate-400">Aktive Akte</p>
          <Link
            href="/dokumente"
            className="mt-2 block rounded-xl border border-slate-200 bg-slate-50 p-3 transition hover:border-violet-200 hover:bg-violet-50/50"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-950">Tester A</p>
                <p className="mt-0.5 text-[9px] font-semibold text-slate-400">Arbeitsakte geöffnet</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
            </div>
          </Link>
        </nav>

        <div className="border-t border-slate-100 p-3">
          <Link
            href="/profil"
            className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            <UserRound className="h-4 w-4" />
            Einstellungen
          </Link>
        </div>
      </aside>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-[max(.6rem,env(safe-area-inset-bottom))] lg:hidden">
        <nav className="pointer-events-auto grid w-full max-w-md grid-cols-5 items-center rounded-[1.6rem] border border-slate-200/90 bg-white/96 p-1.5 shadow-[0_12px_40px_rgba(15,23,42,.16)] backdrop-blur-xl">
          {navItems.map((item) => {
            const isActive = active(pathname, item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  isActive
                    ? 'flex min-w-0 flex-col items-center justify-center rounded-[1.15rem] bg-slate-950 px-1 py-2 text-white'
                    : 'flex min-w-0 flex-col items-center justify-center rounded-[1.15rem] px-1 py-2 text-slate-500'
                }
              >
                <Icon className="h-4.5 w-4.5" strokeWidth={2.15} />
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
