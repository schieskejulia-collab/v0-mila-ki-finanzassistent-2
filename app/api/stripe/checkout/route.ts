export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireSupabaseUser } from '@/lib/supabase-server'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim()
const stripePriceId = process.env.STRIPE_PRICE_ID?.trim()

function getBaseUrl(req: Request) {
  const origin = req.headers.get('origin')

  if (origin) return origin

  const host = req.headers.get('host')

  if (host) {
    return `${host.includes('localhost') ? 'http' : 'https'}://${host}`
  }

  return 'https://v0-mila-ki-finanzassistent-2.vercel.app'
}

export async function POST(req: Request) {
  const { user, error: authError } = await requireSupabaseUser(req)

  if (authError || !user) {
    return NextResponse.json(
      { success: false, error: authError },
      { status: 401 }
    )
  }

  if (!stripeSecretKey || !stripePriceId) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Stripe ist serverseitig noch nicht vollständig konfiguriert.',
      },
      { status: 501 }
    )
  }

  const baseUrl = getBaseUrl(req)
  const body = new URLSearchParams()

  body.set('mode', 'subscription')
  body.set('line_items[0][price]', stripePriceId)
  body.set('line_items[0][quantity]', '1')
  body.set('success_url', `${baseUrl}/profil?checkout=success`)
  body.set('cancel_url', `${baseUrl}/profil?checkout=cancelled`)
  body.set('client_reference_id', user.id)
  body.set('customer_email', user.email || '')
  body.set('metadata[user_id]', user.id)
  body.set('subscription_data[metadata][user_id]', user.id)
  body.set('allow_promotion_codes', 'true')

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  const data = await response.json()

  if (!response.ok) {
    return NextResponse.json(
      {
        success: false,
        error:
          data?.error?.message ||
          'Stripe Checkout konnte nicht erstellt werden.',
      },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    url: data.url,
  })
}
