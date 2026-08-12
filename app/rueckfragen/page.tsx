'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getActiveClientId, supabase } from '@/lib/supabase'

type Question = { id:string; document_id?:string; question:string; answer?:string; status:'offen'|'beantwortet'|'erledigt'; created_at:string }

export default function RueckfragenPage(){
 const [items,setItems]=useState<Question[]>([]); const [question,setQuestion]=useState(''); const [loading,setLoading]=useState(true)
 async function load(){ const clientId=getActiveClientId(); if(!clientId){setItems([]);setLoading(false);return}; const {data}=await supabase.from('client_questions').select('*').eq('client_id',clientId).order('created_at',{ascending:false}); setItems((data||[]) as Question[]); setLoading(false) }
 useEffect(()=>{void load()},[])
 async function add(){ const text=question.trim(); const clientId=getActiveClientId(); if(!text||!clientId)return; const {error}=await supabase.from('client_questions').insert({client_id:clientId,question:text,status:'offen'}); if(error){alert(error.message);return}; setQuestion(''); await load() }
 async function done(id:string){ const {error}=await supabase.from('client_questions').update({status:'erledigt',completed_at:new Date().toISOString()}).eq('id',id); if(error){alert(error.message);return}; await load() }
 return <main className="mx-auto min-h-screen max-w-md space-y-5 p-5 pb-32 text-slate-950">
  <header><Link href="/" className="text-sm font-semibold text-slate-500">← Arbeitsplatz</Link><p className="mt-5 text-xs font-black uppercase tracking-[.18em] text-violet-600">Mandantenkommunikation</p><h1 className="mt-2 text-3xl font-black">Rückfragen</h1><p className="mt-2 text-sm font-semibold text-slate-500">Fragen festhalten, Antworten zuordnen und anschließend erledigen.</p></header>
  <section className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-[.16em] text-violet-600">Neue Rückfrage</p><textarea value={question} onChange={e=>setQuestion(e.target.value)} rows={3} placeholder="z. B. Bitte die vollständige Rechnung nachreichen." className="mt-3 w-full resize-none rounded-2xl border border-slate-200 p-4 font-semibold outline-none focus:border-violet-400"/><button onClick={()=>void add()} className="mt-3 w-full rounded-2xl bg-violet-600 p-4 font-black text-white">Rückfrage speichern</button></section>
  <section className="space-y-3"><div className="flex justify-between"><h2 className="text-xl font-black">Offene Rückfragen</h2><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">{items.filter(x=>x.status!=='erledigt').length} offen</span></div>{loading?<p className="text-sm text-slate-500">Lädt …</p>:items.length===0?<div className="rounded-3xl bg-emerald-50 p-5 text-sm font-semibold text-emerald-800">✓ Keine Rückfragen vorhanden.</div>:items.map(item=><article key={item.id} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"><div className="flex justify-between gap-3"><p className="font-black">{item.question}</p><span className="text-xs font-black uppercase text-violet-600">{item.status}</span></div>{item.answer&&<div className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm font-semibold text-slate-700"><span className="font-black">Antwort:</span> {item.answer}</div>}{item.status!=='erledigt'&&<button onClick={()=>void done(item.id)} className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm font-black">Als erledigt markieren</button>}</article>)}</section>
 </main>
}
