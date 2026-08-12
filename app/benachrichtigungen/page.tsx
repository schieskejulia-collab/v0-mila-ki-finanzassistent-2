'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type NotificationItem = {
  id: string
  client_id?: string | null
  type: 'antwort' | 'upload' | 'info'
  title: string
  message?: string | null
  href?: string | null
  read_at?: string | null
  created_at: string
}

export default function BenachrichtigungenPage() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (!error && data) setItems(data as NotificationItem[])
    setLoading(false)
  }

  useEffect(() => {
    void load()

    const channel = supabase
      .channel('mila-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => void load())
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [])

  const unread = useMemo(() => items.filter((item) => !item.read_at).length, [items])

  async function markRead(item: NotificationItem) {
    if (!item.read_at) {
      await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', item.id)
      await load()
    }

    if (item.href) window.location.assign(item.href)
  }

  async function markAllRead() {
    const ids = items.filter((item) => !item.read_at).map((item) => item.id)
    if (ids.length === 0) return

    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .in('id', ids)

    await load()
  }

  return (
    <main className="mx-auto min-h-screen max-w-md space-y-5 p-5 pb-32 text-slate-950">
      <header>
        <Link href="/" className="text-sm font-semibold text-slate-500">← Arbeitsplatz</Link>
        <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-violet-600">Mila meldet sich</p>
        <div className="mt-2 flex items-end justify-between gap-3">
          <h1 className="text-3xl font-black">Benachrichtigungen</h1>
          <span className="rounded-full bg-violet-100 px-3 py-2 text-xs font-black text-violet-700">{unread} neu</span>
        </div>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">Antworten und neue Unterlagen deiner Mandanten erscheinen hier automatisch.</p>
      </header>

      {unread > 0 && (
        <button type="button" onClick={() => void markAllRead()} className="w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700">
          Alle als gelesen markieren
        </button>
      )}

      {loading ? (
        <p className="text-sm font-semibold text-slate-500">Lädt …</p>
      ) : items.length === 0 ? (
        <section className="rounded-3xl bg-emerald-50 p-5 text-sm font-semibold text-emerald-800">
          ✓ Noch keine neuen Meldungen. Sobald ein Mandant antwortet oder etwas hochlädt, erscheint es hier.
        </section>
      ) : (
        <section className="space-y-3">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => void markRead(item)}
              className={`w-full rounded-3xl border p-5 text-left shadow-sm ${item.read_at ? 'border-slate-100 bg-white' : 'border-violet-200 bg-violet-50'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-violet-600">
                    {item.type === 'upload' ? '📎 Unterlage' : item.type === 'antwort' ? '💬 Antwort' : '🔔 Hinweis'}
                  </p>
                  <h2 className="mt-2 text-lg font-black">{item.title}</h2>
                </div>
                {!item.read_at && <span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-violet-600" />}
              </div>
              {item.message && <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">{item.message}</p>}
              <p className="mt-3 text-xs font-bold text-slate-400">
                {new Date(item.created_at).toLocaleString('de-DE')}
              </p>
            </button>
          ))}
        </section>
      )}
    </main>
  )
}
