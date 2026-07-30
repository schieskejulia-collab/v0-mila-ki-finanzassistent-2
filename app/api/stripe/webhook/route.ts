export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import {
  createClient,
  type SupabaseClient,
} from '@supabase/supabase-js'
import crypto from 'node:crypto'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_KEY?.trim()
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
const stripePriceId = process.env.STRIPE_PRICE_ID?.trim()

type JsonRecord = Record<string, unknown>
type AdminClient = SupabaseClient<any>

function asRecord(value: unknown): JsonRecord {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as JsonRecord
  }

  return {}
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function asNumber(value: unknown) {
  return typeof value === 'number' ? value : Number(value)
}

function parseStripeSignature(signature: string) {
  return signature.split(',').reduce(
    (result, part) => {
      const [key, value] = part.trim().split('=')

      if (key === 't') result.timestamp = value
      if (key === 'v1' && value) result.signatures.push(value)

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

  if (aBuffer.length !== bBuffer.length) return false

  return crypto.timingSafeEqual(aBuffer, bBuffer)
}

function verifyStripeSignature(payload: string, signature: string) {
  if (!webhookSecret) return false

  const { timestamp, signatures } = parseStripeSignature(signature)
  const timestampNumber = Number(timestamp)

  if (!timestamp || !Number.isFinite(timestampNumber)) return false
  if (signatures.length === 0) return false

  const ageInSeconds = Math.abs(Date.now() / 1000 - timestampNumber)

  if (ageInSeconds > 300) return false

  const signedPayload = `${timestamp}.${payload}`
  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(signedPayload)
    .digest('hex')

  return signatures.some((signatureValue) =>
    timingSafeEqual(signatureValue, expected)
  )
}

function getAdminClient(): AdminClient | null {
  if (!supabaseUrl || !serviceRoleKey) return null

  return createClient<any>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

function getCurrentPeriodEnd(value: unknown) {
  const timestamp = asNumber(value)

  if (!Number.isFinite(timestamp) || timestamp <= 0) return null

  return new Date(timestamp * 1000).toISOString()
}

function getSubscriptionPriceId(subscription: JsonRecord) {
  const items = asRecord(subscription.items)
  const data = Array.isArray(items.data) ? items.data : []
  const firstItem = asRecord(data[0])
  const price = asRecord(firstItem.price)

  return asString(price.id) || stripePriceId || null
}

async function saveSubscription(
  admin: AdminClient,
  input: {
    userId: string
    customerId: string
    subscriptionId: string
    priceId: string | null
    status: string
    currentPeriodEnd: string | null
    cancelAtPeriodEnd: boolean
    eventId: string
  }
) {
  const { error } = await admin.from('subscriptions').upsert(
    {
      user_id: input.userId,
      stripe_customer_id: input.customerId || null,
      stripe_subscription_id: input.subscriptionId || null,
      stripe_price_id: input.priceId,
      status: input.status || 'inactive',
      current_period_end: input.currentPeriodEnd,
      cancel_at_period_end: input.cancelAtPeriodEnd,
      last_stripe_event_id: input.eventId || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )

  return error
}

async function updateSubscriptionByStripeId(
  admin: AdminClient,
  input: {
    customerId: string
    subscriptionId: string
    patch: JsonRecord
  }
) {
  if (input.subscriptionId) {
    const { error } = await admin
      .from('subscriptions')
      .update(input.patch)
      .eq('stripe_subscription_id', input.subscriptionId)

    if (error) return error
  }

  if (input.customerId) {
    const { error } = await admin
      .from('subscriptions')
      .update(input.patch)
      .eq('stripe_customer_id', input.customerId)

    if (error) return error
  }

  return null
}

async function handleStripeEvent(
  admin: AdminClient,
  event: JsonRecord
) {
  const eventId = asString(event.id)
  const eventType = asString(event.type)
  const data = asRecord(event.data)
  const object = asRecord(data.object)

  if (eventType === 'checkout.session.completed') {
    const metadata = asRecord(object.metadata)
    const userId =
      asString(metadata.user_id) || asString(object.client_reference_id)
    const customerId = asString(object.customer)
    const subscriptionId = asString(object.subscription)

    if (!userId || !subscriptionId) {
      console.warn('Stripe Checkout ohne Mila-Nutzer-ID oder Subscription-ID')
      return null
    }

    return saveSubscription(admin, {
      userId,
      customerId,
      subscriptionId,
      priceId: stripePriceId || null,
      status: 'active',
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      eventId,
    })
  }

  if (
    eventType === 'customer.subscription.created' ||
    eventType === 'customer.subscription.updated' ||
    eventType === 'customer.subscription.deleted'
  ) {
    const metadata = asRecord(object.metadata)
    const userId = asString(metadata.user_id)
    const subscriptionId = asString(object.id)
    const customerId = asString(object.customer)
    const status =
      eventType === 'customer.subscription.deleted'
        ? 'canceled'
        : asString(object.status) || 'inactive'

    if (userId) {
      return saveSubscription(admin, {
        userId,
        customerId,
        subscriptionId,
        priceId: getSubscriptionPriceId(object),
        status,
        currentPeriodEnd: getCurrentPeriodEnd(object.current_period_end),
        cancelAtPeriodEnd: object.cancel_at_period_end === true,
        eventId,
      })
    }

    return updateSubscriptionByStripeId(admin, {
      customerId,
      subscriptionId,
      patch: {
        stripe_customer_id: customerId || null,
        stripe_price_id: getSubscriptionPriceId(object),
        status,
        current_period_end: getCurrentPeriodEnd(object.current_period_end),
        cancel_at_period_end: object.cancel_at_period_end === true,
        last_stripe_event_id: eventId || null,
        updated_at: new Date().toISOString(),
      },
    })
  }

  if (eventType === 'invoice.payment_succeeded') {
    const subscriptionId = asString(object.subscription)
    const customerId = asString(object.customer)

    return updateSubscriptionByStripeId(admin, {
      customerId,
      subscriptionId,
      patch: {
        status: 'active',
        last_stripe_event_id: eventId || null,
        updated_at: new Date().toISOString(),
      },
    })
  }

  if (eventType === 'invoice.payment_failed') {
    const subscriptionId = asString(object.subscription)
    const customerId = asString(object.customer)

    return updateSubscriptionByStripeId(admin, {
      customerId,
      subscriptionId,
      patch: {
        status: 'past_due',
        last_stripe_event_id: eventId || null,
        updated_at: new Date().toISOString(),
      },
    })
  }

  return null
}

export async function POST(req: Request) {
  const payload = await req.text()
  const signature = req.headers.get('stripe-signature') || ''

  if (!verifyStripeSignature(payload, signature)) {
    return NextResponse.json(
      { success: false, error: 'UngÃ¼ltige Stripe-Signatur.' },
      { status: 400 }
    )
  }

  let event: JsonRecord

  try {
    event = JSON.parse(payload) as JsonRecord
  } catch {
    return NextResponse.json(
      { success: false, error: 'UngÃ¼ltige Webhook-Nutzlast.' },
      { status: 400 }
    )
  }

  const admin = getAdminClient()

  if (!admin) {
    console.error('Supabase-Admin-Konfiguration fehlt fÃ¼r Stripe Webhook')

    return NextResponse.json(
      {
        success: false,
        error: 'Stripe Webhook ist serverseitig nicht vollstÃ¤ndig konfiguriert.',
      },
      { status: 501 }
    )
  }

  const error = await handleStripeEvent(admin, event)

  if (error) {
    console.error('Stripe Subscription konnte nicht gespeichert werden:', error)

    return NextResponse.json(
      { success: false, error: 'Subscription konnte nicht gespeichert werden.' },
      { status: 500 }
    )
  }

  console.log('Stripe Webhook verarbeitet:', {
    id: event.id,
    type: event.type,
  })

  return NextResponse.json({ received: true })
}
