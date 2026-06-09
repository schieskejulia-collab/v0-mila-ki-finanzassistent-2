"use client"

import { useFinance } from "@/lib/store"

export function MilaFeedback() {
  const { milaFeedback } = useFinance()

  if (!milaFeedback) return null

  return (
    <div className="mx-4 mb-4 p-3 bg-muted border border-border rounded-lg text-sm leading-relaxed">
      {milaFeedback}
    </div>
  )
}
