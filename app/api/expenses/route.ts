import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// --- Debug: Prüfen, ob ENV Variablen geladen sind ---
console.log("🔌 SUPABASE URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log("🔑 SUPABASE KEY:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 6))

// --- GET: Test, ob Verbindung zu Supabase funktioniert ---
export async function GET() {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .limit(1)

  console.log("🧪 Test-Select:", { data, error })

  return NextResponse.json({
    success: true,
    message: "Expenses API läuft 🚀",
    test: { data, error }
  })
}

// --- POST: Neue Ausgabe speichern ---
export async function POST(req: Request) {
  try {
    const body = await req.json()

    console.log("📥 POST Body:", body)

    const { data, error } = await supabase
      .from("expenses")
      .insert([
        {
          title: body.title,
          amount: Number(body.amount),
          created_at: new Date().toISOString()
        }
      ])
      .select()

    if (error) {
      console.error("❌ Supabase Insert Error:", error)
      throw error
    }

    console.log("💾 Gespeichert:", data)

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
