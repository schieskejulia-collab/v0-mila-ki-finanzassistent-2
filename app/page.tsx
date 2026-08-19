'use client'

import { DashboardContent } from '@/components/dashboard/dashboard-content'
import { useFinance } from '@/lib/store'
import { buildDashboardModel } from '@/lib/dashboard-model'

export default function DashboardPage() {
  const finance = useFinance()

  if (!finance.summary) return <DashboardLoading />

  const model = {
    ...buildDashboardModel(finance),
    documents: finance.documents,
    expenses: finance.expenses,
    incomes: finance.incomes,
    obligations: finance.obligations,
    userName: finance.userName,
  }

  return <DashboardContent model={model} />
}

function DashboardLoading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="space-y-3">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
        <p className="text-xs font-medium text-slate-500">Einen Moment …</p>
      </div>
    </div>
  )
}
