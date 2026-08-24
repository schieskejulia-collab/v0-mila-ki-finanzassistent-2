'use client'

import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

// Der frühere Finanz-Coach bleibt für seine alten Seiten erreichbar, wird aber
// nicht mehr global in den neuen Akten-Arbeitsbereich geladen.
const LegacyFinanceProvider = dynamic(
  () =>
    import('@/lib/store').then((module) => ({
      default: module.FinanceProvider,
    })),
  { ssr: false }
)

const LEGACY_FINANCE_ROUTES = [
  '/buchungen',
  '/rechnungen',
  '/verpflichtungen',
  '/ziele',
  '/profil',
  '/chat',
  '/mila-core',
  '/premium',
]

export function WorkspaceProviders({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const needsLegacyFinance = LEGACY_FINANCE_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )

  if (needsLegacyFinance) {
    return <LegacyFinanceProvider>{children}</LegacyFinanceProvider>
  }

  return <>{children}</>
}
