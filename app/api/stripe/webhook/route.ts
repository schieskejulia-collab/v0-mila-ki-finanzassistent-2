export const runtime = 'nodejs[span_0](start_span)'[span_0](end_span)
export const dynamic = 'force-dynamic[span_1](start_span)'[span_1](end_span)

import { NextResponse } from 'next/server[span_2](start_span)'[span_2](end_span)
import crypto from 'node:crypto[span_3](start_span)'[span_3](end_span)

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim()[span_4](start_span)[span_4](end_span)

function parseStripeSignature(signature: string) {[span_5](start_span)[span_5](end_span)
  return signature.split(',').reduce([span_6](start_span)[span_6](end_span)
    (result, part) => {[span_7](start_span)[span_7](end_span)
      const [key, value] = part.split('=')[span_8](start_span)[span_8](end_span)

      if (key === 't') result.timestamp = value[span_9](start_span)[span_9](end_span)
      if (key === 'v1') result.signatures.push(value)[span_10](start_span)[span_10](end_span)

      return result[span_11](start_span)[span_11](end_span)
    },
    {
      timestamp: '',[span_12](start_span)[span_12](end_span)
      signatures: [] as string[],[span_13](start_span)[span_13](end_span)
    }
  )
}

function timingSafeEqual(a: string, b: string) {[span_14](start_span)[span_14](end_span)
  const aBuffer = Buffer.from(a)[span_15](start_span)[span_15](end_span)
  const bBuffer = Buffer.from(b)[span_16](start_span)[span_16](end_span)

  if (aBuffer.length !== bBuffer.length) return false[span_17](start_span)[span_17](end_span)

  return crypto.timingSafeEqual(aBuffer, bBuffer)[span_18](start_span)[span_18](end_span)
}

function verifyStripeSignature(payload: string, signature: string) {[span_19](start_span)[span_19](end_span)
  if (!webhookSecret) return false[span_20](start_span)[span_20](end_span)

  const { timestamp, signatures } = parseStripeSignature(signature)[span_21](start_span)[span_21](end_span)

  if (!timestamp || signatures.length === 0) return false[span_22](start_span)[span_22](end_span)

  const signedPayload = `${timestamp}.${payload}`[span_23](start_span)[span_23](end_span)
  const expected = crypto
    .createHmac('sha256', webhookSecret)[span_24](start_span)[span_24](end_span)
    .update(signedPayload)[span_25](start_span)[span_25](end_span)
    .digest('hex')[span_26](start_span)[span_26](end_span)

  return signatures.some((signatureValue) =>[span_27](start_span)[span_27](end_span)
    timingSafeEqual(signatureValue, expected)[span_28](start_span)[span_28](end_span)
  )
}

export async function POST(req: Request) {[span_29](start_span)[span_29](end_span)
  const payload = await req.text()[span_30](start_span)[span_30](end_span)
  const signature = req.headers.get('stripe-signature') || '[span_31](start_span)'[span_31](end_span)

  if (!verifyStripeSignature(payload, signature)) {[span_32](start_span)[span_32](end_span)
    return NextResponse.json([span_33](start_span)[span_33](end_span)
      { success: false, error: 'Ungültige Stripe-Signatur.' },[span_34](start_span)[span_34](end_span)
      { status: 400 }[span_35](start_span)[span_35](end_span)
    )
  }

  const event = JSON.parse(payload)[span_36](start_span)[span_36](end_span)

  console.log('Stripe Webhook empfangen:', {[span_37](start_span)[span_37](end_span)
    id: event.id,[span_38](start_span)[span_38](end_span)
    type: event.type,[span_39](start_span)[span_39](end_span)
  })

  return NextResponse.json({ received: true })[span_40](start_span)[span_40](end_span)
}
