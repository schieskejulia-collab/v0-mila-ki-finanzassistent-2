import { NextResponse } from 'next/server'
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

function fileToDataUrl(file: File, buffer: ArrayBuffer) {
  const base64 = Buffer.from(buffer).toString('base64')
  return `data:${file.type};base64,${base64}`
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GROQ_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'PDF-Scanner ist noch nicht verbunden. API-Key fehlt.' },
        { status: 500 }
      )
    }

    const formData = await req.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'Keine Datei erhalten.' },
        { status: 400 }
      )
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { success: false, error: 'Bitte eine PDF hochladen.' },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()

    if (arrayBuffer.byteLength === 0) {
      return NextResponse.json(
        { success: false, error: 'Die PDF ist leer.' },
        { status: 400 }
      )
    }

    const fileName = file.name.replace(/\.pdf$/i, '')
    const pdfDataUrl = fileToDataUrl(file, arrayBuffer)

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
Analysiere diese deutsche PDF-Rechnung.

Antworte ausschließlich mit gültigem JSON:
{
  "title": string,
  "vendor": string,
  "amount": number,
  "dueDate": string,
  "documentType": string,
  "invoiceNumber": string,
  "note": string
}

Regeln:
- amount ist der zu zahlende Brutto-Endbetrag.
- dueDate im Format YYYY-MM-DD.
- Wenn kein Fälligkeitsdatum gefunden wird, dueDate leer lassen.
- vendor ist Anbieter/Gläubiger/Absender.
- title kurz und verständlich, z.B. "Essengeld Kita" oder "Kita-Rechnung".
- documentType ist z.B. "rechnung", "mahnung", "vertrag", "bescheid" oder "sonstiges".
- invoiceNumber nur wenn eindeutig vorhanden.
- Erfinde keine Werte.
- Wenn du etwas nicht sicher erkennst, nutze "" oder 0.

Suche besonders nach:
Rechnung, Rechnungsnummer, Betrag, Gesamtbetrag, zu zahlen, Fälligkeit, zahlbar bis, Zahlung bis, Essengeld, Kita, Betreuung, Kundennummer.
Antwort nur als JSON, ohne Erklärung.
`,
              },
 {
  type: 'document',
  document: {
    data: {
      mime_type: 'application/pdf',
      content: pdfDataUrl.split(',')[1],
    },
  },
},
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 500,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
  console.error('Groq PDF Fehler:', result)

  const groqMessage =
    result?.error?.message ||
    result?.message ||
    'Unbekannter PDF-Fehler'
const fileName = file.name.replace(/\.pdf$/i, '')
  return NextResponse.json({
  success: true,
  data: {
    title: fileName,
    vendor: '',
    amount: '',
    dueDate: '',
    category: 'sonstiges',
    note:
      'PDF gespeichert 📄 Für automatische Analyse bitte als Bild oder Screenshot hochladen.',
    document: {
      title: fileName,
      partner: '',
      amount: 0,
      type: 'document',
      status: 'neu',
      documentDate: new Date().toISOString().slice(0, 10),
      fileName,
      keepUntil: new Date(
        new Date().setFullYear(new Date().getFullYear() + 1)
      )
        .toISOString()
        .slice(0, 10),
      note: 'PDF Dokument gespeichert',
    },
  },
})
}

    const content = result?.choices?.[0]?.message?.content || '{}'
    const cleaned = cleanJson(content)

    let parsed: any = {}

    try {
      parsed = JSON.parse(cleaned)
    } catch {
      console.error('PDF JSON PARSE FEHLER:', content)
      parsed = {}
    }

    const title = String(parsed.title || fileName || 'PDF-Rechnung').trim()
    const vendor = String(parsed.vendor || '').trim()
    const amount = normalizeAmount(parsed.amount)
    const dueDate = String(parsed.dueDate || '').trim()
    const documentType = String(parsed.documentType || 'rechnung').trim()
    const invoiceNumber = String(parsed.invoiceNumber || '').trim()
const documentClassification = classifyDocument({
  title,
  vendor,
  note: `${parsed.note || ''} ${documentType}`,
})
    return NextResponse.json({
      success: true,
      data: {
        title,
        vendor,
        amount: amount || '',
        dueDate,
        category: documentClassification.category || (documentType === 'rechnung' ? 'sonstiges' : documentType),
documentType: documentClassification.type,
documentMessage: documentClassification.message,
documentPriority: documentClassification.priority,
        note:
          invoiceNumber
            ? `PDF ausgelesen 📄 · Rechnungsnummer: ${invoiceNumber}`
            : 'PDF ausgelesen 📄',
        document: {
          title,
          partner: vendor,
          amount,
          type: documentClassification.type,
          status: 'neu',
          documentDate: new Date().toISOString().slice(0, 10),
          dueDate: dueDate || undefined,
          fileName: file.name,
          keepUntil: new Date(
            new Date().setFullYear(new Date().getFullYear() + 1)
          )
            .toISOString()
            .slice(0, 10),
          note: invoiceNumber
            ? `Aus PDF erkannt · Rechnungsnummer: ${invoiceNumber}`
            : 'Aus PDF erkannt',
        },
      },
    })
  } catch (error) {
    console.error('PDF Fehler:', error)

    return NextResponse.json(
      { success: false, error: 'PDF konnte nicht verarbeitet werden.' },
      { status: 500 }
    )
  }
}
