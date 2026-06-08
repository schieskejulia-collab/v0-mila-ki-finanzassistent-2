"use client"

import React from 'react'
import { useRouter } from 'next/navigation'

export function BottomNav() {
  const router = useRouter()

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-card border-t border-border flex justify-around py-3 px-6 z-50 shadow-lg">
      
      <button
        onClick={() => router.push('/')}
        className="flex flex-col items-center gap-1 text-primary"
      >
        <span className="text-xl">📊</span>
        <span className="text-[10px] font-medium">Übersicht</span>
      </button>

<button
  onClick={() => router.push('/buchungen')}
  className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-all"
>
  <span className="text-xl">📒</span>
  <span className="text-[10px] font-medium">Buchungen</span>
</button>

      <button
        onClick={() => router.push('/chat')}
        className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-all"
      >
        <span className="text-xl">💬</span>
        <span className="text-[10px] font-medium">Mila Chat</span>
      </button>

      <button
        onClick={() => router.push('/profil')}
        className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-all"
      >
        <span className="text-xl">⚙️</span>
        <span className="text-[10px] font-medium">Profil</span>
      </button>

    </div>
  )
}