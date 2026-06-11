export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(req: Request) {
  console.log("📡 POST /api/expenses (Node.js)")

  try {
    const body = await req.json()
    console.log("📥 Body:", body)

    const insertPayload = {
      title: body.title,
      amount: Number(body.amount),
      vendor: body.vendor || "Unbekannt",
      category: body.category || "Allgemein",
      date: body.date || new Date().toISOString().slice(0, 10),
      note: body.note || null,
      created_at: new Date().toISOString()
    }

    console.log("📦 Insert Payload:", insertPayload)

    const { data, error } = await supabase
      .from("expenses")
      .insert([insertPayload])
      .select()

    if (error) {
      console.error("❌ Supabase Error:", error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("🔥 API Fehler:", err)
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    )
  }
}
