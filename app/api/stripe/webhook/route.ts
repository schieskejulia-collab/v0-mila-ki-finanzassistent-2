export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import crypto from 'node:crypto'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim()

function parseStripeSignature(signature: string) {
  return signature.split(',').reduce(
    (result, part) => {
      const [key, value] = part.split('=')

      if (key === 't') result.timestamp = value
      if (key === 'v1') result.signatures.push(value)

      return result
    },
    {
      timestamp: '',
      signatures: [] as string[],
    }
  )
}

function timingSafeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a)
  const bBuffer = Buffer.from(b)

  if (aBuffer.length !== bBuffer.length) {
    return false
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer)
}

function verifyStripeSignature(payload: string, signature: string) {
  if (!webhookSecret) {
    return false
  }

  const { timestamp, signatures } = parseStripeSignature(signature)

  if (!timestamp || signatures.length === 0) {
    return false
  }

  const signedPayload = `${timestamp}.${payload}`

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(signedPayload)
    .digest('hex')

  return signatures.some((signatureValue) =>
    timingSafeEqual(signatureValue, expectedSignature)
  )
}

export async function POST(req: Request) {
  const payload = await req.text()
  const signature = req.headers.get('stripe-signature') || ''

  if (!verifyStripeSignature(payload, signature)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Ungültige Stripe-Signatur.',
      },
      { status: 400 }
    )
  }

  const event = JSON.parse(payload)

  console.log('Stripe Webhook empfangen:', {
    id: event.id,
    type: event.type,
  })

  return NextResponse.json({
    received: true,
  })
}