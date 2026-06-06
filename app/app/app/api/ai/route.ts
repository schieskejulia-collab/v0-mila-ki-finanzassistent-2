import { NextResponse } from "next/server";
import { getMilaPersonality } from "@/lib/mila";
import { getTotals } from "@/lib/data";
import OpenAI from "openai";

// Groq-Client initialisieren (biegt OpenAI auf die kostenlose Groq-API um)
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || "",
  baseURL: "https://api.groq.com/openai/v1",
});

export async function POST(req: Request) {
  try {
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
- Antworte IMMER direkt als Mila, niemals als unpersönlicher KI-Assistent.
`;

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      temperature: 0.4,
    });

    const reply = response.choices?.[0]?.message?.content || "Ich bin da. 💛";

    return NextResponse.json({ reply });
  } catch (err) {
    return NextResponse.json(
      { error: "AI request failed", details: String(err) },
      { status: 500 }
    );
  }
}