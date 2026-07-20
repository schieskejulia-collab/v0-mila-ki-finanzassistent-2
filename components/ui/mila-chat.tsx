'use client'

import React, {
  useEffect,
  useRef,
  useState,
} from 'react'
import { calculateFinanceScore } from '../../lib/calculations'
import { useFinance } from '../../lib/store'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const starterMessages = [
  'Ich mache mir gerade Sorgen um meine Finanzen...',
  'Wie viel Geld ist aktuell wirklich frei verfügbar?',
  'Welche Zahlung sollte ich als Nächstes erledigen?',
]

function createWelcomeMessage(
  userName?: string
): Message {
  const cleanName = String(
    userName || ''
  ).trim()

  return {
    id: 'welcome',
    role: 'assistant',
    content: cleanName
      ? `Schön, dass du da bist, ${cleanName} 🌸 Egal ob du Zahlen prüfen möchtest oder dir gerade etwas Sorgen macht – wir sortieren gemeinsam, was wirklich wichtig ist. Womit soll ich anfangen?`
      : 'Schön, dass du da bist 🌸 Egal ob du Zahlen prüfen möchtest oder dir gerade etwas Sorgen macht – wir sortieren gemeinsam, was wirklich wichtig ist. Womit soll ich anfangen?',
  }
}

export function MilaChat() {
  const {
    summary,
    incomes = [],
    expenses = [],
    budgetStatus,
    milaFeedback,
    userName,
    userStatus,
    vatStatus,
    obligations = [],
    documents = [],
  } = useFinance()

  const [messages, setMessages] =
    useState<Message[]>([
      createWelcomeMessage(userName),
    ])

  const [input, setInput] =
    useState('')

  const [isLoading, setIsLoading] =
    useState(false)

  const chatEndRef =
    useRef<HTMLDivElement>(null)

  const openObligations = Array.isArray(obligations)
  ? obligations.filter((item: any) => {
      const status = String(item?.status || '').toLowerCase()

      return (
        status !== 'bezahlt' &&
        status !== 'erledigt' &&
        status !== 'paid'
      )
    })
  : []

const overdueObligationCount = openObligations.filter((item: any) => {
  const dueDate = item?.dueDate || item?.due_date

  if (!dueDate) return false

  const dueTime = new Date(dueDate).getTime()

  return (
    Number.isFinite(dueTime) &&
    dueTime < new Date().setHours(0, 0, 0, 0)
  )
}).length

const financeScore = calculateFinanceScore({
  balance: Number(summary?.balance ?? 0),

  totalIncomes: Number(
    summary?.totalIncomes ??
      summary?.totalIncome ??
      0
  ),

  totalExpenses: Number(
    summary?.totalExpenses ?? 0
  ),

  openCount: openObligations.length,

  overdueCount: overdueObligationCount,
})


  useEffect(() => {
    try {
      const saved =
        localStorage.getItem('mila-chat')

      if (!saved) {
        setMessages([
          createWelcomeMessage(userName),
        ])
        return
      }

      const parsed = JSON.parse(saved)

      if (
        Array.isArray(parsed) &&
        parsed.length > 0
      ) {
        setMessages(parsed)
        return
      }

      setMessages([
        createWelcomeMessage(userName),
      ])
    } catch {
      localStorage.removeItem(
        'mila-chat'
      )

      setMessages([
        createWelcomeMessage(userName),
      ])
    }
  }, [])

  useEffect(() => {
    setMessages((previous) => {
      if (
        previous.length !== 1 ||
        previous[0]?.id !== 'welcome'
      ) {
        return previous
      }

      return [
        createWelcomeMessage(userName),
      ]
    })
  }, [userName])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: 'smooth',
    })
  }, [messages, isLoading])

  useEffect(() => {
    try {
      localStorage.setItem(
        'mila-chat',
        JSON.stringify(
          messages.slice(-30)
        )
      )
    } catch (error) {
      console.error(
        'Chatverlauf konnte nicht gespeichert werden:',
        error
      )
    }
  }, [messages])

  async function sendMessage(
    text?: string
  ) {
    const content = (
      text ?? input
    ).trim()

    if (!content || isLoading) {
      return
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
    }

    const nextMessages = [
      ...messages,
      userMessage,
    ]

    setMessages(nextMessages)
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch(
        '/api/chat',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            message:
              userMessage.content,

            messages: nextMessages
              .slice(-12)
              .map((message) => ({
                role: message.role,
                content:
                  message.content,
              })),

            userName,
            userStatus,

            context: {
              profile: {
                userName:
                  userName || '',
                userStatus:
                  userStatus || '',
                vatStatus:
                  vatStatus || '',
              },

              summary: {
                totalIncomes: Number(
                  summary
                    ?.totalIncomes ??
                    summary
                      ?.totalIncome ??
                    0
                ),

                totalExpenses: Number(
                  summary
                    ?.totalExpenses ??
                    0
                ),

                balance: Number(
                  summary?.balance ??
                    0
                ),

                profit: Number(
                  summary?.profit ??
                    summary?.balance ??
                    0
                ),
              },

              financeScore,

              budgetStatus:
                budgetStatus || null,

              milaFeedback:
                milaFeedback || '',

              incomes: Array.isArray(
                incomes
              )
                ? incomes.slice(0, 10)
                : [],

              expenses: Array.isArray(
                expenses
              )
                ? expenses.slice(0, 10)
                : [],

              obligations:
                Array.isArray(
                  obligations
                )
                  ? obligations.slice(
                      0,
                      10
                    )
                  : [],

              documents:
                Array.isArray(
                  documents
                )
                  ? documents.slice(
                      0,
                      10
                    )
                  : [],

              counts: {
                incomeCount:
                  Array.isArray(
                    incomes
                  )
                    ? incomes.length
                    : 0,

                expenseCount:
                  Array.isArray(
                    expenses
                  )
                    ? expenses.length
                    : 0,

                obligationCount:
                  Array.isArray(
                    obligations
                  )
                    ? obligations.length
                    : 0,

                documentCount:
                  Array.isArray(
                    documents
                  )
                    ? documents.length
                    : 0,
              },
            },

            systemInstruction: `
Du bist Mila 🌸, eine persönliche Finanzbegleiterin.

Name der Person: ${
              userName ||
              'nicht angegeben'
            }

Status: ${
              userStatus ||
              'nicht angegeben'
            }

Umsatzsteuerstatus: ${
              vatStatus ||
              'nicht angegeben'
            }

Deine Regeln:

- Antworte verständlich, warm und konkret.
- Nutze zuerst die echten Daten aus dem bereitgestellten Kontext.
- Erfinde niemals Beträge, Fristen, Buchungen, Dokumente oder Bewertungen.
- Wenn Daten fehlen, sage klar und knapp, welche Angabe noch fehlt.
- Wiederhole nicht bei jeder Antwort dieselben Satzanfänge.
- Antworte normalerweise in höchstens 6 bis 8 Sätzen.
- Verwende Listen nur, wenn sie die Antwort wirklich übersichtlicher machen.
- Behandle überfällige Verpflichtungen und überfällige Einnahmen zuerst.
- Unterscheide bei Rücklagen zwischen Steuer-Rücklage, Notreserve und frei verfügbarem Geld.
- Bei finanziellen Sorgen beruhigst du zuerst kurz und nennst danach genau einen machbaren nächsten Schritt.
- Nutze den Finanzscore aus context.financeScore, sofern er größer als 0 ist.
- Erkläre einen vorhandenen Finanzscore anhand der vorhandenen Einnahmen, Ausgaben, Verpflichtungen und offenen Zahlungen.
- Sage niemals, du kennst den Finanzscore nicht, wenn context.financeScore einen Wert enthält.
- Gib keine verbindliche Steuerberatung, Rechtsberatung oder Anlageberatung.
- Sprich die Person mit ihrem Namen an, wenn einer vorhanden ist.
- Wenn eine konkrete Handlung sinnvoll ist, beende deine Antwort mit genau einer passenden Rückfrage.
            `,
          }),
        }
      )

      if (!response.ok) {
        const errorText =
          await response.text()

        throw new Error(
          `Chat-Anfrage fehlgeschlagen (${response.status}): ${errorText}`
        )
      }

      const data =
        await response.json()

      const reply =
        typeof data?.reply ===
          'string' &&
        data.reply.trim()
          ? data.reply.trim()
          : 'Ich bin da, aber meine Gedanken haben sich gerade kurz verheddert. Sag es mir ruhig noch einmal. 🌸'

      const milaMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: reply,
      }

      setMessages((previous) => [
        ...previous,
        milaMessage,
      ])
    } catch (error) {
      console.error(
        'Fehler beim Chatten:',
        error
      )

      setMessages((previous) => [
        ...previous,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content:
            'Meine Verbindung hakt gerade ein wenig. Deine Nachricht ist nicht verloren – versuch es bitte gleich noch einmal. 🌸',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault()
    sendMessage()
  }

  function clearChat() {
    const confirmed = confirm(
      'Möchtest du den Chatverlauf wirklich zurücksetzen?'
    )

    if (!confirmed) {
      return
    }

    const fresh = [
      createWelcomeMessage(userName),
    ]

    setMessages(fresh)

    localStorage.setItem(
      'mila-chat',
      JSON.stringify(fresh)
    )
  }

  return (
    <div className="mx-4 my-2 flex h-[calc(100dvh-180px)] flex-col overflow-hidden rounded-[2rem] border border-violet-100 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between bg-purple-600 p-4 text-white shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-sm font-black tracking-wide">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

            Mila 🌸
          </div>

          <p className="mt-0.5 text-[11px] font-medium text-purple-100">
            Dein persönlicher
            Finanzanker
          </p>
        </div>

        <button
          type="button"
          onClick={clearChat}
          className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/25 active:scale-95"
        >
          Reset
        </button>
      </div>

      {/* Nachrichten */}
      <div className="flex-1 space-y-4 overflow-y-auto bg-[#FAF9FD] p-4">
        {messages.length <= 1 && (
          <div className="space-y-2.5 pt-2">
            <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Vorschläge zum Starten
            </p>

            {starterMessages.map(
              (text) => (
                <button
                  key={text}
                  type="button"
                  onClick={() =>
                    sendMessage(
                      text
                    )
                  }
                  disabled={
                    isLoading
                  }
                  className="block w-full rounded-2xl border border-slate-100/50 bg-white p-3.5 text-left text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.99] disabled:opacity-50"
                >
                  {text}
                </button>
              )
            )}
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role ===
              'user'
                ? 'justify-end'
                : 'justify-start'
            }`}
          >
            <div
              className={
                message.role ===
                'user'
                  ? 'max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-none bg-purple-600 px-4 py-3 text-xs font-medium leading-relaxed text-white shadow-sm'
                  : 'max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-none border border-slate-100 bg-white px-4 py-3 text-xs font-medium leading-relaxed text-slate-700 shadow-sm'
              }
            >
              {message.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-none border border-slate-100 bg-white px-4 py-3 text-xs font-medium text-slate-400 shadow-sm">
              <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />

              <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:0.2s]" />

              <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:0.4s]" />
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Eingabe */}
      <form
        onSubmit={handleSubmit}
        className="flex gap-2 border-t border-purple-50 bg-white p-3"
      >
        <input
          type="text"
          value={input}
          onChange={(event) =>
            setInput(
              event.target.value
            )
          }
          placeholder="Was möchtest du gerade sortieren?"
          disabled={isLoading}
          className="min-w-0 flex-1 rounded-2xl bg-purple-50/60 px-4 py-3 text-xs font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:bg-purple-50 disabled:opacity-60"
        />

        <button
          type="submit"
          disabled={
            isLoading ||
            !input.trim()
          }
          className="rounded-2xl bg-purple-600 px-5 py-3 text-xs font-bold text-white transition active:scale-95 disabled:opacity-40"
        >
          {isLoading
            ? '...'
            : 'Senden'}
        </button>
      </form>
    </div>
  )
}