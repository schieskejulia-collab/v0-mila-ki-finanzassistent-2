'use client'

import Link from 'next/link'
import { BookOpenText, FolderKanban, HelpCircle, Link2, ShieldCheck } from 'lucide-react'

const items = [
  {
    href: '/mandanten',
    icon: FolderKanban,
    title: 'Akten & Mandanten',
    text: 'Akte anlegen, Kontext festhalten, Akte wechseln oder Upload-Link teilen.',
  },
  {
    href: '/rueckfragen',
    icon: HelpCircle,
    title: 'Rückfragen',
    text: 'Nur Fragen, die Mila nicht selbst beantworten darf oder kann.',
  },
  {
    href: '/mandanten',
    icon: Link2,
    title: 'Upload-Link',
    text: 'Unterlagen direkt in die richtige Akte schicken lassen.',
  },
  {
    href: '/sicherheit',
    icon: ShieldCheck,
    title: 'Sicherheit & Datenschutz',
    text: 'Speicherung, Zugriff und Datenschutz nachvollziehbar halten.',
  },
  {
    href: '/wissen',
    icon: BookOpenText,
    title: 'Wissen',
    text: 'Hinweise und Grundlagen getrennt von der täglichen Arbeit.',
  },
]

export default function MehrPage() {
  return (
    <main className="mx-auto min-h-screen max-w-md space-y-5 px-4 pb-32 pt-5 text-slate-950">
      <header className="px-1">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Mehr</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">Selten gebraucht.</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
          Alles, was nicht in den täglichen Ablauf gehört, bleibt hier. Kein Berufsprofil, kein Finanzprofil, keine zweite Arbeitswelt.
        </p>
      </header>

      <section className="space-y-3">
        {items.map(({ href, icon: Icon, title, text }) => (
          <Link key={`${href}-${title}`} href={href} className="flex items-center gap-4 rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
              <Icon className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-base font-black">{title}</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{text}</p>
            </div>
          </Link>
        ))}
      </section>

      <section className="rounded-[2rem] bg-slate-950 p-5 text-white">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-300">Grundsatz</p>
        <p className="mt-2 text-lg font-black">Der Kontext gehört in die Akte.</p>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">
          Ob Angestellter, Agentur, Kleinunternehmen oder Kanzleimandat: Mila soll das aus der jeweiligen Akte kennen – nicht aus einem globalen Profil.
        </p>
      </section>
    </main>
  )
}
