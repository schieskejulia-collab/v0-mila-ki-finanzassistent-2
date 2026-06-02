'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ArrowDownCircle, ArrowUpCircle, PiggyBank, Target } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { href: '/', label: 'Start', icon: Home },
  { href: '/ausgaben', label: 'Ausgaben', icon: ArrowDownCircle },
  { href: '/einnahmen', label: 'Einnahmen', icon: ArrowUpCircle },
  { href: '/budget', label: 'Budget', icon: PiggyBank },
  { href: '/ziele', label: 'Ziele', icon: Target },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md border-t border-border bg-card/90 backdrop-blur-lg"
      aria-label="Hauptnavigation"
    >
      <ul className="flex items-stretch justify-around px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {items.map((item) => {
          const active =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-xl py-1 text-[11px] font-medium transition-colors',
                  active
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon
                  className={cn('size-6', active && 'fill-primary/15')}
                  strokeWidth={active ? 2.4 : 2}
                  aria-hidden="true"
                />
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
