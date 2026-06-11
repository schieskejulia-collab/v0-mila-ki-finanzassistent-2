import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Expenses API läuft 🚀"
  })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const { data, error } = await supabase
      .from("expenses")
      .insert([
        {
          title: body.title,
          amount: Number(body.amount)
        }
      ])
      .select()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      data
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