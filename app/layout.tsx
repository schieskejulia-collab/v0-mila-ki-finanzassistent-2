import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { Inter } from 'next/font/google'
import './globals.css'
import { BottomNav } from '@/components/bottom-nav'
import { LegalFooter } from '@/components/legal-footer'
import { ThemeProvider } from '@/components/theme-provider'
import { ClientSwitcher } from '@/components/client-switcher'
import { NotificationBell } from '@/components/notification-bell'
import { WorkspaceProviders } from '@/components/workspace-providers'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Mila – digitaler Kanzlei- & VA-Arbeitsplatz',
  description:
    'Mila verbindet Akten, Vorgänge, Originalunterlagen, Rückfragen, Arbeitsschritte und versionierte Übergaben in einem nachvollziehbaren digitalen Arbeitsablauf.',
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
          <WorkspaceProviders>
            <div className="min-h-[100dvh] bg-[#fbf9ff] text-slate-950 lg:pl-[220px]">
              <BottomNav />
              <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[1440px] flex-col">
                <ClientSwitcher />
                <NotificationBell />
                <div className="relative z-10 flex-1 pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-6">{children}</div>
                <LegalFooter />
              </div>
            </div>
          </WorkspaceProviders>
        </ThemeProvider>
      </body>
    </html>
  )
}
