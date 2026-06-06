"use client";

import { useState } from "react";

export function MilaChat() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hallo Julia, ich bin bereit. Woran denkst du gerade?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });

      const data = await res.json();

      const aiMessage = {
        role: "assistant",
        content: data.reply || "Ich konnte nichts antworten."
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Da ging etwas schief – versuch es gleich nochmal." }
      ]);
    }

    setLoading(false);
  }

  return (
    <div className="border-t bg-background p-4">
      <div className="mb-3 max-h-64 overflow-y-auto space-y-2">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`p-2 rounded-lg text-sm ${
              m.role === "assistant"
                ? "bg-purple-100 text-purple-900"
                : "bg-gray-200 text-gray-900"
            }`}
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="p-2 rounded-lg bg-purple-100 text-purple-900 text-sm">
            Mila schreibt …
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 rounded-lg border px-3 py-2 text-sm"
          placeholder="Schreib Mila etwas…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button
          onClick={sendMessage}
          className="rounded-lg bg-purple-600 px-4 py-2 text-white text-sm"
        >
          Senden
        </button>
      </div>
    </div>
  );
}