// In deiner API-Route für die Beleg-KI
const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'llama-3.2-90b-vision-preview', // Dieses Modell ist aktuell verfügbar
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Analysiere diesen Beleg. Gib mir JSON zurück mit: amount, vendor, category.' },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` } }
        ]
      }
    ],
    response_format: { type: "json_object" }
  }),
});
