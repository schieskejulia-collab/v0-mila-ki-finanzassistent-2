'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardContent } from '@/components/dashboard/dashboard-content'
import { useFinance } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import { buildDashboardModel } from '@/lib/dashboard-model'

export default function DashboardPage() {
  const finance = useFinance()
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    async function checkLogin() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      setIsClient(true)
    }

    checkLogin()
  }, [router])

  if (!isClient || !finance.summary) {
    return <DashboardLoading />
  }

  const model = buildDashboardModel(finance)

  return <DashboardContent model={model} />
}

function DashboardLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8F9FC] p-6 text-center">
      <div className="space-y-3">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
        <p className="text-xs font-medium text-slate-500">
          Mila lädt deine Schaltzentrale...
        </p>
      </div>
    </div>
  )
}