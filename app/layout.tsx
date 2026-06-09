import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { FinanceProvider } from '@/lib/store'
import { BottomNav } from '@/components/bottom-nav'
import { ThemeProvider } from '@/components/theme-provider'

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
  themeColor: '#f8f5ff',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html lang="de" className={`${inter.variable} light bg-background`} suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          forcedTheme="light"
        >
          <FinanceProvider>
            <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col bg-[#fbf9ff] text-slate-950">
              <div className="flex-1 pb-24">{children}</div>
              <BottomNav />
            </div>
          </FinanceProvider>
        </ThemeProvider>

        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
