'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Contact = { id: string; first_name: string; last_name: string; company: string; email: string; phone: string; status: string; next_contact_at: string | null; note: string }
type Project = { id: string; title: string; description: string; status: string; due_date: string | null; budget: number | null }
type Note = { id: string; body: string; note_type: string; created_at: string }
type Event = { id: string; title: string; starts_at: string; ends_at: string | null; notes: string }

const projectStatuses = { planung: 'Planung', aktiv: 'Aktiv', wartet: 'Wartet', abgeschlossen: 'Abgeschlossen' }
const noteTypes = { notiz: 'Notiz', telefonat: 'Telefonat', email: 'E-Mail', whatsapp: 'WhatsApp', meeting: 'Meeting' }

export default function ContactDetailPage() {
  const params = useParams<{ id: string }>()
  const contactId = params.id
  const [contact, setContact] = useState<Contact | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [projectTitle, setProjectTitle] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [projectStatus, setProjectStatus] = useState('planung')
  const [projectDueDate, setProjectDueDate] = useState('')
  const [noteBody, setNoteBody] = useState('')
  const [noteType, setNoteType] = useState('notiz')
  const [eventTitle, setEventTitle] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventNotes, setEventNotes] = useState('')
  const [error, setError] = useState('')

  async function load() {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) { setError('Bitte zuerst anmelden.'); return }

    const [contactResult, projectResult, noteResult, eventResult] = await Promise.all([
      supabase.from('crm_contacts').select('*').eq('id', contactId).single(),
      supabase.from('crm_projects').select('*').eq('contact_id', contactId).order('created_at', { ascending: false }),
      supabase.from('crm_notes').select('*').eq('contact_id', contactId).order('created_at', { ascending: false }),
      supabase.from('crm_calendar_events').select('*').eq('contact_id', contactId).order('starts_at', { ascending: true }),
    ])

    if (contactResult.error) setError('Kontakt konnte nicht geladen werden.')
    setContact(contactResult.data as Contact)
    setProjects((projectResult.data || []) as Project[])
    setNotes((noteResult.data || []) as Note[])
    setEvents((eventResult.data || []) as Event[])
  }

  useEffect(() => { if (contactId) void load() }, [contactId])

  async function addProject() {
    if (!projectTitle.trim()) return
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return
    const { error: insertError } = await supabase.from('crm_projects').insert({ user_id: userData.user.id, contact_id: contactId, title: projectTitle.trim(), description: projectDescription.trim(), status: projectStatus, due_date: projectDueDate || null })
    if (insertError) { setError('Projekt konnte nicht gespeichert werden.'); return }
    setProjectTitle(''); setProjectDescription(''); setProjectDueDate(''); await load()
  }

  async function addNote() {
    if (!noteBody.trim()) return
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return
    const { error: insertError } = await supabase.from('crm_notes').insert({ user_id: userData.user.id, contact_id: contactId, body: noteBody.trim(), note_type: noteType })
    if (insertError) { setError('Notiz konnte nicht gespeichert werden.'); return }
    setNoteBody(''); await load()
  }

  async function addEvent() {
    if (!eventTitle.trim() || !eventDate) return
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return
    const { error: insertError } = await supabase.from('crm_calendar_events').insert({ user_id: userData.user.id, contact_id: contactId, title: eventTitle.trim(), starts_at: new Date(eventDate).toISOString(), notes: eventNotes.trim() })
    if (insertError) { setError('Termin konnte nicht gespeichert werden.'); return }
    setEventTitle(''); setEventDate(''); setEventNotes(''); await load()
  }

  if (!contact) return <main className="min-h-screen p-6 font-bold">{error || 'Kontakt wird geladen...'}</main>
  const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || contact.company || 'Kontakt'

  return (
    <main className="min-h-screen space-y-5 bg-[#fbf9ff] p-4 pb-36 text-slate-950">
      <Link href="/crm" className="font-black text-violet-600">â ZurÃ¼ck zum CRM</Link>
      <section className="rounded-[2rem] bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-500">Kontaktprofil</p>
        <h1 className="mt-3 text-3xl font-black">{name}</h1>
        <p className="mt-1 text-lg font-bold text-slate-500">{contact.company || 'Kein Unternehmen'}</p>
        {contact.email && <p className="mt-4 text-sm font-semibold">âï¸ {contact.email}</p>}
        {contact.phone && <p className="mt-1 text-sm font-semibold">ð {contact.phone}</p>}
        <span className="mt-4 inline-block rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">{contact.status}</span>
      </section>

      <section className="space-y-3 rounded-[2rem] bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Projekt hinzufÃ¼gen</p>
        <input className="w-full rounded-2xl border p-4" placeholder="Projektname" value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} />
        <textarea className="min-h-20 w-full rounded-2xl border p-4" placeholder="Kurzbeschreibung" value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <select className="rounded-2xl border p-4" value={projectStatus} onChange={(e) => setProjectStatus(e.target.value)}>{Object.entries(projectStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <input className="rounded-2xl border p-4" type="date" value={projectDueDate} onChange={(e) => setProjectDueDate(e.target.value)} />
        </div>
        <button type="button" onClick={addProject} className="w-full rounded-2xl bg-violet-600 py-4 font-black text-white">Projekt speichern</button>
        {projects.map((project) => <div key={project.id} className="rounded-2xl bg-violet-50 p-4"><p className="font-black">{project.title}</p><p className="text-sm font-semibold text-slate-600">{project.description}</p><p className="mt-2 text-xs font-black text-violet-700">{projectStatuses[project.status as keyof typeof projectStatuses] || project.status}</p></div>)}
      </section>

      <section className="space-y-3 rounded-[2rem] bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Notiz oder Kommunikation</p>
        <select className="w-full rounded-2xl border p-4" value={noteType} onChange={(e) => setNoteType(e.target.value)}>{Object.entries(noteTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <textarea className="min-h-28 w-full rounded-2xl border p-4" placeholder="Was wurde besprochen?" value={noteBody} onChange={(e) => setNoteBody(e.target.value)} />
        <button type="button" onClick={addNote} className="w-full rounded-2xl bg-slate-900 py-4 font-black text-white">Notiz speichern</button>
        {notes.map((note) => <div key={note.id} className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-black uppercase text-slate-500">{noteTypes[note.note_type as keyof typeof noteTypes] || note.note_type} Â· {new Date(note.created_at).toLocaleDateString('de-DE')}</p><p className="mt-2 whitespace-pre-line text-sm font-semibold text-slate-700">{note.body}</p></div>)}
      </section>

      <section className="space-y-3 rounded-[2rem] bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Kalendertermin</p>
        <input className="w-full rounded-2xl border p-4" placeholder="Terminname" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} />
        <input className="w-full rounded-2xl border p-4" type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
        <textarea className="min-h-20 w-full rounded-2xl border p-4" placeholder="Terminnotiz / Videolink" value={eventNotes} onChange={(e) => setEventNotes(e.target.value)} />
        <button type="button" onClick={addEvent} className="w-full rounded-2xl bg-amber-500 py-4 font-black text-white">Termin speichern</button>
        {events.map((event) => <div key={event.id} className="rounded-2xl bg-amber-50 p-4"><p className="font-black">ð {event.title}</p><p className="text-sm font-bold text-amber-700">{new Date(event.starts_at).toLocaleString('de-DE')}</p>{event.notes && <p className="mt-1 text-sm text-slate-600">{event.notes}</p>}</div>)}
      </section>
      {error && <p className="rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</p>}
    </main>
  )
}
