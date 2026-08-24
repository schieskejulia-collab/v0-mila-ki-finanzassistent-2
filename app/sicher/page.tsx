'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Archive, BriefcaseBusiness, FolderOpen, Inbox, Zap } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function SafeWorkspaceStart() {
  const router = useRouter()
  const [name, setName] = useState('')

  useEffect(() => {
    async function loadSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.replace('/login')
        return
      }

      const storedName = String(
        session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name ||
          ''
      ).trim()
      setName(storedName.split(/\s+/)[0] || 'Julia')
    }

    void loadSession()
  }, [router])

  return <main className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-white px-5 py-10 text-slate-950">
    <div className="mx-auto max-w-md">
      <header className="mb-7">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-violet-600">Mila · Arbeitsplatz</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">Hallo{name ? `, ${name}` : ''} 👋</h1>
        <p className="mt-2 text-sm font-medium leading-6 text-slate-500">Was möchtest du heute für deine Akte erledigen?</p>
      </header>

      <section className="rounded-[1.8rem] border border-emerald-100 bg-emerald-50/70 p-5 shadow-sm">
        <p className="text-sm font-black text-emerald-900">Mila ist wieder da.</p>
        <p className="mt-1 text-sm font-medium leading-6 text-emerald-800/80">Der stabile Arbeitskern ist aktiv. Du kannst direkt dort weitermachen, wo es für die Akte nötig ist.</p>
      </section>

      <section className="mt-5 grid gap-3">
        <StartLink href="/neue-buchungen" icon={<Inbox className="h-5 w-5" />} title="Unterlagen hochladen" text="Belege und Originale in Mila aufnehmen." accent="violet" />
        <StartLink href="/mandanten" icon={<BriefcaseBusiness className="h-5 w-5" />} title="Akte & Übernahme" text="Aktive Akte wählen oder einen Bestand dokumentieren." accent="slate" />
        <StartLink href="/jetzt" icon={<Zap className="h-5 w-5" />} title="Vorgänge" text="Offene Arbeitsschritte und Rückfragen ansehen." accent="amber" />
        <div className="grid grid-cols-2 gap-3">
          <SmallLink href="/dokumente" icon={<FolderOpen className="h-5 w-5" />} label="Mappe" />
          <SmallLink href="/uebergaben" icon={<Archive className="h-5 w-5" />} label="Übergaben" />
        </div>
      </section>
    </div>
  </main>
}

function StartLink({ href, icon, title, text, accent }: { href: string; icon: React.ReactNode; title: string; text: string; accent: 'violet' | 'slate' | 'amber' }) {
  const color = accent === 'violet' ? 'bg-violet-50 text-violet-600' : accent === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-700'
  return <Link href={href} className="flex items-center gap-4 rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-[0_8px_25px_rgba(15,23,42,.05)] transition active:scale-[.99]">
    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${color}`}>{icon}</span>
    <span className="min-w-0 flex-1"><span className="block text-base font-black">{title}</span><span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">{text}</span></span>
    <ArrowRight className="h-4 w-4 shrink-0 text-violet-500" />
  </Link>
}

function SmallLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return <Link href={href} className="rounded-[1.4rem] border border-slate-200 bg-white p-5 text-center shadow-sm transition active:scale-[.99]"><span className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">{icon}</span><span className="mt-3 block text-sm font-black">{label}</span></Link>
}
