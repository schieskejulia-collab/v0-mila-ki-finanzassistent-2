import { NextResponse } from 'next/server'
import { classifyReceipt } from '@/lib/receipt-rules'
function cleanJson(content: string) {
  return content
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim()
}

const classification = classifyReceipt({
  title,
  vendor,
  amount,
  note: parsed.note || '',
})

const category = classification.category
const taxHint = classification.taxHint
const confidence = classification.confidence
      return NextResponse.json(
        {
          success: false,
          error: 'Scanner ist noch nicht verbunden. API-Key fehlt.',
        },
        { status: 500 }
      )
    }

    const { imageBase64 } = await req.json()

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
  "category": string,
  "taxHint": string,
  "confidence": string
}

WICHTIG FÜR amount:
- amount ist IMMER der Brutto-Endbetrag, also der tatsächlich bezahlte Gesamtbetrag.
- Suche nach Begriffen wie: Gesamt, Summe, Zu zahlen, Endbetrag, Brutto, Kartenzahlung, EC, Total.
- Verwende NIEMALS Netto, MwSt, Steuer, VAT, Tax, Rabatt, Rückgeld oder Wechselgeld.
- Wenn ein Netto-Betrag und ein Brutto-Betrag vorhanden sind, nimm IMMER den höheren Brutto-Endbetrag.
- Beispiel: Wenn 4,87 und 5,80 vorkommen, ist amount 5.80.
- Wenn mehrere Beträge vorhanden sind, wähle den höchsten plausiblen tatsächlich bezahlten Endbetrag.

vendor ist der Händlername.
title ist eine kurze Beschreibung des Einkaufs.
Antwort nur als JSON, ohne Erklärung.
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
          max_tokens: 300,
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

    const content = data?.choices?.[0]?.message?.content || '{}'
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
    const title = String(parsed.title || vendor || 'Beleg').trim()
    const amount = normalizeAmount(parsed.amount)
    const combinedText = `${title} ${vendor}`
const normalizedVendor = vendor.toLowerCase()

const matchedRule = RECEIPT_RULES.find((rule) => {
  const merchantMatch = rule.merchantIncludes.some((merchant) =>
    normalizedVendor.includes(merchant.toLowerCase())
  )

  const titleMatch = rule.titleIncludes.some((keyword) =>
    title.toLowerCase().includes(keyword.toLowerCase())
  )

  return merchantMatch && titleMatch
})

const rememberedMerchant = merchantMemory.find((entry) =>
  normalizedVendor.includes(entry.merchant.toLowerCase())
)
const merchantEntry = Object.entries(MERCHANTS).find(
  ([merchantName, merchant]) => {
    const aliases = merchant.aliases || [merchantName]

    return aliases.some((alias) =>
      normalizedVendor.includes(alias.toLowerCase())
    )
  }
)
const smartCategory = matchedRule?.category ?? null


const detectedCategory = inferCategory(combinedText)

const category =
  smartCategory ||
  rememberedMerchant?.category ||
  merchantEntry?.[1]?.category ||
  detectedCategory
const taxHint =
  matchedRule?.taxHint ||
  rememberedMerchant?.taxHint ||
  merchantEntry?.[1]?.taxHint ||
  'unknown'
const confidence =
  smartCategory || rememberedMerchant || merchantEntry
    ? 'high'
    : detectedCategory !== 'sonstiges'
      ? 'medium'
      : 'low'
    return NextResponse.json({
      success: true,
      data: {
        data: {
  amount,
  vendor,
  title,
  category,
  taxHint,
  confidence,
}
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