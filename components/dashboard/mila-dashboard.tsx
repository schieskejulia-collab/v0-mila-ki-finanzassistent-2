'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Archive, CheckCircle2, Clock3, FolderOpen, Inbox, MessageCircleQuestion, Upload } from 'lucide-react'
import { getActiveClientId, supabase } from '@/lib/supabase'
import { assessCaseReadiness } from '@/lib/case-readiness'

type CaseItem={id:string;subject:string;status:string;handoff_ready:boolean;client_id:string|null}
type Task={case_id:string|null;status:string}
type Update={case_id:string;kind:string;status:string}
type Doc={id:string;case_id:string|null;client_id:string|null;title:string|null;partner:string|null;note:string|null;type:string|null;status:string|null;document_date:string|null;file_name:string|null;file_url:string|null}
type Handoff={id:string;case_id:string;version:number}

export function MilaDashboard({model}:{model:any}){
  const[clientName,setClientName]=useState('Aktive Akte')
  const[cases,setCases]=useState<CaseItem[]>([])
  const[tasks,setTasks]=useState<Task[]>([])
  const[updates,setUpdates]=useState<Update[]>([])
  const[docs,setDocs]=useState<Doc[]>([])
  const[handoffs,setHandoffs]=useState<Handoff[]>([])
  const[loading,setLoading]=useState(true)
  const[error,setError]=useState('')

  useEffect(()=>{void load()},[])

  async function load(){
    setLoading(true);setError('')
    const clientId=getActiveClientId()
    if(!clientId){setClientName('Keine Akte ausgewählt');setLoading(false);return}
    const[clientResult,caseResult,docResult]=await Promise.all([
      supabase.from('clients').select('name').eq('id',clientId).maybeSingle(),
      supabase.from('mila_intake_cases').select('id,subject,status,handoff_ready,client_id').eq('client_id',clientId).order('created_at',{ascending:false}).limit(200),
      supabase.from('documents').select('id,case_id,client_id,title,partner,note,type,status,document_date,file_name,file_url').eq('client_id',clientId).limit(500),
    ])
    if(clientResult.data?.name)setClientName(String(clientResult.data.name))
    if(caseResult.error||docResult.error){setError('Mila konnte den Arbeitsstand nicht vollständig laden.');setLoading(false);return}
    const nextCases=(caseResult.data||[])as CaseItem[]
    const ids=nextCases.map(item=>item.id)
    if(ids.length===0){setCases([]);setDocs((docResult.data||[])as Doc[]);setLoading(false);return}
    const[t,u,h]=await Promise.all([
      supabase.from('mila_coordination_tasks').select('case_id,status').in('case_id',ids).limit(800),
      supabase.from('mila_case_updates').select('case_id,kind,status').in('case_id',ids).limit(1200),
      supabase.from('mila_case_handoffs').select('id,case_id,version').in('case_id',ids).limit(500),
    ])
    if(t.error||u.error||h.error)setError('Mila konnte Aufgaben, Rückfragen oder Übergaben nicht vollständig laden.')
    setCases(nextCases);setDocs((docResult.data||[])as Doc[]);setTasks((t.data||[])as Task[]);setUpdates((u.data||[])as Update[]);setHandoffs((h.data||[])as Handoff[]);setLoading(false)
  }

  const open=useMemo(()=>cases.filter(item=>item.status!=='done'),[cases])
  const openIds=useMemo(()=>new Set(open.map(item=>item.id)),[open])
  const questions=updates.filter(item=>openIds.has(item.case_id)&&item.kind==='question'&&item.status!=='done')
  const openTasks=tasks.filter(item=>item.case_id&&openIds.has(item.case_id)&&item.status!=='done')
  const readiness=useMemo(()=>new Map(open.map(item=>[item.id,assessCaseReadiness({status:item.status,documents:docs.filter(d=>d.case_id===item.id),tasks:tasks.filter(t=>t.case_id===item.id),updates:updates.filter(u=>u.case_id===item.id)})])),[open,docs,tasks,updates])
  const issueCount=Array.from(readiness.values()).reduce((sum,item)=>sum+item.documentIssueCount,0)
  const complete=open.filter(item=>!item.handoff_ready&&readiness.get(item.id)?.ready)
  const prepared=open.filter(item=>item.handoff_ready)
  const waiting=open.filter(item=>item.status==='waiting'||item.status==='needs_info')
  const unassigned=docs.filter(item=>!item.case_id)

  const priority=[
    issueCount?{title:`${issueCount} Unterlage${issueCount===1?'':'n'} brauchen Kontext`,text:'Dieselben Vollständigkeitsregeln wie in Mappe und Vorgängen.',href:'/dokumente'}:null,
    questions.length?{title:`${questions.length} Rückfrage${questions.length===1?'':'n'} offen`,text:'Antwort oder Bestätigung fehlt.',href:'/jetzt'}:null,
    complete.length?{title:`${complete.length} Vorgang${complete.length===1?'':'e'} vollständig`,text:'Kann zur Übergabe vorbereitet werden.',href:'/jetzt'}:null,
    prepared.length?{title:`${prepared.length} Übergabe${prepared.length===1?'':'n'} vorbereitet`,text:'Versionierter Stand ist festgehalten.',href:'/jetzt'}:null,
  ].filter(Boolean) as {title:string;text:string;href:string}[]

  return <main className="min-h-screen bg-[#fbfbfd] pb-24 lg:pb-10"><div className="mx-auto w-full max-w-[1420px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
    <header className="mb-5"><h1 className="text-3xl font-black tracking-tight text-slate-950">{model?.greeting||'Guten Tag'}, {model?.userName||'Julia'} 👋</h1><p className="mt-1 text-sm font-medium text-slate-500">Aktive Akte: <span className="font-black text-violet-600">{clientName}</span></p></header>
    {error&&<p className="mb-5 rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>}
    <div className="grid gap-5 xl:grid-cols-[1.55fr_.75fr]">
      <div className="space-y-5">
        <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-500">★</span><h2 className="text-sm font-black">Heute zuerst</h2></div><div className="space-y-2">{loading?<p className="rounded-xl border p-4 text-sm font-semibold text-slate-400">Mila lädt den Arbeitsstand …</p>:priority.length===0?<p className="rounded-xl border p-4 text-sm font-semibold text-slate-500">Gerade braucht nichts deine Entscheidung.</p>:priority.map((item,index)=><Link key={index} href={item.href} className="block rounded-xl border border-slate-100 p-4 hover:border-violet-200"><p className="text-sm font-black">{item.title}</p><p className="mt-1 text-xs font-semibold text-slate-500">{item.text}</p></Link>)}</div></section>
        <Link href="/neue-buchungen" className="flex items-center gap-4 rounded-2xl border border-dashed border-violet-300 bg-white p-5"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600"><Upload className="h-5 w-5"/></span><div><p className="font-black">Unterlagen-Stapel hochladen</p><p className="mt-1 text-xs font-semibold text-slate-500">Originale erfassen und direkt mit Akte und Vorgang verbinden.</p></div></Link>
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Kpi icon={<Inbox className="h-4 w-4"/>} label="Offene Vorgänge" value={open.length}/><Kpi icon={<MessageCircleQuestion className="h-4 w-4"/>} label="Rückfragen" value={questions.length}/><Kpi icon={<CheckCircle2 className="h-4 w-4"/>} label="Übergabebereit" value={prepared.length}/><Kpi icon={<Archive className="h-4 w-4"/>} label="Übergabestände" value={handoffs.length}/></section>
      </div>
      <section className="rounded-2xl border bg-white p-5 shadow-sm xl:self-start"><p className="text-sm font-black text-violet-700">Ein Vorgang, eine Wahrheit</p><div className="mt-5 space-y-3 text-xs font-semibold text-slate-600"><Line icon={<FolderOpen className="h-4 w-4"/>} text="Originale bleiben dem Vorgang zugeordnet"/><Line icon={<MessageCircleQuestion className="h-4 w-4"/>} text="Offene Informationen bleiben sichtbar"/><Line icon={<Clock3 className="h-4 w-4"/>} text={`${openTasks.length} Arbeitsschritte offen · ${waiting.length} Vorgänge warten`}/><Line icon={<Archive className="h-4 w-4"/>} text={`${unassigned.length} ältere Unterlagen noch ohne Vorgang`}/></div><div className="mt-5 grid grid-cols-2 gap-2"><Link href="/jetzt" className="rounded-xl bg-slate-950 px-3 py-3 text-center text-[11px] font-black text-white">Vorgänge</Link><Link href="/uebergaben" className="rounded-xl bg-violet-50 px-3 py-3 text-center text-[11px] font-black text-violet-700">Übergaben</Link></div></section>
    </div>
  </div></main>
}

function Kpi({icon,label,value}:{icon:React.ReactNode;label:string;value:number}){return <div className="rounded-2xl border bg-white p-4"><div className="text-violet-600">{icon}</div><p className="mt-4 text-2xl font-black">{value}</p><p className="mt-1 text-[10px] font-black uppercase tracking-[.12em] text-slate-500">{label}</p></div>}
function Line({icon,text}:{icon:React.ReactNode;text:string}){return <div className="flex items-start gap-3"><span className="mt-0.5 text-violet-500">{icon}</span><span>{text}</span></div>}
