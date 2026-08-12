'use client'

import { PilotStartSection } from './pilot-start-section'
import { HandoffRhythmSection } from './handoff-rhythm-section'
import { RecurringPatternsSection } from './recurring-patterns-section'

export function DashboardContent({ model }: { model: any }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-32 pt-6">
      <PilotStartSection model={model} />
      <HandoffRhythmSection />
      <RecurringPatternsSection />
    </main>
  )
}
