import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { Inter } from 'next/font/google'
import './globals.css'
import { FinanceProvider } from '@/lib/store'
import { BottomNav } from '@/components/bottom-nav'
import { LegalFooter } from '@/components/legal-footer'
import { ThemeProvider } from '@/components/theme-provider'
import { ClientSwitcher } from '@/components/client-switcher'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Mila – Unterlagen rein. Mila sortiert.',
  description:
    'Mila liest Unterlagen, sortiert sie in die richtige Akte, erkennt belegte IST-Vorgänge und zeigt nur echte Klärungsfälle.',
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
  themeColor: '#fbf9ff',
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
            <ClientSwitcher />
            <div className="min-h-[100dvh] w-full bg-[#fbf9ff] text-slate-950 md:pl-64">
              <div className="relative flex min-h-[100dvh] w-full flex-col">
                <div className="relative z-10 flex-1">{children}</div>
                <LegalFooter />
                <BottomNav />
              </div>
            </div>
          </FinanceProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
