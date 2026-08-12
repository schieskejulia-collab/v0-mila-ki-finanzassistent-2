import { NextResponse } from 'next/server'
import { getMilaChatResponse } from '@/lib/mila'
import { requireSupabaseUser } from '@/lib/supabase-server'

export async function POST(req: Request) {
  try {
    const { user, error: authError } = await requireSupabaseUser(req)
    if (authError || !user) {
      return NextResponse.json(
        { success: false, reply: 'Bitte melde dich an, um Mila zu nutzen.' },
        { status: 401, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      )
    }

    const body = await req.json()
    const message = String(body?.message || '').trim().slice(0, 8000)
    const messages = Array.isArray(body?.messages) ? body.messages.slice(-20) : []
    const context = body?.context || {}
    const userName = body?.userName
    const userStatus = body?.userStatus
    const systemInstruction = String(body?.systemInstruction || '').trim().slice(0, 6000)

    if (!message) {
      return NextResponse.json(
        { reply: 'Bitte schreib mir kurz, wobei ich dir helfen soll.' },
        { status: 400 }
      )
    }

    const reply = await getMilaChatResponse(message, messages, {
      ...context,
      userName,
      userStatus,
      systemInstruction,
    })

    return NextResponse.json(
      { success: true, reply },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  } catch (error) {
    console.error('Fehler im Chat-Endpunkt:', error)

    return NextResponse.json(
      {
        success: false,
        reply: 'Mila hat gerade ein kleines Verbindungsproblem. Bitte versuch es gleich nochmal.',
      },
      { status: 500 }
    )
  }
}
