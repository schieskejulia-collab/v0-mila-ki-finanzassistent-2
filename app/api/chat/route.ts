import { NextResponse } from "next/server";
import { getMilaReplyLive } from "../../../lib/mila";

export async function POST(req: Request) {
  try {
    const { message, context, userStatus, userName } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "Nachricht fehlt" }, { status: 400 });
    }

    // Ruft die Funktion exakt so auf, wie sie in lib/mila.ts steht
    const reply = await getMilaReplyLive(
      message, 
      context || {}, 
      userStatus || "selbstständig", 
      userName || "Nutzer"
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
