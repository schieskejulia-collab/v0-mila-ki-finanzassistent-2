'use client'

import { useEffect } from 'react'
import { useFinance } from '../../lib/store'

export function MorningBriefing() {
  const { morningBriefing, refreshMorningBriefing, userName } = useFinance()

  useEffect(() => {
    refreshMorningBriefing()
  }, [refreshMorningBriefing])

  if (!morningBriefing) return null

  return (
    <div className="mb-4 mx-4 p-4 bg-card border border-border rounded-xl whitespace-pre-line text-sm leading-relaxed">
      <div className="text-xs font-semibold text-muted-foreground mb-1">
        Morning Briefing für {userName}
      </div>
      {morningBriefing}
    </div>
  )
}
