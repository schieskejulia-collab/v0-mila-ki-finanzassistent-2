import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { imageBase64 } = await req.json();

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: 'Analysiere diesen Beleg. Gib NUR JSON zurück: {"amount":0,"vendor":"","category":"","title":""}'
                },
                {
                  type: "image_url",
                  image_url: {
                    url: imageBase64
                  }
                }
              ]
            }
          ],
          temperature: 0.1
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq Fehler:", data);

      return NextResponse.json(
        {
          success: false,
          error: "Groq API Fehler"
        },
        { status: 500 }
      );
    }

    const content =
      data?.choices?.[0]?.message?.content || "{}";

    console.log("GROQ CONTENT:", content);

    const parsed = JSON.parse(content);

    console.log("PARSED:", parsed);

    return NextResponse.json({
      success: true,
      data: parsed
    });

  } catch (error) {
    console.error("Scan Fehler:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Serverfehler"
      },
      { status: 500 }
    );
  }
}