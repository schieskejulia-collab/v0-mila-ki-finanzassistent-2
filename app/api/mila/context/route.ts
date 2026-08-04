import { NextResponse } from "next/server"
import { buildMilaContext } from "@/lib/mila-context"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const context = await buildMilaContext()

    return NextResponse.json({
      ok: true,
      context,
    })
  } catch (error) {
    console.error("Mila context route error:", error)

    return NextResponse.json(
      {
        ok: false,
        error: "MilaContext konnte nicht geladen werden.",
      },
      { status: 500 }
    )
  }
}