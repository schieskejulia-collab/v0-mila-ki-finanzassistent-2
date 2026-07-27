import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const secretKey = process.env.SECRET_KEY
  const priceId = process.env.PRICE_ID

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!secretKey || !priceId) {
    return NextResponse.json(
      { error: "Stripe-Konfiguration fehlt." },
      { status: 500 },
    )
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: "Supabase-Konfiguration fehlt." },
      { status: 500 },
    )
  }

  const authHeader = request.headers.get("authorization")
  const accessToken = authHeader?.replace("Bearer ", "")

  if (!accessToken) {
    return NextResponse.json(
      { error: "Bitte melde dich zuerst an." },
      { status: 401 },
    )
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken)

  if (userError || !user) {
    return NextResponse.json(
      { error: "Deine Anmeldung konnte nicht geprüft werden." },
      { status: 401 },
    )
  }

  const origin = request.nextUrl.origin
  const body = new URLSearchParams()

  body.set("mode", "subscription")
  body.set("line_items[0][price]", priceId)
  body.set("line_items[0][quantity]", "1")

  body.set("client_reference_id", user.id)
  body.set("metadata[user_id]", user.id)
  body.set("subscription_data[metadata][user_id]", user.id)

  if (user.email) {
    body.set("customer_email", user.email)
  }

  body.set(
    "success_url",
    `${origin}/profil?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
  )

  body.set(
    "cancel_url",
    `${origin}/premium?checkout=cancelled`,
  )

  body.set("allow_promotion_codes", "true")

  try {
    const stripeResponse = await fetch(
      "https://api.stripe.com/v1/checkout/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
        cache: "no-store",
      },
    )

    const stripeData = await stripeResponse.json()

    if (!stripeResponse.ok || !stripeData.url) {
      console.error("Stripe checkout error:", stripeData)

      return NextResponse.json(
        {
          error:
            stripeData?.error?.message ??
            "Stripe Checkout konnte nicht gestartet werden.",
        },
        { status: stripeResponse.status || 500 },
      )
    }

    return NextResponse.json({
      url: stripeData.url,
    })
  } catch (error) {
    console.error("Stripe checkout request failed:", error)

    return NextResponse.json(
      { error: "Stripe ist momentan nicht erreichbar." },
      { status: 500 },
    )
  }
}
