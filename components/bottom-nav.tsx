'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FolderKanban, FolderOpen, Home, Inbox, ListTodo } from 'lucide-react'

const navItems = [
  { href: '/', label: 'Start', icon: Home, paths: ['/'] },
  { href: '/mandanten', label: 'Akten', icon: FolderKanban, paths: ['/mandanten'] },
  { href: '/eingang', label: 'Eingang', icon: Inbox, paths: ['/eingang', '/stapel', '/neue-buchungen'] },
  { href: '/jetzt', label: 'Vorgänge', icon: ListTodo, paths: ['/jetzt', '/rueckfragen'] },
  { href: '/dokumente', label: 'Mappe', icon: FolderOpen, paths: ['/dokumente'] },
]

function pathMatches(pathname: string, paths: string[]) {
  return paths.some((path) => path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`))
}

export function BottomNav() {
  const pathname = usePathname()

  if (
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/angebot' ||
    pathname === '/kontakt' ||
    pathname === '/akquise' ||
    pathname.startsWith('/demo') ||
    pathname.startsWith('/mandant-upload')
  ) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-2 pb-2 md:hidden">
      <nav className="pointer-events-auto flex w-full max-w-md items-center rounded-2xl border border-violet-100 bg-white/96 px-1.5 py-1.5 shadow-lg backdrop-blur">
        {navItems.map((item) => {
          const isActive = pathMatches(pathname, item.paths)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={isActive
                ? 'flex min-w-0 flex-1 flex-col items-center justify-center rounded-xl bg-violet-600 px-1 py-2 text-white'
                : 'flex min-w-0 flex-1 flex-col items-center justify-center rounded-xl px-1 py-2 text-slate-500'}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
              <span className="mt-0.5 truncate text-[8px] font-black">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

export default BottomNav
