'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type NotificationBellProps = {
  variant?: 'floating' | 'toolbar'
}

export function NotificationBell({ variant = 'floating' }: NotificationBellProps) {
  const pathname = usePathname()
  const [unread, setUnread] = useState(0)

  const hidden =
    pathname === '/login' ||
    pathname === '/sicher' ||
    pathname === '/register' ||
    pathname.startsWith('/demo') ||
    pathname.startsWith('/mandant-upload') ||
    pathname.startsWith('/datenschutz') ||
    pathname.startsWith('/impressum') ||
    pathname.startsWith('/agb') ||
    pathname.startsWith('/widerruf') ||
    pathname.startsWith('/sicherheit')

  useEffect(() => {
    if (hidden) return

    async function refresh() {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .is('read_at', null)

      if (!error) setUnread(count || 0)
    }

    void refresh()

    const channel = supabase
      .channel('mila-notification-bell')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => void refresh())
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [hidden])

  if (hidden) return null

  const button = (
    <Link
      href="/benachrichtigungen"
      className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-100 bg-white/95 text-xl shadow-sm backdrop-blur"
      aria-label={`${unread} neue Benachrichtigungen`}
    >
      🔔
      {unread > 0 && (
        <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </Link>
  )

  if (variant === 'toolbar') return button

  return <div className="fixed right-6 top-6 z-50 hidden lg:block">{button}</div>
}

export default NotificationBell
