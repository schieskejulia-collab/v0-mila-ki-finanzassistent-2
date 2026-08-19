import { NextResponse } from 'next/server'
import { classifyDocument } from '@/lib/document-classifier'

export const runtime = 'nodejs'

function cleanJson(content: string) {
  return content.replace(/```json/gi, '').replace(/```/g, '').trim()
}

function normalizeAmount(value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw) return 0
  const normalized = raw
    .replace(/\s/g, '')
    .replace(/€/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '')
  const number = Number(normalized)
  return Number.isFinite(number) ? number : 0
}

function normalizeConfidence(value: unknown, fallback = 0.5) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  if (number > 1) return Math.min(number / 100, 1)
  return Math.max(0, Math.min(number, 1))
}

function normalizeDate(value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const match = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (!match) return ''
  return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`
}

function normalizeDirection(value: unknown) {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (['income', 'expense', 'neutral'].includes(normalized)) return normalized
  return 'unknown'
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

function categoryForScope(scope: string) {
  if (scope === 'health') return 'Gesundheit'
  if (scope === 'insurance') return 'Versicherungen'
  if (scope === 'employee') return 'Arbeit & Lohn'
  if (scope === 'vehicle') return 'Fahrzeug'
  if (scope === 'business') return 'Betrieb'
  return 'Unklar'
}

function alternativesForScope(scope: string) {
  if (scope === 'health') return ['Gesundheit', 'Privat', 'Anderer Kontext']
  if (scope === 'insurance') return ['Versicherung privat', 'Versicherung betrieblich', 'Anderer Kontext']
  if (scope === 'employee') return ['Arbeitnehmer-Unterlage', 'Privat', 'Anderer Kontext']
  if (scope === 'vehicle') return ['Fahrzeug betrieblich/beruflich', 'Fahrzeug privat', 'Gemischt']
  return ['Betrieblich', 'Beruflich', 'Privat', 'Gemischt']
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Scanner ist noch nicht verbunden. API-Key fehlt.' },
        { status: 500 },
      )
    }

    const body = await req.json()
    const imageBase64 = body?.imageBase64

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Kein Belegbild erhalten.' },
        { status: 400 },
      )
    }

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
        max_tokens: 1500,
        reasoning_format: 'hidden',
        reasoning_effort: 'none',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `
Du bist der Dokument-Extraktor von Mila. Du bewertest NICHT steuerlich oder rechtlich und erfindest keinen geschäftlichen Zweck.

Lies das Dokument positionsgenau und antworte ausschließlich als gültiges JSON:

{
  "amount": 0,
  "vendor": "",
  "title": "",
  "note": "",
  "documentDate": "",
  "documentType": "",
  "financialDirection": "unknown",
  "scope": "unknown",
  "paymentConfirmed": false,
  "isObligation": false,
  "dueDate": "",
  "caseNumber": "",
  "originalCreditor": "",
  "installmentAmount": 0,
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
- Erfinde nichts. Nicht lesbare Werte bleiben leer, 0 oder unknown.
- amount = sichtbarer Brutto-Endbetrag bzw. bei einer offenen Forderung der eindeutig geforderte Gesamt-/Zahlbetrag.
- documentDate = tatsächliches Beleg-/Rechnungs-/Dokumentdatum in YYYY-MM-DD. Niemals das heutige Datum ergänzen, wenn es nicht lesbar ist.
- dueDate = eindeutig genannte Fälligkeit/Zahlungsfrist in YYYY-MM-DD; sonst leer.
- documentType nur: beleg, quittung, kassenbon, rechnung, gutschrift, lohnabrechnung, versicherung, vertrag, bescheid, mahnung, inkasso, sonstiges.
- financialDirection nur: income, expense, neutral, unknown.
- Ein bezahlter Kassenbon oder eine Quittung ist expense und paymentConfirmed = true.
- Eine Rechnung allein beweist noch keinen Geldfluss: ohne erkennbaren Zahlungshinweis financialDirection = neutral.
- income nur, wenn ein tatsächlicher Einnahmen-/Zahlungseingang aus dem Dokument hervorgeht.
- paymentConfirmed nur true, wenn Zahlung/Bezahlung tatsächlich erkennbar ist.
- isObligation = true nur bei einer noch offenen Zahlungspflicht/Forderung, z. B. offene Rechnung, Mahnung, Inkasso, Zahlungsaufforderung oder Rate.
- Bei bereits bezahltem Kassenbon/Quittung ist isObligation = false.
- Ein bloßer Vertrag ohne eindeutig offene Zahlung ist nicht automatisch eine Verpflichtung.
- scope nur: business, employee, health, insurance, vehicle, household, private, mixed, unknown.
- Händlername allein beweist NICHT business/private.
- Apotheke/Medikamente dürfen als health erkannt werden; das sagt nichts über steuerliche Relevanz aus.
- Versicherungsdokumente dürfen als insurance erkannt werden; privat/betrieblich nur, wenn das Dokument es wirklich hergibt.
- Bei Baumarkt, Supermarkt, Elektronik, Kleidung usw. nicht pauschal einen Zweck annehmen.

WICHTIG ZU POSITIONEN:
- lineItems enthält jede einzeln erkennbare Waren-/Leistungsposition, nicht nur den Gesamtbetrag.
- Verschiedene Artikel nicht zu einer Position zusammenfassen.
- Bei einem Mischbon darf jede Position einen anderen scope haben.
- businessPurpose nur füllen, wenn ein konkreter Zweck tatsächlich auf dem Dokument steht.
- relevance bedeutet nur Relevanz für einen ausdrücklich belegten Kontext, NICHT steuerliche Absetzbarkeit.
- relevance = include nur bei eindeutig dokumentiertem Zusammenhang.
- relevance = exclude nur bei eindeutig dokumentiertem privaten Zusammenhang.
- Sonst relevance = needs_context.
- needsConfirmation = true, sobald Zweck, Zuordnung oder mindestens eine Position Kontext braucht.

Keine Mahn-, Inkasso-, Steuer- oder Rechtsentscheidung ausführen. Nur Tatsachen extrahieren.
`,
              },
              {
                type: 'image_url',
                image_url: { url: imageBase64 },
              },
            ],
          },
        ],
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      console.error('Groq scan error:', data)
      return NextResponse.json(
        { success: false, error: 'Mila konnte den Beleg gerade nicht lesen.' },
        { status: response.status || 500 },
      )
    }

    const content = data?.choices?.[0]?.message?.content || '{}'
    let parsed: any
    try {
      parsed = JSON.parse(cleanJson(content))
    } catch {
      console.error('Mila scan JSON parse error:', content)
      return NextResponse.json(
        { success: false, error: 'Mila konnte die Belegdaten nicht sicher erkennen.' },
        { status: 422 },
      )
    }

    const vendor = String(parsed.vendor || '').trim()
    const title = String(parsed.title || (vendor ? `Beleg von ${vendor}` : 'Beleg')).trim()
    const note = String(parsed.note || '').trim()
    const amount = normalizeAmount(parsed.amount)
    const documentDate = normalizeDate(parsed.documentDate)
    const dueDate = normalizeDate(parsed.dueDate || parsed.due_date)
    const caseNumber = String(parsed.caseNumber || '').trim()
    const originalCreditor = String(parsed.originalCreditor || '').trim()
    const installmentAmount = normalizeAmount(parsed.installmentAmount)
    const financialDirection = normalizeDirection(parsed.financialDirection)
    const scope = normalizeScope(parsed.scope)
    const confidence = normalizeConfidence(parsed.confidence, 0.55)
    const paymentConfirmed = Boolean(parsed.paymentConfirmed)
    const isObligation = Boolean(parsed.isObligation)

    const rawItems = Array.isArray(parsed.lineItems) ? parsed.lineItems : []
    const lineItems = rawItems
      .map((item: any) => ({
        description: String(item?.description || '').trim(),
        amount: normalizeAmount(item?.amount),
        quantity: normalizeAmount(item?.quantity),
        scope: normalizeScope(item?.scope),
        businessPurpose: String(item?.businessPurpose || '').trim(),
        relevance: ['include', 'exclude', 'needs_context'].includes(String(item?.relevance || '').toLowerCase())
          ? String(item.relevance).toLowerCase()
          : 'needs_context',
        confidence: normalizeConfidence(item?.confidence, 0.5),
      }))
      .filter((item: any) => item.description || item.amount > 0)

    const documentClassification = classifyDocument({ title, vendor, note })
    const detectedType = String(parsed.documentType || '').trim().toLowerCase()
    const documentType = documentClassification.type === 'inkasso'
      ? 'inkasso'
      : detectedType || documentClassification.type || 'beleg'

    const itemNeedsContext = lineItems.some((item: any) => item.relevance === 'needs_context')
    const needsConfirmation =
      Boolean(parsed.needsConfirmation) ||
      itemNeedsContext ||
      (financialDirection === 'expense' && scope === 'unknown') ||
      ((financialDirection === 'expense' || financialDirection === 'income') && (!amount || !documentDate))

    const suggestedCategory = categoryForScope(scope)
    const reviewReason = needsConfirmation
      ? lineItems.length > 0 && itemNeedsContext
        ? 'Mindestens eine Position braucht noch einen konkreten Verwendungs-Kontext. Mila rät nicht anhand des Händlers.'
        : 'Mindestens eine für die Zuordnung wichtige Angabe ist nicht sicher genug erkennbar.'
      : 'Dokumentart und sichtbarer Kontext konnten strukturiert erfasst werden.'

    const document = {
      title,
      partner: vendor,
      amount,
      type: documentType,
      status: 'neu',
      // Kein Fallback auf das heutige Datum: unbekannt bleibt unbekannt.
      documentDate: documentDate || undefined,
      dueDate: dueDate || undefined,
      fileName: title,
      caseNumber,
      originalCreditor,
      installmentAmount,
      note: note || 'Automatisch von Mila aus Belegscan erstellt 📸',
    }

    return NextResponse.json({
      success: true,
      data: {
        amount,
        vendor,
        title,
        note,
        documentDate,
        dueDate,
        caseNumber,
        originalCreditor,
        installmentAmount,
        documentType,
        financialDirection,
        scope,
        paymentConfirmed,
        isObligation,
        lineItems,
        category: suggestedCategory,
        suggestedCategory,
        alternatives: alternativesForScope(scope),
        confidence,
        needsConfirmation,
        needsReview: needsConfirmation,
        reviewReason,
        taxHint: 'Mila sortiert und prüft Nachweise organisatorisch. Eine steuerliche Bewertung erfolgt hier nicht.',
        document,
      },
    })
  } catch (error) {
    console.error('Scan Fehler:', error)
    return NextResponse.json(
      { success: false, error: 'Serverfehler beim Belegscan.' },
      { status: 500 },
    )
  }
}
