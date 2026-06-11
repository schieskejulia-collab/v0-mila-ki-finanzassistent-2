import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(req: Request) {
  console.log("📡 POST /api/expenses aufgerufen")

  try {
    const body = await req.json()
    console.log("📥 POST Body empfangen:", body)

    // --- Pflichtfelder deiner Tabelle ---
    const insertPayload = {
      title: body.title,
      amount: Number(body.amount),

      // Neue Pflichtfelder mit Defaults:
      vendor: body.vendor || "Unbekannt",
      category: body.category || "Allgemein",
      date: body.date || new Date().toISOString().slice(0, 10),

      // Optional:
      note: body.note || null,

      created_at: new Date().toISOString()
    }

    console.log("📦 Insert Payload:", insertPayload)

    const { data, error } = await supabase
      .from("expenses")
      .insert([insertPayload])
      .select()

    console.log("💾 Supabase Antwort:", { data, error })

    if (error) {
      return NextResponse.json(
        {
          success: false,
          supabaseError: error.message,
          supabaseDetails: error.details,
          supabaseHint: error.hint
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data
    })
  } catch (error: any) {
    console.error("🔥 API Fehler:", error)

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Unbekannter Fehler"
      },
      { status: 500 }
    )
  }
}
