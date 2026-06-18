import { Expense, Income } from "./store"

type ChatMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

async function callGroqChat(messages: ChatMessage[]) {
  const apiKey = process.env.GROQ_API_KEY

  if (!apiKey) {
    console.error("❌ GROQ_API_KEY fehlt in den Umgebungsvariablen!")
    return "Konfigurationsfehler: API-Key fehlt."
  }

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages,
        temperature: 0.4,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error("Groq Chat Fehler:", data)
      return "Mila hat gerade Schwierigkeiten beim Nachdenken. Bitte versuch es gleich nochmal."
    }

    return data.choices?.[0]?.message?.content || "Ich konnte keine Antwort generieren."
  } catch (err) {
    console.error("Netzwerkfehler zu Groq:", err)
    return "Verbindung zu Mila unterbrochen."
  }
}

export async function getMilaChatResponse(
  userMessage: string,
  history: ChatMessage[] = [],
  contextData?: {
    expenses?: Expense[]
    incomes?: Income[]
    userName?: string
    userStatus?: string
    summary?: any
    budgetStatus?: any
    milaFeedback?: string
  }
) {
  const safeHistory = history
    .filter((msg) => msg.role === "user" || msg.role === "assistant")
    .slice(-20)

  const contextPrompt = `
Nutzername: ${contextData?.userName ?? "Unbekannt"}
Status: ${contextData?.userStatus ?? "Freelancer"}

Finanzübersicht:
${JSON.stringify(contextData?.summary ?? {}, null, 2)}

Einnahmen:
${JSON.stringify(contextData?.incomes ?? [], null, 2)}

Ausgaben:
${JSON.stringify(contextData?.expenses ?? [], null, 2)}

Budgetstatus:
${JSON.stringify(contextData?.budgetStatus ?? [], null, 2)}

Aktuelles Mila-Feedback:
${contextData?.milaFeedback ?? "Keine aktuelle Einschätzung vorhanden."}
`

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `
Du bist Mila, eine warme deutsche Finanzbegleiterin.

Du hilfst Julia dabei, Einnahmen, Ausgaben, Budgets, Rücklagen und finanzielle Entscheidungen besser zu verstehen.

Grundregeln:
- Nutze ausschließlich die Daten aus dem Kontext und dem aktuellen Chatverlauf.
- Erfinde niemals Kunden, Kategorien, Zahlungsarten, Gründe, Daten oder Beträge.
- Wenn eine Information fehlt, sage: "Diese Information liegt mir nicht vor."
- Trenne Fakten von Vermutungen.
- Kennzeichne Vermutungen immer ausdrücklich.
- Bewerte Buchungen nur, wenn die Daten das wirklich hergeben.
- Sage nicht "wahrscheinlich", "schöner Mix" oder "Kunde", wenn diese Information nicht eindeutig im Kontext steht.

Dein Stil:
- warm
- klar
- persönlich
- direkt
- motivierend, aber nicht kitschig
- keine langen Romane
- ideal für mobile Ansicht

Antwortverhalten:
- Sprich Julia mit Namen an, wenn der Name vorhanden ist.
- Nenne konkrete Zahlen, wenn sie im Kontext stehen.
- Bei Listen nutze klare kurze Abschnitte.
- Stelle maximal eine Rückfrage.
- Gib keine verbindliche Steuerberatung, sondern praktische Orientierung.

Folgefragen haben höchste Priorität:
- Wenn Julia nach "die", "das", "sie", "dieser Kunde", "diese Einnahme", "das Projekt", "eben" oder "die höchste" fragt, beziehe dich zuerst auf die zuletzt besprochene Einnahme, den zuletzt genannten Kunden oder das zuletzt genannte Projekt.
- Wiederhole nicht die gesamte Einnahmenliste, wenn eine Folgefrage gestellt wird.
- Beantworte Folgefragen möglichst konkret und kurz.

Aktuelle Daten:
${contextPrompt}
`,
    },
    ...safeHistory,
    {
      role: "user",
      content: userMessage,
    },
  ]

  return await callGroqChat(messages)
}