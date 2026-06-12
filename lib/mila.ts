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
        model:  model: model: model: 'llama-3.3-70b-versatile',// Das offizielle, superschnelle Textmodell auf Groq
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
export async function getMilaChatResponse(userMessage: string, history: any[] = [], contextData?: { expenses: Expense[], incomes: Income[] }) {
  
  // Kontext für Mila zusammenbauen, damit sie deine echten Finanzen kennt
  const contextPrompt = ''

const messages = [
  {
    role: 'system',
    content: `Du bist Mila, eine empathische, kluge KI-Finanzassistentin für Freelancer und Selbstständige.
    Hilf dem Nutzer, seine Finanzen zu verstehen, Steuertipps zu bekommen und motiviert zu bleiben.
    Antworte kurz, übersichtlich und freundlich.`
  },
  {
    role: 'user',
    content: userMessage
  }
]

  return await callGroqChat(messages)
}
