export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireSupabaseUser } from '@/lib/supabase-server'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim()

function getBaseUrl(req: Request) {
  const origin = req.headers.get('origin')

  if (origin) return origin

  const forwardedHost = req.headers.get('x-forwarded-host')
  const host = forwardedHost || req.headers.get('host')
  const forwardedProto = req.headers.get('x-forwarded-proto')
  const protocol = forwardedProto || (host?.includes('localhost') ? 'http' : 'https')

  if (host) return `${protocol}://${host}`

  return 'https://v0-mila-ki-finanzassistent-2.vercel.app'
}

export async function POST(req: Request) {
  const { client, user, error: authError } = await requireSupabaseUser(req)

  if (authError || !user) {
    return NextResponse.json(
      { success: false, error: authError || 'Nicht angemeldet.' },
      { status: 401 }
    )
  }

  if (!stripeSecretKey) {
    return NextResponse.json(
      {
        success: false,
        error: 'Stripe ist serverseitig noch nicht vollstÃ¤ndig konfiguriert.',
      },
      { status: 501 }
    )
  }

  const { data: subscription, error: subscriptionError } = await client
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (subscriptionError) {
    console.error('Stripe-Portal: Abo konnte nicht geladen werden', subscriptionError)

    return NextResponse.json(
      { success: false, error: 'Abo-Daten konnten gerade nicht geladen werden.' },
      { status: 500 }
    )
  }

  const customerId = subscription?.stripe_customer_id

  if (!customerId) {
    return NextResponse.json(
      {
        success: false,
        error: 'FÃ¼r dein Konto wurde noch kein Stripe-Kunde gefunden.',
      },
      { status: 409 }
    )
  }

  const body = new URLSearchParams()
  body.set('customer', customerId)
  body.set('return_url', `${getBaseUrl(req)}/profil?billing=returned`)

  const response = await fetch(
    'https://api.stripe.com/v1/billing_portal/sessions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    }
  )

  const result = await response.json().catch(() => null)

  if (!response.ok || !result?.url) {
    console.error('Stripe-Portal konnte nicht erstellt werden', result)

    return NextResponse.json(
      {
        success: false,
        error:
          result?.error?.message ||
          'Das Stripe-Kundenportal konnte gerade nicht geÃ¶ffnet werden.',
      },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, url: result.url })
}
