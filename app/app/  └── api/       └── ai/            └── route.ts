import { NextResponse } from "next/server";
import { getMilaPersonality } from "@/lib/mila";
import { getTotals } from "@/lib/data";

export async function POST(req: Request) {
  const { message } = await req.json();

  if (!message) {
    return NextResponse.json({ error: "Message missing" }, { status: 400 });
  }

  const personality = getMilaPersonality();
  const totals = getTotals();

  const systemPrompt = `
${personality}

Hier sind die aktuellen Finanzdaten des Nutzers:
- Einnahmen: ${totals.income}
- Ausgaben: ${totals.expense}
- Gewinn: ${totals.profit}
- Offene Rechnungen: ${totals.openInvoices}

Antwortstil:
- warm, ruhig, klar
- kurze Sätze
- kein Druck
- kleine Schritte
- konkrete Hinweise
`;

  const userPrompt = `Nutzer sagt: "${message}"`;

  // Fake‑Antwort (wird in Schritt 2 durch echtes LLM ersetzt)
  return NextResponse.json({
    reply: "Mila ist bereit für echte KI‑Antworten. Schritt 2 aktiviert das LLM.",
  });
}
