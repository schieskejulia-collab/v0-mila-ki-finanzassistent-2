"use client"

import { useState } from "react"

export function ReceiptUpload({ onScanSuccess }: { onScanSuccess?: () => void }) {
  const [isScanning, setIsScanning] = useState(false)
  const [statusText, setStatusText] = useState("")

  const handleFile = async (file: File) => {
    if (!file) return
    
    setIsScanning(true)
    setStatusText("Mila liest Beleg...")

    try {
      // 1. Datei in Base64 konvertieren
      const base64 = await fileToBase64(file)

      // 2. Aufruf deines echten Hono-Backends (/api/mila/scan-receipt)
      const res = await fetch("/api/mila/scan-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64 }),
      })

      const json = await res.json()
      
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Scan fehlgeschlagen")
      }

      // 3. Ausgelesene KI-Daten vorbereiten
      const rawData = typeof json.data === "string" ? JSON.parse(json.data) : json.data

      // 4. Direkt in deine echte Cloudflare D1-Datenbank via API speichern
      setStatusText("Speichere in Datenbank...")
      const saveRes = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(rawData.amount) || 0,
          category_id: rawData.category_id || 1, // Ordnet die echte DB-Kategorie zu
          vendor: rawData.vendor || "Unbekannter Händler",
          date: rawData.date || new Date().toISOString().split('T')[0],
          vat: rawData.vat || 19,
          description: "Mila Belegscan",
          is_deductible: 1
        }),
      })

      if (saveRes.ok) {
        setStatusText("Erfolgreich erfasst! 🎉")
        if (onScanSuccess) onScanSuccess()
      } else {
        throw new Error("Fehler beim Speichern der Ausgabe")
      }

    } catch (err: any) {
      console.error(err)
      setStatusText("Fehler: " + err.message)
    } finally {
      setTimeout(() => {
        setIsScanning(false)
        setStatusText("")
      }, 3000)
    }
  }

  return (
    <div className="w-full space-y-2">
      <label className="flex flex-col items-center justify-center w-full p-4 border-2 border-dashed border-rose-300 rounded-2xl bg-rose-50/50 cursor-pointer hover:bg-rose-50 transition-all text-center">
        <div className="flex flex-col items-center justify-center pt-3 pb-3">
          <span className="text-3xl mb-1">{isScanning ? "⏳" : "📸"}</span>
          <p className="text-sm font-bold text-slate-700">
            {isScanning ? statusText : "Beleg fotografieren oder hochladen"}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Mila bestimmt Betrag & Kategorie automatisch</p>
        </div>
        {/* capture="environment" öffnet auf iPhone/Tablet sofort die Rückkamera! */}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          disabled={isScanning}
          onChange={(e) => e.target.files && handleFile(e.target.files[0])}
          className="hidden"
        />
      </label>
    </div>
  )
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => reject(error)
    reader.readAsDataURL(file)
  })
}
