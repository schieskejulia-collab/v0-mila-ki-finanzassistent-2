'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileText,
  FolderOpen,
  History,
  Inbox,
  Loader2,
  MessageCircleQuestion,
  RefreshCw,
  Search,
  UserCheck,
  Zap,
} from 'lucide-react'
import { getActiveClientId, supabase } from '@/lib/supabase'

type CaseStatus = 'new'|'needs_info'|'standard'|'human_review'|'in_progress'|'waiting'|'done'
type Urgency = 'low'|'normal'|'high'|'critical'
type CaseItem = { id:string; client_id:string|null; source:string; caller_name:string|null; company:string|null; phone:string|null; email:string|null; subject:string; summary:string; urgency:Urgency; category:string; status:CaseStatus; assigned_to:string|null; due_at:string|null; handoff_summary:string|null; handoff_ready:boolean; created_at:string; completed_at:string|null }
type Task = { id:string; case_id:string|null; title:string; status:'open'|'waiting'|'blocked'|'done'; due_at:string|null; next_action:string|null }
type Update = { id:string; case_id:string; kind:'question'|'answer'|'note'|'handoff'; content:string; status:'open'|'waiting'|'done'; created_at:string }
type DocumentItem = { id:string; case_id:string|null; title:string|null; file_name:string|null; file_url:string|null; created_at:string|null }
type CaseEvent = { id:string; case_id:string; event_type:string; title:string; detail:string|null; created_at:string }
type Filter = 'all'|'today'|'waiting'|'review'|'ready'|'done'

const STATUS_LABEL:Record<CaseStatus,string>={new:'Neu',needs_info:'Info fehlt',standard:'Standard',human_review:'Mensch prüfen',in_progress:'In Bearbeitung',waiting:'Wartet',done:'Erledigt'}
function dueLevel(value:string|null){if(!value)return'normal';const diff=new Date(value).getTime()-Date.now();if(diff<0)return'overdue';if(diff<86400000)return'today';return'normal'}
function formatDate(value:string|null){if(!value)return'Keine Frist';return new Date(value).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}
function formatEventDate(value:string){return new Date(value).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'})}
function personLabel(item:CaseItem){return item.caller_name||item.company||'Kontakt noch offen'}

export default function JetztPage(){
  const [cases,setCases]=useState<CaseItem[]>([])
  const [tasks,setTasks]=useState<Task[]>([])
  const [updates,setUpdates]=useState<Update[]>([])
  const [documents,setDocuments]=useState<DocumentItem[]>([])
  const [events,setEvents]=useState<CaseEvent[]>([])
  const [selectedId,setSelectedId]=useState<string|null>(null)
  const [filter,setFilter]=useState<Filter>('all')
  const [query,setQuery]=useState('')
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')

  useEffect(()=>{void load()},[])

  async function load(){
    setLoading(true);setError('')
    const {data:auth}=await supabase.auth.getUser()
    if(!auth.user){setError('Bitte zuerst anmelden.');setLoading(false);return}
    const clientId=getActiveClientId()
    let caseQuery:any=supabase.from('mila_intake_cases').select('*').order('created_at',{ascending:false}).limit(200)
    let documentQuery:any=supabase.from('documents').select('id,case_id,title,file_name,file_url,created_at').order('created_at',{ascending:false}).limit(300)
    if(clientId){caseQuery=caseQuery.eq('client_id',clientId);documentQuery=documentQuery.eq('client_id',clientId)}
    const [c,t,u,d,e]=await Promise.all([
      caseQuery,
      supabase.from('mila_coordination_tasks').select('*').order('created_at',{ascending:false}).limit(400),
      supabase.from('mila_case_updates').select('*').order('created_at',{ascending:true}).limit(800),
      documentQuery,
      supabase.from('mila_case_events').select('id,case_id,event_type,title,detail,created_at').order('created_at',{ascending:false}).limit(1000),
    ])
    if(c.error||t.error||u.error||d.error||e.error)setError('Mila konnte den Vorgang nicht vollständig laden.')
    const next=(c.data||[]) as CaseItem[]
    setCases(next);setTasks((t.data||[]) as Task[]);setUpdates((u.data||[]) as Update[]);setDocuments((d.data||[]) as DocumentItem[]);setEvents((e.data||[]) as CaseEvent[])
    setSelectedId(x=>x&&next.some(i=>i.id===x)?x:(next[0]?.id??null))
    setLoading(false)
  }

  const current=cases.find(x=>x.id===selectedId)||null
  const currentTasks=tasks.filter(x=>x.case_id===selectedId)
  const currentUpdates=updates.filter(x=>x.case_id===selectedId)
  const currentDocuments=documents.filter(x=>x.case_id===selectedId)
  const currentEvents=events.filter(x=>x.case_id===selectedId)
  const activeTasks=currentTasks.filter(x=>x.status!=='done')
  const activeUpdates=currentUpdates.filter(x=>x.status!=='done')
  const activeQuestions=activeUpdates.filter(x=>x.kind==='question')
  const resolvedCount=currentTasks.filter(x=>x.status==='done').length+currentUpdates.filter(x=>x.status==='done').length

  const openQuestions=(id:string)=>updates.filter(u=>u.case_id===id&&u.kind==='question'&&u.status!=='done').length
  const openTasks=(id:string)=>tasks.filter(t=>t.case_id===id&&t.status!=='done').length
  const isTodayFirst=(item:CaseItem)=>item.status!=='done'&&(item.urgency==='critical'||item.urgency==='high'||dueLevel(item.due_at)==='today'||dueLevel(item.due_at)==='overdue'||openQuestions(item.id)>0)
  const stats=useMemo(()=>({open:cases.filter(c=>c.status!=='done').length,today:cases.filter(isTodayFirst).length,waiting:cases.filter(c=>c.status==='waiting'||openQuestions(c.id)>0).length,ready:cases.filter(c=>c.handoff_ready&&c.status!=='done').length}),[cases,updates])
  const visible=useMemo(()=>{const q=query.trim().toLowerCase();return cases.filter(item=>{const text=`${item.subject} ${item.summary} ${item.caller_name||''} ${item.company||''} ${item.category}`.toLowerCase();if(q&&!text.includes(q))return false;if(filter==='today')return isTodayFirst(item);if(filter==='waiting')return item.status==='waiting'||openQuestions(item.id)>0;if(filter==='review')return item.status==='human_review';if(filter==='ready')return item.handoff_ready&&item.status!=='done';if(filter==='done')return item.status==='done';return item.status!=='done'})},[cases,updates,query,filter])

  async function setStatus(status:CaseStatus){if(!current)return;setSaving(true);const{error:e}=await supabase.from('mila_intake_cases').update({status}).eq('id',current.id);if(e)setError('Status konnte nicht aktualisiert werden.');else setNotice(`Vorgang ist jetzt „${STATUS_LABEL[status]}“.`);setSaving(false);await load()}
  async function closeTask(task:Task){setSaving(true);await supabase.from('mila_coordination_tasks').update({status:'done'}).eq('id',task.id);setSaving(false);await load()}
  async function closeQuestion(update:Update){setSaving(true);await supabase.from('mila_case_updates').update({status:'done'}).eq('id',update.id);setSaving(false);await load()}
  async function prepareHandoff(){
    if(!current)return
    if(currentDocuments.length===0){setError('Übergabe noch nicht möglich: Dem Vorgang ist noch keine Unterlage zugeordnet.');return}
    if(activeQuestions.length||activeTasks.length){setError('Übergabe noch nicht möglich: Es sind noch Rückfragen oder Arbeitsschritte offen.');return}
    const summary=[`Anliegen: ${current.subject}`,`Unterlagen: ${currentDocuments.length}`,`Kontakt: ${personLabel(current)}`,current.phone?`Telefon: ${current.phone}`:null,current.email?`E-Mail: ${current.email}`:null,`Zusammenfassung: ${current.summary}`,`Zuständig: ${current.assigned_to||'noch offen'}`].filter(Boolean).join('\n')
    setSaving(true)
    const{error:e}=await supabase.from('mila_intake_cases').update({handoff_summary:summary,handoff_ready:true,status:'human_review'}).eq('id',current.id)
    if(e)setError('Übergabe konnte nicht vorbereitet werden.');else setNotice('Übergabe ist vorbereitet und wartet auf menschliche Prüfung.')
    setSaving(false);await load()
  }
  async function finishCase(){if(!current)return;if(!current.handoff_ready||activeTasks.length||activeQuestions.length){setError('Noch nicht abschließen: Zuerst Übergabe vorbereiten und offene Punkte klären.');return}setSaving(true);const{error:e}=await supabase.from('mila_intake_cases').update({status:'done',completed_at:new Date().toISOString()}).eq('id',current.id);if(e)setError('Vorgang konnte nicht abgeschlossen werden.');else setNotice('Vorgang vollständig abgeschlossen.');setSaving(false);await load()}

  return <main className="min-h-screen bg-[#faf9fc] pb-28 lg:pb-8"><div className="mx-auto w-full max-w-[1220px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-[10px] font-black uppercase tracking-[.16em] text-violet-700"><Zap className="h-3.5 w-3.5"/>Vorgänge</div><h1 className="mt-3 text-3xl font-black tracking-tight lg:text-4xl">Was muss wirklich weiter?</h1><p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">Jeder Vorgang hält Originale, Rückfragen, Arbeitsschritte und Verlauf zusammen.</p></div><div className="flex gap-2"><button onClick={()=>void load()} className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-xs font-black"><RefreshCw className="h-4 w-4"/>Aktualisieren</button><Link href="/eingang" className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-black text-white"><Inbox className="h-4 w-4"/>Neuer Eingang</Link></div></header>
    <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4"><Kpi label="Offen" value={stats.open} icon={<Zap className="h-4 w-4"/>}/><Kpi label="Heute zuerst" value={stats.today} icon={<AlertTriangle className="h-4 w-4"/>}/><Kpi label="Wartet" value={stats.waiting} icon={<Clock3 className="h-4 w-4"/>}/><Kpi label="Übergabebereit" value={stats.ready} icon={<FileCheck2 className="h-4 w-4"/>}/></section>
    {notice&&<p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{notice}</p>}{error&&<p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>}
    <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,.95fr)_minmax(0,1.35fr)]">
      <div className="rounded-2xl border bg-white p-3 shadow-sm lg:p-4"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Vorgänge durchsuchen…" className="w-full rounded-xl border bg-slate-50 py-2.5 pl-9 pr-3 text-sm font-semibold outline-none"/></div><div className="mt-3 flex flex-wrap gap-2">{([['all','Offen'],['today','Heute zuerst'],['waiting','Wartet'],['review','Mensch prüfen'],['ready','Übergabebereit'],['done','Erledigt']]as[Filter,string][]).map(([v,l])=><button key={v} onClick={()=>setFilter(v)} className={filter===v?'rounded-lg bg-violet-600 px-3 py-1.5 text-[10px] font-black text-white':'rounded-lg bg-slate-100 px-3 py-1.5 text-[10px] font-black text-slate-600'}>{l}</button>)}</div><div className="mt-4 space-y-2">{loading?<div className="flex items-center justify-center gap-2 py-12 text-sm font-bold text-slate-500"><Loader2 className="h-4 w-4 animate-spin"/>Vorgänge werden geladen…</div>:visible.length===0?<div className="rounded-xl border border-dashed p-6 text-center"><CheckCircle2 className="mx-auto h-7 w-7 text-emerald-500"/><p className="mt-2 text-sm font-black">Hier ist gerade nichts offen.</p></div>:visible.map(item=><CaseRow key={item.id} item={item} selected={item.id===selectedId} questions={openQuestions(item.id)} tasks={openTasks(item.id)} onClick={()=>setSelectedId(item.id)}/>)}</div></div>
      <div className="min-w-0">{!current?<div className="rounded-2xl border border-dashed bg-white p-10 text-center shadow-sm"><Zap className="mx-auto h-8 w-8 text-violet-500"/><p className="mt-3 font-black">Wähle einen Vorgang.</p></div>:<div className="space-y-4">
        <section className="rounded-2xl border bg-white p-4 shadow-sm lg:p-5"><div className="flex justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[.16em] text-violet-500">Aktiver Vorgang</p><h2 className="mt-1 text-2xl font-black">{current.subject}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{current.summary}</p></div><StatusBadge status={current.status}/></div><div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4"><Info label="Kontakt" value={personLabel(current)}/><Info label="Zuständig" value={current.assigned_to||'Noch offen'}/><Info label="Frist" value={formatDate(current.due_at)}/><Info label="Priorität" value={current.urgency}/></div>{current.status!=='done'&&<div className="mt-4 flex flex-wrap gap-2"><button onClick={()=>void setStatus('in_progress')} disabled={saving} className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-black text-white">In Bearbeitung</button><button onClick={()=>void setStatus('waiting')} disabled={saving} className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-700">Wartet auf Antwort</button><button onClick={()=>void setStatus('human_review')} disabled={saving} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black">Mensch prüfen</button></div>}</section>

        <section className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm lg:p-5"><div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-violet-600">Originale in diesem Vorgang</p><h3 className="mt-1 text-lg font-black">{currentDocuments.length} Unterlage{currentDocuments.length===1?'':'n'}</h3></div><FolderOpen className="h-5 w-5 text-violet-500"/></div>{currentDocuments.length===0?<p className="mt-4 rounded-xl border border-dashed p-4 text-sm font-semibold text-slate-500">Noch keine Unterlage mit diesem Vorgang verbunden.</p>:<div className="mt-4 space-y-2">{currentDocuments.map(doc=><a key={doc.id} href={`/api/dokumente/${doc.id}/open`} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-xl border p-3"><div className="flex min-w-0 items-center gap-3"><FileText className="h-4 w-4 shrink-0 text-violet-500"/><div className="min-w-0"><p className="truncate text-sm font-black">{doc.title||doc.file_name||'Unterlage'}</p><p className="truncate text-[10px] font-semibold text-slate-400">Original · {doc.file_name||'Datei'}</p></div></div><span className="text-xs font-black text-violet-700">Öffnen →</span></a>)}</div>}<Link href={`/dokumente?case=${current.id}`} className="mt-3 inline-flex text-xs font-black text-violet-700">In Mappe öffnen →</Link></section>

        {current.status!=='done'&&<section className="grid gap-4 md:grid-cols-2"><WorkCard title="Offene Aufgaben" icon={<UserCheck className="h-4 w-4"/>}>{activeTasks.length===0?<EmptyLine text="Keine Aufgabe offen."/>:activeTasks.map(task=><div key={task.id} className="rounded-xl border p-3"><p className="text-sm font-black">{task.title}</p>{task.next_action&&<p className="mt-1 text-xs leading-5 text-slate-500">{task.next_action}</p>}<button onClick={()=>void closeTask(task)} className="mt-2 rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">Als erledigt markieren</button></div>)}</WorkCard><WorkCard title="Offene Rückfragen" icon={<MessageCircleQuestion className="h-4 w-4"/>}>{activeQuestions.length===0?<EmptyLine text="Keine Rückfrage offen."/>:activeQuestions.map(update=><div key={update.id} className="rounded-xl border p-3"><p className="text-xs font-semibold leading-5 text-slate-700">{update.content}</p><button onClick={()=>void closeQuestion(update)} className="mt-2 text-[10px] font-black text-emerald-700">Als geklärt markieren</button></div>)}</WorkCard></section>}
        {resolvedCount>0&&<p className="px-1 text-[11px] font-semibold text-slate-400">{resolvedCount} erledigte Punkte bleiben im Vorgang erhalten, werden aber nicht mehr als offen angezeigt.</p>}

        <section className="rounded-2xl border bg-white p-4 shadow-sm lg:p-5"><div className="flex items-center gap-2 text-violet-700"><History className="h-4 w-4"/><div><p className="text-[10px] font-black uppercase tracking-[.16em]">Verlauf</p><h3 className="text-lg font-black text-slate-950">Vorgangshistorie</h3></div></div>{currentEvents.length===0?<p className="mt-4 rounded-xl border border-dashed p-4 text-xs font-semibold text-slate-400">Für ältere Vorgänge gibt es noch keine technische Ereignishistorie. Neue Änderungen werden ab jetzt automatisch protokolliert.</p>:<div className="mt-4 space-y-0">{currentEvents.map((event,index)=><div key={event.id} className="relative flex gap-3 pb-4 last:pb-0">{index<currentEvents.length-1&&<span className="absolute left-[9px] top-5 h-[calc(100%-8px)] w-px bg-slate-200"/>}<span className="relative mt-1 h-[19px] w-[19px] shrink-0 rounded-full border-4 border-violet-100 bg-violet-600"/><div className="min-w-0"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><p className="text-xs font-black text-slate-900">{event.title}</p><span className="text-[9px] font-bold text-slate-400">{formatEventDate(event.created_at)}</span></div>{event.detail&&<p className="mt-0.5 text-[11px] font-semibold leading-5 text-slate-500">{event.detail}</p>}</div></div>)}</div>}</section>

        <section className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm lg:p-5"><div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-violet-500">Übergabe</p><h3 className="mt-1 text-lg font-black">{current.status==='done'?'Vorgang abgeschlossen':current.handoff_ready?'Bereit für die fachliche Prüfung':'Noch nicht übergabebereit'}</h3></div>{current.status==='done'?<CheckCircle2 className="h-6 w-6 text-emerald-500"/>:current.handoff_ready?<FileCheck2 className="h-6 w-6 text-emerald-500"/>:<Clock3 className="h-6 w-6 text-amber-500"/>}</div>{current.handoff_summary&&<pre className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-600">{current.handoff_summary}</pre>}{current.status!=='done'&&<div className="mt-4 flex flex-col gap-2 sm:flex-row">{!current.handoff_ready&&<button onClick={()=>void prepareHandoff()} disabled={saving} className="flex-1 rounded-xl bg-violet-600 px-3 py-3 text-xs font-black text-white disabled:opacity-50">Übergabe vorbereiten</button>}<button onClick={()=>void finishCase()} disabled={saving||!current.handoff_ready} className="flex-1 rounded-xl bg-emerald-600 px-3 py-3 text-xs font-black text-white disabled:bg-slate-100 disabled:text-slate-400">Vorgang vollständig abschließen</button></div>}{current.status!=='done'&&!current.handoff_ready&&<p className="mt-3 text-[11px] font-semibold text-slate-500">Benötigt mindestens eine Unterlage und keine offenen Rückfragen/Aufgaben.</p>}</section>
      </div>}</div>
    </section>
  </div></main>
}

function Kpi({label,value,icon}:{label:string;value:number;icon:React.ReactNode}){return <div className="rounded-2xl border bg-white p-4 shadow-sm"><div className="text-violet-600">{icon}</div><p className="mt-4 text-2xl font-black">{value}</p><p className="text-xs font-bold text-slate-500">{label}</p></div>}
function Info({label,value}:{label:string;value:string}){return <div className="rounded-xl bg-slate-50 p-3"><p className="text-[9px] font-black uppercase tracking-[.12em] text-slate-400">{label}</p><p className="mt-1 text-xs font-black">{value}</p></div>}
function WorkCard({title,icon,children}:{title:string;icon:React.ReactNode;children:React.ReactNode}){return <section className="rounded-2xl border bg-white p-4 shadow-sm"><div className="mb-3 flex items-center gap-2 text-violet-700">{icon}<h3 className="text-sm font-black text-slate-950">{title}</h3></div><div className="space-y-2">{children}</div></section>}
function EmptyLine({text}:{text:string}){return <div className="rounded-xl border border-dashed p-4 text-xs font-semibold text-slate-400">{text}</div>}
function StatusBadge({status}:{status:CaseStatus}){return <span className="h-fit shrink-0 rounded-xl bg-slate-100 px-3 py-1.5 text-[10px] font-black text-slate-600">{STATUS_LABEL[status]}</span>}
function CaseRow({item,selected,questions,tasks,onClick}:{item:CaseItem;selected:boolean;questions:number;tasks:number;onClick:()=>void}){return <button onClick={onClick} className={`w-full rounded-xl border p-3 text-left ${selected?'border-violet-300 bg-violet-50':'bg-white'}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-black">{item.subject}</p><p className="mt-1 truncate text-[11px] font-semibold text-slate-500">{personLabel(item)} · {item.category}</p></div><StatusBadge status={item.status}/></div>{(questions>0||tasks>0)&&<p className="mt-2 text-[10px] font-bold text-amber-600">{questions>0?`${questions} Rückfrage${questions===1?'':'n'}`:''}{questions>0&&tasks>0?' · ':''}{tasks>0?`${tasks} Aufgabe${tasks===1?'':'n'}`:''}</p>}</button>}
