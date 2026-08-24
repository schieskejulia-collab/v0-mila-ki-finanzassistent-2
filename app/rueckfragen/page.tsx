'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { getActiveClientId, supabase } from '@/lib/supabase'

type CaseItem = { id: string; subject: string; status: string }
type Question = { id: string; case_id: string; content: string; status: 'open' | 'waiting' | 'done'; created_at: string }

export default function RueckfragenPage() {
  const [cases, setCases] = useState<CaseItem[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [caseId, setCaseId] = useState('')
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const caseMap = useMemo(() => new Map(cases.map((item) => [item.id, item])), [cases])

  async function load() {
    setLoading(true); setMessage('')
    const clientId = getActiveClientId()
    if (!clientId) { setCases([]); setQuestions([]); setCaseId(''); setLoading(false); return }

    const { data: caseData, error: caseError } = await supabase
      .from('mila_intake_cases').select('id,subject,status').eq('client_id', clientId).neq('status', 'done').order('created_at', { ascending: false })
    if (caseError) { setMessage('Vorgänge konnten nicht geladen werden.'); setLoading(false); return }

    const nextCases = (caseData || []).map((item: any) => ({ id: String(item.id), subject: String(item.subject || 'Vorgang'), status: String(item.status || 'new') }))
    setCases(nextCases)
    const urlCaseId = new URLSearchParams(window.location.search).get('case') || ''
    const nextCaseId = nextCases.some((item) => item.id === urlCaseId) ? urlCaseId : nextCases[0]?.id || ''
    setCaseId((current) => current && nextCases.some((item) => item.id === current) ? current : nextCaseId)
    if (nextCases.length === 0) { setQuestions([]); setLoading(false); return }

    const { data: updateData, error: updateError } = await supabase
      .from('mila_case_updates').select('id,case_id,content,status,created_at').in('case_id', nextCases.map((item) => item.id)).eq('kind', 'question').order('created_at', { ascending: false })
    if (updateError) { setMessage('Rückfragen konnten nicht geladen werden.'); setQuestions([]) }
    else setQuestions((updateData || []) as Question[])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  async function add() {
    const text = question.trim()
    if (!text || !caseId) return
    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) { setMessage('Bitte erneut anmelden.'); return }
    setSaving(true); setMessage('')
    const { error } = await supabase.from('mila_case_updates').insert({ user_id: authData.user.id, case_id: caseId, kind: 'question', content: text, status: 'waiting' })
    if (error) { setMessage(error.message); setSaving(false); return }
    await supabase.from('mila_intake_cases').update({ status: 'needs_info', handoff_ready: false }).eq('id', caseId).eq('status', 'in_progress')
    setQuestion(''); setSaving(false); await load()
  }

  async function done(id: string) {
    setSaving(true); setMessage('')
    const { error } = await supabase.from('mila_case_updates').update({ status: 'done' }).eq('id', id)
    if (error) setMessage(error.message)
    setSaving(false); await load()
  }

  const selectedCase = caseMap.get(caseId)
  const visibleQuestions = questions.filter((item) => item.case_id === caseId)
  const openCount = visibleQuestions.filter((item) => item.status !== 'done').length

  return <main className="mx-auto min-h-screen max-w-md space-y-5 p-5 pb-32 text-slate-950">
    <header><Link href="/jetzt" className="text-sm font-semibold text-slate-500">← Zu den Vorgängen</Link><p className="mt-5 text-xs font-black uppercase tracking-[.18em] text-violet-600">Mandantenkommunikation</p><h1 className="mt-2 text-3xl font-black">Rückfragen</h1><p className="mt-2 text-sm font-semibold leading-6 text-slate-500">Jede Frage gehört zu einem konkreten Vorgang – und erscheint dadurch auch im sicheren Mandanten-Link.</p></header>
    {message && <div className="rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-800">{message}</div>}
    {loading ? <p className="py-10 text-center text-sm font-semibold text-slate-400">Rückfragen werden geladen …</p> : cases.length === 0 ? <section className="rounded-3xl border border-dashed p-6 text-center"><p className="text-lg font-black">Noch kein aktiver Vorgang.</p><p className="mt-2 text-sm font-semibold text-slate-500">Lege zuerst im Eingang einen Vorgang an. Danach bleiben Rückfragen, Antworten und Belege zusammen.</p><Link href="/eingang" className="mt-4 inline-flex rounded-2xl bg-violet-600 px-4 py-3 text-sm font-black text-white">Zum Eingang</Link></section> : <>
      <section className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm"><label className="text-xs font-black uppercase tracking-[.16em] text-violet-600">Vorgang<select value={caseId} onChange={(event) => setCaseId(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm font-black text-slate-950">{cases.map((item) => <option key={item.id} value={item.id}>{item.subject}</option>)}</select></label><p className="mt-3 text-xs font-semibold text-slate-500">{openCount} offene Rückfrage{openCount === 1 ? '' : 'n'} in „{selectedCase?.subject}“</p></section>
      <section className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-[.16em] text-violet-600">Neue Rückfrage</p><textarea value={question} onChange={(event) => setQuestion(event.target.value)} rows={3} placeholder="z. B. Bitte die vollständige Rechnung nachreichen." className="mt-3 w-full resize-none rounded-2xl border border-slate-200 p-4 font-semibold outline-none focus:border-violet-400"/><button type="button" disabled={saving || !question.trim()} onClick={() => void add()} className="mt-3 w-full rounded-2xl bg-violet-600 p-4 font-black text-white disabled:opacity-50">Rückfrage im Vorgang speichern</button></section>
      <section className="space-y-3"><div className="flex justify-between"><h2 className="text-xl font-black">Rückfragen im Vorgang</h2><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">{openCount} offen</span></div>{visibleQuestions.length === 0 ? <div className="rounded-3xl bg-emerald-50 p-5 text-sm font-semibold text-emerald-800">✓ In diesem Vorgang ist gerade nichts offen.</div> : visibleQuestions.map((item) => <article key={item.id} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"><div className="flex justify-between gap-3"><p className="font-black">{item.content}</p><span className="shrink-0 text-[10px] font-black uppercase text-violet-600">{item.status === 'done' ? 'erledigt' : 'offen'}</span></div>{item.status !== 'done' && <button type="button" disabled={saving} onClick={() => void done(item.id)} className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 disabled:opacity-50">Als erledigt markieren</button>}</article>)}</section>
    </>}
  </main>
}
