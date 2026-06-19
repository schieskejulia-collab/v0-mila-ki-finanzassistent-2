export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// --- GET: Einnahmen abrufen ---
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('incomes')
      .select('*')
      .order('date', { ascending: false })

    if (error) {
      console.error("❌ Supabase Incomes GET Error:", error.message, error.details)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("❌ API Incomes GET Absturz:", err.message)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

// --- POST: Neue Einnahme speichern ---
export async function POST(req: Request) {
  try {
    const body = await req.json()
    console.log("📡 Eingehender Incomes POST Body:", body)

    const insertPayload = {
  title: body.title,
  client: body.client || '',
  amount: Number(body.amount),
  date: body.date || new Date().toISOString().slice(0, 10),
  note: body.note || '',
  user_id: body.user_id,
  created_at: new Date().toISOString(),
}

    const { data, error } = await supabase
      .from('incomes')
      .insert([insertPayload])
      .select()

    if (error) {
      console.error("❌ Supabase Incomes POST Error:", error.message, error.details, error.hint)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("❌ API Incomes POST Absturz:", err.message)
    return NextResponse.json(
      { success: false, error: err.message ?? 'Unbekannter Fehler' },
      { status: 500 },
    )
  }
}

// --- DELETE: Einnahme löschen ---
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'id fehlt' }, { status: 400 })
    }

    const { error } = await supabase.from('incomes').delete().eq('id', id)

    if (error) {
      console.error("❌ Supabase Incomes DELETE Error:", error.message, error.details)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("❌ API Incomes DELETE Absturz:", err.message)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
