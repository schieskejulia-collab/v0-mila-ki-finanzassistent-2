import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()

    console.log("Stripe Webhook empfangen")
    console.log(body)

    return NextResponse.json({
      received: true,
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        error: "Webhook konnte nicht verarbeitet werden.",
      },
      {
        status: 500,
      },
    )
  }
}