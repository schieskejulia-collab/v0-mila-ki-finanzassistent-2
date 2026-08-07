'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  {
    href: '/',
    label: 'Pilot',
    icon: '🏠',
  },
  {
    href: '/neue-buchungen',
    label: 'Scan',
    icon: '➕',
  },
  {
    href: '/dokumente',
    label: 'Mappe',
    icon: '🧾',
  },
  {
    href: '/verpflichtungen',
    label: 'Pflichten',
    icon: '⏰',
  },
  {
    href: '/profil',
    label: 'Profil',
    icon: '👤',
  },
]

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
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-3">
      <nav className="pointer-events-auto flex w-full max-w-md items-center justify-between rounded-[2rem] border border-violet-100 bg-white/95 px-2 py-2 shadow-xl backdrop-blur">
        {navItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname === item.href || pathname.startsWith(`${item.href}/`)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                isActive
                  ? 'flex min-w-0 flex-1 flex-col items-center justify-center rounded-3xl bg-violet-600 px-2 py-2 text-white'
                  : 'flex min-w-0 flex-1 flex-col items-center justify-center rounded-3xl px-2 py-2 text-slate-500'
              }
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="mt-1 truncate text-[9px] font-black">
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

export default BottomNav
