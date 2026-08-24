'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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

  return (
    <main className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-white px-5 py-16 text-slate-950">
      <section className="mx-auto max-w-md rounded-[2rem] border border-violet-100 bg-white p-7 shadow-[0_18px_54px_rgba(109,40,217,.12)]">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-violet-600">Mila</p>
        <h1 className="mt-5 text-3xl font-black tracking-tight">Hallo, {name || 'Julia'} 👋</h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          Deine Anmeldung ist aktiv. Mila startet gerade in einer schlanken, stabilen Arbeitsansicht.
        </p>
        <button
          type="button"
          onClick={() => router.push('/')}
          className="mt-8 w-full rounded-2xl bg-violet-600 px-5 py-4 text-base font-black text-white shadow-lg shadow-violet-200"
        >
          Arbeitsbereich öffnen
        </button>
      </section>
    </main>
  )
}
