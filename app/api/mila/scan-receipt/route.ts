import { NextResponse } from 'next/server'
import { classifyReceipt } from '@/lib/receipt-rules'
import { classifyDocument } from '@/lib/document-classifier'
import { detectCategory } from '@/lib/categories'

function cleanJson(content: string) {
  return content
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim()
}

function normalizeAmount(value: unknown) {
  const normalized = String(value ?? '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '')

  const number = Number(normalized)

  return Number.isFinite(number) ? number : 0
}

function normalizeConfidence(value: unknown, fallback = 0.5) {
  const number = Number(value)

  if (!Number.isFinite(number)) {
    return fallback
  }

  if (number > 1) {
    return Math.min(number / 100, 1)
  }

  return Math.max(0, Math.min(number, 1))
}

function getAlternatives(category: string) {
  const normalizedCategory = category.toLowerCase()

  if (normalizedCategory.includes('bewirtung')) {
    return [
      'Privat / Nicht absetzbar',
      'Bewirtung',
      'Reisen & Unterkünfte',
    ]
  }

  if (
    normalizedCategory.includes('geschenk') ||
    normalizedCategory.includes('aufmerksamkeit')
  ) {
    return [
      'Privat / Nicht absetzbar',
      'Geschenke & Aufmerksamkeiten',
      'Sonstiges',
    ]
  }

  if (
    normalizedCategory.includes('reise') ||
    normalizedCategory.includes('fahrt')
  ) {
    return [
      'Privat / Nicht absetzbar',
      'Reisen & Unterkünfte',
      'Fahrtkosten',
    ]
  }

  if (
    normalizedCategory.includes('arbeitsmittel') ||
    normalizedCategory.includes('bürobedarf') ||
    normalizedCategory.includes('elektronik')
  ) {
    return [
      'Privat / Nicht absetzbar',
      'Arbeitsmittel',
      'Bürobedarf',
    ]
  }

  if (
    normalizedCategory.includes('kleidung') ||
    normalizedCategory.includes('bekleidung')
  ) {
    return [
      'Privat / Nicht absetzbar',
      'Arbeitskleidung',
      'Sonstiges',
    ]
  }

  return [
    'Privat / Nicht absetzbar',
    category || 'Sonstiges',
    'Sonstiges',
  ]
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GROQ_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Scanner ist noch nicht verbunden. API-Key fehlt.',
        },
        { status: 500 }
      )
    }

    const body = await req.json()
    const imageBase64 = body?.imageBase64

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Kein Belegbild erhalten.',
        },
        { status: 400 }
      )
    }

    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen/qwen3.6-27b',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `
Analysiere dieses deutsche Finanzdokument oder diesen Beleg.

Antworte ausschließlich mit gültigem JSON in genau dieser Struktur:

{
  "amount": 0,
  "vendor": "",
  "title": "",
  "note": "",
  "suggestedCategory": "",
  "documentType": "",
  "isObligation": false,
  "dueDate": "",
  "caseNumber": "",
  "originalCreditor": "",
  "installmentAmount": 0
}

Allgemeine Regeln:

- amount ist der Brutto-Endbetrag oder die geforderte Gesamtsumme.
- vendor ist Händler, Anbieter, Gläubiger, Inkasso oder Absender.
- title ist kurz und verständlich.
- Verwende für title möglichst den Händler oder den erkennbaren Zweck.
- Beispiele für title:
  "Einkauf bei Deichmann"
  "Porto Deutsche Post"
  "Rechnung Vodafone"
  "Forderung Klarna"
- note enthält nur Informationen, die tatsächlich auf dem Dokument erkennbar sind.
- Erfinde keine Werte.
- Ist ein Wert nicht erkennbar, nutze bei Textfeldern "" und bei Zahlen 0.

Dokumenttypen:

documentType darf nur einer dieser Werte sein:

- "beleg"
- "rechnung"
- "mahnung"
- "inkasso"
- "vertrag"
- "bescheid"
- "sonstiges"

Regeln für Zahlungsfristen:

- dueDate ist das Zahlungsziel, "zahlen bis", "fällig am" oder "1. Rate bis".
- dueDate immer im Format YYYY-MM-DD ausgeben.
- Wenn kein eindeutiges Fälligkeitsdatum erkennbar ist, dueDate = "".

Regeln für Verpflichtungen:

- isObligation ist true bei:
  Rechnung mit offener Zahlung,
  Mahnung,
  Inkasso,
  Forderung,
  Ratenzahlung,
  Vertrag mit Zahlungspflicht,
  Zahlungsaufforderung.
- Ein normaler bereits bezahlter Kassenbon ist keine Verpflichtung.

Regeln für Inkasso und Forderungen:

- Wenn Wörter wie Inkasso, Forderung, Gläubiger, Aktenzeichen,
  Mahnung, Ratenzahlung oder Vollstreckung vorkommen,
  prüfe besonders sorgfältig auf eine Verpflichtung.
- Bei einer eindeutigen Inkasso-Forderung gilt:
  documentType = "inkasso"
  suggestedCategory = "inkasso"
  isObligation = true
- Inkasso darf niemals als "sonstiges" eingeordnet werden.
- originalCreditor ist der ursprüngliche Gläubiger oder Anbieter,
  zum Beispiel Klarna, Vodafone oder PayPal.
- caseNumber ist das eindeutige Aktenzeichen, die Kundennummer,
  Vertragsnummer oder Rechnungsnummer.
- installmentAmount ist die angebotene oder geforderte Rate.
- Wenn keine Rate genannt wird, installmentAmount = 0.

Regeln für Kategorien:

- suggestedCategory ist nur eine vorsichtige Vermutung.
- Der Händler allein reicht nicht für eine sichere steuerliche Kategorie.
- Erfinde keinen geschäftlichen Zweck.
- Bei Restaurants, Kleidung, Elektronik, Geschenken,
  Reisen, Tickets oder allgemeinen Einkäufen darf nicht automatisch
  von einer geschäftlichen Ausgabe ausgegangen werden.
- Wenn der tatsächliche Verwendungszweck nicht eindeutig
  aus dem Dokument hervorgeht, suggestedCategory = "unklar".
- Ein Restaurantbeleg ist nicht automatisch Bewirtung.
- Normale Kleidung ist nicht automatisch Arbeitskleidung.
- Ein Geschenk ist nicht automatisch geschäftlich.
- Ein Ticket ist nicht automatisch eine Dienstreise.
- Ein Elektronikkauf ist nicht automatisch ein Arbeitsmittel.

Antworte nur mit JSON und ohne zusätzliche Erklärung.
`,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageBase64,
                  },
                },
              ],
            },
          ],
          temperature: 0.1,
max_tokens: 450,
reasoning_format: 'hidden',
reasoning_effort: 'none',
response_format: {
  type: 'json_object',
},
        }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error('Groq Fehler:', data)

      return NextResponse.json(
        {
          success: false,
          error: 'Mila konnte den Beleg gerade nicht lesen.',
        },
        { status: 500 }
      )
    }

    const content =
      data?.choices?.[0]?.message?.content || '{}'

    const cleanedContent = cleanJson(content)

    let parsed: any

    try {
      parsed = JSON.parse(cleanedContent)
    } catch {
      console.error('JSON PARSE FEHLER:', content)

      return NextResponse.json(
        {
          success: false,
          error: 'Mila konnte die Belegdaten nicht sicher erkennen.',
        },
        { status: 422 }
      )
    }

    const vendor = String(parsed.vendor || '').trim()

    const title = String(
      parsed.title ||
        (vendor ? `Beleg von ${vendor}` : 'Beleg')
    ).trim()

    const note = String(parsed.note || '').trim()
    const amount = normalizeAmount(parsed.amount)

    const dueDate = String(
      parsed.dueDate ||
        parsed.due_date ||
        ''
    ).trim()

    const caseNumber = String(
      parsed.caseNumber || ''
    ).trim()

    const originalCreditor = String(
      parsed.originalCreditor || ''
    ).trim()

    const installmentAmount = normalizeAmount(
      parsed.installmentAmount
    )

    const aiSuggestedCategory = String(
      parsed.suggestedCategory ||
        parsed.category ||
        ''
    ).trim()

    console.log('MILA SCAN RESULT:', parsed)

    const classification = classifyReceipt({
      title,
      vendor,
      amount,
      note,
    })

    const documentClassification = classifyDocument({
      title,
      vendor,
      note,
    })

    const completeText = `
      ${title}
      ${vendor}
      ${note}
      ${aiSuggestedCategory}
    `

    const detectedCategory =
      detectCategory(completeText) || ''

    const ruleCategory = String(
      classification.category || ''
    ).trim()

    const keywordCategory = String(
      detectedCategory || ''
    ).trim()

    const isInkasso =
      documentClassification.type === 'inkasso' ||
      String(parsed.documentType || '').toLowerCase() ===
        'inkasso' ||
      aiSuggestedCategory.toLowerCase() === 'inkasso'

    const categoryCandidates = [
      ruleCategory,
      keywordCategory,
      aiSuggestedCategory,
    ].filter(
      (category) =>
        category &&
        category.toLowerCase() !== 'sonstiges' &&
        category.toLowerCase() !== 'unklar'
    )

    const suggestedCategory =
      categoryCandidates[0] ||
      aiSuggestedCategory ||
      'Sonstiges'

    const ambiguousCategories = [
      'bewirtung',
      'geschenke',
      'geschenke & aufmerksamkeiten',
      'aufmerksamkeiten',
      'reisen',
      'reisen & unterkünfte',
      'fahrtkosten',
      'arbeitsmittel',
      'bürobedarf',
      'elektronik',
      'kleidung',
      'arbeitskleidung',
      'sonstiges',
      'unklar',
    ]

    const normalizedSuggestedCategory =
      suggestedCategory.toLowerCase()

    const categoryIsAmbiguous =
      ambiguousCategories.some((category) =>
        normalizedSuggestedCategory.includes(category)
      )

    const hasClearBusinessContext =
      /\b(kunde|kundin|kundentermin|geschäftlich|betrieblich|projekt|auftrag|büro|versand|porto|hosting|domain|software|abonnement|geschäftsreise|dienstreise)\b/i.test(
        `${title} ${vendor} ${note}`
      )

    const aiWasUnsure =
      !aiSuggestedCategory ||
      aiSuggestedCategory.toLowerCase() === 'unklar' ||
      aiSuggestedCategory.toLowerCase() === 'sonstiges'

    const needsConfirmation =
      !isInkasso &&
      (
        categoryIsAmbiguous ||
        aiWasUnsure ||
        !hasClearBusinessContext
      )

    const finalCategory = isInkasso
      ? 'inkasso'
      : needsConfirmation
        ? 'Unklar'
        : suggestedCategory

    const reviewReason = isInkasso
      ? ''
      : needsConfirmation
        ? suggestedCategory &&
          suggestedCategory.toLowerCase() !== 'unklar'
          ? `Ich habe „${suggestedCategory}“ als Möglichkeit erkannt. Der tatsächliche Verwendungszweck ist auf dem Beleg aber nicht eindeutig.`
          : 'Der tatsächliche Verwendungszweck ist auf dem Beleg nicht eindeutig erkennbar.'
        : 'Die sichtbaren Angaben sprechen relativ eindeutig für diese Kategorie.'

    const alternatives = isInkasso
      ? ['inkasso']
      : getAlternatives(suggestedCategory)

    const originalConfidence =
      normalizeConfidence(
        classification.confidence,
        needsConfirmation ? 0.55 : 0.85
      )

    const confidence = needsConfirmation
      ? Math.min(originalConfidence, 0.69)
      : originalConfidence

    const documentType = isInkasso
      ? 'inkasso'
      : documentClassification.type ||
        parsed.documentType ||
        'beleg'

    const document = {
      title,
      partner: vendor,
      amount,
      type: documentType,
      status: 'neu',
      documentDate: new Date()
        .toISOString()
        .slice(0, 10),
      dueDate,
      fileName: title,
      keepUntil: new Date(
        new Date().setFullYear(
          new Date().getFullYear() + 1
        )
      )
        .toISOString()
        .slice(0, 10),
      caseNumber,
      originalCreditor,
      installmentAmount,
      note:
        note ||
        'Automatisch von Mila aus Belegscan erstellt 📸',
    }

    console.log(
      'Regel-Kategorie:',
      classification.category
    )
    console.log(
      'Keyword-Kategorie:',
      detectedCategory
    )
    console.log(
      'KI-Vermutung:',
      aiSuggestedCategory
    )
    console.log(
      'Vorgeschlagene Kategorie:',
      suggestedCategory
    )
    console.log(
      'Finale Kategorie:',
      finalCategory
    )
    console.log(
      'Rückfrage notwendig:',
      needsConfirmation
    )

    return NextResponse.json({
      success: true,
      data: {
        amount,
        vendor,
        title,
        note,
        dueDate,
        caseNumber,
        originalCreditor,
        installmentAmount,

        category: finalCategory,
        suggestedCategory,
        alternatives,

        documentType,
        isObligation:
          isInkasso ||
          Boolean(parsed.isObligation),

        taxHint: isInkasso
          ? 'Private Verpflichtung – steuerliche Relevanz bitte gesondert prüfen.'
          : needsConfirmation
            ? 'Noch nicht sicher beurteilbar – abhängig vom tatsächlichen Verwendungszweck.'
            : classification.taxHint,

        confidence,
        needsConfirmation,
        needsReview:
          needsConfirmation ||
          Boolean(classification.needsReview),

        reviewReason,
        document,
      },
    })
  } catch (error) {
    console.error('Scan Fehler:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Serverfehler beim Belegscan.',
      },
      { status: 500 }
    )
  }
}