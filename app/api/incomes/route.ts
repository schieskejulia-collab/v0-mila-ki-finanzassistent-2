export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { requireSupabaseUser } from '@/lib/supabase-server'

export async function GET(req: Request) {
  try {
    const { client, user, error: authError } = await requireSupabaseUser(req)

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: authError },
        { status: 401 }
      )
    }

    const { data, error } = await client
      .from('incomes')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase Incomes GET Error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: data ?? [] })
  } catch (err: any) {
    console.error('API Incomes GET Fehler:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Fehler beim Laden' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const { client, user, error: authError } = await requireSupabaseUser(req)

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: authError },
        { status: 401 }
      )
    }

    const body = await req.json()
    const amount = Number(body.amount)

    if (!body.title && !body.client) {
      return NextResponse.json(
        { success: false, error: 'Titel oder Kunde fehlt' },
        { status: 400 }
      )
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Ungültiger Betrag' },
        { status: 400 }
      )
    }

    const insertPayload = {
      title: body.title || body.client || 'Einnahme',
      client: body.client || '',
      amount,
      date: body.date || new Date().toISOString().slice(0, 10),
      note: body.note || '',
      user_id: user.id,
      created_at: new Date().toISOString(),
    }

    const { data, error } = await client
      .from('incomes')
      .insert([insertPayload])
      .select()

    if (error) {
      console.error('Supabase Incomes POST Error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error('API Incomes POST Fehler:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Fehler beim Speichern' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request) {
  try {
    const { client, user, error: authError } = await requireSupabaseUser(req)

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: authError },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id fehlt' },
        { status: 400 }
      )
    }

    const { error } = await client
      .from('incomes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Supabase Incomes DELETE Error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('API Incomes DELETE Fehler:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Fehler beim Löschen' },
      { status: 500 }
    )
  }
}
