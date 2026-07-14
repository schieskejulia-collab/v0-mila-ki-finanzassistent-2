import { NextResponse } from 'next/server'
import { extractText, getDocumentProxy } from 'unpdf'
import { detectCategory } from '@/lib/categories'
import { classifyDocument } from '@/lib/document-classifier'
import { detectVendor } from '@/lib/mila-vendor-detection'
import { autoCategorizeVendor } from '@/lib/mila-vendor-category'

export const runtime = 'nodejs'

function cleanJson(content: string) {
  return content
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim()
}

function normalizeAmount(value: unknown) {
  const raw = String(value ?? '').trim()

  if (!raw) return 0

  const cleaned = raw
    .replace(/\s/g, '')
    .replace(/€/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '')

  const number = Number(cleaned)

  return Number.isFinite(number) ? number : 0
}

function normalizeDate(value: unknown) {
  const raw = String(value ?? '').trim()

  if (!raw) return ''

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw
  }

  const germanDate = raw.match(
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/
  )

  if (germanDate) {
    const [, day, month, year] = germanDate

    return `${year}-${month.padStart(
      2,
      '0'
    )}-${day.padStart(2, '0')}`
  }

  return ''
}

function limitText(text: string, maxLength = 30000) {
  return text
    .replace(/\u0000/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxLength)
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GROQ_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            'PDF-Scanner ist noch nicht verbunden. API-Key fehlt.',
        },
        { status: 500 }
      )
    }

    const formData = await req.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Keine Datei erhalten.',
        },
        { status: 400 }
      )
    }

    if (
      file.type !== 'application/pdf' &&
      !file.name.toLowerCase().endsWith('.pdf')
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Bitte eine PDF hochladen.',
        },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()

    if (arrayBuffer.byteLength === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Die PDF ist leer.',
        },
        { status: 400 }
      )
    }

    if (arrayBuffer.byteLength > 10 * 1024 * 1024) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Die PDF ist größer als 10 MB. Bitte eine kleinere Datei verwenden.',
        },
        { status: 413 }
      )
    }

    const fileName = file.name.replace(/\.pdf$/i, '')

    const pdf = await getDocumentProxy(
      new Uint8Array(arrayBuffer)
    )

    const extracted = await extractText(pdf, {
      mergePages: true,
    })

    const pdfText = limitText(
      Array.isArray(extracted.text)
        ? extracted.text.join('\n')
        : String(extracted.text || '')
    )

    if (pdfText.length < 20) {
      return NextResponse.json(
        {
          success: false,
          error:
            'In dieser PDF wurde kein lesbarer Text gefunden. Wahrscheinlich ist sie nur eingescannt. Bitte nutze einen Screenshot oder fotografiere das Dokument.',
        },
        { status: 422 }
      )
    }

    const vendorResult = detectVendor(pdfText)
    const categoryResult =
      autoCategorizeVendor(pdfText)

    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model:
            'meta-llama/llama-4-scout-17b-16e-instruct',
          response_format: {
            type: 'json_object',
          },
          messages: [
            {
              role: 'system',
              content: `
Du analysierst deutschsprachige Finanzdokumente.

Antworte ausschließlich mit gültigem JSON.

Erfinde keine Werte.
Wenn ein Wert nicht sicher erkennbar ist, nutze "" oder 0.
`,
            },
            {
              role: 'user',
              content: `
Analysiere den folgenden aus einer PDF extrahierten Text.

Gib genau diese JSON-Struktur zurück:

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

- amount ist der tatsächlich zu zahlende Brutto-Endbetrag.
- dueDate muss YYYY-MM-DD sein.
- vendor ist Anbieter, Gläubiger, Behörde oder Absender.
- title soll kurz und verständlich sein.
- documentType ist:
  "rechnung",
  "mahnung",
  "vertrag",
  "bescheid",
  "lohnabrechnung",
  "versicherung",
  "steuer",
  oder "sonstiges".
- invoiceNumber nur übernehmen, wenn sie eindeutig vorhanden ist.
- Eine bereits bezahlte Summe nicht als offenen Rechnungsbetrag übernehmen.
- Bei mehreren Beträgen den Gesamtbetrag beziehungsweise offenen Zahlbetrag wählen.
- Erfinde nichts.

Bereits lokal erkannter Anbieter:
${vendorResult.vendor?.name || 'nicht erkannt'}

Bereits lokal erkannte Kategorie:
${categoryResult.category || 'nicht erkannt'}

PDF-TEXT:

${pdfText}
`,
            },
          ],
          temperature: 0.1,
          max_tokens: 700,
        }),
      }
    )

    const result = await response.json()

    if (!response.ok) {
      console.error('Groq PDF Fehler:', result)

      return NextResponse.json(
        {
          success: false,
          error:
            result?.error?.message ||
            'Mila konnte den PDF-Text gerade nicht analysieren.',
        },
        { status: response.status || 500 }
      )
    }

    const content =
      result?.choices?.[0]?.message?.content || '{}'

    let parsed: any

    try {
      parsed = JSON.parse(cleanJson(content))
    } catch {
      console.error(
        'PDF JSON PARSE FEHLER:',
        content
      )

      return NextResponse.json(
        {
          success: false,
          error:
            'Mila konnte das Ergebnis der PDF nicht sicher verarbeiten.',
        },
        { status: 502 }
      )
    }

    const detectedVendor =
      String(parsed.vendor || '').trim() ||
      vendorResult.vendor?.name ||
      ''

    const title =
      String(parsed.title || '').trim() ||
      detectedVendor ||
      fileName ||
      'PDF-Dokument'

    const amount = normalizeAmount(parsed.amount)
    const dueDate = normalizeDate(parsed.dueDate)

    const documentType = String(
      parsed.documentType || 'sonstiges'
    )
      .trim()
      .toLowerCase()

    const invoiceNumber = String(
      parsed.invoiceNumber || ''
    ).trim()

    const documentClassification =
      classifyDocument({
        title,
        vendor: detectedVendor,
        note: `${parsed.note || ''} ${documentType} ${pdfText.slice(
          0,
          1500
        )}`,
      })

    const classificationText = `
${title}
${detectedVendor}
${parsed.note || ''}
${documentType}
${pdfText.slice(0, 2500)}
`.toLowerCase()

const isChildcareDocument =
  classificationText.includes('kita') ||
  classificationText.includes('kindergarten') ||
  classificationText.includes('hort') ||
  classificationText.includes('betreuung') ||
  classificationText.includes('essengeld') ||
  classificationText.includes('mittagessen') ||
  classificationText.includes('schulessen') ||
  classificationText.includes('besseressen')

const keywordCategory = detectCategory(
  `
  ${title}
  ${detectedVendor}
  ${parsed.note || ''}
  ${documentType}
  ${pdfText}
  `
)

const vendorCategory = String(
  categoryResult.category || ''
)
  .trim()
  .toLowerCase()

const classifiedCategory = String(
  documentClassification.category || ''
)
  .trim()
  .toLowerCase()

const finalCategory =
  documentClassification.type === 'inkasso'
    ? 'inkasso'
    : keywordCategory !== 'sonstiges'
      ? keywordCategory
      : vendorCategory &&
          vendorCategory !== 'sonstiges'
        ? vendorCategory
        : classifiedCategory &&
            classifiedCategory !== 'sonstiges'
          ? classifiedCategory
          : 'sonstiges'

    return NextResponse.json({
      success: true,
      data: {
        title,
        vendor: detectedVendor,
        amount: amount || '',
        dueDate,
        due_date: dueDate,
        category: finalCategory,
        documentType:
          documentClassification.type ||
          documentType,
        documentMessage:
          documentClassification.message,
        documentPriority:
          documentClassification.priority,
        invoiceNumber,
        note: invoiceNumber
          ? `PDF automatisch ausgelesen 📄 · Rechnungsnummer: ${invoiceNumber}`
          : 'PDF automatisch ausgelesen 📄',
        vendorDetection: {
          name:
            vendorResult.vendor?.name || null,
          type:
            vendorResult.vendor?.type || null,
          confidence:
            vendorResult.confidence,
          method: vendorResult.method,
        },
        document: {
          title,
          partner: detectedVendor,
          amount,
          type:
            documentClassification.type ||
            documentType,
          status: 'neu',
          documentDate: new Date()
            .toISOString()
            .slice(0, 10),
          dueDate: dueDate || undefined,
          due_date: dueDate || undefined,
          fileName: file.name,
          keepUntil: new Date(
            new Date().setFullYear(
              new Date().getFullYear() + 1
            )
          )
            .toISOString()
            .slice(0, 10),
          note: invoiceNumber
            ? `Automatisch aus PDF erkannt · Rechnungsnummer: ${invoiceNumber}`
            : 'Automatisch aus PDF erkannt',
        },
      },
    })
  } catch (error: any) {
    console.error('PDF Fehler:', error)

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          'PDF konnte nicht verarbeitet werden.',
      },
      { status: 500 }
    )
  }
}