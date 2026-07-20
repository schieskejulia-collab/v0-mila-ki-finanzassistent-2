'use client'

import { DailySummaryCard } from './daily-summary-card'
import { OverviewSection } from './overview-section'
import { TasksSection } from './tasks-section'
import { InsightsSection } from './insights-section'

export function DashboardContent({ model }: { model: any }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-32 pt-6">
      <DailySummaryCard model={model} />

      <OverviewSection model={model} />

      <TasksSection model={model} />

      <InsightsSection model={model} />
    </main>
  )
}