import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// --- DEBUG: ENV prüfen ---
console.log("🔌 SUPABASE URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log("🔑 SUPABASE KEY:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 6))

// --- GET: Verbindung testen ---
export async function GET() {
  console.log("📡 GET /api/expenses aufgerufen")

  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .limit(1)

  console.log("🧪 Test-Select Ergebnis:", { data, error })

  return NextResponse.json({
    success: true,
    message: "Expenses API läuft 🚀",
    test: { data, error }
  })
}

// --- POST: Neue Ausgabe speichern ---
export async function POST(req: Request) {
  console.log("📡 POST /api/expenses aufgerufen")

  try {
    const body = await req.json()
    console.log("📥 POST Body empfangen:", body)

    // --- DEBUG: Body prüfen ---
    if (!body.title || !body.amount) {
      console.log("⚠️ Body unvollständig:", body)
    }

    const insertPayload = {
      title: body.title,
      amount: Number(body.amount),
      created_at: new Date().toISOString()
    }

    console.log("📦 Insert Payload:", insertPayload)

    const { data, error } = await supabase
      .from("expenses")
      .insert([insertPayload])
      .select()

    console.log("💾 Supabase Antwort:", { data, error })

    if (error) {
      console.error("❌ Supabase Insert Error:", error)
      throw error
    }

    return NextResponse.json({
      success: true,
      data
    })
  } catch (error) {
    console.error("🔥 API Fehler:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Fehler beim Speichern"
      },
      { status: 500 }
    )
  }
}
