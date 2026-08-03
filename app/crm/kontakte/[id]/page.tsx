'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Contact = { id: string; first_name: string; last_name: string; company: string; email: string; phone: string; status: string }
type Project = { id: string; title: string; description: string; status: string }
type Note = { id: string; body: string; note_type: string; created_at: string }
type Event = { id: string; title: string; starts_at: string; notes: string }
type Tab = 'projects' | 'activity' | 'calendar'

const projectLabels: Record<string, string> = { planung: 'Planung', aktiv: 'Aktiv', wartet: 'Wartet', abgeschlossen: 'Abgeschlossen' }
const noteLabels: Record<string, string> = { notiz: 'Notiz', telefonat: 'Telefonat', email: 'E-Mail', whatsapp: 'WhatsApp', meeting: 'Meeting' }

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [contact, setContact] = useState<Contact | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [tab, setTab] = useState<Tab>('projects')
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [project, setProject] = useState({ title: '', description: '', status: 'planung' })
  const [note, setNote] = useState({ body: '', type: 'notiz' })
  const [event, setEvent] = useState({ title: '', starts_at: '', notes: '' })
  const [editing, setEditing] = useState<{ table: string; id: string } | null>(null)

  async function load() {
    const [c, p, n, e] = await Promise.all([
      supabase.from('crm_contacts').select('*').eq('id', id).single(),
      supabase.from('crm_projects').select('*').eq('contact_id', id).order('created_at', { ascending: false }),
      supabase.from('crm_notes').select('*').eq('contact_id', id).order('created_at', { ascending: false }),
      supabase.from('crm_calendar_events').select('*').eq('contact_id', id).order('starts_at', { ascending: true }),
    ])
    if (c.error) { setError('Kontakt konnte nicht geladen werden.'); return }
    setContact(c.data as Contact)
    setProjects((p.data || []) as Project[])
    setNotes((n.data || []) as Note[])
    setEvents((e.data || []) as Event[])
  }

  useEffect(() => { if (id) void load() }, [id])

  async function save(table: string, payload: Record<string, unknown>, reset: () => void) {
    const { data } = await supabase.auth.getUser()
    if (!data.user) { setError('Bitte zuerst anmelden.'); return }
    const query = editing?.table === table
      ? supabase.from(table).update(payload).eq('id', editing.id)
      : supabase.from(table).insert({ ...payload, user_id: data.user.id, contact_id: id })
    const { error: saveError } = await query
    if (saveError) { setError('Speichern war nicht erfolgreich.'); return }
    setError(''); setEditing(null); reset(); setShowForm(false); await load()
  }

  async function remove(table: string, itemId: string) {
    if (!window.confirm('Diesen Eintrag wirklich loeschen?')) return
    const { error: deleteError } = await supabase.from(table).delete().eq('id', itemId)
    if (deleteError) { setError('Loeschen war nicht erfolgreich.'); return }
    await load()
  }

  function editProject(item: Project) { setTab('projects'); setEditing({ table: 'crm_projects', id: item.id }); setProject({ title: item.title, description: item.description || '', status: item.status }); setShowForm(true) }
  function editNote(item: Note) { setTab('activity'); setEditing({ table: 'crm_notes', id: item.id }); setNote({ body: item.body, type: item.note_type }); setShowForm(true) }
  function editEvent(item: Event) { setTab('calendar'); setEditing({ table: 'crm_calendar_events', id: item.id }); setEvent({ title: item.title, starts_at: item.starts_at.slice(0, 16), notes: item.notes || '' }); setShowForm(true) }

  if (!contact) return <main className="min-h-screen bg-[#fbf9ff] p-6 font-bold">{error || 'Kontakt wird geladen...'}</main>

  const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || contact.company || 'Kontakt'
  const tabData = {
    projects: { label: 'Projekte', count: projects.length, action: '+ Projekt anlegen' },
    activity: { label: 'Aktivitaeten', count: notes.length, action: '+ Aktivitaet anlegen' },
    calendar: { label: 'Termine', count: events.length, action: '+ Termin anlegen' },
  }
  const active = tabData[tab]

  return <main className="min-h-screen bg-[#fbf9ff] px-4 pb-40 pt-0 text-slate-950">
    <header className="sticky top-0 z-30 -mx-4 border-b border-violet-100 bg-[#fbf9ff]/95 px-4 py-3 backdrop-blur">
      <Link href="/crm" className="inline-flex rounded-full bg-violet-100 px-4 py-2 text-sm font-black text-violet-700 shadow-sm">Zurueck zum CRM</Link>
    </header>

    <section className="mt-5 rounded-3xl bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-[11px] font-black uppercase tracking-[0.22em] text-violet-500">Kontaktprofil</p><h1 className="mt-2 text-3xl font-black tracking-tight">{name}</h1><p className="mt-1 font-semibold text-slate-500">{contact.company || 'Kein Unternehmen'}</p></div>
        <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">{contact.status}</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold text-slate-600">{contact.email && <a href={`mailto:${contact.email}`} className="underline">{contact.email}</a>}{contact.phone && <a href={`tel:${contact.phone}`} className="underline">{contact.phone}</a>}</div>
    </section>

    <section className="mt-5 rounded-3xl bg-white p-3 shadow-sm">
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(tabData) as Tab[]).map((key) => <button key={key} type="button" onClick={() => { setTab(key); setShowForm(false) }} className={`rounded-2xl px-2 py-3 text-xs font-black ${tab === key ? 'bg-violet-600 text-white' : 'bg-violet-50 text-violet-700'}`}><span className="block text-lg">{tabData[key].count}</span>{tabData[key].label}</button>)}
      </div>
    </section>

    <section className="mt-5 rounded-3xl bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3"><div><p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Aktueller Bereich</p><h2 className="mt-1 text-2xl font-black">{active.label}</h2></div><button type="button" onClick={() => setShowForm(!showForm)} className="rounded-full bg-violet-600 px-4 py-2 text-xs font-black text-white">{showForm ? 'Schliessen' : active.action}</button></div>

      {showForm && tab === 'projects' && <div className="mt-5 space-y-3 rounded-2xl bg-violet-50 p-4"><input className="w-full rounded-xl border-0 p-3 text-sm" placeholder="Projektname" value={project.title} onChange={(e) => setProject({ ...project, title: e.target.value })} /><textarea className="min-h-20 w-full rounded-xl border-0 p-3 text-sm" placeholder="Kurzbeschreibung" value={project.description} onChange={(e) => setProject({ ...project, description: e.target.value })} /><select className="w-full rounded-xl border-0 p-3 text-sm" value={project.status} onChange={(e) => setProject({ ...project, status: e.target.value })}>{Object.entries(projectLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><button type="button" onClick={() => save('crm_projects', { title: project.title.trim(), description: project.description.trim(), status: project.status }, () => setProject({ title: '', description: '', status: 'planung' }))} className="w-full rounded-xl bg-violet-600 py-3 font-black text-white">Projekt speichern</button></div>}

      {showForm && tab === 'activity' && <div className="mt-5 space-y-3 rounded-2xl bg-slate-50 p-4"><select className="w-full rounded-xl border-0 p-3 text-sm" value={note.type} onChange={(e) => setNote({ ...note, type: e.target.value })}>{Object.entries(noteLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><textarea className="min-h-28 w-full rounded-xl border-0 p-3 text-sm" placeholder="Was wurde besprochen?" value={note.body} onChange={(e) => setNote({ ...note, body: e.target.value })} /><button type="button" onClick={() => save('crm_notes', { body: note.body.trim(), note_type: note.type }, () => setNote({ body: '', type: 'notiz' }))} className="w-full rounded-xl bg-slate-900 py-3 font-black text-white">Aktivitaet speichern</button></div>}

      {showForm && tab === 'calendar' && <div className="mt-5 space-y-3 rounded-2xl bg-amber-50 p-4"><input className="w-full rounded-xl border-0 p-3 text-sm" placeholder="Terminname" value={event.title} onChange={(e) => setEvent({ ...event, title: e.target.value })} /><input className="w-full rounded-xl border-0 p-3 text-sm" type="datetime-local" value={event.starts_at} onChange={(e) => setEvent({ ...event, starts_at: e.target.value })} /><textarea className="min-h-20 w-full rounded-xl border-0 p-3 text-sm" placeholder="Terminnotiz oder Videolink" value={event.notes} onChange={(e) => setEvent({ ...event, notes: e.target.value })} /><button type="button" onClick={() => save('crm_calendar_events', { title: event.title.trim(), starts_at: new Date(event.starts_at).toISOString(), notes: event.notes.trim() }, () => setEvent({ title: '', starts_at: '', notes: '' }))} className="w-full rounded-xl bg-amber-500 py-3 font-black text-white">Termin speichern</button></div>}

      {!showForm && tab === 'projects' && <div className="mt-5 space-y-3">{projects.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">Noch keine Projekte vorhanden.</p>}{projects.map((item) => <article key={item.id} className="rounded-2xl bg-violet-50 p-4"><div className="flex justify-between gap-3"><p className="font-black">{item.title}</p><span className="text-xs font-black text-violet-700">{projectLabels[item.status] || item.status}</span></div>{item.description && <p className="mt-2 text-sm text-slate-600">{item.description}</p>}<div className="mt-4 flex gap-2"><button type="button" onClick={() => editProject(item)} className="rounded-full bg-white px-3 py-2 text-xs font-black text-violet-700">Bearbeiten</button><button type="button" onClick={() => remove('crm_projects', item.id)} className="rounded-full bg-rose-100 px-3 py-2 text-xs font-black text-rose-700">Loeschen</button></div></article>)}</div>}
      {!showForm && tab === 'activity' && <div className="mt-5 space-y-3">{notes.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">Noch keine AktivitÃ¤ten vorhanden.</p>}{notes.map((item) => <article key={item.id} className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{noteLabels[item.note_type] || item.note_type} Â· {new Date(item.created_at).toLocaleDateString('de-DE')}</p><p className="mt-2 font-semibold text-slate-700">{item.body}</p><div className="mt-4 flex gap-2"><button type="button" onClick={() => editNote(item)} className="rounded-full bg-white px-3 py-2 text-xs font-black text-slate-700">Bearbeiten</button><button type="button" onClick={() => remove('crm_notes', item.id)} className="rounded-full bg-rose-100 px-3 py-2 text-xs font-black text-rose-700">Loeschen</button></div></article>)}</div>}
      {!showForm && tab === 'calendar' && <div className="mt-5 space-y-3">{events.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">Noch keine Termine vorhanden.</p>}{events.map((item) => <article key={item.id} className="rounded-2xl bg-amber-50 p-4"><p className="font-black">{item.title}</p><p className="mt-1 font-bold text-amber-700">{new Date(item.starts_at).toLocaleString('de-DE')}</p>{item.notes && <p className="mt-2 text-sm text-slate-600">{item.notes}</p>}<div className="mt-4 flex gap-2"><button type="button" onClick={() => editEvent(item)} className="rounded-full bg-white px-3 py-2 text-xs font-black text-amber-700">Bearbeiten</button><button type="button" onClick={() => remove('crm_calendar_events', item.id)} className="rounded-full bg-rose-100 px-3 py-2 text-xs font-black text-rose-700">Loeschen</button></div></article>)}</div>}
    </section>
    {error && <p className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</p>}
  </main>
}