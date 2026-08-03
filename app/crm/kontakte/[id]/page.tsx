'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Contact = { id: string; first_name: string; last_name: string; company: string; email: string; phone: string; status: string }
type Project = { id: string; title: string; description: string; status: string }
type Note = { id: string; body: string; note_type: string; created_at: string }
type Event = { id: string; title: string; starts_at: string; notes: string }

const projectLabels: Record<string, string> = { planung: 'Planung', aktiv: 'Aktiv', wartet: 'Wartet', abgeschlossen: 'Abgeschlossen' }
const noteLabels: Record<string, string> = { notiz: 'Notiz', telefonat: 'Telefonat', email: 'E-Mail', whatsapp: 'WhatsApp', meeting: 'Meeting' }

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [contact, setContact] = useState<Contact | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [project, setProject] = useState({ title: '', description: '', status: 'planung' })
  const [note, setNote] = useState({ body: '', type: 'notiz' })
  const [event, setEvent] = useState({ title: '', starts_at: '', notes: '' })
  const [error, setError] = useState('')

  async function load() {
    const [contactResult, projectResult, noteResult, eventResult] = await Promise.all([
      supabase.from('crm_contacts').select('*').eq('id', id).single(),
      supabase.from('crm_projects').select('*').eq('contact_id', id).order('created_at', { ascending: false }),
      supabase.from('crm_notes').select('*').eq('contact_id', id).order('created_at', { ascending: false }),
      supabase.from('crm_calendar_events').select('*').eq('contact_id', id).order('starts_at', { ascending: true }),
    ])
    if (contactResult.error) { setError('Kontakt konnte nicht geladen werden.'); return }
    setContact(contactResult.data as Contact); setProjects((projectResult.data || []) as Project[]); setNotes((noteResult.data || []) as Note[]); setEvents((eventResult.data || []) as Event[])
  }

  useEffect(() => { if (id) void load() }, [id])

  async function insert(table: string, payload: Record<string, unknown>, reset: () => void) {
    const { data } = await supabase.auth.getUser()
    if (!data.user) { setError('Bitte zuerst anmelden.'); return }
    const { error: insertError } = await supabase.from(table).insert({ ...payload, user_id: data.user.id, contact_id: id })
    if (insertError) { setError('Speichern war nicht erfolgreich.'); return }
    reset(); await load()
  }

  if (!contact) return <main className="min-h-screen p-6 font-bold">{error || 'Kontakt wird geladen...'}</main>
  const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || contact.company || 'Kontakt'

  return <main className="min-h-screen bg-[#fbf9ff] px-4 pb-40 pt-5 text-slate-950">
    <Link href="/crm" className="text-sm font-black text-violet-600">â Zurueck zum CRM</Link>
    <section className="mt-4 border-b border-slate-200 pb-5"><p className="text-[11px] font-black uppercase tracking-[0.22em] text-violet-500">Kontaktprofil</p><div className="mt-2 flex items-start justify-between gap-3"><div><h1 className="text-3xl font-black tracking-tight">{name}</h1><p className="mt-1 font-semibold text-slate-500">{contact.company || 'Kein Unternehmen'}</p></div><span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">{contact.status}</span></div><div className="mt-4 flex flex-wrap gap-4 text-sm font-bold text-slate-600">{contact.email && <a href={`mailto:${contact.email}`} className="underline">{contact.email}</a>}{contact.phone && <a href={`tel:${contact.phone}`} className="underline">{contact.phone}</a>}</div></section>

    <section className="mt-5"><div className="flex items-center justify-between"><h2 className="text-lg font-black">Projekte</h2><span className="text-xs font-bold text-slate-400">{projects.length}</span></div><details className="mt-3 rounded-2xl bg-white shadow-sm"><summary className="cursor-pointer list-none p-4 font-black">+ Projekt hinzufuegen</summary><div className="space-y-3 border-t border-slate-100 p-4"><input className="w-full rounded-xl border p-3 text-sm" placeholder="Projektname" value={project.title} onChange={(e) => setProject({ ...project, title: e.target.value })} /><textarea className="min-h-20 w-full rounded-xl border p-3 text-sm" placeholder="Kurzbeschreibung" value={project.description} onChange={(e) => setProject({ ...project, description: e.target.value })} /><select className="w-full rounded-xl border p-3 text-sm" value={project.status} onChange={(e) => setProject({ ...project, status: e.target.value })}>{Object.entries(projectLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><button type="button" onClick={() => insert('crm_projects', { title: project.title.trim(), description: project.description.trim(), status: project.status }, () => setProject({ title: '', description: '', status: 'planung' }))} className="w-full rounded-xl bg-violet-600 py-3 font-black text-white">Projekt speichern</button></div></details><div className="mt-3 space-y-2">{projects.map((item) => <article key={item.id} className="border-b border-slate-200 py-3"><div className="flex justify-between gap-3"><p className="font-black">{item.title}</p><span className="text-xs font-black text-violet-600">{projectLabels[item.status] || item.status}</span></div>{item.description && <p className="mt-1 text-sm text-slate-500">{item.description}</p>}</article>)}</div></section>

    <section className="mt-7"><div className="flex items-center justify-between"><h2 className="text-lg font-black">Aktivitaeten</h2><span className="text-xs font-bold text-slate-400">{notes.length}</span></div><details className="mt-3 rounded-2xl bg-white shadow-sm"><summary className="cursor-pointer list-none p-4 font-black">+ Notiz oder Kommunikation</summary><div className="space-y-3 border-t border-slate-100 p-4"><select className="w-full rounded-xl border p-3 text-sm" value={note.type} onChange={(e) => setNote({ ...note, type: e.target.value })}>{Object.entries(noteLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><textarea className="min-h-24 w-full rounded-xl border p-3 text-sm" placeholder="Was wurde besprochen?" value={note.body} onChange={(e) => setNote({ ...note, body: e.target.value })} /><button type="button" onClick={() => insert('crm_notes', { body: note.body.trim(), note_type: note.type }, () => setNote({ body: '', type: 'notiz' }))} className="w-full rounded-xl bg-slate-900 py-3 font-black text-white">Notiz speichern</button></div></details><div className="mt-3 space-y-2">{notes.map((item) => <article key={item.id} className="border-b border-slate-200 py-3"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{noteLabels[item.note_type] || item.note_type} - {new Date(item.created_at).toLocaleDateString('de-DE')}</p><p className="mt-1 font-semibold text-slate-700">{item.body}</p></article>)}</div></section>

    <section className="mt-7"><div className="flex items-center justify-between"><h2 className="text-lg font-black">Kalender</h2><span className="text-xs font-bold text-slate-400">{events.length}</span></div><details className="mt-3 rounded-2xl bg-white shadow-sm"><summary className="cursor-pointer list-none p-4 font-black">+ Termin eintragen</summary><div className="space-y-3 border-t border-slate-100 p-4"><input className="w-full rounded-xl border p-3 text-sm" placeholder="Terminname" value={event.title} onChange={(e) => setEvent({ ...event, title: e.target.value })} /><input className="w-full rounded-xl border p-3 text-sm" type="datetime-local" value={event.starts_at} onChange={(e) => setEvent({ ...event, starts_at: e.target.value })} /><textarea className="min-h-20 w-full rounded-xl border p-3 text-sm" placeholder="Notiz oder Videolink" value={event.notes} onChange={(e) => setEvent({ ...event, notes: e.target.value })} /><button type="button" onClick={() => insert('crm_calendar_events', { title: event.title.trim(), starts_at: new Date(event.starts_at).toISOString(), notes: event.notes.trim() }, () => setEvent({ title: '', starts_at: '', notes: '' }))} className="w-full rounded-xl bg-amber-500 py-3 font-black text-white">Termin speichern</button></div></details><div className="mt-3 space-y-2">{events.map((item) => <article key={item.id} className="border-b border-slate-200 py-3"><p className="font-black">{item.title}</p><p className="text-sm font-semibold text-amber-700">{new Date(item.starts_at).toLocaleString('de-DE')}</p>{item.notes && <p className="mt-1 text-sm text-slate-500">{item.notes}</p>}</article>)}</div></section>
    {error && <p className="mt-5 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>}
  </main>
}