/server"
import { buildMilaContext } from "@/lib/mila-context"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(req: Request) {
  try {
    const context = await buildMilaContext(req)

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