import { NextResponse } from 'next/server'
import { detectCategory } from '@/lib/categories'
import { MERCHANTS } from '@/lib/merchants'
import { merchantMemory } from '@/lib/merchant-memory'
function cleanJson(content: string) {
  return content
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim()
}

function inferCategory(text: string) {
  const value = text.toLowerCase()

  if (/kita|kindergarten|hort|schule|nordspatzen|kindertagesstätte|kindertagesstaette/.test(value)) {
    return 'privat'
  }

  if (/mahnung|bescheid|hansestadt|stadt|landkreis|amt|behörde|behoerde|verwaltungsgebühr|verwaltungsgebuehr/.test(value)) {
    return 'steuern'
  }

  if (/dhl|dpd|hermes|gls|ups|porto|versand|post/.test(value)) {
    return 'versand'
  }

  if (/aral|shell|esso|total|avia|tankstelle|benzin|diesel|tanken/.test(value)) {
    return 'fahrzeug'
  }

  if (/hetzner|hosting|server|canva|figma|adobe|openai|chatgpt|notion|software|app|tool|saas/.test(value)) {
    return 'software'
  }

  if (/vodafone|telekom|o2|telefon|internet|mobilfunk/.test(value)) {
    return 'telefon'
  }

  if (/restaurant|cafe|café|essen|bewirtung|lunch|dinner/.test(value)) {
    return 'bewirtung'
  }

if (
  value.includes('fahrtticket') ||
  value.includes('fahrticket') ||
  value.includes('fahrkarte') ||
  value.includes('ticket') ||
  value.includes('dticket') ||
  value.includes('d-ticket') ||
  value.includes('deutschlandticket') ||
  value.includes('d tarif') ||
  value.includes('d-tarif') ||
  value.includes('nahverkehr') ||
  value.includes('bus') ||
  value.includes('tram') ||
  value.includes('bahn') ||
  value.includes('db') ||
  value.includes('zug') ||
  value.includes('verkehr') ||
  value.includes('öpnv') ||
  value.includes('oepnv') ||
  value.includes('ice') ||
  value.includes('ic') ||
  value.includes('ec')
) {
  return 'reisen'
}

  if (/hotel|bahn|db|flug|reise|airbnb|booking/.test(value)) {
    return 'reisen'
  }

  if (/kurs|coaching|seminar|workshop|weiterbildung|fortbildung/.test(value)) {
    return 'weiterbildung'
  }

  if (/instagram|meta|facebook|google ads|werbung|marketing/.test(value)) {
    return 'marketing'
  }

  if (/büro|buero|papier|stift|drucker|toner/.test(value)) {
    return 'buerobedarf'
  }

  if (/bank|gebühr|gebuehr|konto|paypal|stripe/.test(value)) {
    return 'bank'
  }

  return 'sonstiges'
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
let smartCategory: string | null = null

// Nanu-Nana
if (normalizedVendor.includes('nanu')) {
  if (/(spiel|spielzeug|spielwaren|lego|puzzle|kuscheltier)/i.test(title)) {
    smartCategory = 'geschenke'
  } else if (/(kerze|vase|deko|dekoration|bilderrahmen)/i.test(title)) {
    smartCategory = 'dekoration'
  } else if (/(geschenk|gutschein|präsent|aufmerksamkeit|accessoire|accessoires)/i.test(title)) {
    smartCategory = 'geschenke'
  }
}
const category =
  smartCategory ||
  rememberedMerchant?.category ||
  merchantEntry?.[1]?.category ||
  detectCategory(combinedText)

const taxHint =
  rememberedMerchant?.taxHint ||
  merchantEntry?.[1]?.taxHint ||
  'unknown'
const confidence =
  merchantEntry
    ? 'high'
    : category !== 'sonstiges'
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