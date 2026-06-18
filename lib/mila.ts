import { Expense, Income } from './store' // Oder wo deine Typen liegen

// Hilfsfunktion für den direkten, schlanken Groq-Aufruf ohne extra OpenAI-Paket
async function callGroqChat(messages: any[]) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    console.error('❌ GROQ_API_KEY fehlt in den Umgebungsvariablen!')
    return 'Konfigurationsfehler: API-Key fehlt.'
  }

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
  model: 'llama-3.3-70b-versatile',
  messages: messages,
  temperature: 0.7,
}),
    })

    const data = await res.json()
    if (!res.ok) {
      console.error('Groq Chat Fehler:', data)
      return 'Mila hat gerade Schwierigkeiten beim Nachdenken. Bitte versuch es gleich nochmal.'
    }

    return data.choices[0].message.content || 'Ich konnte keine Antwort generieren.'
  } catch (err) {
    console.error('Netzwerkfehler zu Groq:', err)
    return 'Verbindung zu Mila unterbrochen.'
  }
}

// Die Funktion, die vermutlich von deiner app/api/chat/route.ts aufgerufen wird
export async function getMilaChatResponse(
  userMessage: string,
  history: any[] = [],
  contextData?: {
    expenses?: Expense[]
    incomes?: Income[]
    userName?: string
    userStatus?: string
    summary?: any
  }
) {

  const contextPrompt = `
Nutzername: ${contextData?.userName ?? 'Unbekannt'}

Status: ${contextData?.userStatus ?? 'Freelancer'}

Finanzübersicht:
${JSON.stringify(contextData?.summary ?? {}, null, 2)}

Einnahmen:
${JSON.stringify(contextData?.incomes ?? [], null, 2)}

Ausgaben:
${JSON.stringify(contextData?.expenses ?? [], null, 2)}
`

  const messages = [
    {
      role: 'system',
      content: `
Du bist Mila.

Eine warme deutsche Finanzbegleiterin.

Du analysierst Einnahmen, Ausgaben,
Budgets und Steuern.

Du sprichst motivierend,
persönlich und verständlich.

Du lobst Fortschritte,
warnst freundlich vor Risiken
und gibst immer konkrete nächste Schritte.

Sprich die Nutzerin mit ihrem Namen an.
Nutze die Finanzdaten aus dem Kontext.
Antworte niemals wie ein Chatbot.

Aktuelle Daten:

${contextPrompt}
`
    },

    ...history,

    {
      role: 'user',
      content: userMessage
    }
  ]

  return await callGroqChat(messages)
}