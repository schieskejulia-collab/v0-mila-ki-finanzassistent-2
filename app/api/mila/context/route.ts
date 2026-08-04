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
```

Falls dein Projekt keinen @-Alias nutzt, ersetze diese Zeile:

```ts
import { buildMilaContext } from "@/lib/mila-context"
```

durch diese:

```ts
import { buildMilaContext } from "../../../../lib/mila-context"
```

Test danach im Browser:

```txt
/api/mila/context
```

Wenn alles passt, bekommst du eine JSON-Antwort mit:

```json
{
  "ok": true,
  "context": {
    "month": "aktueller Monat",
    "incomeTotal": 0,
    "expenseTotal": 0,
    "balance": 0,
    "categories": [],
    "recentExpenses": [],
    "openObligations": [],
    "projects": [],
    "goals": [],
    "taxRelevantReceipts": [],
    "healthScore": 50,
    "warnings": [
      "Für diesen Monat sind noch keine Einnahmen erfasst."
    ],
    "suggestions": [
      "Noch nicht genug Daten für eine konkrete Empfehlung. Erfasse Einnahmen, Ausgaben oder Belege."
    ]
  }
}