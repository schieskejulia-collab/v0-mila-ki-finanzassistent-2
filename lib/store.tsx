'use client'
import { createContext,useCallback,useContext,useEffect,useMemo,useRef,useState,ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

export type UserStatus='angestellt'|'minijob'|'selbststaendig_gewerbe'|'freelancer'|'kleinunternehmer'|'handwerker'|'montagearbeiter'
export type Industry='webdesigner'|'fotograf'|'coach'|'handwerker'|'restaurant'|'ecommerce'|'berater'|'sonstiges'

export type Expense={id:string|number,title:string,vendor:string,amount:number,date:string,category:string,note?:string|null}
export type Income={id:string|number,title:string,client:string,amount:number,date:string,status?:string,due_date?:string,dueDate?:string,invoiceNumber?:string,note?:string|null}
export type BudgetStatus={category:string,spent:number,limit:number,remaining:number,percent:number}
type Summary={totalExpenses:number,totalIncomes:number,balance:number}

interface FinanceContextValue{
  expenses:Expense[]
  incomes:Income[]
  setIncomes:(i:Income[])=>void
  categories:string[]
  milaFeedback:string
  morningBriefing:string
  refreshMorningBriefing:()=>Promise<void>
  triggerMilaFeedback:(category:string)=>void
  addExpense:(e:{title?:string,vendor?:string,amount:number|string,date?:string,category?:string,note?:string,hasReceipt?:boolean,vat?:number})=>Promise<void>
  deleteExpense:(id:string|number)=>Promise<void>
  addIncome:(i:{title?:string,client?:string,amount:number|string,date?:string,note?:string,vat?:number,status?:string,source?:string})=>Promise<void>
  deleteIncome:(id:string|number)=>Promise<void>
  userName:string
  setUserName:(v:string)=>void
  userStatus:UserStatus
  setUserStatus:(v:UserStatus)=>void
  industry:Industry
  setIndustry:(v:Industry)=>void
  isLoggedIn:boolean
  login:(name:string,status:UserStatus)=>void
  logout:()=>void
  summary:Summary
  budgetStatus:BudgetStatus[]
  taxClass:string
  setTaxClass:(v:string)=>void
  annualGross:number
  setAnnualGross:(v:number)=>void
  annualProfit:number
  setAnnualProfit:(v:number)=>void
  vatStatus:string
  setVatStatus:(v:string)=>void
  federalState:string
  setFederalState:(v:string)=>void
  churchTax:boolean
  setChurchTax:(v:boolean)=>void
  married:boolean
  setMarried:(v:boolean)=>void
  children:number
  setChildren:(v:number)=>void
  assemblyWork:boolean
  setAssemblyWork:(v:boolean)=>void
}

const DEFAULT_CATEGORIES=['software','hardware','elektronik','telefon & internet','marketing','buerobedarf','reisen','fahrtkosten','bewirtung','weiterbildung','versicherung','miete','bankgebühren','material','werkzeug','arbeitskleidung','sonstiges']

export const CATEGORY_LABELS:Record<string,string>={
  software:'Software & IT',hardware:'Hardware',elektronik:'Elektronik','telefon & internet':'Telefon & Internet',marketing:'Marketing',buerobedarf:'Büro & Arbeitsmittel',reisen:'Reisekosten',fahrtkosten:'Fahrtkosten',bewirtung:'Bewirtung',weiterbildung:'Weiterbildung',versicherung:'Versicherung',miete:'Miete & Coworking',bankgebühren:'Bankgebühren',material:'Material',werkzeug:'Werkzeug',arbeitskleidung:'Arbeitskleidung',sonstiges:'Sonstiges'
}

const BUDGET_LIMITS:Record<string,number>={software:200,reisen:500,weiterbildung:300,marketing:250,buerobedarf:150,bewirtung:200,versicherung:100,hardware:400,'telefon & internet':150,miete:600,fahrtkosten:250,bankgebühren:80,sonstiges:100}

const STATUS_VALUES:UserStatus[]=['angestellt','minijob','selbststaendig_gewerbe','freelancer','kleinunternehmer','handwerker','montagearbeiter']
const FinanceContext=createContext<FinanceContextValue|null>(null)
function isUserStatus(v:any):v is UserStatus{return typeof v==='string'&&STATUS_VALUES.includes(v)}

export function toNumber(v:any){if(typeof v==='number')return v||0;const raw=String(v??'').trim();if(!raw)return 0;const normalized=raw.includes(',')?raw.replace(/\./g,'').replace(',','.'):raw;const cleaned=normalized.replace(/[^\d.-]/g,'');const num=Number(cleaned);return Number.isFinite(num)?num:0}

const CATEGORY_RULES=[
  {regex:/laptop|notebook|computer|macbook|monitor|pc|tastatur|maus|headset/,category:'hardware'},
  {regex:/werkzeug|bohrer|akkuschrauber|maschine|hammer|zange/,category:'werkzeug'},
  {regex:/arbeitskleidung|arbeitsschuhe|schutzbrille|helm|handschuhe|blaumann/,category:'arbeitskleidung'},
  {regex:/hotel|bahn|flug|reise|airbnb|unterkunft|übernachtung/,category:'reisen'},
  {regex:/kurs|seminar|weiterbildung|coaching/,category:'weiterbildung'},
  {regex:/restaurant|essen|bewirtung|lunch|dinner|cafe/,category:'bewirtung'},
  {regex:/versicherung|haftpflicht|rechtsschutz/,category:'versicherung'},
  {regex:/miete|coworking|bürofläche/,category:'miete'},
  {regex:/tank|diesel|benzin|fahrt|parken|uber|taxi/,category:'fahrtkosten'},
  {regex:/material|farbe|holz|metall|rohr|baustoff/,category:'material'},
  {regex:/telefon|internet|vodafone|telekom|o2/,category:'telefon & internet'},
  {regex:/hosting|server|canva|figma|adobe|openai|notion|saas/,category:'software'}
]

export function inferCategory(input:string){
  const t=input.toLowerCase()
  for(const r of CATEGORY_RULES){if(r.regex.test(t))return r.category}
  return 'sonstiges'
}

const TIPS:any={
  montagearbeiter:{
    reisen:'🛏️ Unterkunft auf Montage: zählt zur doppelten Haushaltsführung – bringt hohe Erstattungen.',
    fahrtkosten:'🚗 Jeder km zur Baustelle: 0,30 € (ab km 21 → 0,38 €).',
    arbeitskleidung:'🦺 Arbeitskleidung & Werkzeug: 100% sofort absetzbar.',
    werkzeug:'🛠️ Werkzeug: komplett absetzbar.',
    default:'✨ Montagekosten erfasst – Mila optimiert deine Erstattung.'
  },
  angestellt:{
    software:'💻 Geräte & Tools unter 952 € brutto → sofort 100% absetzbar.',
    hardware:'💻 Arbeitsmittel sofort absetzbar.',
    buerobedarf:'📝 Homeoffice-Pauschale: 6 €/Tag, bis 1.260 €/Jahr.',
    default:'✨ Werbungskosten erkannt – Mila prüft deine Vorteile.'
  },
  kleinunternehmer:{
    default:'🌱 Bruttobetrag verbucht – ohne Vorsteuerabzug schützt das deine Liquidität.'
  },
  default:{
    software:'⚙️ Software-Abos mindern sofort deinen Gewinn.',
    bewirtung:'🍽️ Geschäftsessen: 70% absetzbar – Anlass auf den Beleg!',
    default:'✨ Buchung erfasst – Mila prüft steuerliche Vorteile.'
  }
}

function getMilaTip(category:string,status:UserStatus){
  return TIPS[status]?.[category]||TIPS[status]?.default||TIPS.default[category]||TIPS.default.default
}

export function FinanceProvider({children}:{children:ReactNode}){
  const [expenses,setExpenses]=useState<Expense[]>([])
  const [incomes,setIncomes]=useState<Income[]>([])
  const [categories]=useState(DEFAULT_CATEGORIES)
  const [milaFeedback,setMilaFeedback]=useState('Hi, ich bin Mila. Ich helfe dir beim Sortieren deiner Finanzen.')
  const [industry,setIndustry]=useState<Industry>('webdesigner')
  const [morningBriefing,setMorningBriefing]=useState('')
  const [userName,setUserName]=useState('Julia')
  const [userStatus,setUserStatus]=useState<UserStatus>('freelancer')

  const [taxClass,setTaxClass]=useState('1')
  const [annualGross,setAnnualGross]=useState(0)
  const [annualProfit,setAnnualProfit]=useState(0)
  const [vatStatus,setVatStatus]=useState('kleinunternehmer')
  const [federalState,setFederalState]=useState('Sachsen-Anhalt')
  const [churchTax,setChurchTax]=useState(false)
  const [married,setMarried]=useState(false)
  const [assemblyWork,setAssemblyWork]=useState(false)
  const [isLoggedIn,setIsLoggedIn]=useState(true)

  useEffect(()=>{
    if(typeof window==='undefined')return
    const saved=localStorage.getItem('mila_profile_central')
    if(!saved)return
    try{
      const p=JSON.parse(saved)
      if(p.userName)setUserName(p.userName)
      if(p.userStatus)setUserStatus(p.userStatus)
      if(p.industry)setIndustry(p.industry)
      if(p.taxClass)setTaxClass(p.taxClass)
      if(p.annualGross)setAnnualGross(Number(p.annualGross))
      if(p.annualProfit)setAnnualProfit(Number(p.annualProfit))
      if(p.vatStatus)setVatStatus(p.vatStatus)
      if(p.federalState)setFederalState(p.federalState)
      if(typeof p.churchTax==='boolean')setChurchTax(p.churchTax)
      if(typeof p.married==='boolean')setMarried(p.married)
      if(p.children)setChildren(Number(p.children))
      if(typeof p.assemblyWork==='boolean')setAssemblyWork(p.assemblyWork)
    }catch(e){console.error('Fehler beim Laden',e)}
  },[])

  useEffect(()=>{
    if(typeof window==='undefined')return
    localStorage.setItem('mila_profile_central',JSON.stringify({
      userName,userStatus,industry,taxClass,annualGross,annualProfit,vatStatus,federalState,churchTax,married,children,assemblyWork
    }))
  },[userName,userStatus,industry,taxClass,annualGross,annualProfit,vatStatus,federalState,churchTax,married,children,assemblyWork])

  const refreshMorningBriefing=async()=>{
    const incomeTotal=incomes.reduce((s,i)=>s+toNumber(i.amount),0)
    const expensesTotal=expenses.reduce((s,e)=>s+toNumber(e.amount),0)
    const profit=incomeTotal-expensesTotal
    let tip='Behalte deine Steuerrücklage im Auge.'
    if(userStatus==='montagearbeiter')tip='Fokus Montage: Sammle alle Belege für Unterkunft & Fahrten!'
    else{
      if(profit>1000)tip='Starker Monat – vielleicht etwas zurücklegen.'
      if(expenses.length>incomes.length)tip='Mehr Ausgaben als Einnahmen – prüfe offene Posten.'
    }
    setMorningBriefing(`🌸 Guten Tag ${userName}

Einnahmen: ${incomeTotal.toFixed(2)} €
Ausgaben: ${expensesTotal.toFixed(2)} €
Überschuss: ${profit.toFixed(2)} €

Ich habe aktuell ${expenses.length} Ausgaben und ${incomes.length} Einnahmen im Blick.

💜 Mein Tipp:
${tip}`)
  }

  useEffect(()=>{refreshMorningBriefing()},[incomes,expenses,userName,userStatus])

  const mountedRef=useRef(true)
  useEffect(()=>{mountedRef.current=true;return()=>{mountedRef.current=false}},[])

  const loadData=useCallback(async(signal?:AbortSignal)=>{
    try{
      const[expRes,incRes]=await Promise.all([
        fetch('/api/expenses',{signal}),
        fetch('/api/incomes',{signal})
      ])
      if(signal?.aborted)return
      const[expJson,incJson]=await Promise.all([expRes.json(),incRes.json()])
      if(!mountedRef.current)return
      if(expJson.success)setExpenses(expJson.data??[])
      if(incJson.success)setIncomes(incJson.data??[])
    }catch(e){
      if(e instanceof DOMException&&e.name==='AbortError')return
      console.error('Laden fehlgeschlagen:',e)
    }
  },[])

  useEffect(()=>{
    const c=new AbortController()
    loadData(c.signal)
    return()=>c.abort()
  },[loadData])

  const login=useCallback((name:string,status:UserStatus)=>{
    const safeName=name?.trim()||'Julia'
    const safeStatus=isUserStatus(status)?status:'freelancer'
    setUserName(safeName)
    setUserStatus(safeStatus)
    setIsLoggedIn(true)
    setMilaFeedback(`Willkommen zurück, ${safeName} ✨`)
    loadData()
  },[loadData])

  const logout=useCallback(()=>{
    setIsLoggedIn(false)
    setUserName('Julia')
    setUserStatus('freelancer')
    setExpenses([])
    setIncomes([])
    setMilaFeedback('Du wurdest ausgeloggt. Ich bin bereit, wenn du zurück bist.')
  },[])

  const triggerMilaFeedback=useCallback((category:string)=>{
    setMilaFeedback(getMilaTip(category,userStatus))
  },[userStatus])
  const addExpense=useCallback(async(exp:any)=>{
    const{data:{user}}=await supabase.auth.getUser()
    if(!user){
      setMilaFeedback('Bitte zuerst einloggen.')
      return
    }
    const title=exp.title?.trim()||'Ausgabe'
    const vendor=exp.vendor?.trim()||''
    const autoCategory=inferCategory(`${title} ${vendor} ${exp.note??''}`)
    const category=exp.category&&exp.category!=='Automatisch'&&exp.category!=='sonstiges'
      ?exp.category
      :autoCategory

    const payload={
      title,
      vendor,
      amount:toNumber(exp.amount),
      date:exp.date||new Date().toISOString().slice(0,10),
      category,
      note:exp.note?.trim()||'',
      vat:exp.vat??19,
      user_id:user.id
    }

    try{
      const res=await fetch('/api/expenses',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(payload)
      })
      const data=await res.json()
      const saved=data.data?.[0]
      if(mountedRef.current&&saved){
        setExpenses(p=>[saved,...p])
        setMilaFeedback(getMilaTip(category,userStatus))
      }
    }catch(e){console.error(e)}
  },[userStatus])

  const deleteExpense=useCallback(async(id:any)=>{
    try{
      const res=await fetch(`/api/expenses?id=${id}`,{method:'DELETE'})
      const data=await res.json()
      if(data.success&&mountedRef.current){
        setExpenses(p=>p.filter(e=>String(e.id)!==String(id)))
        setMilaFeedback('Die Ausgabe wurde gelöscht.')
      }
    }catch(e){console.error(e)}
  },[])

  const addIncome=useCallback(async(inc:any)=>{
    const{data:{user}}=await supabase.auth.getUser()
    if(!user)return
    const payload={
      title:inc.title?.trim()||'Einnahme',
      client:inc.client?.trim()||'',
      amount:toNumber(inc.amount),
      date:inc.date||new Date().toISOString().slice(0,10),
      note:inc.note?.trim()||'',
      user_id:user.id,
      created_at:new Date().toISOString()
    }
    try{
      const res=await fetch('/api/incomes',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(payload)
      })
      const data=await res.json()
      const saved=data.data?.[0]
      if(mountedRef.current&&saved){
        setIncomes(p=>[saved,...p])
        setMilaFeedback('💰 Einnahme gespeichert.')
      }
    }catch(e){console.error(e)}
  },[])

  const deleteIncome=useCallback(async(id:any)=>{
    try{
      const res=await fetch(`/api/incomes?id=${id}`,{method:'DELETE'})
      const data=await res.json()
      if(data.success&&mountedRef.current){
        setIncomes(p=>p.filter(i=>String(i.id)!==String(id)))
      }
    }catch(e){console.error(e)}
  },[])

  const summary = useMemo(() => {
  const totalExpenses = expenses.reduce((s, e) => s + toNumber(e.amount), 0)
  const totalIncomes = incomes.reduce((s, i) => s + toNumber(i.amount), 0)
  return { totalExpenses, totalIncomes, balance: totalIncomes - totalExpenses }
}, [expenses, incomes])

const budgetStatus = useMemo(() =>
  categories.map(c => {
    const spent = expenses.filter(e => e.category === c).reduce((s, e) => s + toNumber(e.amount), 0)
    const limit = BUDGET_LIMITS[c] ?? 100
    const remaining = limit - spent
    const percent = limit > 0 ? Math.min(100, Math.max(0, (spent / limit) * 100)) : 0
    return { category: CATEGORY_LABELS[c] || c, spent, limit, remaining, percent }
  })
, [categories, expenses])

const value = useMemo<FinanceContextValue>(() => ({
  expenses,
  incomes,
  setIncomes,
  categories,
  milaFeedback,
  morningBriefing,
  refreshMorningBriefing,
  triggerMilaFeedback,
  addExpense,
  deleteExpense,
  addIncome,
  deleteIncome,
  userName,
  setUserName,
  userStatus,
  setUserStatus,
  industry,
  setIndustry,
  taxClass,
  setTaxClass,
  annualGross,
  setAnnualGross,
  annualProfit,
  setAnnualProfit,
  vatStatus,
  setVatStatus,
  federalState,
  setFederalState,
  churchTax,
  setChurchTax,
  married,
  setMarried,
  children,
  setChildren,
  assemblyWork,
  setAssemblyWork,
  isLoggedIn,
  login,
  logout,
  summary,
  budgetStatus,
}), [
  expenses,
  incomes,
  categories,
  milaFeedback,
  morningBriefing,
  userName,
  userStatus,
  industry,
  taxClass,
  annualGross,
  annualProfit,
  vatStatus,
  federalState,
  churchTax,
  married,
  children,
  assemblyWork,
  isLoggedIn,
  summary,
  budgetStatus,
])

return (
  <FinanceContext.Provider value={value}>
    {children}
  </FinanceContext.Provider>
)
}

export function useFinance() {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider')
  return ctx
}

export { FinanceProvider }

