import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Expenses API läuft 🚀"
  })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    console.log("Neue Ausgabe:", body)

    return NextResponse.json({
      success: true,
      data: body
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        success: false,
        error: "Fehler beim Speichern"
      },
      { status: 500 }
    )
  }
}