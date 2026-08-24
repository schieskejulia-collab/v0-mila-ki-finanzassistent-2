'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardContent } from '@/components/dashboard/dashboard-content'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [userName, setUserName] = useState('Julia')

  useEffect(() => {
    async function checkLogin() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      const name = String(session.user.user_metadata?.full_name || session.user.user_metadata?.name || '').trim()
      if (name) setUserName(name.split(/\s+/)[0])
      setReady(true)
    }

    checkLogin()
  }, [router])

  if (!ready) {
    return <DashboardLoading />
  }

  return <DashboardContent model={{ greeting: greeting(), userName }} />
}

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Guten Morgen'
  if (hour < 18) return 'Guten Tag'
  return 'Guten Abend'
}

function DashboardLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8F9FC] p-6 text-center">
      <div className="space-y-3">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
        <p className="text-xs font-medium text-slate-500">
          Mila lädt deine Kanzlei-Vorbereitung...
        </p>
      </div>
    </div>
  )
}
