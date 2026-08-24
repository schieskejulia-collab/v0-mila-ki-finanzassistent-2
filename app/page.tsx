'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  const router = useRouter()

  useEffect(() => {
    async function routeToStableEntry() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      router.replace(session ? '/sicher' : '/login')
    }

    void routeToStableEntry()
  }, [router])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8F9FC] p-6 text-center">
      <div className="space-y-3">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
        <p className="text-xs font-medium text-slate-500">Mila wird sicher geöffnet…</p>
      </div>
    </div>
  )
}
