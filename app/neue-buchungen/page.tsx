'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, FileText, FolderOpen, Loader2, Upload } from 'lucide-react'
import { getActiveClientId, supabase } from '@/lib/supabase'

type CaseItem={id:string;subject:string;status:string;created_at:string}

function inferDocumentType(name:string){
 const value=name.toLowerCase()
 if(value.includes('rechnung'))return'rechnung'
 if(value.includes('mahnung'))return'mahnung'
 if(value.includes('bescheid'))return'bescheid'
 if(value.includes('vertrag'))return'vertrag'
 if(value.includes('schreiben')||value.includes('brief'))return'schreiben'
 if(value.includes('beleg')||value.includes('quittung'))return'beleg'
 return'unterlage'
}

async function hashFile(file:File){
 const buffer=await file.arrayBuffer()
 const digest=await crypto.subtle.digest('SHA-256',buffer)
 return Array.from(new Uint8Array(digest)).map(byte=>byte.toString(16).padStart(2,'0')).join('')
}

export default function NeueBuchungPage(){
 const router=useRouter()
 const[clientId,setClientId]=useState(''),[clientName,setClientName]=useState(''),[cases,setCases]=useState<CaseItem[]>([]),[caseId,setCaseId]=useState(''),[files,setFiles]=useState<File[]>([]),[saving,setSaving]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
 useEffect(()=>{const id=getActiveClientId();setClientId(id);void load(id)},[])
 async function load(id:string){if(!id)return;const[c,cs]=await Promise.all([supabase.from('clients').select('id,name').eq('id',id).maybeSingle(),supabase.from('mila_intake_cases').select('id,subject,status,created_at').eq('client_id',id).order('created_at',{ascending:false}).limit(100)]);if(c.data?.name)setClientName(String(c.data.name));setCases((cs.data||[])as CaseItem[])}
 const selected=useMemo(()=>cases.find(i=>i.id===caseId)||null,[cases,caseId])
 async function callCore(payload:Record<string,unknown>){const{data:s}=await supabase.auth.getSession();const token=s.session?.access_token;if(!token)throw new Error('Bitte neu anmelden.');const r=await fetch('/api/mila/process',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(payload)});const data=await r.json().catch(()=>({}));if(!r.ok||!data?.success)throw new Error(data?.error||'Mila konnte den Vorgang nicht verarbeiten.');return data}
 async function upload(){
  setError('');setNotice('')
  if(!clientId){setError('Bitte zuerst oben eine aktive Akte wählen.');return}
  if(!files.length){setError('Bitte mindestens eine Unterlage auswählen.');return}
  if(files.some(f=>f.size>10*1024*1024)){setError('Eine Datei ist größer als 10 MB.');return}
  setSaving(true)
  const uploadedPaths:string[]=[];const insertedIds:string[]=[]
  let targetCaseId=caseId;let createdCase=false
  try{
   const{data:a}=await supabase.auth.getUser();if(!a.user)throw new Error('Bitte neu anmelden.')
   const preparedFiles=[] as Array<{file:File;hash:string;type:string}>
   for(const file of files){
    const hash=await hashFile(file)
    const{data:duplicate,error:duplicateError}=await supabase.from('documents').select('id,title,file_name').eq('client_id',clientId).eq('content_hash',hash).limit(1).maybeSingle()
    if(duplicateError)throw duplicateError
    if(duplicate)throw new Error(`„${file.name}“ ist in dieser Akte bereits als identischer Dateiinhalt vorhanden. Mila legt kein zweites Original an.`)
    preparedFiles.push({file,hash,type:inferDocumentType(file.name)})
   }
   if(!targetCaseId){const created=await callCore({clientId,source:'upload',subject:`Unterlagen-Eingang · ${files.length} Datei${files.length===1?'':'en'}`,text:`Für ${clientName||'die aktive Akte'} sind ${files.length} neue Originalunterlagen eingegangen.`,fields:{category:'Dokumenten-Eingang'}});targetCaseId=String(created.caseId||'');createdCase=true;if(!targetCaseId)throw new Error('Mila konnte keinen Vorgang für den Upload anlegen.')}
   for(const item of preparedFiles){
    const file=item.file,documentId=crypto.randomUUID(),ext=file.name.split('.').pop()?.toLowerCase()||'bin',path=`${a.user.id}/${clientId}/${targetCaseId}/${documentId}.${ext}`
    const{error:up}=await supabase.storage.from('mila-dokumente').upload(path,file,{contentType:file.type||'application/octet-stream',upsert:false});if(up)throw up;uploadedPaths.push(path)
    const needsContext=item.type!=='unterlage'
    const{error:db}=await supabase.from('documents').insert({id:documentId,user_id:a.user.id,client_id:clientId,case_id:targetCaseId,title:file.name,type:item.type,status:needsContext?'klaerung':'erfasst',file_name:file.name,file_url:path,content_hash:item.hash,note:'Original unverändert hochgeladen'})
    if(db)throw db;insertedIds.push(documentId)
   }
   await callCore({caseId:targetCaseId,clientId,source:'upload',subject:selected?.subject||`Unterlagen-Eingang · ${files.length} Datei${files.length===1?'':'en'}`,text:`Originalunterlagen verbunden: ${files.map(f=>f.name).join(', ')}`,fields:{category:'Dokumenten-Eingang'}})
   setNotice(`${files.length} Unterlage${files.length===1?'':'n'} erfolgreich mit genau einem Vorgang verbunden. Identische Datei-Dubletten werden technisch erkannt.`);setFiles([])
   setTimeout(()=>router.push(`/dokumente?case=${targetCaseId}`),450)
  }catch(e:any){
   if(insertedIds.length)await supabase.from('documents').delete().in('id',insertedIds)
   if(uploadedPaths.length)await supabase.storage.from('mila-dokumente').remove(uploadedPaths)
   if(createdCase&&targetCaseId){await supabase.from('mila_coordination_tasks').delete().eq('case_id',targetCaseId);await supabase.from('mila_case_updates').delete().eq('case_id',targetCaseId);await supabase.from('mila_intake_cases').delete().eq('id',targetCaseId)}
   setError(e?.message||'Upload fehlgeschlagen. Der begonnene Stapel wurde zurückgerollt.')
  }finally{setSaving(false)}
 }
 if(!clientId)return <main className="min-h-screen bg-[#f8f7fb] p-5 pb-28"><div className="mx-auto max-w-2xl rounded-3xl border bg-white p-6"><h1 className="text-2xl font-black">Bitte zuerst eine Akte wählen.</h1><p className="mt-2 text-sm font-semibold text-slate-500">Unterlagen werden bei Mila nie ohne Aktenkontext abgelegt.</p></div></main>
 return <main className="min-h-screen bg-[#f8f7fb] px-4 pb-28 pt-6 text-slate-950 sm:px-6 lg:px-8 lg:pb-10"><div className="mx-auto max-w-4xl"><header className="border-b border-slate-200 pb-5"><p className="text-[11px] font-black uppercase tracking-[.18em] text-violet-600">Unterlagen-Eingang</p><h1 className="mt-1 text-3xl font-black lg:text-4xl">Unterlagen-Stapel hochladen</h1><p className="mt-2 text-sm font-semibold text-slate-500">Akte <span className="font-black text-slate-800">{clientName}</span> · Originale bleiben unverändert und landen vollständig in genau einem Vorgang.</p></header>
 {error&&<p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>}{notice&&<p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{notice}</p>}
 <section className="mt-6 grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]"><aside className="rounded-2xl border bg-white p-4 shadow-sm"><p className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">Zu welchem Vorgang?</p><select value={caseId} onChange={e=>setCaseId(e.target.value)} className="mt-3 w-full rounded-xl border p-3 text-sm font-bold"><option value="">Neuen Vorgang aus Upload erstellen</option>{cases.filter(i=>i.status!=='done').map(i=><option key={i.id} value={i.id}>{i.subject}</option>)}</select><div className="mt-4 rounded-xl bg-violet-50 p-3 text-xs font-semibold leading-5 text-violet-800">{selected?'Der gesamte Stapel bleibt im gewählten Vorgang zusammen.':'Mila erstellt genau einen neuen Vorgang für den gesamten Stapel.'}</div><p className="mt-3 text-[10px] font-semibold leading-4 text-slate-400">Mila bildet vor dem Speichern einen SHA-256-Fingerabdruck. Identischer Dateiinhalt wird in derselben Akte nicht doppelt abgelegt.</p><p className="mt-2 text-[10px] font-semibold leading-4 text-slate-400">Wenn ein Upload technisch scheitert, entfernt Mila den begonnenen Stapel wieder – keine halben Vorgänge.</p></aside>
 <section className="rounded-2xl border bg-white p-5 shadow-sm"><label className="flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/30 p-6 text-center hover:bg-violet-50"><Upload className="h-9 w-9 text-violet-600"/><p className="mt-3 text-lg font-black">Dateien auswählen</p><p className="mt-1 text-xs font-semibold text-slate-500">Mehrere Bilder oder PDFs auf einmal · max. 10 MB je Datei</p><input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={e=>setFiles(Array.from(e.target.files||[]))}/></label>
 {files.length>0&&<div className="mt-4 space-y-2"><div className="flex items-center justify-between"><p className="text-xs font-black uppercase tracking-[.14em] text-slate-400">{files.length} ausgewählt</p><button onClick={()=>setFiles([])} className="text-xs font-black text-slate-500">Leeren</button></div>{files.map((f,i)=><div key={`${f.name}-${i}`} className="flex items-center gap-3 rounded-xl border px-3 py-3"><FileText className="h-4 w-4 shrink-0 text-violet-500"/><span className="min-w-0 flex-1 truncate text-sm font-bold">{f.name}</span><CheckCircle2 className="h-4 w-4 text-emerald-500"/></div>)}</div>}
 <button onClick={()=>void upload()} disabled={saving||!files.length} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3.5 text-sm font-black text-white disabled:bg-slate-200 disabled:text-slate-400">{saving?<><Loader2 className="h-4 w-4 animate-spin"/>Mila prüft und verbindet…</>:<><FolderOpen className="h-4 w-4"/>Stapel in Vorgang übernehmen</>}</button></section></section></div></main>
}
