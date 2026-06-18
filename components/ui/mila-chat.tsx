"use client"

import React, { useState, useRef, useEffect } from "react"
import { useFinance } from "../../lib/store"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

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
      id: "1",
      role: "assistant",
      content: "Hi! Ich bin Mila. Wie kann ich dir heute mit deinen Finanzen helfen?",
    },
  ])

  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
  localStorage.removeItem("mila-chat")
}, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    localStorage.setItem("mila-chat", JSON.stringify(messages))
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    }

    const nextMessages = [...messages, userMessage]

    setMessages(nextMessages)
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          data.reply ||
          "Ich habe dich leider nicht verstanden. Kannst du das nochmal sagen?",
      }

      setMessages((prev) => [...prev, milaMessage])
    } catch (error) {
      console.error("Fehler beim Chatten:", error)

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content:
            "Upps, mein Gehirn hat gerade Schluckauf. Prüf mal deine Internetverbindung!",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col bg-card border border-border rounded-xl shadow-lg mx-4 my-2 overflow-hidden min-h-[520px] mb-28">
      <div className="bg-primary p-3 text-primary-foreground font-semibold text-sm flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        Mila — Deine Finanzbegleiterin
      </div>

      <div className="flex-1 p-3 overflow-y-auto space-y-3 text-sm">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[85%] px-3 py-2 rounded-xl leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-none"
                  : "bg-muted text-foreground rounded-bl-none"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted text-muted-foreground px-3 py-2 rounded-xl rounded-bl-none animate-pulse">
              Mila überlegt...
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      <form
        onSubmit={handleSend}
        className="p-2 border-t border-border flex gap-2 bg-background"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Frag Mila etwas..."
          className="flex-1 px-3 py-1.5 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
        />

        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50"
        >
          Senden
        </button>
      </form>
    </div>
  )
}