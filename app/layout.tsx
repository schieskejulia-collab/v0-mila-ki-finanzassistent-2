import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Mila – Deine Finanzbegleiterin',
  description:
    'Mila ist die empathische KI-Finanzassistentin für Freelancer und Selbstständige: Buchhaltung, Budgets, Steuern und Coaching in einer App.',
  generator: 'v0.app',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Mila',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#7c3aed',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html lang="de" className={`${inter.variable} bg-background`} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>

        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
