'use client'

import Link from 'next/link'
import { BookOpenText, FolderKanban, ShieldCheck } from 'lucide-react'

const items = [
  {
    href: '/mandanten',
    icon: FolderKanban,
    title: 'Akten & Upload-Link',
    text: 'Akte anlegen, wechseln oder Unterlagen anfordern.',
  },
  {
    href: '/sicherheit',
    icon: ShieldCheck,
    title: 'Sicherheit & Datenschutz',
    text: 'Zugriff, Speicherung und Datenschutz.',
  },
  {
    href: '/wissen',
    icon: BookOpenText,
    title: 'Wissen',
    text: 'Grundlagen und Hinweise.',
  },
]

export default function MehrPage() {
  return (
    <main className="mx-auto min-h-screen max-w-md space-y-4 px-4 pb-32 pt-4 text-slate-950">
      <header className="px-1">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Mehr</p>
        <h1 className="mt-1 text-4xl font-black tracking-tight">Alles Weitere</h1>
      </header>

      <section className="space-y-3">
        {items.map(({ href, icon: Icon, title, text }) => (
          <Link key={title} href={href} className="flex items-center gap-4 rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
              <Icon className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-base font-black">{title}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">{text}</p>
            </div>
          </Link>
        ))}
      </section>
    </main>
  )
}
