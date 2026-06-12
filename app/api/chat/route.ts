import { NextResponse } from "next/server";
// Hier importieren wir den korrekten Funktionsnamen, den wir in lib/mila.ts festgelegt haben
import { getMilaChatResponse } from "../../../lib/mila"; 

export async function POST(req: Request) {
  try {
    const { message, context, userStatus, userName } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "Nachricht fehlt" }, { status: 400 });
    }

    // Wir nutzen hier den exakten Funktionsnamen aus deiner lib/mila.ts
    // Wir passen die Parameter an die Signatur an, die wir in lib/mila.ts gebaut haben
    const reply = await getMilaChatResponse(
      message, 
      [], // history
      context // contextData
    );

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Fehler im Chat-Endpunkt:", error);
    return NextResponse.json(
      { reply: "Mila hat gerade ein kleines Verbindungsproblem." },
      { status: 500 }
    );
  }
}
