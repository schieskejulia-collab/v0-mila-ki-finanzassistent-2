import { NextResponse } from 'next/server'
import { extractText, getDocumentProxy } from 'unpdf'
import { classifyDocument } from '@/lib/document-classifier'
import { detectVendor } from '@/lib/mila-vendor-detection'

export const runtime = 'nodejs'

function cleanJson(content: string) {
  return content.replace(/```json/gi, '').replace(/```/g, '').trim()
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
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw

  const germanDate = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (germanDate) {
    const [, day, month, year] = germanDate
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  return ''
}

function normalizeConfidence(value: unknown, fallback = 0.5) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return number > 1
    ? Math.max(0, Math.min(number / 100, 1))
    : Math.max(0, Math.min(number, 1))
}

function normalizeDirection(value: unknown) {
  const normalized = String(value ?? '').trim().toLowerCase()
  return ['income', 'expense', 'neutral'].includes(normalized) ? normalized : 'unknown'
}

function normalizeScope(value: unknown) {
  const normalized = String(value ?? '').trim().toLowerCase()
  const allowed = [
    'business',
    'employee',
    'health',
    'insurance',
    'vehicle',
    'household',
    'private',
    'mixed',
    'unknown',
  ]
  return allowed.includes(normalized) ? normalized : 'unknown'
}

function limitText(text: string, maxLength = 30000) {
  return text
    .replace(/\u0000/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxLength)
}

function normalizeLineItems(value: unknown) {
  if (!Array.isArray(value)) return []

  return value
    .slice(0, 80)
    .map((item: any) => ({
      description: String(item?.description || '').trim(),
      amount: normalizeAmount(item?.amount),
      quantity: normalizeAmount(item?.quantity),
      scope: normalizeScope(item?.scope),
      businessPurpose: String(item?.businessPurpose || '').trim(),
      relevance: ['include', 'exclude', 'needs_context'].includes(
        String(item?.relevance || '').trim().toLowerCase(),
      )
        ? String(item.relevance).trim().toLowerCase()
        : 'needs_context',
      confidence: normalizeConfidence(item?.confidence, 0.5),
    }))
    .filter((item) => item.description || item.amount > 0)
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'PDF-Scanner ist noch nicht verbunden. API-Key fehlt.' },
        { status: 500 },
      )
    }

    const formData = await req.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'Keine Datei erhalten.' },
        { status: 400 },
      )
    }

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { success: false, error: 'Bitte eine PDF hochladen.' },
        { status: 400 },
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    if (arrayBuffer.byteLength === 0) {
      return NextResponse.json({ success: false, error: 'Die PDF ist leer.' }, { status: 400 })
    }

    if (arrayBuffer.byteLength > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'Die PDF ist größer als 10 MB. Bitte eine kleinere Datei verwenden.' },
        { status: 413 },
      )
    }

    const fileName = file.name.replace(/\.pdf$/i, '')
    const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer))
    const extracted = await extractText(pdf, { mergePages: true })
    const pdfText = limitText(
      Array.isArray(extracted.text)
        ? extracted.text.join('\n')
        : String(extracted.text || ''),
    )

    if (pdfText.length < 20) {
      return NextResponse.json(
        {
          success: false,
          error: 'In dieser PDF wurde kein lesbarer Text gefunden. Wahrscheinlich ist sie nur eingescannt. Bitte nutze einen Screenshot oder fotografiere das Dokument.',
        },
        { status: 422 },
      )
    }

    const vendorResult = detectVendor(pdfText)

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen/qwen3.6-27b',
        response_format: { type: 'json_object' },
        temperature: 0.05,
        max_tokens: 1800,
        reasoning_format: 'hidden',
        reasoning_effort: 'none',
        messages: [
          {
            role: 'system',
            content: `Du bist der Dokument-Extraktor von Mila. Extrahiere nur belegbare Tatsachen. Triff keine steuerliche oder rechtliche Entscheidung und erfinde keinen geschäftlichen Zweck. Antworte ausschließlich als gültiges JSON.`,
          },
          {
            role: 'user',
            content: `
Analysiere den folgenden Text einer deutschsprachigen PDF.

Gib genau diese JSON-Struktur zurück:
{
  "title": "",
  "vendor": "",
  "amount": 0,
  "documentDate": "",
  "dueDate": "",
  "documentType": "sonstiges",
  "financialDirection": "unknown",
  "scope": "unknown",
  "paymentConfirmed": false,
  "isObligation": false,
  "invoiceNumber": "",
  "caseNumber": "",
  "originalCreditor": "",
  "installmentAmount": 0,
  "note": "",
  "confidence": 0,
  "needsConfirmation": true,
  "lineItems": [
    {
      "description": "",
      "amount": 0,
      "quantity": 0,
      "scope": "unknown",
      "businessPurpose": "",
      "relevance": "needs_context",
      "confidence": 0
    }
  ]
}

Regeln:
- Erfinde nichts. Nicht sicher erkennbare Werte bleiben leer, 0 oder unknown.
- amount = sichtbarer Gesamt-/Zahlbetrag des Dokuments, nicht irgendeine Zwischensumme.
- documentDate = tatsächliches Beleg-, Rechnungs- oder Dokumentdatum in YYYY-MM-DD. Niemals heutiges Datum erfinden.
- dueDate = eindeutige Fälligkeit/Zahlungsfrist in YYYY-MM-DD, sonst leer.
- documentType nur: beleg, quittung, kassenbon, rechnung, gutschrift, lohnabrechnung, versicherung, vertrag, bescheid, mahnung, inkasso, sonstiges.
- financialDirection nur: income, expense, neutral, unknown.
- Eine Rechnung allein ist KEIN bewiesener Geldfluss: ohne Zahlungsbeleg financialDirection = neutral.
- income nur bei tatsächlich belegtem Zahlungseingang/Gutschrift auf ein Konto oder ausdrücklich erhaltenem Betrag.
- expense nur bei tatsächlich belegter Zahlung oder eindeutig bezahltem Beleg/Quittung/Kassenbon.
- paymentConfirmed = true nur wenn Zahlung/Bezahlung tatsächlich aus dem Text hervorgeht.
- isObligation = true bei einer noch offenen Forderung/Zahlungspflicht; ein bereits bezahlter Bon ist keine offene Verpflichtung.
- scope nur: business, employee, health, insurance, vehicle, household, private, mixed, unknown.
- Händler/Absender allein beweist weder business noch private. Bei Zweifel unknown.
- Apotheke/medizinische Unterlagen dürfen health sein; das ist KEINE steuerliche Bewertung.
- Versicherungsunterlagen dürfen insurance sein; privat/betrieblich nur bei ausdrücklichem Beleg.
- lineItems: einzelne klar erkennbare Waren-/Leistungspositionen getrennt ausgeben. Nicht zu Sammelpositionen zusammenfassen.
- Bei Mischbelegen darf jede Position einen anderen scope haben.
- relevance nur include/exclude, wenn der Kontext ausdrücklich belegt ist; sonst needs_context.
- confidence zwischen 0 und 1.

Lokal erkannter möglicher Absender: ${vendorResult.vendor?.name || 'nicht erkannt'}

PDF-TEXT:
${pdfText}
`,
          },
        ],
      }),
    })

    const result = await response.json()
    if (!response.ok) {
      console.error('Groq PDF Fehler:', result)
      return NextResponse.json(
        {
          success: false,
          error: result?.error?.message || 'Mila konnte den PDF-Text gerade nicht analysieren.',
        },
        { status: response.status || 500 },
      )
    }

    const content = result?.choices?.[0]?.message?.content || '{}'
    let parsed: any

    try {
      parsed = JSON.parse(cleanJson(content))
    } catch {
      console.error('PDF JSON PARSE FEHLER:', content)
      return NextResponse.json(
        { success: false, error: 'Mila konnte das Ergebnis der PDF nicht sicher verarbeiten.' },
        { status: 502 },
      )
    }

    const detectedVendor =
      String(parsed.vendor || '').trim() || vendorResult.vendor?.name || ''
    const title =
      String(parsed.title || '').trim() || detectedVendor || fileName || 'PDF-Dokument'
    const amount = normalizeAmount(parsed.amount)
    const documentDate = normalizeDate(parsed.documentDate)
    const dueDate = normalizeDate(parsed.dueDate)
    const rawDocumentType = String(parsed.documentType || 'sonstiges').trim().toLowerCase()
    const financialDirection = normalizeDirection(parsed.financialDirection)
    const scope = normalizeScope(parsed.scope)
    const paymentConfirmed = Boolean(parsed.paymentConfirmed)
    const isObligation = Boolean(parsed.isObligation)
    const invoiceNumber = String(parsed.invoiceNumber || '').trim()
    const caseNumber = String(parsed.caseNumber || '').trim()
    const originalCreditor = String(parsed.originalCreditor || '').trim()
    const installmentAmount = normalizeAmount(parsed.installmentAmount)
    const lineItems = normalizeLineItems(parsed.lineItems)
    const confidence = normalizeConfidence(parsed.confidence, 0.55)

    const documentClassification = classifyDocument({
      title,
      vendor: detectedVendor,
      note: `${parsed.note || ''} ${rawDocumentType} ${pdfText.slice(0, 1500)}`,
    })

    const documentType =
      documentClassification.type && documentClassification.type !== 'sonstiges'
        ? documentClassification.type
        : rawDocumentType

    const needsConfirmation =
      Boolean(parsed.needsConfirmation) ||
      confidence < 0.7 ||
      (financialDirection === 'expense' && scope === 'unknown') ||
      ((financialDirection === 'expense' || financialDirection === 'income') && (!amount || !documentDate))

    const note = String(parsed.note || '').trim()
    const category = documentType === 'inkasso' ? 'inkasso' : 'Unklar'

    return NextResponse.json({
      success: true,
      data: {
        title,
        vendor: detectedVendor,
        amount: amount || '',
        documentDate,
        dueDate,
        due_date: dueDate,
        category,
        suggestedCategory: category,
        documentType,
        financialDirection,
        scope,
        paymentConfirmed,
        isObligation,
        invoiceNumber,
        caseNumber,
        originalCreditor,
        installmentAmount,
        confidence,
        needsConfirmation,
        lineItems,
        note: [
          'PDF automatisch ausgelesen 📄',
          invoiceNumber ? `Rechnungsnummer: ${invoiceNumber}` : '',
          note,
        ].filter(Boolean).join(' · '),
        documentMessage: documentClassification.message,
        documentPriority: documentClassification.priority,
        vendorDetection: {
          name: vendorResult.vendor?.name || null,
          type: vendorResult.vendor?.type || null,
          confidence: vendorResult.confidence,
          method: vendorResult.method,
        },
        document: {
          title,
          partner: detectedVendor,
          amount,
          type: documentType,
          status: 'neu',
          documentDate: documentDate || undefined,
          dueDate: dueDate || undefined,
          due_date: dueDate || undefined,
          fileName: file.name,
          keepUntil: new Date(
            new Date().setFullYear(new Date().getFullYear() + 1),
          ).toISOString().slice(0, 10),
          note: [
            'Automatisch aus PDF erkannt',
            invoiceNumber ? `Rechnungsnummer: ${invoiceNumber}` : '',
          ].filter(Boolean).join(' · '),
        },
      },
    })
  } catch (error: any) {
    console.error('PDF Fehler:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'PDF konnte nicht verarbeitet werden.',
      },
      { status: 500 },
    )
  }
}
