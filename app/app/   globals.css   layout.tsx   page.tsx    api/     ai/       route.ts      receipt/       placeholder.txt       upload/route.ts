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

    // Jetzt feuern wir die Frage live zu Groq!
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      temperature: 0.6,
    });

    const reply =
      response.choices?.[0]?.message?.content ||
      "Ich habe kurz den Faden verloren. Frag mich einfach nochmal, ich bin da.";

    return NextResponse.json({ reply });

  } catch (error) {
    console.error("Fehler bei Groq-Anfrage:", error);
    return NextResponse.json(
      {
        reply:
          "Entschuldige, ich habe gerade ein kleines Verbindungsproblem. Frag mich gleich noch mal, ich bin bei dir.",
      },
      { status: 500 }
    );
  }
}

