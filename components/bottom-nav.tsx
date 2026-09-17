'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FileText, Home, MessageCircleHeart, UserRound, WalletCards } from 'lucide-react'

const navItems = [
  { href: '/sicher', label: 'Start', icon: Home },
  { href: '/buchungen', label: 'Finanzen', icon: WalletCards },
  { href: '/dokumente', label: 'Dokumente', icon: FileText },
  { href: '/chat', label: 'Mila fragen', icon: MessageCircleHeart },
  { href: '/profil', label: 'Profil', icon: UserRound },
]

function active(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function BottomNav() {
  const pathname = usePathname()
  if (['/login', '/angebot', '/kontakt', '/akquise'].includes(pathname)) return null

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[208px] border-r border-violet-100 bg-white lg:flex lg:flex-col">
        <Link href="/sicher" className="flex items-center gap-3 px-5 pb-5 pt-7">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-600 text-base font-black text-white">M</span>
          <span><span className="block text-lg font-black tracking-tight">Mila</span><span className="block text-[9px] font-bold text-slate-400">Damit dein Kopf freier wird.</span></span>
        </Link>
        <nav className="flex-1 space-y-1 px-3 py-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = active(pathname, item.href)
            return <Link key={item.href} href={item.href} className={isActive ? 'flex items-center gap-3 rounded-xl bg-violet-600 px-3.5 py-3 text-sm font-black text-white' : 'flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-600 hover:bg-violet-50'}><Icon className="h-4 w-4" />{item.label}</Link>
          })}
        </nav>
        <div className="border-t border-violet-50 p-4 text-xs font-semibold leading-5 text-slate-400">Finanzen und Behörden im Blick.</div>
      </aside>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-[max(.6rem,env(safe-area-inset-bottom))] lg:hidden">
        <nav className="pointer-events-auto grid w-full max-w-md grid-cols-5 items-center rounded-[1.6rem] border border-violet-100 bg-white/95 p-1.5 shadow-[0_12px_40px_rgba(76,29,149,.16)] backdrop-blur-xl">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = active(pathname, item.href)
            return <Link key={item.href} href={item.href} className={isActive ? 'flex min-w-0 flex-col items-center justify-center rounded-[1.15rem] bg-violet-600 px-1 py-2 text-white' : 'flex min-w-0 flex-col items-center justify-center rounded-[1.15rem] px-1 py-2 text-slate-500'}><Icon className="h-[18px] w-[18px]" /><span className="mt-1 truncate text-[8px] font-black">{item.label}</span></Link>
          })}
        </nav>
      </div>
    </>
  )
}

export default BottomNav
