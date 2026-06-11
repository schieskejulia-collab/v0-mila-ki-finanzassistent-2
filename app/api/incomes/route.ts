export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('incomes')
    .select('*')
    .order('date', { ascending: false })

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const insertPayload = {
      title: body.title,
      client: body.client || '',
      amount: Number(body.amount),
      date: body.date || new Date().toISOString().slice(0, 10),
      note: body.note || null,
      created_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('incomes')
      .insert([insertPayload])
      .select()

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message ?? 'Unbekannter Fehler' },
      { status: 500 },
    )
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ success: false, error: 'id fehlt' }, { status: 400 })
  }

  const { error } = await supabase.from('incomes').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}