import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { Inter } from 'next/font/google'
import './globals.css'
import { FinanceProvider } from '@/lib/store'
import { BottomNav } from '@/components/bottom-nav'
import { LegalFooter } from '@/components/legal-footer'
import { ThemeProvider } from '@/components/theme-provider'
import { ClientSwitcher } from '@/components/client-switcher'
import { NotificationBell } from '@/components/notification-bell'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Mila – Kanzlei-Vorbereitung',
  description:
    'Mila unterstützt kleine Betriebe und Steuerkanzleien dabei, Belege, Rückfragen, Nachweise und Monatsmappen sauber vorzubereiten.',
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
    <html lang="de" className={`${inter.variable} light bg-[#fbf9ff]`} suppressHydrationWarning>
      <body className="min-h-screen bg-[#fbf9ff] font-sans text-slate-950 antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          forcedTheme="light"
        >
          <FinanceProvider>
            <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col bg-[#fbf9ff] text-slate-950">
              <ClientSwitcher />
              <NotificationBell />
              <div className="relative z-10 flex-1 pb-6">{children}</div>
              <LegalFooter />
              <BottomNav />
            </div>
          </FinanceProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
