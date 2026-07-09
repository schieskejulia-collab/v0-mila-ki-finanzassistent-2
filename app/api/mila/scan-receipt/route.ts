import { NextResponse } from 'next/server'
import { classifyReceipt } from '@/lib/receipt-rules'
import { classifyDocument } from '@/lib/document-classifier'
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
Analysiere dieses deutsche Finanzdokument oder diesen Beleg.

Antworte ausschließlich mit gültigem JSON:

 {
  "amount": number,
  "vendor": string,
  "title": string,
  "note": string,
  "category": string,
  "documentType": string,
  "isObligation": boolean,
  "dueDate": string,
"caseNumber": string,
"originalCreditor": string,
"installmentAmount": number
}

Regeln:
- amount ist der Brutto-Endbetrag oder die geforderte Gesamtsumme.
- vendor ist Händler, Anbieter, Gläubiger, Inkasso oder Absender.
- title ist kurz und verständlich.
- documentType ist: "beleg", "rechnung", "mahnung", "inkasso", "vertrag", "bescheid" oder "sonstiges".
- dueDate ist das Zahlungsziel / "zahlen bis" / "1. Rate bis" / "fällig am" Datum
- Wenn ein Datum gefunden wird, gib dueDate im Format YYYY-MM-DD zurück
- Bei Inkasso, Mahnung oder Forderung ist documentType "verpflichtung"
Kategorie-Regeln:
- Wenn Wörter wie Inkasso, Forderung, Gläubiger, Aktenzeichen, Mahnung, Ratenzahlung oder Vollstreckung vorkommen:
  category = "inkasso"
- Inkasso ist niemals "sonstiges".
- Eine Inkasso-Forderung ist immer isObligation = true.
- Speichere ursprünglichen Anbieter (z.B. Klarna) in note, wenn erkennbar.
- isObligation ist true bei Rechnung, Mahnung, Inkasso, Rate, Vertrag mit Zahlungspflicht oder Zahlungsfrist.
- dueDate im Format DD-MM-YYYY, wenn erkennbar. Sonst "".
- caseNumber ist Aktenzeichen, Kundennummer, Vertragsnummer oder Rechnungsnummer, wenn eindeutig erkennbar.
- originalCreditor ist der ursprüngliche Gläubiger oder Anbieter, z.B. Klarna, Vodafone, PayPal.
- installmentAmount ist die angebotene oder geforderte Rate, wenn eine Ratenzahlung genannt wird. Sonst 0.
- Bei Inkasso/Forderungen ist documentType immer "inkasso" und category immer "inkasso".
- Erfinde keine Werte.

Bei Inkasso/Forderungen besonders suchen nach:
Inkasso, Forderung, Aktenzeichen, Gläubiger, Hauptforderung, Gebühren, Mahnung, Zahlungsfrist, Ratenzahlung.
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
const documentClassification = classifyDocument({
  title,
  vendor,
  note: parsed.note || '',
})
    const document = {
  title,
  partner: vendor,
  amount,
  type: documentClassification.type,
  status: 'neu',
  documentDate: new Date().toISOString().slice(0, 10),
  dueDate: parsed.dueDate || parsed.due_date || '',
  fileName: title,
 keepUntil: new Date(
  new Date().setFullYear(new Date().getFullYear() + 1)
)
  .toISOString()
  .slice(0, 10),

caseNumber: parsed.caseNumber || '',
originalCreditor: parsed.originalCreditor || '',
installmentAmount: Number(parsed.installmentAmount || 0),

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
  } catch (error) {
    console.error('Scan Fehler:', error)
    return NextResponse.json(
      { success: false, error: 'Serverfehler beim Belegscan.' },
      { status: 500 }
    )
  }
}