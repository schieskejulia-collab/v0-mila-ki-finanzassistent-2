export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { imageBase64 } = await req.json()

    if (!imageBase64) {
      return NextResponse.json({ success: false, error: 'Kein Bild empfangen' }, { status: 400 })
    }

    // Falls das Base64-Präfix (data:image/jpeg;base64,) mitkommt, isolieren wir den reinen String
    const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ success: false, error: 'Groq API Key fehlt' }, { status: 500 })
    }

    // Wir rufen die Groq API mit dem Vision-Modell auf
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.2-11b-vision-preview', // Groqs ultraschnelles Vision-Modell
        response_format: { type: 'json_object' }, // Zwingt Groq zu sauberem JSON
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Du bist Mila, eine smarte Finanz-Assistentin. Analysiere diesen Beleg. Extrahiere den Gesamtbetrag (als reine Zahl mit Punkt, z.B. 12.50), den Händler (vendor) und kategorisiere die Ausgabe in eine dieser Kategorien: "Software", "Marketing", "Bewirtung", "Reisen", "Sonstiges". Antworte AUSSCHLIESSLICH im folgenden JSON-Format: {"amount": 12.50, "vendor": "Händlername", "category": "Kategorie", "title": "Kurzer prägnanter Titel für die Ausgabe"}'
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
      console.error('❌ Groq Vision API Error:', groqData)
      return NextResponse.json({ success: false, error: groqData.error?.message || 'Groq-Fehler' }, { status: 500 })
    }

    // Extrahiere das generierte JSON-Objekt aus der Antwort
    const rawContent = groqData.choices[0].message.content
    const parsedData = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent

    return NextResponse.json({ success: true, data: parsedData })

  } catch (err: any) {
    console.error('❌ Crash in Scan-Receipt Route:', err.message)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
