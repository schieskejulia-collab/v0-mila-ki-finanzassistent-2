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
            url: `data:image/png;base64,${imageBase64}`
          }
        }
      ]
    }
  ],
  temperature: 0.1
})