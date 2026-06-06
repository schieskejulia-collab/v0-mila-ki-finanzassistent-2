import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { FinanceProvider } from '@/lib/store'
import { BottomNav } from '@/components/bottom-nav'
import { MilaChat } from '../components/mila-chat'


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
  children: React.ReactNode
}>) {
  return (
    <html lang="de" className={`${inter.variable} bg-background`}>
      <body className="font-sans antialiased">
        <FinanceProvider>
          <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col bg-background">
            <div className="flex-1 pb-24">{children}</div>
            <MilaChat />
            <BottomNav />
          </div>
        </FinanceProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
