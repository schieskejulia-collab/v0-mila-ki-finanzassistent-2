import { Suspense } from 'react'

export default function EingangLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fbf9ff] px-4 pt-8 text-sm font-semibold text-slate-500">Mila lädt den Eingang…</div>}>
      {children}
    </Suspense>
  )
}
