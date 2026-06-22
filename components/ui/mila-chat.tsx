'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useFinance } from '../../lib/store'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

// 🌸 Neue Starter-Fragen, die Raum für Sorgen und Austausch geben
const starterMessages = [
  'Ich mache mir gerade Sorgen um meine Finanzen...',
  'Wie viel sollte ich als Kleinunternehmer zurücklegen?',
  'Mila, ich brauche mal einen kurzen Mutmacher. ✨',
]

export function MilaChat() {
  const {
    summary,
    incomes,
    expenses,
    budgetStatus,
    milaFeedback,
    userName,
    userStatus,
    vatStatus,
  } = useFinance()

  // 🌸 Empathischerer Willkommenstext beim allerersten Start
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        `Schön, dass du da bist, ${userName || 'Julia'} 🌸 Egal ob du Zahlen prüfen willst, dir gerade etwas Sorgen macht oder du einfach mal Frust abladen musst – ich bin hier und halte dir den Rücken frei. Worüber möchtest du sprechen?`,
    },
  ])

  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('mila-chat')
      if (!saved) return

      const parsed = JSON.parse(saved)

      if (Array.isArray(parsed) && parsed.length > 0) {
        setMessages(parsed)
      }
    } catch {
      localStorage.removeItem('mila-chat')
    }
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  useEffect(() => {
    localStorage.setItem('mila-chat', JSON.stringify(messages.slice(-30)))
  }, [messages])

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim()
    if (!content || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
    }

    const nextMessages = [...messages, userMessage]

    setMessages(nextMessages)
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          messages: nextMessages,
          // 🌸 HIER HAUCHEN WIR DER KI DIE ANKER-SEELE EIN:
          systemInstruction: `
            Du bist Mila, die KI-gestützte Finanzassistentin und vor allem der treue, virtuelle Anker für ${userName || 'Julia'}. 
            Julia ist selbstständig tätig (Status: ${userStatus}, Steuerprofil: ${vatStatus}).
            WICHTIGSTE REGEL: Du bist kein kaltes Excel-Tool. Wenn Julia Ängste, Frust, Sorgen vor Schulden, dem Haushalten oder bürokratischem Stress äußert, antworte extrem verständnisvoll, sanft und auf Augenhöhe. 
            Nimm ihr den Druck. Validiere ihre Gefühle („Ich verstehe vollkommen, dass dich das gerade stresst...“). Sei ihr sicherer Hafen. 
            Erst wenn sie emotional abgeholt ist, gibst du ihr ganz einfache, klare und beruhigende nächste Schritte an die Hand, ohne sie mit Fachbegriffen zu überladen.
          `,
          context: {
            summary,
            incomes,
            expenses,
            budgetStatus,
            milaFeedback,
          },
          userName,
          userStatus,
        }),
      })

      const data = await response.json()

      const milaMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content:
          data.reply ||
          'Ich bin da, aber meine Gedanken haben sich gerade kurz verheddert. Sag es mir ruhig nochmal. 🌸',
      }

      setMessages((prev) => [...prev, milaMessage])
    } catch (error) {
      console.error('Fehler beim Chatten:', error)

      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content:
            'Meine Verbindung hakt gerade ein kleines bisschen. Ich bin aber fest an deiner Seite — versuch es gleich noch einmal. 🌸',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    sendMessage()
  }

  function clearChat() {
    const ok = confirm('Möchtest du unseren Chatverlauf zurücksetzen?')
    if (!ok) return

    const fresh: Message[] = [
      {
        id: 'welcome',
        role: 'assistant',
        content:
          'Hier ist dein frischer Start 🌸 Ich bin bereit. Atme tief durch, wir gehen das ganz entspannt Schritt für Schritt an.',
      },
    ]

    setMessages(fresh)
    localStorage.setItem('mila-chat', JSON.stringify(fresh))
  }

  return (
    <div className="mx-4 my-2 flex h-[calc(100dvh-180px)] flex-col overflow-hidden rounded-[2rem] border border-violet-100 bg-white shadow-sm">
      
      {/* Sanfterer, lila Header mit Anker-Symbol */}
      <div className="flex items-center justify-between bg-purple-600 p-4 text-white shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-sm font-black tracking-wide">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Mila 🌸
          </div>
          <p className="mt-0.5 text-[11px] font-medium text-purple-100">
            Dein virtueller Anker & Begleiterin
          </p>
        </div>

        <button
          type="button"
          onClick={clearChat}
          className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/25 transition active:scale-95"
        >
          Reset
        </button>
      </div>

      {/* Chat-Fenster */}
      <div className="flex-1 space-y-4 overflow-y-auto bg-[#FAF9FD] p-4">
        {messages.length <= 1 && (
          <div className="space-y-2.5 pt-2">
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 px-1">Vorschläge zum Starten:</p>
            {starterMessages.map((text) => (
              <button
                key={text}
                type="button"
                onClick={() => sendMessage(text)}
                className="block w-full rounded-2xl bg-white p-3.5 text-left text-xs font-semibold text-slate-700 shadow-xs border border-slate-100/50 hover:bg-slate-50 transition active:scale-[0.99]"
              >
                {text}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={
                msg.role === 'user'
                  ? 'max-w-[85%] rounded-2xl rounded-br-none bg-purple-600 px-4 py-3 text-xs font-medium leading-relaxed text-white shadow-sm'
                  : 'max-w-[85%] rounded-2xl rounded-bl-none bg-white px-4 py-3 text-xs font-medium leading-relaxed text-slate-700 shadow-xs border border-slate-100'
              }
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-none bg-white px-4 py-3 text-xs font-medium text-slate-400 shadow-xs border border-slate-100 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
              <span className="inline-block w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="inline-block w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Eingabefeld */}
      <form
        onSubmit={handleSubmit}
        className="flex gap-2 border-t border-purple-50 bg-white p-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Erzähl mir, was dich gerade beschäftigt..."
          className="min-w-0 flex-1 rounded-2xl bg-purple-50/60 px-4 py-3 text-xs font-medium text-slate-800 outline-none placeholder:text-slate-400 focus:bg-purple-50 transition"
        />

        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="rounded-2xl bg-purple-600 px-5 py-3 text-xs font-bold text-white disabled:opacity-40 transition active:scale-95"
        >
          Senden
        </button>
      </form>
    </div>
  )
}
