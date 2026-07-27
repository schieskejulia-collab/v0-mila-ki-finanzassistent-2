import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const secretKey = process.env.SECRET_KEY
  const priceId = process.env.PRICE_ID

  if (!secretKey) {
    return NextResponse.json(
      { error: "Stripe Secret Key fehlt." },
      { status: 500 },
    )
  }

  if (!priceId) {
    return NextResponse.json(
      { error: "Stripe Price ID fehlt." },
      { status: 500 },
    )
  }

  const origin = request.nextUrl.origin
  const body = new URLSearchParams()

  body.set("mode", "subscription")
  body.set("line_items[0][price]", priceId)
  body.set("line_items[0][quantity]", "1")

  body.set(
    "success_url",
    `${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
  )

  body.set(
    "cancel_url",
    `${origin}/?checkout=cancelled`,
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
      {
        error: "Stripe ist momentan nicht erreichbar.",
      },
      { status: 500 },
    )
  }
}