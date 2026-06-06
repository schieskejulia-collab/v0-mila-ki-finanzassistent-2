import { NextResponse } from "next/server";
import { getMilaPersonality, getMilaReplyLive } from "@/lib/mila";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: "Nachricht fehlt" },
        { status: 400 }
      );
    }

    // Mila antwortet live über Groq mit den echten Werten
    const reply = await getMilaReplyLive(message);

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Fehler im Chat-Endpunkt:", error);
    return NextResponse.json(
      { error: "Mila hat gerade ein kleines Verbindungsproblem." },
      { status: 500 }
    );
  }
}

