import { NextResponse } from 'next/server'
import { classifyReceipt } from '@/lib/receipt-rules'

function cleanJson(content: string) {
  return content.replace(/```json/gi, '').replace(/```/g, '').trim()
}

function normalizeAmount(value: any) {
  const normalized = String(value ?? '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '')

  const number = Number(normalized)
  return Number.isFinite(number) ? number : 0
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GROQ_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Scanner ist noch nicht verbunden. API-Key fehlt.' },
        { status: 500 }
      )
    }

    const { imageBase64 } = await req.json()

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Kein Belegbild erhalten.' },
        { status: 400 }
      )
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `
Analysiere diesen deutschen Kassenbeleg.

Antworte ausschließlich mit gültigem JSON:
{
  "amount": number,
  "vendor": string,
  "title": string,
  "note": string
}

amount ist IMMER der Brutto-Endbetrag, also der tatsächlich bezahlte Gesamtbetrag.
Suche nach: Gesamt, Summe, Zu zahlen, Endbetrag, Brutto, Kartenzahlung, EC, Total.
Nimm niemals Netto, MwSt, Steuer, Rabatt, Rückgeld oder Wechselgeld.
vendor ist der Händlername.
title ist eine kurze Beschreibung des Einkaufs.
Antwort nur als JSON, ohne Erklärung.
`,
              },
              {
                type: 'image_url',
                image_url: { url: imageBase64 },
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 300,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Groq Fehler:', data)
      return NextResponse.json(
        { success: false, error: 'Mila konnte den Beleg gerade nicht lesen.' },
        { status: 500 }
      )
    }

    const content = data?.choices?.[0]?.message?.content || '{}'
    const cleanedContent = cleanJson(content)

    let parsed: any

    try {
      parsed = JSON.parse(cleanedContent)
    } catch {
      console.error('JSON PARSE FEHLER:', content)
      return NextResponse.json(
        { success: false, error: 'Mila konnte die Belegdaten nicht sicher erkennen.' },
        { status: 422 }
      )
    }

    const vendor = String(parsed.vendor || '').trim()
    const title = String(parsed.title || vendor || 'Beleg').trim()
    const amount = normalizeAmount(parsed.amount)

    const classification = classifyReceipt({
      title,
      vendor,
      amount,
      note: parsed.note || '',
    })

    const document = {
  title,
  partner: vendor,
  amount,
  type: classification.needsReview ? 'sonstiges' : 'beleg',
  status: 'neu',
  documentDate: new Date().toISOString().slice(0, 10),
  dueDate: undefined,
  fileName: title,
  keepUntil: new Date(
    new Date().setFullYear(new Date().getFullYear() + 1)
  )
    .toISOString()
    .slice(0, 10),
  note: 'Automatisch von Mila aus Belegscan erstellt 📸',
}

return NextResponse.json({
  success: true,
  data: {
    data: {
      amount,
      vendor,
      title,
      category: classification.category,
      taxHint: classification.taxHint,
      confidence: classification.confidence,
      needsReview: classification.needsReview,
      document,
    },
  },
})