'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type MilaClient = {
  id: string
  name: string
  contact?: string
  note?: string
  createdAt: string
}

type PortalCase = {
  id: string
  client_id: string
  subject: string
  status: string
  created_at: string
}

type Takeover = {
  clientId: string
  startDate: string
  period: string
  existingFiles: 'yes' | 'no' | 'unknown'
  completeness: 'yes' | 'no' | 'unknown'
  handoffRhythm: 'kanzlei' | 'monthly' | 'quarterly' | 'halfyear' | 'yearly' | 'individual'
  note: string
  recordedAt: string
}

const CLIENTS_KEY = 'mila-clients-v1'
const ACTIVE_CLIENT_KEY = 'mila-active-client-v1'
const TAKEOVER_KEY = 'mila-client-takeovers-v1'

function readLocalClients(): MilaClient[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(CLIENTS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function readTakeovers(): Record<string, Takeover> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(TAKEOVER_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function toClient(row: any): MilaClient {
  return {
    id: row.id,
    name: row.name,
    contact: row.contact || '',
    note: row.note || '',
    createdAt: row.created_at || new Date().toISOString(),
  }
}

function todayValue() {
  return new Date().toISOString().slice(0, 10)
}

function monthValue() {
  return new Date().toISOString().slice(0, 7)
}

function takeoverLabel(value: Takeover['completeness']) {
  if (value === 'yes') return 'als vollständig übergeben'
  if (value === 'no') return 'noch unvollständig übergeben'
  return 'Vollständigkeit bei Übernahme unbekannt'
}

export default function MandantenPage() {
  const [clients, setClients] = useState<MilaClient[]>([])
  const [cases, setCases] = useState<PortalCase[]>([])
  const [activeClientId, setActiveClientId] = useState('')
  const [portalCaseId, setPortalCaseId] = useState('')
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [linkStatus, setLinkStatus] = useState<Record<string, string>>({})
  const [takeovers, setTakeovers] = useState<Record<string, Takeover>>({})
  const [startDate, setStartDate] = useState(todayValue())
  const [period, setPeriod] = useState(monthValue())
  const [existingFiles, setExistingFiles] = useState<Takeover['existingFiles']>('yes')
  const [completeness, setCompleteness] = useState<Takeover['completeness']>('unknown')
  const [handoffRhythm, setHandoffRhythm] = useState<Takeover['handoffRhythm']>('kanzlei')
  const [takeoverNote, setTakeoverNote] = useState('')

  useEffect(() => {
    async function loadClients() {
      const savedActive = window.localStorage.getItem(ACTIVE_CLIENT_KEY) || ''
      setActiveClientId(savedActive)
      setTakeovers(readTakeovers())

      const [clientResult, caseResult] = await Promise.all([
        supabase.from('clients').select('id,name,contact,note,created_at').order('created_at', { ascending: false }),
        savedActive
          ? supabase.from('mila_intake_cases').select('id,client_id,subject,status,created_at').eq('client_id', savedActive).order('created_at', { ascending: false })
          : Promise.resolve({ data: [], error: null }),
      ])

      if (!clientResult.error && clientResult.data) {
        const remoteClients = clientResult.data.map(toClient)
        setClients(remoteClients)
        window.localStorage.setItem(CLIENTS_KEY, JSON.stringify(remoteClients))
        const nextCases = (caseResult.data || []) as PortalCase[]
        setCases(nextCases)
        setPortalCaseId((current) => current && nextCases.some((item) => item.id === current)
          ? current
          : nextCases.find((item) => item.status !== 'done')?.id || nextCases[0]?.id || '')
        setLoading(false)
        return
      }

      setClients(readLocalClients())
      setCases([])
      setLoading(false)
    }

    void loadClients()
  }, [])

  const activeClient = useMemo(
    () => clients.find((client) => client.id === activeClientId) || null,
    [clients, activeClientId]
  )
  const activeTakeover = activeClient ? takeovers[activeClient.id] : undefined

  function persistLocal(nextClients: MilaClient[]) {
    setClients(nextClients)
    window.localStorage.setItem(CLIENTS_KEY, JSON.stringify(nextClients))
  }

  async function addClient() {
    const cleanName = name.trim()
    if (!cleanName) {
      window.alert('Bitte einen Mandantennamen eingeben.')
      return
    }

    const id = globalThis.crypto?.randomUUID?.() || `client-${Date.now()}`
    const createdAt = new Date().toISOString()
    const client: MilaClient = { id, name: cleanName, contact: contact.trim(), note: note.trim(), createdAt }

    const { error } = await supabase.from('clients').insert({
      id,
      name: client.name,
      contact: client.contact || null,
      note: client.note || null,
      created_at: createdAt,
    })

    if (error) {
      window.alert(`Mandant konnte noch nicht dauerhaft gespeichert werden: ${error.message}`)
      return
    }

    const nextClients = [client, ...clients]
    persistLocal(nextClients)
    setActiveClientId(client.id)
    window.localStorage.setItem(ACTIVE_CLIENT_KEY, client.id)
    setName('')
    setContact('')
    setNote('')
  }

  function saveTakeover() {
    if (!activeClient) return
    if (!startDate || !period) {
      window.alert('Bitte Bearbeitungsbeginn und Startzeitraum angeben.')
      return
    }

    const entry: Takeover = {
      clientId: activeClient.id,
      startDate,
      period,
      existingFiles,
      completeness,
      handoffRhythm,
      note: takeoverNote.trim(),
      recordedAt: new Date().toISOString(),
    }
    const next = { ...takeovers, [activeClient.id]: entry }
    setTakeovers(next)
    window.localStorage.setItem(TAKEOVER_KEY, JSON.stringify(next))
  }

  function editTakeover() {
    if (!activeTakeover) return
    setStartDate(activeTakeover.startDate)
    setPeriod(activeTakeover.period)
    setExistingFiles(activeTakeover.existingFiles)
    setCompleteness(activeTakeover.completeness)
    setHandoffRhythm(activeTakeover.handoffRhythm)
    setTakeoverNote(activeTakeover.note || '')
    const next = { ...takeovers }
    delete next[activeTakeover.clientId]
    setTakeovers(next)
    window.localStorage.setItem(TAKEOVER_KEY, JSON.stringify(next))
  }

  function selectClient(client: MilaClient) {
    window.localStorage.setItem(ACTIVE_CLIENT_KEY, client.id)
    setActiveClientId(client.id)
    window.location.assign('/mandanten')
  }

  async function createPortalLink(client: MilaClient, caseId: string) {
    const statusKey = `${client.id}:${caseId}`
    if (!caseId) {
      setLinkStatus((current) => ({ ...current, [client.id]: 'Bitte zuerst einen Vorgang auswählen.' }))
      return
    }
    setLinkStatus((current) => ({ ...current, [statusKey]: 'Erstelle sicheren Link …' }))
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    if (!accessToken) {
      setLinkStatus((current) => ({ ...current, [statusKey]: 'Bitte neu anmelden.' }))
      return
    }

    const response = await fetch('/api/client-portal/link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ clientId: client.id, caseId }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok || !data?.url) {
      setLinkStatus((current) => ({ ...current, [statusKey]: data?.error || 'Link konnte nicht erstellt werden.' }))
      return
    }

    try {
      if (navigator.share) {
        await navigator.share({ title: `Unterlagen für ${data.caseSubject || client.name}`, text: `Hier kannst du Unterlagen sicher für „${data.caseSubject || 'diesen Vorgang'}“ einreichen:`, url: data.url })
        setLinkStatus((current) => ({ ...current, [statusKey]: 'Link bereit zum Teilen ✓' }))
      } else {
        await navigator.clipboard.writeText(data.url)
        setLinkStatus((current) => ({ ...current, [statusKey]: 'Link kopiert ✓' }))
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        setLinkStatus((current) => ({ ...current, [statusKey]: 'Teilen abgebrochen – Link bleibt verfügbar.' }))
        return
      }
      try {
        await navigator.clipboard.writeText(data.url)
        setLinkStatus((current) => ({ ...current, [statusKey]: 'Link kopiert ✓' }))
      } catch {
        window.prompt('Mandanten-Link kopieren:', data.url)
        setLinkStatus((current) => ({ ...current, [statusKey]: 'Link erstellt ✓' }))
      }
    }
  }

  const activeCases = useMemo(() => cases.filter((item) => item.status !== 'done'), [cases])
  const selectedPortalCase = cases.find((item) => item.id === portalCaseId) || null

  async function deleteClient(client: MilaClient) {
    const confirmed = window.confirm(`${client.name} wirklich aus der Mandantenliste entfernen? Die bereits zugeordneten Unterlagen werden dabei nicht gelöscht.`)
    if (!confirmed) return
    const { error } = await supabase.from('clients').delete().eq('id', client.id)
    if (error) {
      window.alert(`Mandant konnte nicht entfernt werden: ${error.message}`)
      return
    }
    const nextClients = clients.filter((item) => item.id !== client.id)
    persistLocal(nextClients)
    if (activeClientId === client.id) {
      setActiveClientId('')
      window.localStorage.removeItem(ACTIVE_CLIENT_KEY)
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-md space-y-5 p-5 pb-32 text-slate-950">
      <header>
        <Link href="/" className="text-sm font-semibold text-slate-500">← Arbeitsplatz</Link>
        <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-violet-600">Mobile Mandantenzentrale</p>
        <h1 className="mt-2 text-3xl font-black">Mandanten</h1>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">Mandanten auswählen, Übernahme dokumentieren, Rückfragen verwalten und sichere Upload-Links teilen.</p>
      </header>

      {activeClient && (
        <section className="rounded-3xl bg-violet-600 p-5 text-white shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-white/70">Du arbeitest gerade für</p>
          <h2 className="mt-2 text-2xl font-black">{activeClient.name}</h2>
          <p className="mt-2 text-sm font-semibold text-white/80">Alles hier wird eindeutig diesem Mandanten zugeordnet.</p>
          <div className="mt-5 space-y-2">
            {activeCases.length > 0 ? <>
              <label className="block text-xs font-black uppercase tracking-[.12em] text-white/70">Vorgang für diesen Link
                <select value={portalCaseId} onChange={(event) => setPortalCaseId(event.target.value)} className="mt-2 w-full rounded-2xl border-0 bg-white px-4 py-4 text-base font-black text-slate-950">
                  {activeCases.map((item) => <option key={item.id} value={item.id}>{item.subject}</option>)}
                </select>
              </label>
              <p className="rounded-2xl bg-white/10 p-3 text-xs font-semibold leading-relaxed text-white/85">Der Mandant sieht und beantwortet nur Rückfragen aus diesem einen Vorgang. Nachgereichte Dateien landen ebenfalls genau hier.</p>
              <button type="button" onClick={() => void createPortalLink(activeClient, portalCaseId)} className="w-full rounded-2xl bg-white px-4 py-4 text-base font-black text-violet-700">🔗 Sicheren Vorgangs-Link teilen</button>
            </> : <div className="rounded-2xl bg-white/10 p-4"><p className="text-sm font-black">Noch kein aktiver Vorgang.</p><p className="mt-1 text-xs font-semibold text-white/80">Lege zuerst im Eingang ein konkretes Anliegen an. Erst dann kann Mila einen sicheren Link eindeutig zuordnen.</p><Link href="/eingang" className="mt-3 inline-flex rounded-xl bg-white px-3 py-2 text-xs font-black text-violet-700">Zum Eingang</Link></div>}
            <Link href="/rueckfragen" className="block w-full rounded-2xl bg-violet-500 px-4 py-4 text-center text-base font-black text-white ring-1 ring-white/20">💬 Allgemeine Rückfrage erstellen</Link>
            <Link href="/dokumente" className="block w-full rounded-2xl bg-violet-500 px-4 py-4 text-center text-base font-black text-white ring-1 ring-white/20">📁 Mandantenmappe öffnen</Link>
          </div>
          {selectedPortalCase && linkStatus[`${activeClient.id}:${selectedPortalCase.id}`] && <p className="mt-3 rounded-xl bg-white/10 px-3 py-2 text-center text-xs font-bold text-white">{linkStatus[`${activeClient.id}:${selectedPortalCase.id}`]}</p>}
        </section>
      )}

      {activeClient && (
        <section className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Mandanten-Onboarding</p>
          <h2 className="mt-2 text-xl font-black">Übernahmebestand</h2>
          {activeTakeover ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-emerald-50 p-4">
                <p className="text-sm font-black text-emerald-800">✓ Übernahme dokumentiert</p>
                <p className="mt-2 text-sm font-semibold text-slate-600">Bearbeitungsbeginn: {new Date(`${activeTakeover.startDate}T12:00:00`).toLocaleDateString('de-DE')}</p>
                <p className="mt-1 text-sm font-semibold text-slate-600">Startzeitraum: {activeTakeover.period}</p>
                <p className="mt-1 text-sm font-semibold text-slate-600">Bestand: {activeTakeover.existingFiles === 'yes' ? 'vorhandene Unterlagen werden übernommen' : activeTakeover.existingFiles === 'no' ? 'kein Altbestand angegeben' : 'Altbestand noch ungeklärt'}</p>
                <p className="mt-1 text-sm font-semibold text-slate-600">Status: {takeoverLabel(activeTakeover.completeness)}</p>
                <p className="mt-1 text-sm font-semibold text-slate-600">Übergabe: {activeTakeover.handoffRhythm === 'kanzlei' ? 'Rhythmus laut Kanzlei' : activeTakeover.handoffRhythm}</p>
                {activeTakeover.note && <p className="mt-3 rounded-xl bg-white p-3 text-xs font-semibold text-slate-500">{activeTakeover.note}</p>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={editTakeover} className="rounded-xl bg-white px-3 py-3 text-sm font-black text-violet-700 ring-1 ring-violet-200">Übernahme ändern</button>
                <Link href="/dokumente" className="rounded-xl bg-violet-600 px-3 py-3 text-center text-sm font-black text-white">Bestand prüfen</Link>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <p className="rounded-2xl bg-amber-50 p-3 text-xs font-semibold leading-relaxed text-amber-800">Dokumentiere zuerst, ab wann du übernimmst und wie der vorhandene Bestand übergeben wurde. Mila wertet den Altbestand nicht automatisch als vollständig.</p>
              <label className="block text-xs font-black text-slate-500">Bearbeitungsbeginn<input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-base font-semibold" /></label>
              <label className="block text-xs font-black text-slate-500">Startzeitraum<input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-base font-semibold" /></label>
              <label className="block text-xs font-black text-slate-500">Vorhandene Unterlagen<select value={existingFiles} onChange={(e) => setExistingFiles(e.target.value as Takeover['existingFiles'])} className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-base font-semibold"><option value="yes">Ja, Bestand wird übernommen</option><option value="no">Nein</option><option value="unknown">Noch ungeklärt</option></select></label>
              <label className="block text-xs font-black text-slate-500">Vollständigkeit bei Übernahme<select value={completeness} onChange={(e) => setCompleteness(e.target.value as Takeover['completeness'])} className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-base font-semibold"><option value="unknown">Unbekannt / noch zu prüfen</option><option value="yes">Mandant gibt Bestand als vollständig an</option><option value="no">Bestand ist noch unvollständig</option></select></label>
              <label className="block text-xs font-black text-slate-500">Übergaberhythmus<select value={handoffRhythm} onChange={(e) => setHandoffRhythm(e.target.value as Takeover['handoffRhythm'])} className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-base font-semibold"><option value="kanzlei">Laut Kanzlei</option><option value="monthly">Monatlich</option><option value="quarterly">Quartalsweise</option><option value="halfyear">Halbjährlich</option><option value="yearly">Jährlich</option><option value="individual">Individuell</option></select></label>
              <textarea value={takeoverNote} onChange={(e) => setTakeoverNote(e.target.value)} placeholder="Notiz zur Übernahme, z. B. welche Unterlagen noch nachgereicht werden" rows={3} className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-base font-semibold" />
              <button type="button" onClick={saveTakeover} className="w-full rounded-2xl bg-emerald-600 px-4 py-4 text-base font-black text-white">Übernahmebestand festhalten</button>
            </div>
          )}
        </section>
      )}

      <section className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-600">Mandant anlegen</p>
        <div className="mt-4 space-y-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name / Betrieb *" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base font-semibold outline-none focus:border-violet-400" />
          <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Ansprechpartner oder Kontakt (optional)" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base font-semibold outline-none focus:border-violet-400" />
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Kurze Notiz (optional)" rows={3} className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-base font-semibold outline-none focus:border-violet-400" />
          <button type="button" onClick={() => void addClient()} className="w-full rounded-2xl bg-violet-600 px-4 py-4 text-base font-black text-white">Mandant anlegen</button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3 px-1"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Deine Mandanten</p><h2 className="mt-1 text-xl font-black">{loading ? 'Lädt …' : `${clients.length} angelegt`}</h2></div><span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">Ziel: 5+ mobil</span></div>
        {!loading && clients.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-violet-200 bg-violet-50 p-5 text-sm font-semibold leading-relaxed text-slate-600">Noch keine Mandanten angelegt. Für den Test kannst du zwei fiktive Betriebe anlegen; echte Daten brauchen wir dafür nicht.</div>
        ) : clients.map((client) => {
          const selected = client.id === activeClientId
          return (
            <article key={client.id} className={`rounded-3xl border p-5 shadow-sm ${selected ? 'border-violet-300 bg-violet-50' : 'border-slate-100 bg-white'}`}>
              <div className="flex items-start justify-between gap-3"><div><p className="text-lg font-black">{client.name}</p>{client.contact && <p className="mt-1 text-sm font-semibold text-slate-500">{client.contact}</p>}</div>{selected && <span className="rounded-full bg-violet-600 px-3 py-1 text-xs font-black text-white">Aktiv</span>}</div>
              {client.note && <p className="mt-3 rounded-2xl bg-white/80 p-3 text-sm font-semibold leading-relaxed text-slate-600">{client.note}</p>}
              {takeovers[client.id] && <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">✓ Übernahmebestand dokumentiert</p>}
              <div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => selectClient(client)} className={`rounded-xl px-3 py-3 text-sm font-black ${selected ? 'bg-white text-violet-700 ring-1 ring-violet-200' : 'bg-violet-600 text-white'}`}>{selected ? 'Aktiv' : 'Auswählen'}</button><Link href={selected ? '/eingang' : '/mandanten'} className="rounded-xl bg-white px-3 py-3 text-center text-sm font-black text-violet-700 ring-1 ring-violet-200">{selected ? 'Vorgänge' : 'Erst auswählen'}</Link></div>
              <button type="button" onClick={() => void deleteClient(client)} className="mt-3 w-full rounded-xl bg-white px-3 py-3 text-sm font-black text-red-500 ring-1 ring-red-100">Entfernen</button>
            </article>
          )
        })}
      </section>

      <section className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5"><p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Sicherer Ablauf</p><p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">Der Mandant erhält nur seinen persönlichen Upload-Link. Er bekommt keinen Zugriff auf deinen Mila-Arbeitsplatz oder andere Mandanten.</p></section>
    </main>
  )
}
