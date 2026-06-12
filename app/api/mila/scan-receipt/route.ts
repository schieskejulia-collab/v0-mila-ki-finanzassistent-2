import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { imageBase64 } = await req.json();
    
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: 'Analysiere diesen Beleg. Gib NUR ein gültiges JSON zurück: {"amount": 0, "vendor": "", "category": "", "title": ""}.' },
            { type: "image_url", image_url: { url: `data:image/png;base64,${imageBase64}` } }
          ]
        }],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API Fehler:", errorText);
      return NextResponse.json({ error: "Groq API Fehler" }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Scan API Fehler:", error);
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}
