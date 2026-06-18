import { NextResponse } from "next/server";
import { getMilaChatResponse } from "../../../lib/mila";

export async function POST(req: Request) {
  try {
    const { message, context, userStatus, userName } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "Nachricht fehlt" }, { status: 400 });
    }

    const reply = await getMilaChatResponse(
      message,
      [],
      {
        ...context,
        userName,
        userStatus,
      }
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