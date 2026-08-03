'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type ContactStatus = 'lead' | 'kontakt' | 'gespraech' | 'angebot' | 'kunde' | 'inaktiv'

type Contact = {
  id: string
  first_name: string
  last_name: string
  company: string
  email: string
  phone: string
  status: ContactStatus
  next_contact_at: string | null
  note: string
  created_at?: string
}

const statusLabels: Record<ContactStatus, string> = {
  lead: 'Neuer Lead',
  kontakt: 'Kontaktiert',
  gespraech: 'Gespräch geplant',
  angebot: 'Angebot offen',
  kunde: 'Kunde',
  inaktiv: 'Inaktiv',
}

const emptyForm = {
  first_name: '',
  last_name: '',
  company: '',
  email: '',
  phone: '',
  status: 'lead' as ContactStatus,
  next_contact_at: '',
  note: '',
}

export default function CRMPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [form, setForm] = useState(emptyForm)
  const [search, setSearch] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadContacts() {
    setIsLoading(true)
    setError('')

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      setError('Bitte zuerst anmelden.')
      setIsLoading(false)
      return
    }

    const { data, error: queryError } = await supabase
      .from('crm_contacts')
      .select('*')
      .order('next_contact_at', { ascending: true, nullsFirst: false })

    if (queryError) {
      setError('CRM-Daten konnten nicht geladen werden. Bitte zuerst CRM-MODULE.sql in Supabase ausführen.')
    } else {
      setContacts((data || []) as Contact[])
    }

    setIsLoading(false)
  }

  useEffect(() => {
    void loadContacts()
  }, [])

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function saveContact() {
    if (!form.first_name.trim() && !form.company.trim()) {
      setError('Bitte mindestens einen Namen oder ein Unternehmen eintragen.')
      return
    }

    setIsSaving(true)
    setError('')

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      setError('Bitte zuerst anmelden.')
      setIsSaving(false)
      return
    }

    const { error: insertError } = await supabase.from('crm_contacts').insert({
      user_id: userData.user.id,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      company: form.company.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      status: form.status,
      next_contact_at: form.next_contact_at || null,
      note: form.note.trim(),
    })

    if (insertError) {
      setError('Kontakt konnte nicht gespeichert werden.')
    } else {
      setForm(emptyForm)
      await loadContacts()
    }

    setIsSaving(false)
  }

  async function deleteContact(id: string) {
    if (!window.confirm('Diesen Kontakt wirklich löschen?')) return

    const { error: deleteError } = await supabase
      .from('crm_contacts')
      .delete()
      .eq('id', id)

    if (deleteError) {
      setError('Kontakt konnte nicht gelöscht werden.')
    } else {
      setContacts((current) => current.filter((contact) => contact.id !== id))
    }
  }

  const normalizedSearch = search.toLowerCase().trim()
  const filteredContacts = contacts.filter((contact) =>
    [contact.first_name, contact.last_name, contact.company, contact.email]
      .join(' ')
      .toLowerCase()
      .includes(normalizedSearch),
  )

  return (
    <main className="min-h-screen space-y-5 bg-[#fbf9ff] p-4 pb-36 text-slate-950">
      <section className="rounded-[2rem] bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-500">Mila CRM</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">Kontakte im Blick</h1>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
          Leads, Kunden und nächste Kontakte an einem Ort - mit Wiedervorlage für Mila.
        </p>
      </section>

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-700">
          {error}
        </div>
      )}

      <section className="space-y-3 rounded-[2rem] bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Neuen Kontakt anlegen</p>
        <div className="grid grid-cols-2 gap-3">
          <input className="rounded-2xl border p-4" placeholder="Vorname" value={form.first_name} onChange={(event) => updateField('first_name', event.target.value)} />
          <input className="rounded-2xl border p-4" placeholder="Nachname" value={form.last_name} onChange={(event) => updateField('last_name', event.target.value)} />
        </div>
        <input className="w-full rounded-2xl border p-4" placeholder="Unternehmen" value={form.company} onChange={(event) => updateField('company', event.target.value)} />
        <input className="w-full rounded-2xl border p-4" type="email" placeholder="E-Mail" value={form.email} onChange={(event) => updateField('email', event.target.value)} />
        <input className="w-full rounded-2xl border p-4" type="tel" placeholder="Telefon / WhatsApp" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <select className="rounded-2xl border p-4" value={form.status} onChange={(event) => updateField('status', event.target.value as ContactStatus)}>
            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <input className="rounded-2xl border p-4 text-sm" type="date" value={form.next_contact_at} onChange={(event) => updateField('next_contact_at', event.target.value)} />
        </div>
        <textarea className="min-h-24 w-full rounded-2xl border p-4" placeholder="Notiz zum Kontakt" value={form.note} onChange={(event) => updateField('note', event.target.value)} />
        <button type="button" onClick={saveContact} disabled={isSaving} className="w-full rounded-2xl bg-violet-600 py-4 font-black text-white disabled:opacity-50">
          {isSaving ? 'Wird gespeichert...' : 'Kontakt speichern'}
        </button>
      </section>

      <section className="space-y-3">
        <input className="w-full rounded-2xl border bg-white p-4 shadow-sm" placeholder="Kontakte durchsuchen..." value={search} onChange={(event) => setSearch(event.target.value)} />
        {isLoading ? (
          <div className="rounded-3xl bg-white p-5 font-bold text-slate-500 shadow-sm">CRM wird geladen...</div>
        ) : filteredContacts.length === 0 ? (
          <div className="rounded-3xl bg-purple-50 p-5 font-bold text-slate-700">Noch keine Kontakte gefunden.</div>
        ) : (
          filteredContacts.map((contact) => (
            <article key={contact.id} className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-xl font-black">{[contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'Ohne Namen'}</p>
                  <p className="break-words text-sm font-semibold text-slate-500">{contact.company || 'Kein Unternehmen'}</p>
                </div>
                <span className="shrink-0 rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">{statusLabels[contact.status]}</span>
              </div>
              {contact.email && <p className="mt-3 text-sm font-semibold text-slate-600">✉️ {contact.email}</p>}
              {contact.phone && <p className="mt-1 text-sm font-semibold text-slate-600">📞 {contact.phone}</p>}
              {contact.next_contact_at && <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-700">📅 Wiedervorlage: {new Date(contact.next_contact_at).toLocaleDateString('de-DE')}</p>}
              {contact.note && <p className="mt-3 whitespace-pre-line rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">{contact.note}</p>}
              <button type="button" onClick={() => deleteContact(contact.id)} className="mt-4 font-black text-rose-500">Löschen</button>
            </article>
          ))
        )}
      </section>
    </main>
  )
}
