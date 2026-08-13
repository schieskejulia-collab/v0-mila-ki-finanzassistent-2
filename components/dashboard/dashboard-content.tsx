'use client'

import Link from 'next/link'
import { ArrowRight, Zap } from 'lucide-react'

import { PilotStartSection } from './pilot-start-section'
import { HandoffRhythmSection } from './handoff-rhythm-section'
import { HandoffPackageSection } from './handoff-package-section'
import { RecurringPatternsSection } from './recurring-patterns-section'
import { AuditTrailSection } from './audit-trail-section'

export function DashboardContent({ model }: { model: any }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-32 pt-6">
      <Link
        href="/jetzt"
        className="group flex items-center justify-between gap-4 rounded-[2rem] bg-violet-600 p-5 text-white shadow-lg shadow-violet-200"
      >
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
            <Zap className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-100">
              Mila JETZT
            </p>
            <p className="mt-1 text-lg font-black leading-tight">
              Etwas muss schnell erledigt werden?
            </p>
            <p className="mt-1 text-xs font-semibold text-violet-100">
              Reinwerfen → ordnen → erledigen.
            </p>
          </div>
        </div>
        <ArrowRight className="h-5 w-5 shrink-0 transition group-hover:translate-x-1" />
      </Link>

      <PilotStartSection model={model} />
      <HandoffRhythmSection />
      <HandoffPackageSection />
      <RecurringPatternsSection />
      <AuditTrailSection />
    </main>
  )
}
