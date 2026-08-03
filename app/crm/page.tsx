'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Status = 'lead' | 'kontakt' | 'gespraech' | 'angebot' | 'kunde' | 'inaktiv'
type Contact = { id: string; first_name: string; last_name: string; company: string; email: string; phone: string; status: Status; next_contact_at: string | null }
type Event = { id: string; contact_id: string | null; title: string; starts_at: string }

const labels: Record<Status, string> = { lead: 'Lead', kontakt: 'Kontaktiert', gespraech: 'Gespräch', angebot: 'Angebot', kunde: 'Kunde', inaktiv: 'Inaktiv' }
const badge: Record<Status, string> = { lead: 'bg-sky-50 text-sky-700', kontakt: 'bg-indigo-50 text-indigo-700', gespraech: 'bg-amber-50 text-amber-700', angebot: 'bg-orange-50 text-orange-700', kunde: 'bg-emerald-50 text-emerald-700', inaktiv: 'bg-slate-100 text-slate-500' }

const emptyForm = { first_name: '', last_name: '', company: '', email: '', phone: '', status: 'lead' as Status, next_contact_at: '' }

function initials(contact: Contact) {
  return `${contact.first_name?.[0] || ''}${contact.last_name?.[0] || contact.company?.[0] || '?'}`.toUpperCase()
}

function dateDE(value?: string | null) {
  if (!value) return 'Keine Wiedervorlage'
  return new Date(value).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function CRMPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [form, setForm] = useState(emptyForm)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'alle' | Status>('alle')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) { setError('Bitte zuerst anmelden.'); setLoading(false); return }
    const [contactResult, eventResult] = await Promise.all([
      supabase.from('crm_contacts').select('*').order('next_contact_at', { ascending: true, nullsFirst: false }),
      supabase.from('crm_calendar_events').select('id,contact_id,title,starts_at').gte('starts_at', new Date().toISOString()).order('starts_at', { ascending: true }).limit(5),
    ])
    if (contactResult.error) setError('Kontakte konnten nicht geladen werden.')
    setContacts((contactResult.data || []) as Contact[])
    setEvents((eventResult.data || []) as Event[])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  async function saveContact() {
    if (!form.first_name.trim() && !form.company.trim()) { setError('Bitte Name oder Unternehmen eintragen.'); return }
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return
    setSaving(true); setError('')
    const { error: saveError } = await supabase.from('crm_contacts').insert({ user_id: userData.user.id, ...form, first_name: form.first_name.trim(), last_name: form.last_name.trim(), company: form.company.trim(), email: form.email.trim(), phone: form.phone.trim(), next_contact_at: form.next_contact_at || null })
    if (saveError) setError('Kontakt konnte nicht gespeichert werden.')
    else { setForm(emptyForm); await load() }
    setSaving(false)
  }

  async function deleteContact(contactId: string) {
    if (!window.confirm('Diesen Kontakt wirklich loeschen? Projekte, Notizen und Termine bleiben bestehen.')) return
    const { error: deleteError } = await supabase.from('crm_contacts').delete().eq('id', contactId)
    if (deleteError) { setError('Kontakt konnte nicht geloescht werden.'); return }
    await load()
  }

  const filtered = useMemo(() => contacts.filter((contact) => {
    const text = [contact.first_name, contact.last_name, contact.company, contact.email].join(' ').toLowerCase()
    return (filter === 'alle' || contact.status === filter) && text.includes(query.toLowerCase().trim())
  }), [contacts, filter, query])

  const counts = { leads: contacts.filter((item) => item.status === 'lead').length, customers: contacts.filter((item) => item.status === 'kunde').length, followups: contacts.filter((item) => item.next_contact_at).length, appointments: events.length }

  return (
    <main className="min-h-screen bg-[#fbf9ff] px-4 pb-40 pt-5 text-slate-950">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-violet-500">Mila CRM</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">Dein Kundenbereich</h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">Kontakte, Projekte und nächste Schritte.</p>
        </div>
        <div className="rounded-2xl bg-violet-600 px-3 py-2 text-center text-white shadow-sm"><p className="text-lg font-black">{contacts.length}</p><p className="text-[10px] font-black uppercase">Kontakte</p></div>
      </header>

      <section className="mt-5 grid grid-cols-2 gap-3">
        {[['Leads', counts.leads, 'text-sky-600'], ['Kunden', counts.customers, 'text-emerald-600'], ['Wiedervorlagen', counts.followups, 'text-amber-600'], ['Termine', counts.appointments, 'text-violet-600']].map(([title, value, color]) => <div key={String(title)} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><p className={`text-2xl font-black ${color}`}>{value}</p><p className="mt-1 text-xs font-black text-slate-500">{title}</p></div>)}
      </section>

      {events.length > 0 && <section className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">Als Nächstes</p><p className="mt-2 font-black text-slate-900">{events[0].title}</p><p className="mt-1 text-sm font-semibold text-amber-800">{new Date(events[0].starts_at).toLocaleString('de-DE')}</p></section>}

      <details open className="mt-5 rounded-2xl border border-slate-100 bg-white shadow-sm">
        <summary className="cursor-pointer list-none p-4 font-black text-slate-900">+ Kontakt anlegen</summary>
        <div className="space-y-3 border-t border-slate-100 p-4">
          <div className="grid grid-cols-2 gap-3"><input className="rounded-xl border border-slate-200 p-3 text-sm" placeholder="Vorname" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /><input className="rounded-xl border border-slate-200 p-3 text-sm" placeholder="Nachname" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
          <input className="w-full rounded-xl border border-slate-200 p-3 text-sm" placeholder="Unternehmen" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          <div className="grid grid-cols-2 gap-3"><input className="rounded-xl border border-slate-200 p-3 text-sm" placeholder="E-Mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /><input className="rounded-xl border border-slate-200 p-3 text-sm" placeholder="Telefon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3"><select className="rounded-xl border border-slate-200 p-3 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Status })}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><input className="rounded-xl border border-slate-200 p-3 text-sm" type="date" value={form.next_contact_at} onChange={(e) => setForm({ ...form, next_contact_at: e.target.value })} /></div>
          <button type="button" onClick={saveContact} disabled={saving} className="w-full rounded-xl bg-violet-600 py-3 font-black text-white disabled:opacity-50">{saving ? 'Wird gespeichert...' : 'Kontakt speichern'}</button>
        </div>
      </details>

      <section className="mt-6">
        <div className="flex items-center justify-between"><h2 className="text-lg font-black">Kontakte</h2><span className="text-xs font-bold text-slate-400">{filtered.length} angezeigt</span></div>
        <input className="mt-3 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-sm" placeholder="Suchen..." value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{(['alle', 'lead', 'gespraech', 'angebot', 'kunde'] as const).map((value) => <button key={value} type="button" onClick={() => setFilter(value)} className={`shrink-0 rounded-full px-3 py-2 text-xs font-black ${filter === value ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 shadow-sm'}`}>{value === 'alle' ? 'Alle' : labels[value]}</button>)}</div>
        <div className="mt-3 space-y-3">
          {loading ? <div className="rounded-2xl bg-white p-5 font-bold text-slate-500">CRM wird geladen...</div> : filtered.length === 0 ? <div className="rounded-2xl bg-white p-5 font-bold text-slate-500">Keine Kontakte gefunden.</div> : filtered.map((contact) => <article key={contact.id} className="border-b border-slate-200 py-4"><div className="flex items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-100 font-black text-violet-700">{initials(contact)}</div><div className="min-w-0 flex-1"><p className="truncate font-black">{[contact.first_name, contact.last_name].filter(Boolean).join(' ') || contact.company}</p><p className="truncate text-sm font-semibold text-slate-500">{contact.company || contact.email || 'Kein Unternehmen'}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${badge[contact.status]}`}>{labels[contact.status]}</span></div><div className="mt-3 flex items-center justify-between"><p className="text-xs font-semibold text-slate-500">{contact.next_contact_at ? `Wiedervorlage ${dateDE(contact.next_contact_at)}` : 'Keine Wiedervorlage'}</p><div className="flex items-center gap-3"><Link href={`/crm/kontakte/${contact.id}`} className="text-sm font-black text-violet-600">Öffnen →</Link><button type="button" onClick={() => deleteContact(contact.id)} className="text-sm font-black text-rose-600">Löschen</button></div></div></article>)}
        </div>
      </section>
      {error && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>}
    </main>
  )
}