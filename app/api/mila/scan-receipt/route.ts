export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { imageBase64 } = await req.json()

    if (!imageBase64) {
      return NextResponse.json({ success: false, error: 'Kein Bild empfangen' }, { status: 400 })
    }

    // Falls das Base64-Präfix mitgegeben wurde, filtern wir es heraus
    const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64

    if (!process.env.GROQ_API_KEY) {
      console.error('❌ GROQ_API_KEY fehlt in den Umgebungsvariablen!')
      return NextResponse.json({ success: false, error: 'Konfigurationsfehler auf dem Server' }, { status: 500 })
    }

    // Anfrage an Groq mit dem Llama 3.2 Vision Modell
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.2-11b-vision-preview',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Du bist Mila, eine smarte Finanz-Assistentin. Analysiere diesen Beleg. Extrahiere den Gesamtbetrag (als reine Zahl mit Punkt, z.B. 14.99), den Händler (vendor) und ordne es einer dieser Kategorien zu: "Software", "Marketing", "Bewirtung", "Reisen", "Sonstiges". Antworte AUSSCHLIESSLICH als JSON-Objekt in diesem Format: {"amount": 14.99, "vendor": "Händlername", "category": "Kategorie", "title": "Kurzer Titel"}'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${cleanBase64}`
                }
              }
            ]
          }
        ]
      })
    })

    const groqData = await response.json()

    if (!response.ok) {
      console.error('❌ Groq Vision API Fehler:', groqData)
      return NextResponse.json({ success: false, error: groqData.error?.message || 'Fehler bei der Beleganalyse' }, { status: 500 })
    }

    const rawContent = groqData.choices[0].message.content
    const parsedData = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent

    return NextResponse.json({ success: true, data: parsedData })

  } catch (err: any) {
    console.error('❌ Crash in Scan-Receipt Route:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
