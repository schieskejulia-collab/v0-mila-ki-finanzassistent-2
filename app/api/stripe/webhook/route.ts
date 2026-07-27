import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createHmac, timingSafeEqual } from "node:crypto"

export const runtime = "nodejs"

type StripeEvent = {
  id: string
  type: string
  data: {
    object: Record<string, any>
  }
}

function verifyStripeSignature(
  payload: string,
  signatureHeader: string,
  webhookSecret: string,
) {
  const parts = signatureHeader.split(",")

  const timestamp = parts
    .find((part) => part.startsWith("t="))
    ?.replace("t=", "")

  const signature = parts
    .find((part) => part.startsWith("v1="))
    ?.replace("v1=", "")

  if (!timestamp || !signature) {
    return false
  }

  const signedPayload = `${timestamp}.${payload}`

  const expectedSignature = createHmac("sha256", webhookSecret)
    .update(signedPayload, "utf8")
    .digest("hex")

  const expectedBuffer = Buffer.from(expectedSignature, "hex")
  const receivedBuffer = Buffer.from(signature, "hex")

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer)
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseSecretKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Webhook Secret fehlt." },
      { status: 500 },
    )
  }

  if (!supabaseUrl || !supabaseSecretKey) {
    return NextResponse.json(
      { error: "Supabase-Serverkonfiguration fehlt." },
      { status: 500 },
    )
  }

  const payload = await request.text()
  const signatureHeader = request.headers.get("stripe-signature")

  if (!signatureHeader) {
    return NextResponse.json(
      { error: "Stripe-Signatur fehlt." },
      { status: 400 },
    )
  }

  const isValid = verifyStripeSignature(
    payload,
    signatureHeader,
    webhookSecret,
  )

  if (!isValid) {
    return NextResponse.json(
      { error: "Ungültige Stripe-Signatur." },
      { status: 400 },
    )
  }

  const event = JSON.parse(payload) as StripeEvent

  const supabaseAdmin = createClient(
    supabaseUrl,
    supabaseSecretKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  )

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object

      const userId =
        session.client_reference_id ||
        session.metadata?.user_id

      if (!userId) {
        throw new Error(
          "Keine Mila-Benutzer-ID in der Stripe-Session gefunden.",
        )
      }

      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : null

      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : null

      const { error } = await supabaseAdmin
        .from("profiles")
        .update({
          is_premium: true,
          subscription_status: "active",
          premium_since: new Date().toISOString(),
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)

      if (error) {
        throw error
      }

      console.log(`Premium aktiviert für Nutzer ${userId}`)
    }

    return NextResponse.json({
      received: true,
    })
  } catch (error) {
    console.error("Stripe Webhook Fehler:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Webhook konnte nicht verarbeitet werden.",
      },
      { status: 500 },
    )
  }
}
