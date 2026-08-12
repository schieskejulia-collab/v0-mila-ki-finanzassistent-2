import { NextResponse } from 'next/server'
import { getMilaChatResponse } from '@/lib/mila'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const message = String(body?.message || '').trim()
    const messages = Array.isArray(body?.messages) ? body.messages : []
    const context = body?.context || {}
    const userName = body?.userName
    const userStatus = body?.userStatus
    const systemInstruction = String(body?.systemInstruction || '').trim()

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

    return NextResponse.json({
      success: true,
      reply,
    })
  } catch (error) {
    console.error('Fehler im Chat-Endpunkt:', error)

    return NextResponse.json(
      {
        success: false,
        reply:
          'Mila hat gerade ein kleines Verbindungsproblem. Bitte versuch es gleich nochmal.',
      },
      { status: 500 }
    )
  }
}
