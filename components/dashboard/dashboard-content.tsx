'use client'

import { PilotStartSection } from './pilot-start-section'
import { HandoffRhythmSection } from './handoff-rhythm-section'
import { HandoffPackageSection } from './handoff-package-section'
import { RecurringPatternsSection } from './recurring-patterns-section'
import { AuditTrailSection } from './audit-trail-section'

export function DashboardContent({ model }: { model: any }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-32 pt-6">
      <PilotStartSection model={model} />
      <HandoffRhythmSection />
      <HandoffPackageSection />
      <RecurringPatternsSection />
      <AuditTrailSection />
    </main>
  )
}
