'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  ArrowLeft,
  Calculator,
  Check,
  ChevronRight,
  DoorOpen,
  Plus,
  RefreshCw,
  Ruler,
  ShieldCheck,
  Square,
  X,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Geometry = {
  id: string
  case_id: string
  geometry_type: 'rectangle'
  geometry_role: 'surface' | 'opening' | 'deduction'
  label: string
  sort_order: number
  status: 'active' | 'superseded' | 'deleted'
}

type Measurement = {
  id: string
  case_id: string
  geometry_id: string
  measurement_type: 'width' | 'height' | string
  label: string
  entered_value: number
  entered_unit: 'mm' | 'cm' | 'm'
  normalized_value: number
  normalized_unit: 'm'
  origin_type: string
  confirmation_status: 'unconfirmed' | 'confirmed' | 'rejected' | 'not_required'
  plausibility_status: 'unchecked' | 'plausible' | 'warning' | 'implausible'
  plausibility_message: string | null
  revision_no: number
  superseded_by: string | null
}

type CalculationResult = {
  id: string
  calculation_type: 'rectangle_area' | 'net_area'
  geometry_id: string | null
  formula_display: string
  result_value: number
  result_unit: string
  status: 'current' | 'stale' | 'superseded' | 'failed'
  input_snapshot: { inputs?: Array<{ measurement_id: string; revision_no: number; type: string; value: number; unit: string }> }
  created_at: string
}

type ActiveCase = {
  id: string
  title: string | null
  room: string | null
  component: string | null
  status: string
}

const n = (value: unknown) => Number(value || 0)
const fmt = (value: number) => value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function AufmassPage() {
  const router = useRouter()
  const [userId, setUserId] = useState('')
  const [activeCase, setActiveCase] = useState<ActiveCase | null>(null)
  const [geometries, setGeometries] = useState<Geometry[]>([])
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [calculations, setCalculations] = useState<CalculationResult[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showOpening, setShowOpening] = useState(false)
  const [edit, setEdit] = useState<{ geometry: Geometry; measurement: Measurement } | null>(null)

  const wall = geometries.find((g) => g.geometry_role === 'surface' && g.status === 'active') || null
  const openings = geometries.filter((g) => ['opening', 'deduction'].includes(g.geometry_role) && g.status === 'active')

  const currentMeasurements = useMemo(
    () => measurements.filter((m) => !m.superseded_by && m.confirmation_status !== 'rejected'),
    [measurements]
  )

  const byGeometry = (geometryId: string) => currentMeasurements.filter((m) => m.geometry_id === geometryId)
  const findMeasure = (geometryId: string, type: string) => byGeometry(geometryId).find((m) => m.measurement_type === type)

  const wallWidth = wall ? findMeasure(wall.id, 'width') : undefined
  const wallHeight = wall ? findMeasure(wall.id, 'height') : undefined
  const wallArea = wallWidth && wallHeight ? n(wallWidth.normalized_value) * n(wallHeight.normalized_value) : 0

  const openingAreas = openings.map((geometry) => {
    const width = findMeasure(geometry.id, 'width')
    const height = findMeasure(geometry.id, 'height')
    return { geometry, width, height, area: width && height ? n(width.normalized_value) * n(height.normalized_value) : 0 }
  })

  const netArea = Math.max(0, wallArea - openingAreas.reduce((sum, item) => sum + item.area, 0))
  const currentNet = [...calculations].reverse().find((c) => c.calculation_type === 'net_area' && c.status === 'current')
  const stale = calculations.some((c) => c.status === 'stale')
  const allRequiredConfirmed = Boolean(
    wallWidth && wallHeight &&
    wallWidth.confirmation_status === 'confirmed' && wallHeight.confirmation_status === 'confirmed' &&
    openingAreas.every((item) => item.width?.confirmation_status === 'confirmed' && item.height?.confirmation_status === 'confirmed')
  )

  useEffect(() => {
    void boot()
  }, [])

  async function boot() {
    setLoading(true)
    setError('')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      router.replace('/login')
      return
    }
    setUserId(session.user.id)
    try {
      const caseRow = await ensureCase(session.user.id)
      setActiveCase(caseRow)
      await loadCase(caseRow.id)
    } catch (e: any) {
      setError(e?.message || 'Das Aufmaß konnte nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }

  async function ensureCase(uid: string): Promise<ActiveCase> {
    const { data: existing, error: readError } = await supabase
      .from('cases')
      .select('id,title,room,component,status')
      .eq('owner_user_id', uid)
      .eq('trade_code', 'drywall')
      .neq('status', 'archived')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (readError) throw readError
    if (existing) return existing as ActiveCase

    const { data: created, error: createError } = await supabase
      .from('cases')
      .insert({
        owner_user_id: uid,
        created_by: uid,
        updated_by: uid,
        trade_code: 'drywall',
        workflow_type: 'wall_repair',
        title: 'Trockenbauwand',
        component: 'Wand',
        status: 'draft',
      })
      .select('id,title,room,component,status')
      .single()

    if (createError) throw createError
    return created as ActiveCase
  }

  async function loadCase(caseId: string) {
    const [g, m, c] = await Promise.all([
      supabase.from('geometries').select('*').eq('case_id', caseId).order('sort_order'),
      supabase.from('measurements').select('*').eq('case_id', caseId).order('created_at'),
      supabase.from('calculation_results').select('*').eq('case_id', caseId).order('created_at'),
    ])
    if (g.error) throw g.error
    if (m.error) throw m.error
    if (c.error) throw c.error
    setGeometries((g.data || []) as Geometry[])
    setMeasurements((m.data || []).map((x: any) => ({ ...x, entered_value: n(x.entered_value), normalized_value: n(x.normalized_value) })) as Measurement[])
    setCalculations((c.data || []).map((x: any) => ({ ...x, result_value: n(x.result_value) })) as CalculationResult[])
  }

  async function createWall(width: number, height: number) {
    if (!activeCase || !userId) return
    setBusy(true); setError('')
    try {
      const { data: geometry, error: ge } = await supabase.from('geometries').insert({
        case_id: activeCase.id,
        geometry_type: 'rectangle',
        geometry_role: 'surface',
        label: 'Hauptwand',
        sort_order: 0,
        created_by: userId,
        updated_by: userId,
      }).select('*').single()
      if (ge) throw ge

      const rows = [
        measurementInput(geometry.id, 'width', 'Wandbreite', width),
        measurementInput(geometry.id, 'height', 'Wandhöhe', height),
      ]
      const { error: me } = await supabase.from('measurements').insert(rows)
      if (me) throw me
      await loadCase(activeCase.id)
    } catch (e: any) { setError(e?.message || 'Wand konnte nicht gespeichert werden.') }
    finally { setBusy(false) }
  }

  function measurementInput(geometryId: string, type: 'width' | 'height', label: string, value: number) {
    return {
      case_id: activeCase!.id,
      geometry_id: geometryId,
      measurement_type: type,
      label,
      entered_value: value,
      entered_unit: 'm',
      normalized_value: value,
      normalized_unit: 'm',
      origin_type: 'manual_measurement',
      confirmation_status: 'unconfirmed',
      plausibility_status: value > 50 ? 'implausible' : 'plausible',
      plausibility_code: value > 50 ? 'unusual_wall_dimension' : null,
      plausibility_message: value > 50 ? 'Dieser Wert wirkt für dieses Bauteil ungewöhnlich.' : null,
      created_by: userId,
      updated_by: userId,
    }
  }

  async function addOpening(label: string, width: number, height: number) {
    if (!activeCase || !userId) return
    setBusy(true); setError('')
    try {
      const { data: geometry, error: ge } = await supabase.from('geometries').insert({
        case_id: activeCase.id,
        geometry_type: 'rectangle',
        geometry_role: 'opening',
        label,
        sort_order: openings.length + 1,
        created_by: userId,
        updated_by: userId,
      }).select('*').single()
      if (ge) throw ge
      const { error: me } = await supabase.from('measurements').insert([
        measurementInput(geometry.id, 'width', `${label}breite`, width),
        measurementInput(geometry.id, 'height', `${label}höhe`, height),
      ])
      if (me) throw me
      setShowOpening(false)
      await loadCase(activeCase.id)
    } catch (e: any) { setError(e?.message || 'Öffnung konnte nicht gespeichert werden.') }
    finally { setBusy(false) }
  }

  async function confirmMeasurement(measurement: Measurement) {
    if (!activeCase) return
    setBusy(true); setError('')
    const { error: updateError } = await supabase.from('measurements').update({
      confirmation_status: 'confirmed',
      updated_by: userId,
    }).eq('id', measurement.id)
    if (updateError) setError(updateError.message)
    await loadCase(activeCase.id)
    setBusy(false)
  }

  async function rejectMeasurement(measurement: Measurement) {
    if (!activeCase) return
    setBusy(true); setError('')
    const { error: updateError } = await supabase.from('measurements').update({
      confirmation_status: 'rejected',
      updated_by: userId,
    }).eq('id', measurement.id)
    if (updateError) setError(updateError.message)
    await loadCase(activeCase.id)
    setBusy(false)
  }

  async function correctMeasurement(old: Measurement, value: number) {
    if (!activeCase || !userId) return
    setBusy(true); setError('')
    try {
      const { data: fresh, error: insertError } = await supabase.from('measurements').insert({
        ...measurementInput(old.geometry_id, old.measurement_type as 'width' | 'height', old.label, value),
        source_reference: { supersedes_measurement_id: old.id },
      }).select('*').single()
      if (insertError) throw insertError
      const { error: supersedeError } = await supabase.from('measurements').update({
        superseded_by: fresh.id,
        updated_by: userId,
      }).eq('id', old.id)
      if (supersedeError) throw supersedeError
      setEdit(null)
      await loadCase(activeCase.id)
    } catch (e: any) { setError(e?.message || 'Korrektur konnte nicht gespeichert werden.') }
    finally { setBusy(false) }
  }

  async function recalculate() {
    if (!activeCase || !userId || !wall || !wallWidth || !wallHeight) return
    setBusy(true); setError('')
    try {
      const activeInputs = [wallWidth, wallHeight, ...openingAreas.flatMap((x) => [x.width, x.height]).filter(Boolean)] as Measurement[]
      const inputSnapshot = {
        inputs: activeInputs.map((m) => ({ measurement_id: m.id, revision_no: m.revision_no, type: m.measurement_type, value: n(m.normalized_value), unit: 'm' })),
      }
      const formula = `${fmt(wallArea)} m² − ${fmt(openingAreas.reduce((s, x) => s + x.area, 0))} m²`
      const { error: calcError } = await supabase.from('calculation_results').insert({
        case_id: activeCase.id,
        geometry_id: null,
        calculation_type: 'net_area',
        formula_key: 'surface_minus_openings',
        formula_display: formula,
        result_value: netArea,
        result_unit: 'm2',
        input_snapshot: inputSnapshot,
        status: 'current',
        created_by: userId,
        updated_by: userId,
      })
      if (calcError) throw calcError
      await loadCase(activeCase.id)
    } catch (e: any) { setError(e?.message || 'Berechnung konnte nicht gespeichert werden.') }
    finally { setBusy(false) }
  }

  if (loading) return <Loading />

  return (
    <main className="min-h-screen bg-[#070A0D] text-zinc-100">
      <div className="mx-auto min-h-screen max-w-md px-4 pb-28 pt-5">
        <header className="mb-5 flex items-center gap-3">
          <button onClick={() => router.back()} className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/[.04]" aria-label="Zurück">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[.18em] text-emerald-400">Mila Mobile · Aufmaß</p>
            <h1 className="truncate text-lg font-black">{activeCase?.title || 'Trockenbauwand'}</h1>
            <p className="text-xs text-zinc-500">{activeCase?.room || 'Baustelle'} · {activeCase?.component || 'Wand'}</p>
          </div>
        </header>

        {error && <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-semibold text-red-200">{error}</div>}

        {!wall ? (
          <StartWall busy={busy} onSave={createWall} />
        ) : (
          <>
            <section className="rounded-[1.8rem] border border-white/10 bg-[#101418] p-4 shadow-2xl shadow-black/20">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-400/10 text-emerald-400"><Square className="h-5 w-5" /></span>
                  <div><h2 className="font-black">Hauptwand</h2><p className="text-xs text-zinc-500">Rechteck</p></div>
                </div>
                <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Aufmaß</span>
              </div>

              <MeasureRow label="Breite" measurement={wallWidth} onConfirm={confirmMeasurement} onEdit={(m) => setEdit({ geometry: wall, measurement: m })} />
              <MeasureRow label="Höhe" measurement={wallHeight} onConfirm={confirmMeasurement} onEdit={(m) => setEdit({ geometry: wall, measurement: m })} />

              <div className="mt-4 rounded-2xl bg-black/25 p-4">
                <p className="text-xs font-semibold text-zinc-500">Wandfläche</p>
                <div className="mt-1 flex items-end justify-between gap-3">
                  <strong className="text-3xl font-black tracking-tight">{fmt(wallArea)} <span className="text-base text-zinc-500">m²</span></strong>
                  {wallWidth && wallHeight && <span className="text-xs font-bold text-zinc-500">{fmt(n(wallWidth.normalized_value))} × {fmt(n(wallHeight.normalized_value))}</span>}
                </div>
              </div>
            </section>

            <section className="mt-4 rounded-[1.8rem] border border-white/10 bg-[#101418] p-4">
              <div className="flex items-center justify-between"><div><h2 className="font-black">Öffnungen / Abzüge</h2><p className="text-xs text-zinc-500">Tür, Fenster oder anderer Abzug</p></div><DoorOpen className="h-5 w-5 text-zinc-600" /></div>
              <div className="mt-3 space-y-2">
                {openingAreas.map(({ geometry, width, height, area }) => (
                  <div key={geometry.id} className="rounded-2xl border border-white/5 bg-black/20 p-3">
                    <div className="flex items-center justify-between"><strong className="text-sm">{geometry.label}</strong><span className="font-black">− {fmt(area)} m²</span></div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <MeasureMini label="Breite" measurement={width} onConfirm={confirmMeasurement} onEdit={(m) => setEdit({ geometry, measurement: m })} />
                      <MeasureMini label="Höhe" measurement={height} onConfirm={confirmMeasurement} onEdit={(m) => setEdit({ geometry, measurement: m })} />
                    </div>
                  </div>
                ))}
                {!openingAreas.length && <p className="rounded-2xl border border-dashed border-white/10 px-3 py-4 text-center text-xs font-semibold text-zinc-600">Noch keine Öffnung erfasst.</p>}
              </div>
              <button onClick={() => setShowOpening(true)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm font-black text-emerald-300"><Plus className="h-4 w-4" /> Öffnung hinzufügen</button>
            </section>

            <section className="mt-4 overflow-hidden rounded-[1.8rem] border border-white/10 bg-[#101418]">
              <div className="p-4">
                <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-sky-400/10 text-sky-300"><Calculator className="h-5 w-5" /></span><div><h2 className="font-black">Nettofläche</h2><p className="text-xs text-zinc-500">Deterministisch berechnet</p></div></div>
                <div className="mt-4 rounded-2xl bg-black/25 p-4">
                  <p className="text-sm font-bold text-zinc-400">{fmt(wallArea)} m² − {fmt(openingAreas.reduce((s, x) => s + x.area, 0))} m²</p>
                  <strong className="mt-1 block text-4xl font-black tracking-tight">{fmt(netArea)} <span className="text-lg text-zinc-500">m²</span></strong>
                </div>
              </div>

              {stale && <div className="border-t border-amber-400/20 bg-amber-400/10 p-4"><div className="flex gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" /><div><p className="text-sm font-black text-amber-200">Berechnung veraltet</p><p className="mt-1 text-xs leading-5 text-amber-100/70">Ein verwendeter Messwert wurde geändert. Das alte Ergebnis bleibt erhalten und wird nicht still überschrieben.</p></div></div></div>}

              <div className="border-t border-white/10 p-4">
                <div className="mb-3 flex items-center justify-between text-xs"><span className="font-semibold text-zinc-500">Messgrundlage</span><StatusBadge ok={allRequiredConfirmed} text={allRequiredConfirmed ? 'alle Maße bestätigt' : 'Prüfung offen'} /></div>
                <button disabled={busy || !wallWidth || !wallHeight} onClick={recalculate} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-4 py-3.5 text-sm font-black text-[#07110C] disabled:opacity-40"><RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} /> {currentNet && !stale ? 'Berechnung neu erzeugen' : 'Neu berechnen'}</button>
                {currentNet && <p className="mt-2 text-center text-[11px] font-semibold text-zinc-600">Gespeichertes Ergebnis: {fmt(n(currentNet.result_value))} m² · aktuelle Version</p>}
              </div>
            </section>

            <section className="mt-4 rounded-[1.8rem] border border-white/10 bg-[#101418] p-4">
              <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" /><div><h2 className="text-sm font-black">Fachmann entscheidet</h2><p className="mt-1 text-xs leading-5 text-zinc-500">Mila rechnet aus den erfassten Werten. Unbestätigte oder geänderte Maße bleiben sichtbar und werden nicht automatisch freigegeben.</p></div></div>
            </section>
          </>
        )}
      </div>

      {showOpening && <OpeningSheet busy={busy} onClose={() => setShowOpening(false)} onSave={addOpening} />}
      {edit && <EditSheet busy={busy} item={edit.measurement} onClose={() => setEdit(null)} onConfirm={confirmMeasurement} onReject={rejectMeasurement} onSave={(value) => correctMeasurement(edit.measurement, value)} />}
    </main>
  )
}

function StartWall({ busy, onSave }: { busy: boolean; onSave: (w: number, h: number) => void }) {
  const [width, setWidth] = useState('3.80')
  const [height, setHeight] = useState('2.40')
  return <section className="rounded-[1.8rem] border border-white/10 bg-[#101418] p-5"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-400/10 text-emerald-400"><Ruler className="h-6 w-6" /></span><h2 className="mt-4 text-xl font-black">Hauptwand aufmessen</h2><p className="mt-1 text-sm leading-6 text-zinc-500">Starte mit Breite und Höhe. Mila behandelt beide Werte zunächst als ungeprüft.</p><div className="mt-5 grid grid-cols-2 gap-3"><NumberField label="Breite in m" value={width} setValue={setWidth} /><NumberField label="Höhe in m" value={height} setValue={setHeight} /></div><button disabled={busy || !n(width) || !n(height)} onClick={() => onSave(n(width), n(height))} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-4 py-3.5 text-sm font-black text-[#07110C] disabled:opacity-40">Aufmaß anlegen <ChevronRight className="h-4 w-4" /></button></section>
}

function MeasureRow({ label, measurement, onConfirm, onEdit }: any) {
  if (!measurement) return <div className="mb-2 rounded-2xl border border-dashed border-white/10 p-3 text-sm text-zinc-600">{label} fehlt</div>
  return <button onClick={() => onEdit(measurement)} className="mb-2 flex w-full items-center justify-between rounded-2xl border border-white/5 bg-black/20 px-3.5 py-3 text-left"><span><span className="block text-xs font-semibold text-zinc-500">{label}</span><span className="text-lg font-black">{fmt(n(measurement.normalized_value))} m</span></span><span className="flex items-center gap-2"><StatusBadge ok={measurement.confirmation_status === 'confirmed'} warning={measurement.plausibility_status === 'implausible'} text={measurement.plausibility_status === 'implausible' ? 'prüfen' : measurement.confirmation_status === 'confirmed' ? 'bestätigt' : 'ungeprüft'} />{measurement.confirmation_status !== 'confirmed' && <span onClick={(e) => { e.stopPropagation(); onConfirm(measurement) }} className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-400/15 text-emerald-300"><Check className="h-4 w-4" /></span>}</span></button>
}

function MeasureMini({ label, measurement, onConfirm, onEdit }: any) {
  if (!measurement) return <div className="rounded-xl bg-white/5 p-2 text-xs text-zinc-600">{label}: fehlt</div>
  return <button onClick={() => onEdit(measurement)} className="rounded-xl bg-white/[.04] p-2 text-left"><span className="block text-[10px] font-bold uppercase text-zinc-600">{label}</span><span className="mt-0.5 flex items-center justify-between"><strong className="text-sm">{fmt(n(measurement.normalized_value))} m</strong><span className={`h-2 w-2 rounded-full ${measurement.confirmation_status === 'confirmed' ? 'bg-emerald-400' : 'bg-amber-300'}`} /></span></button>
}

function StatusBadge({ ok, warning, text }: { ok?: boolean; warning?: boolean; text: string }) {
  const cls = warning ? 'bg-red-400/10 text-red-300' : ok ? 'bg-emerald-400/10 text-emerald-300' : 'bg-amber-400/10 text-amber-200'
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${cls}`}>{text}</span>
}

function NumberField({ label, value, setValue }: { label: string; value: string; setValue: (v: string) => void }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-bold text-zinc-500">{label}</span><input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value.replace(',', '.'))} className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-lg font-black outline-none focus:border-emerald-400/50" /></label>
}

function OpeningSheet({ busy, onClose, onSave }: { busy: boolean; onClose: () => void; onSave: (label: string, w: number, h: number) => void }) {
  const [label, setLabel] = useState('Tür')
  const [width, setWidth] = useState('0.90')
  const [height, setHeight] = useState('2.00')
  return <Sheet title="Öffnung hinzufügen" onClose={onClose}><div className="grid grid-cols-3 gap-2">{['Tür','Fenster','Öffnung'].map((x) => <button key={x} onClick={() => setLabel(x)} className={`rounded-2xl border px-2 py-3 text-xs font-black ${label === x ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300' : 'border-white/10 bg-white/[.03] text-zinc-400'}`}>{x}</button>)}</div><div className="mt-4 grid grid-cols-2 gap-3"><NumberField label="Breite in m" value={width} setValue={setWidth} /><NumberField label="Höhe in m" value={height} setValue={setHeight} /></div><div className="mt-4 rounded-2xl bg-black/30 p-3"><p className="text-xs text-zinc-500">Fläche</p><strong className="text-2xl font-black">{fmt(n(width) * n(height))} m²</strong></div><button disabled={busy || !n(width) || !n(height)} onClick={() => onSave(label, n(width), n(height))} className="mt-4 w-full rounded-2xl bg-emerald-400 px-4 py-3.5 text-sm font-black text-[#07110C] disabled:opacity-40">Speichern</button></Sheet>
}

function EditSheet({ busy, item, onClose, onConfirm, onReject, onSave }: any) {
  const [value, setValue] = useState(String(item.normalized_value))
  const changed = Math.abs(n(value) - n(item.normalized_value)) > 0.000001
  return <Sheet title={item.label} onClose={onClose}><div className="rounded-2xl bg-black/30 p-4"><p className="text-xs font-bold text-zinc-500">Aktueller Messwert</p><div className="mt-1 flex items-end justify-between"><strong className="text-3xl font-black">{fmt(n(item.normalized_value))} m</strong><StatusBadge ok={item.confirmation_status === 'confirmed'} warning={item.plausibility_status === 'implausible'} text={item.plausibility_status === 'implausible' ? 'unplausibel' : item.confirmation_status === 'confirmed' ? 'bestätigt' : 'ungeprüft'} /></div><p className="mt-2 text-xs text-zinc-600">Herkunft: {item.origin_type === 'manual_measurement' ? 'manuell gemessen' : item.origin_type}</p></div>{item.plausibility_message && <div className="mt-3 flex gap-2 rounded-2xl border border-red-400/20 bg-red-400/10 p-3 text-xs leading-5 text-red-200"><AlertTriangle className="h-4 w-4 shrink-0" />{item.plausibility_message}</div>}<div className="mt-4"><NumberField label="Korrigierter Wert in m" value={value} setValue={setValue} /></div>{changed ? <button disabled={busy || !n(value)} onClick={() => onSave(n(value))} className="mt-4 w-full rounded-2xl bg-emerald-400 px-4 py-3.5 text-sm font-black text-[#07110C] disabled:opacity-40">Neue Messversion speichern</button> : <div className="mt-4 grid grid-cols-2 gap-2"><button disabled={busy} onClick={() => onReject(item)} className="flex items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-400/10 px-3 py-3 text-xs font-black text-red-200"><X className="h-4 w-4" /> Ablehnen</button><button disabled={busy || item.confirmation_status === 'confirmed'} onClick={() => onConfirm(item)} className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-3 py-3 text-xs font-black text-[#07110C] disabled:opacity-40"><Check className="h-4 w-4" /> Bestätigen</button></div>}<p className="mt-4 text-center text-[11px] leading-5 text-zinc-600">Eine Korrektur überschreibt den bisherigen Wert nicht. Mila legt eine neue Messversion an.</p></Sheet>
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-2 backdrop-blur-sm"><div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-[#11161B] p-4 shadow-2xl"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-black">{title}</h2><button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl bg-white/5"><X className="h-4 w-4" /></button></div>{children}</div></div>
}

function Loading() {
  return <main className="grid min-h-screen place-items-center bg-[#070A0D] text-zinc-100"><div className="text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-emerald-400 border-t-transparent" /><p className="mt-3 text-xs font-bold text-zinc-500">Aufmaß wird geladen…</p></div></main>
}
