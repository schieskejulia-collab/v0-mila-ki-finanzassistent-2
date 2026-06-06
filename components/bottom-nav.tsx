"use client"

import React from 'react'

export function BottomNav() {
  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-card border-t border-border flex justify-around py-3 px-6 z-50 shadow-lg">
      <button className="flex flex-col items-center gap-1 text-primary">
        <span className="text-xl">📊</span>
        <span className="text-[10px] font-medium">Übersicht</span>
      </button>
      
      <button className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-all">
        <span className="text-xl">💬</span>
        <span className="text-[10px] font-medium">Mila Chat</span>
      </button>

      <button className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-all">
        <span className="text-xl">⚙️</span>
        <span className="text-[10px] font-medium">Profil</span>
      </button>
    </div>
  )
}
