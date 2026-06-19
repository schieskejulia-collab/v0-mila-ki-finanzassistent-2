'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useFinance } from '../../lib/store'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const starterMessages = [
  'Was ist heute finanziell wichtig?',
  'Wie viel sollte ich zurücklegen?',
  'Welche Ausgaben sollte ich prüfen?',
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
  } = useFinance()

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hi, ich bin Mila 🌸 Frag mich zu deinen Einnahmen, Ausgaben, Rücklagen oder nächsten Schritten.',
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
          'Ich konnte gerade keine klare Antwort erzeugen. Versuch es bitte nochmal.',
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
            'Meine Verbindung hakt gerade. Deine Daten sind nicht weg — versuch es gleich nochmal.',
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
    const ok = confirm('Chatverlauf wirklich löschen?')
    if (!ok) return

    const fresh: Message[] = [
      {
        id: 'welcome',
        role: 'assistant',
        content:
          'Chat gelöscht. Ich bin wieder bereit 🌸 Was möchtest du als Nächstes prüfen?',
      },
    ]

    setMessages(fresh)
    localStorage.setItem('mila-chat', JSON.stringify(fresh))
  }

  return (
    <div className="mx-4 my-2 flex h-[calc(100dvh-180px)] flex-col overflow-hidden rounded-[2rem] border border-violet-100 bg-white shadow-sm">
      <div className="flex items-center justify-between bg-violet-600 p-4 text-white">
        <div>
          <div className="flex items-center gap-2 text-sm font-black">
            <span className="h-2 w-2 rounded-full bg-emerald-300" />
            Mila Chat
          </div>
          <p className="mt-1 text-xs font-semibold text-white/80">
            Deine Finanzbegleiterin
          </p>
        </div>

        <button
          type="button"
          onClick={clearChat}
          className="rounded-full bg-white/15 px-3 py-2 text-xs font-black text-white"
        >
          Reset
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto bg-[#fbf9ff] p-4">
        {messages.length <= 1 && (
          <div className="space-y-2">
            {starterMessages.map((text) => (
              <button
                key={text}
                type="button"
                onClick={() => sendMessage(text)}
                className="block w-full rounded-2xl bg-white p-3 text-left text-sm font-bold text-slate-700 shadow-sm"
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
                  ? 'max-w-[85%] rounded-2xl rounded-br-none bg-violet-600 px-4 py-3 text-sm font-semibold leading-relaxed text-white'
                  : 'max-w-[85%] rounded-2xl rounded-bl-none bg-white px-4 py-3 text-sm font-semibold leading-relaxed text-slate-700 shadow-sm'
              }
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-none bg-white px-4 py-3 text-sm font-bold text-slate-400 shadow-sm">
              Mila denkt nach...
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex gap-2 border-t border-violet-100 bg-white p-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Frag Mila..."
          className="min-w-0 flex-1 rounded-2xl bg-violet-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400"
        />

        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50"
        >
          Senden
        </button>
      </form>
    </div>
  )
}